import { actionOf } from "@/arms/chronicle";
import type { Action } from "@/arms/chronicle";

// What each fighter holds on the field, drawn as strokes pointing up from
// the grip, and how they use it: one look and one motion for each of Set's
// actions, with a few tools that look unlike the rest of theirs.

export type Stroke = readonly [number, number, number, number];

export type Motion =
	| "swing"
	| "smash"
	| "thrust"
	| "punch"
	| "shove"
	| "lash"
	| "loose"
	| "shoot"
	| "throw"
	| "cast"
	| "play";

export type Shot =
	| "arrow"
	| "bolt"
	| "bullet"
	| "ball"
	| "spin"
	| "hurled"
	| "stone"
	| "spark"
	| "note";

export interface Gear {
	readonly strokes: readonly Stroke[];
	readonly motion: Motion;
	// Distance between the two fighters when a blow lands.
	readonly reach: number;
	readonly shot?: Shot;
	// A bow: the string is drawn back toward the hand.
	readonly strung?: boolean;
}

const SWORD: readonly Stroke[] = [
	[0, 1, 0, -11],
	[-2, -2, 2, -2],
];
const RAPIER: readonly Stroke[] = [
	[0, 0, 0, -12],
	[-1, -1, 1, -1],
	[1, 0, 2, 1],
];
const DAGGER: readonly Stroke[] = [
	[0, 0, 0, -6],
	[-1, -1, 1, -1],
];
const SPEAR: readonly Stroke[] = [
	[0, 4, 0, -14],
	[-1, -12, 0, -15],
	[1, -12, 0, -15],
];
const HALBERD: readonly Stroke[] = [
	[0, 4, 0, -15],
	[1, -13, 3, -14],
	[1, -9, 3, -8],
	[3, -14, 3, -8],
	[2, -13, 2, -9],
];
const AXE: readonly Stroke[] = [
	[0, 2, 0, -10],
	[1, -11, 3, -12],
	[1, -7, 3, -6],
	[3, -12, 3, -6],
	[2, -11, 2, -7],
];
const HAMMER: readonly Stroke[] = [
	[0, 2, 0, -8],
	[-2, -9, 3, -9],
	[-2, -10, 3, -10],
	[-2, -11, 3, -11],
];
const CLUB: readonly Stroke[] = [
	[0, 1, 0, -8],
	[1, -4, 1, -9],
	[-1, -6, -1, -8],
];
const STAFF: readonly Stroke[] = [
	[0, 5, 0, -13],
	[-1, -13, 1, -13],
];
const BOW: readonly Stroke[] = [
	[0, -7, 2, -5],
	[2, -5, 3, -2],
	[3, -2, 3, 2],
	[3, 2, 2, 5],
	[2, 5, 0, 7],
];
const CROSSBOW: readonly Stroke[] = [
	[0, 3, 0, -7],
	[-3, -6, 3, -6],
	[-3, -6, -3, -4],
	[3, -6, 3, -4],
];
const GUN: readonly Stroke[] = [
	[0, 1, 0, -9],
	[1, 2, 1, -9],
	[-1, 2, -2, 4],
];
const CANNON: readonly Stroke[] = [
	[-1, 2, -1, -8],
	[0, 2, 0, -8],
	[1, 2, 1, -8],
	[-2, -8, 2, -8],
];
const JAVELIN: readonly Stroke[] = [
	[0, 3, 0, -12],
	[-1, -10, 0, -13],
	[1, -10, 0, -13],
];
const HATCHET: readonly Stroke[] = [
	[0, 1, 0, -6],
	[1, -6, 2, -7],
	[1, -4, 2, -3],
	[2, -7, 2, -3],
];
const BOOMERANG: readonly Stroke[] = [
	[-3, 0, 0, -3],
	[0, -3, 3, 0],
];
const SLING: readonly Stroke[] = [
	[0, 0, 0, -4],
	[-1, -5, 1, -5],
];
const WAND: readonly Stroke[] = [
	[0, 0, 0, -6],
	[-1, -8, 1, -8],
	[0, -9, 0, -7],
];
const ORB: readonly Stroke[] = [
	[-1, -5, 1, -5],
	[-2, -4, -2, -2],
	[2, -4, 2, -2],
	[-1, -1, 1, -1],
];
const TOME: readonly Stroke[] = [
	[-2, -1, 2, -1],
	[-2, -5, 2, -5],
	[-2, -5, -2, -1],
	[2, -5, 2, -1],
	[0, -5, 0, -1],
];
const EYE: readonly Stroke[] = [
	[-2, -3, -1, -4],
	[-1, -4, 1, -4],
	[1, -4, 2, -3],
	[2, -3, 1, -2],
	[1, -2, -1, -2],
	[-1, -2, -2, -3],
	[0, -3, 0, -3],
];
const FLUTE: readonly Stroke[] = [[0, 2, 0, -8]];
const HARP: readonly Stroke[] = [
	[0, 2, 0, -8],
	[0, -8, 4, -4],
	[4, -4, 4, 2],
	[0, 2, 4, 2],
	[2, -6, 2, 2],
];
const WHIP: readonly Stroke[] = [
	[0, 0, 0, -3],
	[0, -3, 2, -2],
	[2, -2, 2, 0],
];
const NUNCHAKU: readonly Stroke[] = [
	[0, 0, 0, -4],
	[1, -5, 2, -9],
];
const CLAW: readonly Stroke[] = [
	[0, 0, -1, -3],
	[0, 0, 0, -4],
	[0, 0, 1, -3],
];
const SHIELD: readonly Stroke[] = [
	[-2, -6, 2, -6],
	[-2, 4, 2, 4],
	[-2, -6, -2, 4],
	[2, -6, 2, 4],
	[0, -4, 0, 2],
];

