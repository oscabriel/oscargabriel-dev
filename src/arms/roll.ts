import * as Clock from "effect/Clock";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as FetchHttpClient from "effect/http/FetchHttpClient";
import type * as HttpClient from "effect/http/HttpClient";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";

import { contender, fight } from "@/arms/bout";
import { CLEF_MODEL, Clef, ClefError, ClefResponse } from "@/arms/clef";
import { forge } from "@/arms/forge";
import { NotASite, parseSite } from "@/arms/host";
import { Character, SetWorld } from "@/arms/set-world";
import {
	Camera,
	CameraError,
	SnapshotResponse,
	snapshotRequest,
} from "@/arms/survey";
import { Db } from "@/db/db";
import { Arms } from "@/db/schema";
import { env } from "@/env";
import { mediaPath } from "@/lib/site";

// The Roll of Arms as the site keeps it: forged through the Worker's own
// bindings, stored in D1, the plate in R2 beside the post images.

export class ArmsNotFound extends Schema.TaggedError<ArmsNotFound>()(
	"ArmsNotFound",
	{ host: Schema.String }
) {}

export class ArmsRefused extends Schema.TaggedError<ArmsRefused>()(
	"ArmsRefused",
	{ host: Schema.String, reasons: Schema.Array(Schema.String) }
) {}

// The author's days: a site is read against today in Portland.
const dayFormat = new Intl.DateTimeFormat("en-CA", {
	year: "numeric",
	month: "2-digit",
	day: "2-digit",
	timeZone: "America/Los_Angeles",
});

function plateKey(host: string): string {
	return `arms/${host}.jpg`;
}

function base64Bytes(base64: string): Uint8Array {
	return Uint8Array.from(
		atob(base64),
		(character) => character.codePointAt(0) ?? 0
	);
}

const clefBinding = Layer.succeed(Clef, {
	decide: (request) =>
		Effect.tryPromise(
			async () => await env.AI.run(CLEF_MODEL, { ...request })
		).pipe(
			Effect.flatMap(Schema.decodeUnknownEffect(ClefResponse)),
			Effect.mapError((cause) => new ClefError({ cause }))
		),
});

const cameraBinding = Layer.succeed(Camera, {
	snapshot: (url) =>
		Effect.tryPromise(async () => {
			const response = await env.BROWSER.quickAction(
				"snapshot",
				snapshotRequest(url)
			);
			if (!response.ok) {
				throw new Error(`${response.status}: ${await response.text()}`);
			}
			return await response.json();
		}).pipe(
			Effect.flatMap(Schema.decodeUnknownEffect(SnapshotResponse)),
			Effect.map(({ result }) => ({
				html: result.content,
				screenshot: result.screenshot,
			})),
			Effect.mapError((cause) => new CameraError({ url, cause }))
		),
});

