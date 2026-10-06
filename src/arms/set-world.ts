import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import { flow } from "effect/Function";
import * as FetchHttpClient from "effect/http/FetchHttpClient";
import * as HttpClient from "effect/http/HttpClient";
import * as HttpClientRequest from "effect/http/HttpClientRequest";
import * as HttpClientResponse from "effect/http/HttpClientResponse";
import * as Layer from "effect/Layer";
import * as Schedule from "effect/Schedule";
import * as Schema from "effect/Schema";

// Set (https://set.world) rolls the characters and prices everything in orbs.
// It is one person's free service with no key: calls go one at a time, only
// while a character is being made, and never during a duel.

const API = "https://set.world";
const USER_AGENT = "oscargabriel.dev (Roll of Arms)";

// Set's stat order, used wherever a stat block travels as "a-b-c-…".
export const STATS = [
	"strength",
	"dexterity",
	"intelligence",
	"wisdom",
	"agility",
	"vitality",
	"perception",
	"resolve",
	"luck",
] as const;

export type Stat = (typeof STATS)[number];

// The 13 equipment slots in Set's canonical order; hand and finger hold two.
export const SLOTS = [
	"tool",
	"offhand",
	"head",
	"neck",
	"back",
	"shoulders",
	"chest",
	"waist",
	"legs",
	"feet",
	"wrist",
	"hand",
	"finger",
] as const;

export type Slot = (typeof SLOTS)[number];

export function isSlot(slot: string): slot is Slot {
	return SLOTS.some((known) => known === slot);
}

export const STAT_FLOOR = 8;
export const STAT_CEILING = 24;

// Above this a craft costs no more and buys nothing better.
export const CRAFT_ORB_CAP = 15_625;

export const StatBlock = Schema.Struct({
	strength: Schema.Int,
	dexterity: Schema.Int,
	intelligence: Schema.Int,
	wisdom: Schema.Int,
	agility: Schema.Int,
	vitality: Schema.Int,
	perception: Schema.Int,
	resolve: Schema.Int,
	luck: Schema.Int,
});

export const Item = Schema.Struct({
	name: Schema.String,
	slot: Schema.String,
	tier: Schema.Int,
	tierGrade: Schema.String,
	orbValue: Schema.Finite,
	score: Schema.Finite,
	material: Schema.Struct({ name: Schema.String }),
	affects: Schema.Array(Schema.String),
});

const Trait = Schema.Struct({ name: Schema.String });

// The fields of Set's `Character` this site reads. The full response is kept
// as Set returned it; this is only the typed view of it.
export const Character = Schema.Struct({
	seed: Schema.NullOr(Schema.Int),
	contentVersion: Schema.String,
	class: Schema.Struct({
		name: Schema.String,
		flavor: Schema.String,
		mainhand: Schema.String,
	}),
	stats: Schema.Struct({ skills: Schema.Int }),
	finalStats: StatBlock,
	equipment: Schema.Struct({
		tool: Item,
		offhand: Item,
		head: Item,
		neck: Item,
		back: Item,
		shoulders: Item,
		chest: Item,
		waist: Item,
		legs: Item,
		feet: Item,
		wrist: Item,
		hand: Schema.Array(Item),
		finger: Schema.Array(Item),
	}),
	powerRating: Schema.Finite,
	powerRatingMax: Schema.Finite,
	equipmentOrbValue: Schema.Finite,
	traits: Schema.Struct({
		skills: Schema.Array(
			Schema.Struct({ name: Schema.String, flavor: Schema.String })
		),
		advantages: Schema.NullOr(Schema.Array(Trait)),
		disadvantages: Schema.NullOr(Schema.Array(Trait)),
	}),
	attributes: Schema.Record(Schema.String, Schema.Finite),
});

export const decodeCharacter = Schema.decodeUnknownSync(Character);

const BoostCostResponse = Schema.Struct({
	perStep: Schema.Array(
		Schema.Struct({ from: Schema.Int, to: Schema.Int, orbs: Schema.Int })
	),
});

const AttributesResponse = Schema.Struct({
	attributes: Schema.Record(Schema.String, Schema.Finite),
});

const PowerResponse = Schema.Struct({
	powerRating: Schema.Finite,
	powerRatingMax: Schema.Finite,
});

const CraftResponse = Schema.Struct({ orbs: Schema.Int, item: Item });

export class SetWorldError extends Schema.TaggedError<SetWorldError>()(
	"SetWorldError",
	{ path: Schema.String, cause: Schema.Defect() }
) {}

export function statsParam(stats: typeof StatBlock.Type): string {
	return STATS.map((stat) => stats[stat]).join("-");
}

export class SetWorld extends Context.Service<SetWorld>()("arms/SetWorld", {
	make: Effect.gen(function* () {
		const client = (yield* HttpClient.HttpClient).pipe(
			HttpClient.mapRequest(
				flow(
					HttpClientRequest.prependUrl(API),
					HttpClientRequest.setHeaders({
						Accept: "application/json",
						"User-Agent": USER_AGENT,
					})
				)
			),
			HttpClient.filterStatusOk,
			HttpClient.retryTransient({
				schedule: Schedule.exponential("300 millis"),
				times: 2,
			})
		);

		function get(path: string) {
			return client.get(path).pipe(
				Effect.flatMap((response) => response.json),
				Effect.timeout("15 seconds"),
				Effect.mapError((cause) => new SetWorldError({ path, cause }))
			);
		}

		function getAs<S extends Schema.Top>(path: string, schema: S) {
			return client.get(path).pipe(
				Effect.flatMap(HttpClientResponse.schemaBodyJson(schema)),
				Effect.timeout("15 seconds"),
				Effect.mapError((cause) => new SetWorldError({ path, cause }))
			);
		}

		// The whole response, unedited, beside its typed view.
		const rollCharacter = Effect.fn("SetWorld.rollCharacter")(function* (
			seed: number
		) {
			const path = `/api/roll/character?seed=${seed}`;
			const raw = yield* get(path);
			const character = yield* Schema.decodeUnknownEffect(Character)(raw).pipe(
				Effect.mapError((cause) => new SetWorldError({ path, cause }))
			);
			return { raw, character };
		});

		// The price of every one-point raise from the floor to the ceiling, in
		// one call: the same for every stat, and steeper the higher it goes.
		const boostPrices = Effect.fn("SetWorld.boostPrices")(function* () {
			const { perStep } = yield* getAs(
				`/api/boost/cost?from=${STAT_FLOOR}&to=${STAT_CEILING}`,
				BoostCostResponse
			);
			return new Map(perStep.map((step) => [step.from, step.orbs]));
		});

		const attributes = Effect.fn("SetWorld.attributes")(function* (
			stats: typeof StatBlock.Type
		) {
			const response = yield* getAs(
				`/api/attributes?stats=${statsParam(stats)}`,
				AttributesResponse
			);
			return response.attributes;
		});

		const power = Effect.fn("SetWorld.power")(function* (
			stats: typeof StatBlock.Type,
			skills: number
		) {
			return yield* getAs(
				`/api/power?stats=${statsParam(stats)}&skills=${skills}`,
				PowerResponse
			);
		});

		const craft = Effect.fn("SetWorld.craft")(function* (
			orbs: number,
			seed: number
		) {
			return yield* getAs(
				`/api/craft?orbs=${Math.min(orbs, CRAFT_ORB_CAP)}&seed=${seed}`,
				CraftResponse
			);
		});

		return { rollCharacter, boostPrices, attributes, power, craft };
	}),
}) {
	static readonly layer = Layer.effect(this, this.make).pipe(
		Layer.provide(FetchHttpClient.layer)
	);
}