const ACTION_GEAR: Readonly<Record<Action, Gear>> = {
	aim: { strokes: BOW, motion: "loose", reach: 0, shot: "arrow", strung: true },
	bash: { strokes: CLUB, motion: "smash", reach: 18 },
	blast: { strokes: CANNON, motion: "shoot", reach: 0, shot: "ball" },
	chop: { strokes: AXE, motion: "smash", reach: 19 },
	fire: { strokes: CROSSBOW, motion: "shoot", reach: 0, shot: "bolt" },
	flick: { strokes: WAND, motion: "cast", reach: 0, shot: "spark" },
	gaze: { strokes: EYE, motion: "cast", reach: 0, shot: "spark" },
	gunfire: { strokes: GUN, motion: "shoot", reach: 0, shot: "bullet" },
	hurl: { strokes: JAVELIN, motion: "throw", reach: 0, shot: "hurled" },
	jab: { strokes: CLAW, motion: "punch", reach: 15 },
	lash: { strokes: WHIP, motion: "lash", reach: 34 },
	play: { strokes: FLUTE, motion: "play", reach: 0, shot: "note" },
	repulse: { strokes: ORB, motion: "cast", reach: 0, shot: "spark" },
	return: { strokes: BOOMERANG, motion: "throw", reach: 0, shot: "spin" },
	rupture: { strokes: TOME, motion: "cast", reach: 0, shot: "spark" },
	shieldBash: { strokes: SHIELD, motion: "shove", reach: 16 },
	skewer: { strokes: JAVELIN, motion: "throw", reach: 0, shot: "hurled" },
	slash: { strokes: SWORD, motion: "swing", reach: 20 },
	strum: { strokes: HARP, motion: "play", reach: 0, shot: "note" },
	throw: { strokes: HATCHET, motion: "throw", reach: 0, shot: "spin" },
	thrust: { strokes: DAGGER, motion: "thrust", reach: 17 },
	twirl: { strokes: NUNCHAKU, motion: "swing", reach: 18 },
	whirl: { strokes: SLING, motion: "throw", reach: 0, shot: "stone" },
};

// Tools that look unlike the rest of their action.
function buildToolGear(): ReadonlyMap<string, Gear> {
	const table: readonly (readonly [Gear, string])[] = [
		[
			{ strokes: SPEAR, motion: "thrust", reach: 25 },
			"spear|trident|spetum|pike|lance|partizan|ranseur|corseque|sarissa|yari|assegai|iklwa|goad|spike",
		],
		[
			{ strokes: RAPIER, motion: "thrust", reach: 21 },
			"estoc|rapier|gladius|cinquedea|jian|xiphos",
		],
		[
			{ strokes: HALBERD, motion: "smash", reach: 24 },
			"bill|bardiche|voulge|halberd|guisarme|glaive|naginata|fauchard|scythe",
		],
		[
			{ strokes: HAMMER, motion: "smash", reach: 19 },
			"hammer|maul|mace|morningstar|tree trunk|patu|tetsubo",
		],
		[
			{ strokes: STAFF, motion: "swing", reach: 22 },
			"quarterstaff|staff|jo|stick|cane|baton",
		],
		[
			{ strokes: DAGGER, motion: "swing", reach: 16 },
			"knife|karambit|balisong|seax",
		],
	];
	return new Map(
		table.flatMap(([gear, tools]) =>
			tools.split("|").map((tool) => [tool, gear] as const)
		)
	);
}

const TOOL_GEAR = buildToolGear();

export function gearFor(mainhand: string): Gear {
	return TOOL_GEAR.get(mainhand) ?? ACTION_GEAR[actionOf(mainhand)];
}

export function isRanged(gear: Gear): boolean {
	return gear.shot !== undefined;
}

// How the arm and the thing in hand move through an act. Angles are degrees
// clockwise from straight up for the gear, and from straight down for the
// arm, so positive is always toward the foe.
export interface Key {
	readonly angle: number;
	readonly arm: number;
	readonly push: number;
}

export interface Swing {
	readonly idle: Key;
	readonly windup: Key;
	readonly strike: Key;
}

export function key(angle: number, arm: number, push = 0): Key {
	return { angle, arm, push };
}

// Whatever's in hand, held high.
export const VICTORY = key(-10, 165);

export const SWINGS: Readonly<Record<Motion, Swing>> = {
	swing: { idle: key(35, 50), windup: key(-60, 160), strike: key(125, 75) },
	smash: { idle: key(20, 45), windup: key(-85, 170), strike: key(150, 80) },
	thrust: {
		idle: key(80, 65),
		windup: key(85, 55, -3),
		strike: key(90, 90, 5),
	},
	punch: { idle: key(90, 60), windup: key(90, 35, -2), strike: key(90, 90, 5) },
	shove: { idle: key(0, 70), windup: key(0, 55, -2), strike: key(0, 90, 5) },
	lash: { idle: key(160, 30), windup: key(-40, 160), strike: key(90, 90) },
	loose: { idle: key(0, 80), windup: key(0, 90), strike: key(0, 90) },
	shoot: { idle: key(90, 80), windup: key(90, 90), strike: key(90, 90, -2) },
	throw: { idle: key(30, 50), windup: key(-70, 165), strike: key(60, 95) },
	cast: { idle: key(30, 50), windup: key(-10, 140), strike: key(70, 100, 1) },
	play: { idle: key(70, 80), windup: key(70, 85), strike: key(70, 85) },
};
