import * as Effect from "effect/Effect";

import { Clef } from "@/arms/clef";
import { deriveSeed, hostSeed } from "@/arms/host";
import type { Site } from "@/arms/host";
import { BRANDED, clefRequest, interpret, YES } from "@/arms/judge";
import type { Reading } from "@/arms/judge";
import { isSlot, SetWorld, STAT_CEILING, STATS } from "@/arms/set-world";
import type { Character, Item, Stat, StatBlock } from "@/arms/set-world";
import { survey } from "@/arms/survey";
import type { Survey } from "@/arms/survey";

// Making a site's arms. Fate rolls the candidates from the host; Clef picks
// which of them the site is and scores the work; the scores earn orbs, which
// Set's own prices turn into raised stats and, from what's left, one craft.

export const CANDIDATES = 8;

// A judged score of 4 earns 2,400 orbs: enough to lift a middling stat by
// four or five points, and a strong one by one, at Set's cubic prices.
const ORBS_PER_SQUARED_POINT = 150;

// The craft's seed is derived from the birth's, past the candidates' range.
const CRAFT_SEED_INDEX = 1000;

export interface Craft {
	readonly item: typeof Item.Type;
	readonly orbs: number;
	// The worn item it displaced, or null when it went into the pack.
	readonly replaces: string | null;
}

export interface Sheet {
	readonly stats: typeof StatBlock.Type;
	readonly raised: Readonly<Record<Stat, number>>;
	readonly earned: Readonly<Record<Stat, number>>;
	readonly craft: Craft | null;
	// Orbs earned and never spent.
	readonly purse: number;
	readonly attributes: Readonly<Record<string, number>>;
	readonly powerRating: number;
	readonly powerRatingMax: number;
	// The page tried to talk the judge into a better reading: it earns nothing.
	readonly branded: boolean;
}

export interface Forged {
	readonly site: Site;
	readonly seed: number;
	readonly candidates: readonly { seed: number; className: string }[];
	readonly castIndex: number;
	// Set's response for the chosen candidate, unedited.
	readonly birth: unknown;
	readonly character: typeof Character.Type;
	readonly reading: Reading | null;
	readonly refusals: readonly string[];
	readonly sheet: Sheet;
	readonly survey: Survey;
}

export interface ForgeOptions {
	// Whether Clef reads the site. Without it the site gets its first
	// candidate and earns nothing: fate alone.
	readonly judge: boolean;
	// "YYYY-MM-DD", so vitality can be judged against today.
	readonly today: string;
}

function earnedOrbs(score: number): number {
	return Math.round(ORBS_PER_SQUARED_POINT * score ** 2);
}

function noOrbs(): Record<Stat, number> {
	return {
		strength: 0,
		dexterity: 0,
		intelligence: 0,
		wisdom: 0,
		agility: 0,
		vitality: 0,
		perception: 0,
		resolve: 0,
		luck: 0,
	};
}

interface Raise {
	readonly level: number;
	// Orbs that couldn't buy the next point.
	readonly left: number;
}

// Buys one-point raises in order until the next costs more than is left.
function raise(
	from: number,
	orbs: number,
	prices: ReadonlyMap<number, number>
): Raise {
	let level = from;
	let left = orbs;
	while (level < STAT_CEILING) {
		const price = prices.get(level);
		if (price === undefined || price > left) {
			break;
		}
		left -= price;
		level += 1;
	}
	return { level, left };
}

// Set's comparison: grade first, then the roll's quality score.
function isBetter(item: typeof Item.Type, than: typeof Item.Type): boolean {
	return item.tier === than.tier
		? item.score > than.score
		: item.tier > than.tier;
}

// The worn item a craft would replace: the weaker one in a two-item slot.
function weakestWorn(
	character: typeof Character.Type,
	slot: string
): typeof Item.Type | null {
	if (!isSlot(slot)) {
		return null;
	}
	let weakest: typeof Item.Type | null = null;
	for (const item of [character.equipment[slot]].flat()) {
		if (weakest === null || isBetter(weakest, item)) {
			weakest = item;
		}
	}
	return weakest;
}

