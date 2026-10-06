// Forge arms for sites from the terminal, and set the first two against each
// other. Nothing is saved; it's for seeing whether the readings feel right.
//
//   bun scripts/forge.ts example.com other.dev
//   bun scripts/forge.ts example.com --fate      # no Clef: the first candidate, no orbs
//   bun scripts/forge.ts example.com --flash     # the smaller, faster Clef
//   bun scripts/forge.ts a.com b.com --bout=2    # another bout between the same two
//   bun scripts/forge.ts example.com --json      # everything, as JSON (plates left out)
//
// Clef and the browser are reached over Cloudflare's REST API with the account
// Alchemy is signed in to (~/.alchemy/profiles/default), or with
// CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN when both are set.

import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

import * as BunRuntime from "@effect/platform-bun/BunRuntime";
import * as Console from "effect/Console";
import * as Effect from "effect/Effect";
import * as FetchHttpClient from "effect/http/FetchHttpClient";
import * as Layer from "effect/Layer";
import * as Result from "effect/Result";
import * as Schema from "effect/Schema";

import { trumpAt } from "@/arms/arcana";
import { contender, fight } from "@/arms/bout";
import type { Paragraph } from "@/arms/chronicle";
import { Clef, ClefError, ClefResponse } from "@/arms/clef";
import type { ClefRequest } from "@/arms/clef";
import { forge } from "@/arms/forge";
import type { Forged } from "@/arms/forge";
import { NotASite, parseSite } from "@/arms/host";
import { CALLINGS } from "@/arms/judge";
import { SetWorld, STATS } from "@/arms/set-world";
import {
	Camera,
	CameraError,
	SnapshotResponse,
	snapshotRequest,
} from "@/arms/survey";

const API = "https://api.cloudflare.com/client/v4";
const PROFILE = path.join(
	homedir(),
	".alchemy/profiles/default/cloudflare.json"
);
const RECONFIGURE =
	"bun x alchemy profile edit --profile default --reconfigure Cloudflare";

interface Auth {
	readonly accountId: string;
	readonly token: string;
}

// Why the script can't reach Cloudflare, and what to run about it.
class SignInNeeded {
	readonly message: string;
	constructor(message: string) {
		this.message = message;
	}
}

const Profile = Schema.Struct({
	values: Schema.Struct({
		accountId: Schema.String,
		access: Schema.String,
		expires: Schema.Finite,
	}),
});

async function cloudflareAuth(): Promise<Auth | SignInNeeded> {
	const accountId = process.env.CLOUDFLARE_ACCOUNT_ID ?? "";
	const token = process.env.CLOUDFLARE_API_TOKEN ?? "";
	if (accountId !== "" && token !== "") {
		return { accountId, token };
	}
	try {
		const { values } = Schema.decodeUnknownSync(Profile)(
			JSON.parse(await readFile(PROFILE, "utf-8"))
		);
		if (values.expires <= Date.now()) {
			return new SignInNeeded(
				`Alchemy's Cloudflare sign-in has expired. Sign in again with:\n  ${RECONFIGURE}`
			);
		}
		return { accountId: values.accountId, token: values.access };
	} catch {
		return new SignInNeeded(
			`No Cloudflare sign-in found at ${PROFILE}. Sign in with:\n  ${RECONFIGURE}`
		);
	}
}

// Cloudflare's REST API wraps every result.
function envelope<S extends Schema.Top>(result: S) {
	return Schema.Struct({ success: Schema.Literal(true), result });
}

type RestBody = ClefRequest | ReturnType<typeof snapshotRequest>;

function post(auth: Auth, route: string, body: RestBody) {
	return Effect.tryPromise(async () => {
		const response = await fetch(`${API}/accounts/${auth.accountId}${route}`, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${auth.token}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(body),
		});
		const json: unknown = await response.json();
		if (!response.ok) {
			throw new Error(`${response.status}: ${JSON.stringify(json)}`);
		}
		return json;
	});
}

