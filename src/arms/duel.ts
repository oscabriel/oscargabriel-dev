// A duel by Set's turn-based rules ("dungeon-initiative-1", skill
// anima-derived-combat), written here from the published formulas. It reads
// only the 23 derived attributes: weapons and armour change nothing in a
// turn-based fight. Pure and seeded, so a bout replays exactly.

export type Corner = 0 | 1;

export interface TurnEvent {
	readonly turn: number;
	readonly atMs: number;
	readonly actor: Corner;
	readonly outcome: "hit" | "miss" | "rest";
	readonly critical: boolean;
	// Health the blow took from the other fighter.
	readonly damage: number;
	// The other fighter's health after the turn.
	readonly healthAfter: number;
	// Both fighters' stamina after the turn, challenger first.
	readonly staminaAfter: readonly [number, number];
}

export interface Bout {
	readonly events: readonly TurnEvent[];
	// Null when neither fell before the turn limit.
	readonly winner: Corner | null;
	readonly health: readonly [number, number];
	readonly maxHealth: readonly [number, number];
	readonly maxStamina: readonly [number, number];
}

type Attributes = Readonly<Record<string, number>>;

const STAMINA_PER_ATTACK = 20;
const STAMINA_PER_SECOND = 10;
const MILLIS_PER_SECOND = 1000;
// Set schedules in integer rate units so two fighters' turns compare exactly.
const RATE_UNITS_PER_INITIATIVE = 10_000;
const MILLIS_PER_RATE_UNIT = 10_000_000;
const CRITICAL_MULTIPLIER = 2;
// Every attack lands for at least 1, so a fight always ends; this only guards
// against two fighters who dodge forever.
const TURN_LIMIT = 500;

const UINT32_RANGE = 2 ** 32;

// Set's own generator (mulberry32), seeded once per bout. It is uint32
// arithmetic, so it is bitwise by nature.
/* oxlint-disable no-bitwise */
export function mulberry32(seed: number): () => number {
	let state = seed >>> 0;
	return () => {
		state = (state + 0x6d_2b_79_f5) >>> 0;
		let t = Math.imul(state ^ (state >>> 15), 1 | state);
		t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
		return ((t ^ (t >>> 14)) >>> 0) / UINT32_RANGE;
	};
}
/* oxlint-enable no-bitwise */

function read(attributes: Attributes, name: string): number {
	return attributes[name] ?? 0;
}

interface FighterState {
	readonly attributes: Attributes;
	readonly maxStamina: number;
	readonly rateUnits: number;
	health: number;
	stamina: number;
	// The number of this fighter's next opportunity, from 1.
	ordinal: number;
}

function enter(attributes: Attributes): FighterState {
	return {
		attributes,
		maxStamina: Math.floor(read(attributes, "stamina")),
		rateUnits: Math.max(
			1,
			Math.round(read(attributes, "initiative") * RATE_UNITS_PER_INITIATIVE)
		),
		health: Math.floor(read(attributes, "maxHealth")),
		stamina: Math.floor(read(attributes, "stamina")),
		ordinal: 1,
	};
}

function staminas(
	fighters: readonly [FighterState, FighterState]
): readonly [number, number] {
	return [fighters[0].stamina, fighters[1].stamina];
}

function nextAt(fighter: FighterState): number {
	return (fighter.ordinal * MILLIS_PER_RATE_UNIT) / fighter.rateUnits;
}

// Exact comparison of the two next opportunities; the challenger wins ties,
// as Set's party does.
function nextActor(a: FighterState, b: FighterState): Corner {
	return a.ordinal * b.rateUnits <= b.ordinal * a.rateUnits ? 0 : 1;
}

export function duel(
	challenger: Attributes,
	defender: Attributes,
	seed: number
): Bout {
	const random = mulberry32(seed);
	const fighters = [enter(challenger), enter(defender)] as const;
	const maxHealth = [fighters[0].health, fighters[1].health] as const;
	const maxStamina = [fighters[0].maxStamina, fighters[1].maxStamina] as const;
	const events: TurnEvent[] = [];
	let clock = 0;

	while (
		fighters[0].health > 0 &&
		fighters[1].health > 0 &&
		events.length < TURN_LIMIT
	) {
		const corner = nextActor(fighters[0], fighters[1]);
		const actor = fighters[corner];
		const target = fighters[corner === 0 ? 1 : 0];
		const at = nextAt(actor);

		// Stamina comes back with time for both, and stays fractional.
		for (const fighter of fighters) {
			fighter.stamina = Math.min(
				fighter.maxStamina,
				fighter.stamina +
					(STAMINA_PER_SECOND * (at - clock)) / MILLIS_PER_SECOND
			);
		}
		clock = at;
		actor.ordinal += 1;

		const turn = events.length + 1;
		if (actor.stamina < STAMINA_PER_ATTACK) {
			events.push({
				turn,
				atMs: at,
				actor: corner,
				outcome: "rest",
				critical: false,
				damage: 0,
				healthAfter: target.health,
				staminaAfter: staminas(fighters),
			});
			continue;
		}

		// A miss still costs the stamina.
		actor.stamina -= STAMINA_PER_ATTACK;
		const dodgeChance =
			read(target.attributes, "dodgeRate") *
			(1 - read(actor.attributes, "clarity"));
		if (random() < dodgeChance) {
			events.push({
				turn,
				atMs: at,
				actor: corner,
				outcome: "miss",
				critical: false,
				damage: 0,
				healthAfter: target.health,
				staminaAfter: staminas(fighters),
			});
			continue;
		}

		const critical = random() < read(actor.attributes, "criticalHitChance");
		const landed = Math.max(
			1,
			Math.floor(
				read(actor.attributes, "physicalDamage") *
					(1 - read(target.attributes, "physicalDamageReduction")) *
					(1 - read(target.attributes, "globalResistance")) *
					(critical ? CRITICAL_MULTIPLIER : 1)
			)
		);
		const damage = Math.min(target.health, landed);
		target.health -= damage;
		events.push({
			turn,
			atMs: at,
			actor: corner,
			outcome: "hit",
			critical,
			damage,
			healthAfter: target.health,
			staminaAfter: staminas(fighters),
		});
	}

	let winner: Corner | null = null;
	if (fighters[1].health <= 0) {
		winner = 0;
	} else if (fighters[0].health <= 0) {
		winner = 1;
	}
	return {
		events,
		winner,
		health: [fighters[0].health, fighters[1].health],
		maxHealth,
		maxStamina,
	};
}