function refusalsFor(reading: Reading | null): string[] {
	if (reading === null) {
		return [];
	}
	const refusals: string[] = [];
	if (reading.portfolio < YES) {
		refusals.push("It doesn't read as one person's own site.");
	}
	if (reading.safe < YES) {
		refusals.push("It isn't fit for a public gallery.");
	}
	return refusals;
}

export const forge = Effect.fn("forge")(function* (
	site: Site,
	options: ForgeOptions
) {
	const setWorld = yield* SetWorld;
	const read = yield* survey(site);

	// One at a time: Set serves its rolls from a single queue.
	const seed = hostSeed(site.host);
	// oxlint-disable-next-line unicorn/no-array-for-each -- Effect.forEach, not Array#forEach
	const rolls = yield* Effect.forEach(
		Array.from({ length: CANDIDATES }, (_, index) => deriveSeed(seed, index)),
		(candidateSeed) => setWorld.rollCharacter(candidateSeed),
		{ concurrency: 1 }
	);
	const candidates = rolls.map((roll) => roll.character);

	let reading: Reading | null = null;
	if (options.judge) {
		const clef = yield* Clef;
		const response = yield* clef.decide(
			clefRequest(read, site.host, options.today, candidates)
		);
		reading = yield* interpret(response, read, candidates.length);
	}

	const castIndex = reading?.cast.index ?? 0;
	const chosen = rolls[castIndex] ?? rolls[0];
	if (chosen === undefined) {
		return yield* Effect.die(new Error("Set returned no candidates"));
	}
	const { character } = chosen;
	const branded = reading !== null && reading.trickery >= BRANDED;
	const refusals = refusalsFor(reading);

	const earned = noOrbs();
	if (reading !== null && !branded) {
		for (const stat of STATS) {
			if (stat !== "luck") {
				earned[stat] = earnedOrbs(reading.scores[stat]);
			}
		}
	}

	// Each stat's orbs raise that stat; whatever can't buy another point
	// pools into one craft. A refused site spends nothing, so Set isn't asked
	// to price or craft for arms that won't be kept.
	const stats = { ...character.finalStats };
	const raised = noOrbs();
	let pool = 0;
	const spends =
		refusals.length === 0 && STATS.some((stat) => earned[stat] > 0);
	if (spends) {
		const prices = yield* setWorld.boostPrices();
		for (const stat of STATS) {
			const { level, left } = raise(stats[stat], earned[stat], prices);
			raised[stat] = level - stats[stat];
			stats[stat] = level;
			pool += left;
		}
	}

	let craft: Craft | null = null;
	if (spends && pool > 0) {
		const crafted = yield* setWorld.craft(
			pool,
			deriveSeed(deriveSeed(seed, castIndex), CRAFT_SEED_INDEX)
		);
		const worn = weakestWorn(character, crafted.item.slot);
		craft = {
			item: crafted.item,
			orbs: crafted.orbs,
			replaces:
				worn !== null && isBetter(crafted.item, worn) ? worn.name : null,
		};
		pool -= crafted.orbs;
	}

	const anyRaised = STATS.some((stat) => raised[stat] > 0);
	const attributes = anyRaised
		? yield* setWorld.attributes(stats)
		: character.attributes;
	const power = anyRaised
		? yield* setWorld.power(stats, character.traits.skills.length)
		: {
				powerRating: character.powerRating,
				powerRatingMax: character.powerRatingMax,
			};

	return {
		site,
		seed,
		candidates: rolls.map((roll, index) => ({
			seed: deriveSeed(seed, index),
			className: roll.character.class.name,
		})),
		castIndex,
		birth: chosen.raw,
		character,
		reading,
		refusals,
		sheet: {
			stats,
			raised,
			earned,
			craft,
			purse: pool,
			attributes,
			powerRating: power.powerRating,
			powerRatingMax: power.powerRatingMax,
			branded,
		},
		survey: read,
	} satisfies Forged;
});