function clefOverRest(auth: Auth, model: ClefRequest["model"]) {
	return Layer.succeed(Clef, {
		decide: (request) =>
			post(auth, `/ai/run/@cf/cloudflare/${model}`, { ...request, model }).pipe(
				Effect.flatMap(Schema.decodeUnknownEffect(envelope(ClefResponse))),
				Effect.map(({ result }) => result),
				Effect.mapError((cause) => new ClefError({ cause }))
			),
	});
}

function cameraOverRest(auth: Auth) {
	return Layer.succeed(Camera, {
		snapshot: (url) =>
			post(auth, "/browser-rendering/snapshot", snapshotRequest(url)).pipe(
				Effect.flatMap(Schema.decodeUnknownEffect(SnapshotResponse)),
				Effect.map(({ result }) => ({
					html: result.content,
					screenshot: result.screenshot,
				})),
				Effect.mapError((cause) => new CameraError({ url, cause }))
			),
	});
}

// Without a sign-in only fate works: no reading and no picture.
const noClef = Layer.succeed(Clef, {
	decide: () =>
		Effect.fail(new ClefError({ cause: "Clef needs a Cloudflare sign-in" })),
});
const noCamera = Layer.succeed(Camera, {
	snapshot: (url) =>
		Effect.fail(
			new CameraError({ url, cause: "The browser needs a Cloudflare sign-in" })
		),
});

function percent(value: number): string {
	return `${Math.round(value * 100)}%`;
}

function orbs(value: number): string {
	return value.toLocaleString("en-US");
}

function sheetLines(forged: Forged): string[] {
	const { character, reading, sheet, survey, site } = forged;
	const lines = [
		"",
		`━━ ${site.host} ━━ seed ${forged.seed}`,
		`   read ${survey.url} in ${Math.round(survey.documentMs)} ms, ${Math.round(survey.documentBytes / 1024)} KB, ${survey.plate === null ? "no plate" : "with a plate"}`,
		`   "${survey.title ?? "untitled"}"`,
		"",
		`   candidates  ${forged.candidates.map((candidate, index) => `${index === forged.castIndex ? "☞ " : ""}${candidate.className}`).join(" · ")}`,
	];
	const trump = trumpAt(forged.trump);
	const drawn = reading?.trump;
	lines.push(
		`   drawn       ${trump.numeral} ${trump.name}${drawn === undefined ? " (by fate)" : ` (${percent(drawn.probabilities[drawn.choice] ?? 0)})`}`
	);
	if (reading === null) {
		lines.push("   fate alone: no reading, the first candidate, no orbs");
	} else {
		lines.push(
			`   cast as     ${character.class.name} (${percent(reading.cast.probabilities[reading.cast.choice] ?? 0)}, confidence ${percent(reading.cast.confidence)})`,
			`   calling     ${reading.calling.choice}: ${CALLINGS[reading.calling.choice]} (${percent(reading.calling.probabilities[reading.calling.choice] ?? 0)})`,
			`   portfolio ${percent(reading.portfolio)} · safe ${percent(reading.safe)} · trickery ${percent(reading.trickery)} · ${orbs(reading.usage.inputTokens)} tokens`
		);
	}
	for (const refusal of forged.refusals) {
		lines.push(`   ✗ refused: ${refusal}`);
	}
	if (sheet.branded) {
		lines.push("   ✗ branded: the page spoke to the judge, and earns nothing");
	}
	lines.push(
		"",
		`   ${character.class.name.toUpperCase()}: ${character.class.flavor}`,
		"",
		"   stat           birth  score    orbs  now"
	);
	for (const stat of STATS) {
		const birth = character.finalStats[stat];
		const score =
			stat === "luck" || reading === null
				? "  —  "
				: reading.scores[stat].toFixed(2).padStart(5);
		const raised = sheet.raised[stat] > 0 ? ` (+${sheet.raised[stat]})` : "";
		lines.push(
			`   ${stat.padEnd(14)} ${String(birth).padStart(5)}  ${score}  ${orbs(sheet.earned[stat]).padStart(6)}  ${sheet.stats[stat]}${raised}`
		);
	}
	if (sheet.craft !== null) {
		const { craft } = sheet;
		lines.push(
			"",
			`   crafted     ${craft.item.name} (grade ${craft.item.tierGrade}, ${craft.item.slot}) for ${orbs(craft.orbs)} orbs, ${craft.replaces === null ? "kept in the pack" : `replacing ${craft.replaces}`}`
		);
	}
	lines.push(
		`   power       ${orbs(sheet.powerRating)} of ${orbs(sheet.powerRatingMax)} · health ${Math.floor(sheet.attributes.maxHealth ?? 0)} · damage ${(sheet.attributes.physicalDamage ?? 0).toFixed(1)} · purse ${orbs(sheet.purse)}`,
		`   wields      ${contender(site.host, character, sheet).weapon}`
	);
	return lines;
}