export class RollOfArms extends Context.Service<RollOfArms>()(
	"arms/RollOfArms",
	{
		make: Effect.gen(function* () {
			const db = yield* Db;

			const list = Effect.fn("RollOfArms.list")(function* () {
				return yield* db.query.Arms.findMany({
					columns: {
						host: true,
						className: true,
						calling: true,
						powerRating: true,
						forgedAt: true,
					},
					orderBy: { forgedAt: "desc" },
				}).pipe(Effect.orDie);
			});

			const load = Effect.fn("RollOfArms.load")(function* (host: string) {
				const row = yield* db.query.Arms.findFirst({ where: { host } }).pipe(
					Effect.orDie
				);
				if (row === undefined) {
					return yield* new ArmsNotFound({ host });
				}
				// Stored as Set returned it; read through the same schema.
				const character = yield* Schema.decodeUnknownEffect(Character)(
					row.birth
				).pipe(Effect.orDie);
				return { ...row, character };
			});

			const sheet = Effect.fn("RollOfArms.sheet")(function* (host: string) {
				const arms = yield* load(host);
				const rivals = yield* list();
				return {
					host: arms.host,
					url: arms.url,
					seed: arms.seed,
					castIndex: arms.castIndex,
					candidates: arms.candidates,
					contentVersion: arms.contentVersion,
					character: arms.character,
					reading: arms.reading,
					sheet: arms.sheet,
					page: arms.page,
					plate: arms.plateKey === null ? null : mediaPath(arms.plateKey),
					forgedAt: arms.forgedAt,
					rivals: rivals
						.filter((rival) => rival.host !== host)
						.map((rival) => ({
							host: rival.host,
							className: rival.className,
						})),
				};
			});

			const bout = Effect.fn("RollOfArms.bout")(function* (
				host: string,
				rival: string,
				number: number
			) {
				const challenger = yield* load(host);
				const defender = yield* load(rival);
				return {
					challenger: {
						host: challenger.host,
						className: challenger.className,
					},
					defender: { host: defender.host, className: defender.className },
					fight: fight(
						contender(host, challenger.character, challenger.sheet),
						contender(rival, defender.character, defender.sheet),
						number
					),
				};
			});

			return { list, sheet, bout };
		}),
	}
) {
	static readonly layer = Layer.effect(this, this.make).pipe(
		Layer.provide(Db.layer)
	);
}

export class ArmsSmith extends Context.Service<ArmsSmith>()("arms/ArmsSmith", {
	make: Effect.gen(function* () {
		const db = yield* Db;
		// What forging needs, captured once so each forge runs on it.
		const tools = yield* Effect.context<
			SetWorld | Clef | Camera | HttpClient.HttpClient
		>();

		// Read a site, roll its arms and keep them, replacing any earlier
		// arms for the same host. A refused site is not kept.
		const forgeAndKeep = Effect.fn("ArmsSmith.forgeAndKeep")(function* (
			input: string,
			judge: boolean
		) {
			const site = parseSite(input);
			if (site instanceof NotASite) {
				return yield* site;
			}
			const today = dayFormat.format(yield* Clock.currentTimeMillis);
			const forged = yield* forge(site, { judge, today }).pipe(
				Effect.provideContext(tools)
			);
			if (forged.refusals.length > 0) {
				return yield* new ArmsRefused({
					host: site.host,
					reasons: forged.refusals,
				});
			}

			const { survey } = forged;
			const key = survey.plate === null ? null : plateKey(site.host);
			if (key !== null && survey.plate !== null) {
				const bytes = base64Bytes(survey.plate);
				yield* Effect.tryPromise(
					async () =>
						await env.MEDIA.put(key, bytes, {
							httpMetadata: { contentType: "image/jpeg" },
						})
				).pipe(Effect.orDie);
			}

			const row = {
				url: survey.url,
				seed: forged.seed,
				castIndex: forged.castIndex,
				candidates: forged.candidates,
				birth: forged.birth,
				contentVersion: forged.character.contentVersion,
				reading: forged.reading,
				sheet: forged.sheet,
				page: {
					title: survey.title,
					description: survey.description,
					documentMs: survey.documentMs,
					documentBytes: survey.documentBytes,
				},
				plateKey: key,
				className: forged.character.class.name,
				calling: forged.reading?.calling.choice ?? null,
				powerRating: forged.sheet.powerRating,
				forgedAt: new Date(yield* Clock.currentTimeMillis),
			};
			yield* db
				.insert(Arms)
				.values({ host: site.host, ...row })
				.onConflictDoUpdate({ target: Arms.host, set: row })
				.pipe(Effect.orDie);
			return { host: site.host };
		});

		return { forgeAndKeep };
	}),
}) {
	static readonly layer = Layer.effect(this, this.make).pipe(
		Layer.provide(
			Layer.mergeAll(
				Db.layer,
				SetWorld.layer,
				clefBinding,
				cameraBinding,
				FetchHttpClient.layer
			)
		)
	);
}