function told(paragraph: Paragraph, hosts: readonly [string, string]): string {
	return paragraph
		.map((run) => ("name" in run ? hosts[run.name].toUpperCase() : run.text))
		.join("")
		.trim();
}

const program = Effect.gen(function* () {
	const args = process.argv.slice(2);
	const flags = new Set(args.filter((arg) => arg.startsWith("--")));
	const inputs = args.filter((arg) => !arg.startsWith("--"));
	const boutFlag = args.find((arg) => arg.startsWith("--bout="));
	const bout = boutFlag === undefined ? 1 : Number(boutFlag.slice(7));
	if (inputs.length === 0) {
		yield* Console.error(
			"Name a site or two: bun scripts/forge.ts example.com other.dev"
		);
		return;
	}
	const judge = !flags.has("--fate");

	const auth = yield* Effect.promise(cloudflareAuth);
	const signedIn = auth instanceof SignInNeeded ? null : auth;
	if (auth instanceof SignInNeeded) {
		if (judge) {
			yield* Console.error(
				`${auth.message}\n\nOr run with --fate to roll without Clef.`
			);
			return;
		}
		yield* Console.error(
			`${auth.message}\nRolling by fate, without a plate.\n`
		);
	}
	const services = Layer.mergeAll(
		SetWorld.layer,
		FetchHttpClient.layer,
		signedIn === null
			? noClef
			: clefOverRest(signedIn, flags.has("--flash") ? "clef-flash" : "clef"),
		signedIn === null ? noCamera : cameraOverRest(signedIn)
	);

	const today = new Date().toISOString().slice(0, 10);
	const forged: Forged[] = [];
	for (const input of inputs) {
		const site = parseSite(input);
		if (site instanceof NotASite) {
			yield* Console.error(`${input}: ${site.reason}`);
			continue;
		}
		const result = yield* forge(site, { judge, today }).pipe(
			Effect.provide(services),
			Effect.result
		);
		if (Result.isFailure(result)) {
			yield* Console.error(`${site.host}: ${String(result.failure)}`);
			continue;
		}
		forged.push(result.success);
		if (!flags.has("--json")) {
			yield* Console.log(sheetLines(result.success).join("\n"));
		}
	}

	if (flags.has("--json")) {
		yield* Console.log(
			JSON.stringify(
				forged.map(({ survey, ...rest }) => ({
					...rest,
					survey: { ...survey, plate: survey.plate !== null },
				})),
				null,
				2
			)
		);
		return;
	}

	const [first, second] = forged;
	if (first !== undefined && second !== undefined) {
		const tale = fight(
			contender(first.site.host, first.character, first.sheet),
			contender(second.site.host, second.character, second.sheet),
			bout
		);
		const hosts = [first.site.host, second.site.host] as const;
		yield* Console.log(
			`\n━━ bout ${tale.bout}: ${hosts[0]} vs ${hosts[1]} ━━ ${tale.turns} turns\n`
		);
		for (const paragraph of tale.paragraphs) {
			yield* Console.log(`   ${told(paragraph, hosts)}\n`);
		}
	}
});

BunRuntime.runMain(program);
