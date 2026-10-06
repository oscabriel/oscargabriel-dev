import { trumpAt } from "@/arms/arcana";
import { mulberry32 } from "@/arms/duel";
import type { Corner, TurnEvent } from "@/arms/duel";
import { gearFor, isRanged, key, SWINGS, VICTORY } from "@/arms/gear";
import type { Gear, Key, Shot, Stroke } from "@/arms/gear";
import { fnv1a } from "@/arms/host";
import {
	CLEAR,
	INK,
	Raster,
	sprite,
	STOCK,
	text,
	textWidth,
} from "@/arms/pixels";
import type { Pixel, Point } from "@/arms/pixels";

// A bout played out on a field of card stock: the two cards stand up as
// card-soldiers and fight it out turn by turn, exactly as the duel fell.
// Everything here is a function of time, so the bout can be played at any
// speed, stopped, or turned to its end.

export const FIELD_WIDTH = 144;
export const FIELD_HEIGHT = 80;
const GROUND = 66;
const HOMES = [44, 100] as const;
const FACING = [1, -1] as const;

const INTRO_MS = 1200;
// How far off the field each fighter starts its walk in.
const ENTRY = 64;
const ACT_MS = 500;
// The duel's own rhythm, kept within what the eye can follow.
const MIN_GAP_MS = 580;
const MAX_GAP_MS = 1500;
const FALL_DELAY_MS = 260;
const FALL_MS = 480;
// After the fall: the card lies a moment, sinks into the ground, and a stone
// rises where it lay.
const LIE_MS = 420;
const SINK_MS = 420;
const RISE_MS = 520;
const VERDICT_DELAY_MS = LIE_MS + SINK_MS + RISE_MS;
// How far behind its feet a fallen card's middle lies.
const LYING_MIDDLE = 18;
// Deep enough that nothing of a buried card shows.
const SUNK = 40;
const CODA_MS = 3200;

// Within an act: when a blow lands, and when a shot leaves the hand.
const MELEE_IMPACT = 0.5;
const RANGED_RELEASE = 0.3;
const RANGED_IMPACT = 0.72;

// How a struck fighter answers, and for how long.
const REACT_MS = 280;
const DODGE_LEAD_MS = 90;
const FLASH_MS = 80;
const CRITICAL_FLASH_MS = 150;
const SHAKE_MS = 160;
const FLOAT_MS = 900;
const BURST_MS = 70;

// --- The bout, scheduled.

export interface FieldFighter {
	readonly host: string;
	readonly trump: number;
	readonly mainhand: string;
}

export interface FieldBout {
	readonly number: number;
	readonly fighters: readonly [FieldFighter, FieldFighter];
	readonly events: readonly TurnEvent[];
	readonly winner: Corner | null;
	readonly maxHealth: readonly [number, number];
	readonly maxStamina: readonly [number, number];
}

export interface Beat {
	readonly index: number;
	readonly event: TurnEvent;
	readonly start: number;
	readonly impact: number;
	readonly end: number;
}

export interface Script {
	readonly bout: FieldBout;
	readonly gear: readonly [Gear, Gear];
	readonly beats: readonly Beat[];
	// When the loser starts to fall, if anyone does.
	readonly fallAt: number | null;
	readonly endAt: number;
	readonly seed: number;
}

function clamp(value: number, low: number, high: number): number {
	return Math.min(high, Math.max(low, value));
}

function other(corner: Corner): Corner {
	return corner === 0 ? 1 : 0;
}

// How far through an act its blow lands: a rest has none to wait for.
function impactWithin(event: TurnEvent, gear: Gear): number {
	if (event.outcome === "rest") {
		return 0;
	}
	return isRanged(gear) ? RANGED_IMPACT : MELEE_IMPACT;
}

export function script(bout: FieldBout): Script {
	const gear = [
		gearFor(bout.fighters[0].mainhand),
		gearFor(bout.fighters[1].mainhand),
	] as const;
	let clock = INTRO_MS;
	let lastAt = 0;
	const beats = bout.events.map((event, index) => {
		if (index > 0) {
			clock += clamp(event.atMs - lastAt, MIN_GAP_MS, MAX_GAP_MS);
		}
		lastAt = event.atMs;
		return {
			index,
			event,
			start: clock,
			impact: clock + ACT_MS * impactWithin(event, gear[event.actor]),
			end: clock + ACT_MS,
		};
	});
	const last = beats.at(-1);
	const fallAt =
		bout.winner === null || last === undefined
			? null
			: last.impact + FALL_DELAY_MS;
	return {
		bout,
		gear,
		beats,
		fallAt,
		endAt: (fallAt ?? last?.end ?? INTRO_MS) + CODA_MS,
		seed: fnv1a(
			`${bout.fighters[0].host}|${bout.fighters[1].host}|${bout.number}|field`
		),
	};
}

// How many beats have been told by time t: the log follows this.
export function toldBy(field: Script, t: number): number {
	let told = 0;
	for (const beat of field.beats) {
		if (beat.impact > t) {
			break;
		}
		told += 1;
	}
	return told;
}

// --- Easing.

function easeOut(q: number): number {
	return 1 - (1 - q) ** 2;
}

function easeInOut(q: number): number {
	return q < 0.5 ? 2 * q * q : 1 - (-2 * q + 2) ** 2 / 2;
}

function mix(from: Key, to: Key, q: number): Key {
	const along = clamp(q, 0, 1);
	return {
		angle: from.angle + (to.angle - from.angle) * along,
		arm: from.arm + (to.arm - from.arm) * along,
		push: from.push + (to.push - from.push) * along,
	};
}

// A drop with one small bounce at the end.
function topple(q: number): number {
	const along = clamp(q, 0, 1);
	if (along < 0.75) {
		return (along / 0.75) ** 2;
	}
	const bounce = (along - 0.75) / 0.25;
	return 1 - 0.08 * Math.sin(bounce * Math.PI);
}

// --- Poses.

interface Pose {
	x: number;
	lift: number;
	key: Key;
	pull: number;
	hide: boolean;
	walking: boolean;
	crouch: boolean;
	invert: boolean;
	fall: number;
	// How far a fallen card has gone into the ground.
	sink: number;
}

function stand(gear: Gear, x: number): Pose {
	return {
		x,
		lift: 0,
		key: SWINGS[gear.motion].idle,
		pull: 0,
		hide: false,
		walking: false,
		crouch: false,
		invert: false,
		fall: 0,
		sink: 0,
	};
}

// The last beat that has started by t.
function currentIndex(beats: readonly Beat[], t: number): number {
	let low = 0;
	let high = beats.length - 1;
	let found = -1;
	while (low <= high) {
		const middle = Math.floor((low + high) / 2);
		const beat = beats[middle];
		if (beat !== undefined && beat.start <= t) {
			found = middle;
			low = middle + 1;
		} else {
			high = middle - 1;
		}
	}
	return found;
}

function meleeAct(pose: Pose, gear: Gear, p: number, facing: number): void {
	const swing = SWINGS[gear.motion];
	const advance = (HOMES[1] - HOMES[0] - gear.reach) * facing;
	if (p < 0.3) {
		pose.x += advance * easeOut(p / 0.3);
		pose.walking = true;
	} else if (p < 0.64) {
		pose.x += advance;
		pose.key =
			p < 0.42
				? mix(swing.idle, swing.windup, (p - 0.3) / 0.12)
				: mix(swing.windup, swing.strike, (p - 0.42) / 0.08);
	} else {
		const back = easeInOut((p - 0.64) / 0.36);
		pose.x += advance * (1 - back);
		pose.key = mix(swing.strike, swing.idle, back * 2);
		pose.walking = true;
	}
}

function rangedAct(pose: Pose, gear: Gear, p: number): void {
	const swing = SWINGS[gear.motion];
	if (p < RANGED_RELEASE) {
		const drawn = p / RANGED_RELEASE;
		pose.key = mix(swing.idle, swing.windup, drawn);
		pose.pull = gear.strung === true ? Math.round(4 * drawn) : 0;
		return;
	}
	pose.key =
		p < RANGED_IMPACT
			? mix(swing.windup, swing.strike, (p - RANGED_RELEASE) / 0.1)
			: mix(swing.strike, swing.idle, (p - RANGED_IMPACT) / 0.28);
	pose.hide = gear.motion === "throw" && p < 0.92;
}

function ownAct(field: Script, corner: Corner, t: number, pose: Pose): void {
	const beat = field.beats[currentIndex(field.beats, t)];
	if (beat === undefined || beat.event.actor !== corner || t >= beat.end) {
		return;
	}
	if (beat.event.outcome === "rest") {
		pose.crouch = true;
		return;
	}
	const gear = field.gear[corner];
	const p = (t - beat.start) / ACT_MS;
	if (isRanged(gear)) {
		rangedAct(pose, gear, p);
	} else {
		meleeAct(pose, gear, p, FACING[corner]);
	}
}

// Struck, or slipping a blow.
function reaction(field: Script, corner: Corner, t: number, pose: Pose): void {
	const index = currentIndex(field.beats, t);
	for (const beat of [field.beats[index - 1], field.beats[index]]) {
		if (beat === undefined || beat.event.actor === corner) {
			continue;
		}
		const age = t - beat.impact;
		const { outcome, critical } = beat.event;
		if (outcome === "miss" && age >= -DODGE_LEAD_MS && age < REACT_MS) {
			const q = (age + DODGE_LEAD_MS) / (REACT_MS + DODGE_LEAD_MS);
			pose.x -= FACING[corner] * 8 * Math.sin(q * Math.PI);
			pose.lift = Math.round(5 * Math.sin(q * Math.PI));
		}
		if (outcome === "hit" && age >= 0 && age < REACT_MS) {
			const knock = critical ? 6 : 3;
			pose.x -= FACING[corner] * knock * (1 - age / REACT_MS) ** 2;
			pose.invert = age < (critical ? CRITICAL_FLASH_MS : FLASH_MS);
			pose.key = mix(
				pose.key,
				key(pose.key.angle - 20, 20),
				1 - age / REACT_MS
			);
		}
	}
}

function ending(field: Script, corner: Corner, t: number, pose: Pose): void {
	const { fallAt, bout } = field;
	if (fallAt === null || t < fallAt) {
		return;
	}
	const age = t - fallAt;
	if (corner === bout.winner) {
		const cheer = age - FALL_MS;
		if (cheer > 0) {
			pose.lift =
				cheer < 440
					? Math.round(3 * Math.abs(Math.sin((cheer / 220) * Math.PI)))
					: 0;
			pose.key = VICTORY;
		}
		return;
	}
	pose.fall = -FACING[corner] * 90 * topple(age / FALL_MS);
	const sinking = (age - FALL_MS - LIE_MS) / SINK_MS;
	pose.sink = Math.round(SUNK * clamp(sinking, 0, 1));
	pose.key = SWINGS[field.gear[corner].motion].idle;
	pose.invert = false;
}

function poseAt(field: Script, corner: Corner, t: number): Pose {
	const pose = stand(field.gear[corner], HOMES[corner]);
	if (t < INTRO_MS) {
		const q = t / INTRO_MS;
		pose.x -= FACING[corner] * ENTRY * (1 - easeOut(q));
		pose.walking = q < 0.92;
	}
	ownAct(field, corner, t, pose);
	reaction(field, corner, t, pose);
	ending(field, corner, t, pose);
	return pose;
}

// --- Drawing a fighter: a tarot card on legs, with a head, an arm and its
// gear. Drawn facing right into its own raster, then set on the field
// mirrored and turned as it stands.

const LOCAL = { width: 72, height: 64 } as const;
const PIVOT: Point = { x: 36, y: 60 };
const BODY = { width: 15, height: 21 } as const;
const LEG = 6;
const ARM = 6;
// The front shoulder, and the back, from the pivot and the body's top.
const SHOULDER = { x: 7, y: 6 } as const;
const DEGREES = Math.PI / 180;

const HEAD = sprite([
	".#####.",
	"#ooooo#",
	"#ooo#o#",
	"#ooooo#",
	"#ooooo#",
	".#####.",
]);

// The edge pixels a card loses as it's struck, in the order it loses them.
function tearOrder(seed: number): Point[] {
	const edge: Point[] = [];
	for (let x = 1; x < BODY.width - 1; x += 1) {
		edge.push({ x, y: 0 }, { x, y: BODY.height - 1 });
	}
	for (let y = 2; y < BODY.height - 2; y += 1) {
		edge.push({ x: 0, y }, { x: BODY.width - 1, y });
	}
	const random = mulberry32(seed);
	for (let index = edge.length - 1; index > 0; index -= 1) {
		const swapWith = Math.floor(random() * (index + 1));
		const held = edge[index];
		const taken = edge[swapWith];
		if (held !== undefined && taken !== undefined) {
			edge[index] = taken;
			edge[swapWith] = held;
		}
	}
	return edge;
}

const MAX_TEARS = 18;
// The pixel type's height.
const GLYPH_ROWS = 5;

interface Look {
	// Set once, and set backwards for a fighter drawn mirrored, so it reads
	// true on the field.
	readonly numeral: Raster;
	readonly gear: Gear;
	readonly tears: readonly Point[];
	readonly torn: number;
}

function inward(point: Point): Point {
	if (point.x === 0) {
		return { x: 1, y: point.y };
	}
	if (point.x === BODY.width - 1) {
		return { x: BODY.width - 2, y: point.y };
	}
	return point.y === 0 ? { x: point.x, y: 1 } : { x: point.x, y: point.y - 1 };
}

function drawBody(local: Raster, look: Look, top: number): void {
	const left = PIVOT.x - Math.floor(BODY.width / 2);
	local.rect(left, top, BODY.width, BODY.height, INK);
	local.rect(left + 1, top + 1, BODY.width - 2, BODY.height - 2, STOCK);
	for (const [x, y] of [
		[0, 0],
		[BODY.width - 1, 0],
		[0, BODY.height - 1],
		[BODY.width - 1, BODY.height - 1],
	] as const) {
		local.set(left + x, top + y, CLEAR);
	}
	local.stamp(
		look.numeral,
		{ x: Math.floor(look.numeral.width / 2), y: 0 },
		{ x: PIVOT.x, y: top + 3 }
	);
	// The picture, too small to be more than its tone.
	for (let y = top + 11; y < top + BODY.height - 2; y += 1) {
		for (let x = left + 3; x < left + BODY.width - 3; x += 1) {
			if ((x + y) % 2 === 0) {
				local.set(x, y, INK);
			}
		}
	}
	for (const tear of look.tears.slice(0, look.torn)) {
		local.set(left + tear.x, top + tear.y, CLEAR);
		const edge = inward(tear);
		local.set(left + edge.x, top + edge.y, INK);
	}
}

function drawLegs(local: Raster, pose: Pose, t: number, hip: number): void {
	const stride = pose.walking && Math.floor(t / 90) % 2 === 0 ? 2 : 0;
	const ground = PIVOT.y - 1;
	const bend = pose.crouch ? 1 : 0;
	for (const [hipX, sway] of [
		[PIVOT.x - 3, -stride],
		[PIVOT.x + 3, stride],
	] as const) {
		local.line(hipX, hip, hipX + sway + bend, ground, INK);
		local.set(hipX + sway + bend + 1, ground, INK);
	}
}

function strokePoint(
	x: number,
	y: number,
	angle: number
): readonly [number, number] {
	const cos = Math.cos(angle * DEGREES);
	const sin = Math.sin(angle * DEGREES);
	return [x * cos - y * sin, x * sin + y * cos];
}

function drawStrokes(
	raster: Raster,
	strokes: readonly Stroke[],
	at: Point,
	angle: number,
	flip = false,
	value: Pixel = INK
): void {
	const mirror = flip ? -1 : 1;
	for (const [x0, y0, x1, y1] of strokes) {
		const [ax, ay] = strokePoint(x0, y0, angle);
		const [bx, by] = strokePoint(x1, y1, angle);
		raster.line(
			at.x + ax * mirror,
			at.y + ay,
			at.x + bx * mirror,
			at.y + by,
			value
		);
	}
}

function hand(pose: Pose, top: number): Point {
	const shoulder = { x: PIVOT.x + SHOULDER.x, y: top + SHOULDER.y };
	return {
		x: shoulder.x + ARM * Math.sin(pose.key.arm * DEGREES) + pose.key.push,
		y: shoulder.y + ARM * Math.cos(pose.key.arm * DEGREES),
	};
}

function drawFighter(local: Raster, look: Look, pose: Pose, t: number): void {
	local.clear();
	const crouch = pose.crouch ? 1 : 0;
	const top = PIVOT.y - LEG - BODY.height + crouch;
	drawLegs(local, pose, t, top + BODY.height);
	// The back arm, then the head on the card's top edge.
	local.line(
		PIVOT.x - SHOULDER.x,
		top + SHOULDER.y,
		PIVOT.x - SHOULDER.x - 2,
		top + SHOULDER.y + 6,
		INK
	);
	local.stamp(
		HEAD,
		{ x: 0, y: 0 },
		{ x: PIVOT.x - Math.floor(HEAD.width / 2), y: top - HEAD.height }
	);
	drawBody(local, look, top);
	const grip = hand(pose, top);
	local.line(PIVOT.x + SHOULDER.x, top + SHOULDER.y, grip.x, grip.y, INK);
	if (!pose.hide) {
		drawStrokes(local, look.gear.strokes, grip, pose.key.angle);
	}
	if (look.gear.strung === true && !pose.hide) {
		local.line(grip.x, grip.y - 7, grip.x - pose.pull, grip.y, INK);
		local.line(grip.x - pose.pull, grip.y, grip.x, grip.y + 7, INK);
	}
}

// Where a fighter's grip is on the field, for shots and lashes.
function gripOnField(pose: Pose, corner: Corner): Point {
	const top = PIVOT.y - LEG - BODY.height + (pose.crouch ? 1 : 0);
	const grip = hand(pose, top);
	return {
		x: pose.x + (grip.x - PIVOT.x) * FACING[corner],
		y: GROUND + grip.y - PIVOT.y - pose.lift,
	};
}

// --- The field.

function scenery(raster: Raster, seed: number): void {
	const random = mulberry32(seed);
	const phase = random() * 10;
	// Far hills, dotted, as an engraver would leave them.
	for (let x = 0; x < FIELD_WIDTH; x += 2) {
		const y =
			40 +
			Math.round(
				3 * Math.sin(x / 11 + phase) + 2 * Math.sin(x / 4.7 + phase * 2)
			);
		raster.set(x, y, INK);
	}
	raster.line(0, GROUND, FIELD_WIDTH - 1, GROUND, INK);
	for (let y = GROUND + 2; y < FIELD_HEIGHT; y += 1) {
		for (let x = 0; x < FIELD_WIDTH; x += 1) {
			if ((x * 7 + y * 13) % (y - GROUND + 13) === 0) {
				raster.set(x, y, INK);
			}
		}
	}
	// Tufts of grass: three blades, the middle one tallest.
	for (let tuft = 0; tuft < 10; tuft += 1) {
		const x = Math.floor(random() * FIELD_WIDTH);
		raster.line(x - 2, GROUND - 1, x - 2, GROUND - 2, INK);
		raster.line(x, GROUND - 1, x, GROUND - 3, INK);
		raster.line(x + 2, GROUND - 1, x + 2, GROUND - 2, INK);
	}
}

function healthAt(field: Script, t: number): [number, number] {
	const health: [number, number] = [
		field.bout.maxHealth[0],
		field.bout.maxHealth[1],
	];
	for (const beat of field.beats) {
		if (beat.impact > t) {
			break;
		}
		if (beat.event.outcome === "hit") {
			health[other(beat.event.actor)] = beat.event.healthAfter;
		}
	}
	return health;
}

function staminaAt(field: Script, t: number): readonly [number, number] {
	const beat = field.beats[currentIndex(field.beats, t)];
	return beat?.event.staminaAfter ?? field.bout.maxStamina;
}

// Text in ink with a stock edge, so it reads over anything.
function outlined(
	raster: Raster,
	value: string,
	x: number,
	y: number,
	align: "left" | "center" | "right" = "center"
): void {
	const width = textWidth(value);
	let left = x;
	if (align === "center") {
		left = x - width / 2;
	} else if (align === "right") {
		left = x - width + 1;
	}
	raster.rect(Math.round(left) - 1, y - 1, width + 2, 7, STOCK);
	text(raster, value, Math.round(left), y);
}

const HEART = sprite([".#.#.", "#####", "#####", ".###.", "..#.."]);

function meter(
	raster: Raster,
	corner: Corner,
	health: number,
	maxHealth: number,
	stamina: number,
	maxStamina: number
): void {
	const barWidth = 38;
	const right = corner === 1;
	const heartX = right ? FIELD_WIDTH - 8 : 3;
	raster.stamp(HEART, { x: 0, y: 0 }, { x: heartX, y: 9 });
	const barLeft = right ? heartX - 2 - barWidth : heartX + 7;
	raster.rect(barLeft, 9, barWidth, 5, INK);
	raster.rect(barLeft + 1, 10, barWidth - 2, 3, STOCK);
	const filled = Math.round(
		(barWidth - 2) * clamp(health / Math.max(1, maxHealth), 0, 1)
	);
	const fillLeft = right ? barLeft + barWidth - 1 - filled : barLeft + 1;
	raster.rect(fillLeft, 10, filled, 3, INK);
	const breath = Math.round(
		barWidth * clamp(stamina / Math.max(1, maxStamina), 0, 1)
	);
	for (let step = 0; step < barWidth; step += 1) {
		const x = right ? barLeft + barWidth - 1 - step : barLeft + step;
		if (step < breath || step % 2 === 0) {
			raster.set(x, 15, step < breath ? INK : STOCK);
		}
	}
	const figure = String(Math.max(0, Math.ceil(health)));
	if (right) {
		text(raster, figure, barLeft - 3, 9, { align: "right" });
	} else {
		text(raster, figure, barLeft + barWidth + 3, 9);
	}
}

const NAME_LENGTH = 17;

function nameOf(host: string): string {
	return host.length > NAME_LENGTH
		? `${host.slice(0, NAME_LENGTH - 1)}.`
		: host;
}

function hud(field: Script, t: number, raster: Raster): void {
	const health = healthAt(field, t);
	const stamina = staminaAt(field, t);
	const { fighters, maxHealth, maxStamina } = field.bout;
	text(raster, nameOf(fighters[0].host), 3, 2);
	text(raster, nameOf(fighters[1].host), FIELD_WIDTH - 4, 2, {
		align: "right",
	});
	for (const corner of [0, 1] as const) {
		meter(
			raster,
			corner,
			health[corner],
			maxHealth[corner],
			stamina[corner],
			maxStamina[corner]
		);
	}
}

// Paper torn from a struck card: thrown off, falling, and left on the ground.
function scraps(field: Script, t: number, raster: Raster): void {
	for (const beat of field.beats) {
		if (beat.impact > t) {
			break;
		}
		if (beat.event.outcome !== "hit") {
			continue;
		}
		const age = t - beat.impact;
		const target = other(beat.event.actor);
		const away = FACING[beat.event.actor];
		const random = mulberry32(field.seed + beat.index * 101);
		const count = beat.event.critical ? 9 : 4;
		const originX = HOMES[target];
		const originY = GROUND - 17;
		for (let chip = 0; chip < count; chip += 1) {
			const vx = away * (0.015 + 0.05 * random()) * (random() < 0.2 ? -1 : 1);
			const vy = -(0.04 + 0.06 * random());
			const gravity = 0.00035;
			const drop = GROUND - 1 - originY;
			const landsAt = (-vy + Math.sqrt(vy * vy + 2 * gravity * drop)) / gravity;
			const flight = Math.min(age, landsAt);
			const x = clamp(originX + vx * flight, 1, FIELD_WIDTH - 2);
			const y = Math.min(
				GROUND - 1,
				originY + vy * flight + 0.5 * gravity * flight * flight
			);
			raster.set(x, y, INK);
		}
	}
}

function burst(raster: Raster, at: Point, size: number): void {
	for (const [dx, dy] of [
		[1, 0],
		[-1, 0],
		[0, 1],
		[0, -1],
	] as const) {
		raster.line(
			at.x + dx * 2,
			at.y + dy * 2,
			at.x + dx * (2 + size),
			at.y + dy * (2 + size),
			INK
		);
	}
}

const NOTE = sprite([".##", ".#.", ".#.", "##.", "##."]);

function drawShot(
	raster: Raster,
	shot: Shot,
	gear: Gear,
	at: Point,
	facing: number,
	q: number,
	t: number
): void {
	const flip = facing < 0;
	switch (shot) {
		case "arrow": {
			raster.line(at.x, at.y, at.x - facing * 6, at.y, INK);
			raster.set(at.x - facing, at.y - 1, INK);
			raster.set(at.x - facing, at.y + 1, INK);
			raster.set(at.x - facing * 6, at.y - 1, INK);
			raster.set(at.x - facing * 6, at.y + 1, INK);
			return;
		}
		case "bolt": {
			raster.line(at.x, at.y, at.x - facing * 4, at.y, INK);
			raster.line(at.x - facing, at.y - 1, at.x - facing, at.y + 1, INK);
			return;
		}
		case "bullet": {
			raster.line(at.x, at.y, at.x - facing, at.y, INK);
			return;
		}
		case "ball": {
			raster.rect(at.x - 1, at.y - 1, 3, 3, INK);
			return;
		}
		case "stone": {
			raster.rect(at.x, at.y, 2, 2, INK);
			return;
		}
		case "spin": {
			drawStrokes(raster, gear.strokes, at, q * 900, flip);
			return;
		}
		case "hurled": {
			drawStrokes(
				raster,
				gear.strokes,
				at,
				90 - 25 * Math.cos(q * Math.PI),
				flip
			);
			return;
		}
		case "note": {
			raster.stamp(
				NOTE,
				{ x: 1, y: 2 },
				{ x: at.x, y: at.y + Math.round(2 * Math.sin(q * 12)) }
			);
			return;
		}
		case "spark": {
			// Turning as it flies, with its trail behind.
			const upright = Math.floor(t / 60) % 2 === 0;
			raster.rect(at.x - 1, at.y - 1, 3, 3, STOCK);
			if (upright) {
				raster.line(at.x - 2, at.y, at.x + 2, at.y, INK);
				raster.line(at.x, at.y - 2, at.x, at.y + 2, INK);
			} else {
				raster.line(at.x - 2, at.y - 2, at.x + 2, at.y + 2, INK);
				raster.line(at.x - 2, at.y + 2, at.x + 2, at.y - 2, INK);
			}
			raster.set(at.x - facing * 5, at.y, INK);
			raster.set(at.x - facing * 8, at.y, INK);
			raster.set(at.x - facing * 11, at.y, INK);
			break;
		}
		default:
	}
}

interface Exchange {
	readonly beat: Beat;
	readonly gear: Gear;
	readonly facing: number;
	readonly attacker: Pose;
	readonly defender: Pose;
	readonly target: Corner;
}

// A shot between the hand and where the foe stood.
function inFlight(raster: Raster, exchange: Exchange, t: number): void {
	const { beat, gear, facing, attacker, target } = exchange;
	const release = beat.start + ACT_MS * RANGED_RELEASE;
	if (gear.shot === undefined || t < release || t >= beat.impact) {
		return;
	}
	const from = gripOnField(attacker, beat.event.actor);
	const toX =
		beat.event.outcome === "miss"
			? HOMES[target] + facing * 26
			: HOMES[target] - facing * 4;
	const q = (t - release) / (beat.impact - release);
	const arc = gear.shot === "stone" || gear.shot === "hurled" ? 6 : 2;
	const at = {
		x: from.x + (toX - from.x) * q,
		y: from.y + (GROUND - 18 - from.y) * q - arc * Math.sin(q * Math.PI),
	};
	drawShot(raster, gear.shot, gear, at, facing, q, t);
	const fired = gear.shot === "bullet" || gear.shot === "ball";
	if (fired && t - release < BURST_MS) {
		burst(raster, { x: from.x + facing * 3, y: from.y }, 1);
	}
}

// A lash cracking out to the foe, or past where it stood.
function crack(raster: Raster, exchange: Exchange, t: number): void {
	const { beat, gear, facing, attacker, defender, target } = exchange;
	const p = (t - beat.start) / ACT_MS;
	if (gear.motion !== "lash" || p < 0.44 || p >= 0.62) {
		return;
	}
	const from = gripOnField(attacker, beat.event.actor);
	const reach =
		beat.event.outcome === "miss"
			? HOMES[target] + facing * 6
			: defender.x - facing * 5;
	const middle = {
		x: (from.x + reach) / 2,
		y: Math.max(from.y, GROUND - 14) + 3,
	};
	raster.line(from.x, from.y, middle.x, middle.y, INK);
	raster.line(middle.x, middle.y, reach, GROUND - 18, INK);
}

// Where a blow lands: a burst, and a cut across the card for a true one.
function landing(raster: Raster, exchange: Exchange, t: number): void {
	const { beat, facing, defender } = exchange;
	const { outcome, critical } = beat.event;
	const age = t - beat.impact;
	if (outcome !== "hit" || age < 0) {
		return;
	}
	if (age < BURST_MS * (critical ? 2 : 1)) {
		burst(
			raster,
			{ x: defender.x - facing * 6, y: GROUND - 18 },
			critical ? 3 : 1
		);
	}
	if (critical && age < CRITICAL_FLASH_MS) {
		raster.line(defender.x - 8, GROUND - 33, defender.x + 8, GROUND - 10, INK);
	}
}

// Shots in the air, lashes cracking, and the marks of blows landing.
function strikes(
	field: Script,
	t: number,
	raster: Raster,
	poses: readonly [Pose, Pose]
): void {
	const index = currentIndex(field.beats, t);
	for (const beat of [field.beats[index - 1], field.beats[index]]) {
		if (beat === undefined || beat.event.outcome === "rest") {
			continue;
		}
		const { actor } = beat.event;
		const target = other(actor);
		const exchange = {
			beat,
			gear: field.gear[actor],
			facing: FACING[actor],
			attacker: poses[actor],
			defender: poses[target],
			target,
		};
		inFlight(raster, exchange, t);
		crack(raster, exchange, t);
		landing(raster, exchange, t);
	}
}

// Damage, misses and breath, rising over the fighters.
function marks(
	field: Script,
	t: number,
	raster: Raster,
	poses: readonly Pose[]
) {
	const index = currentIndex(field.beats, t);
	for (let look = Math.max(0, index - 2); look <= index; look += 1) {
		const beat = field.beats[look];
		if (beat === undefined) {
			continue;
		}
		const { actor, outcome, critical, damage } = beat.event;
		const rest = outcome === "rest";
		const age = t - (rest ? beat.start : beat.impact);
		if (age < 0 || age >= FLOAT_MS) {
			continue;
		}
		if (age > FLOAT_MS - 200 && Math.floor(age / 60) % 2 === 0) {
			continue;
		}
		const over = rest ? actor : other(actor);
		const x = poses[over]?.x ?? HOMES[over];
		const y = GROUND - 40 - Math.round(5 * easeOut(age / FLOAT_MS));
		let value = "Z";
		if (outcome === "miss") {
			value = "MISS";
		} else if (outcome === "hit") {
			value = critical ? `${damage}!` : String(damage);
		}
		outlined(raster, value, x, y);
	}
}

function gravestone(field: Script, t: number, raster: Raster): void {
	const { fallAt, bout } = field;
	if (fallAt === null || bout.winner === null) {
		return;
	}
	const age = t - fallAt - FALL_MS - LIE_MS - SINK_MS;
	if (age < 0) {
		return;
	}
	const loser = other(bout.winner);
	const x = HOMES[loser] - FACING[loser] * LYING_MIDDLE;
	const sunk = Math.round(20 * (1 - easeOut(clamp(age / RISE_MS, 0, 1))));
	const stone = new Raster(15, 19);
	stone.rect(0, 3, 15, 16, INK);
	stone.rect(1, 3, 13, 16, STOCK);
	stone.line(3, 0, 11, 0, INK);
	stone.line(1, 1, 2, 1, INK);
	stone.line(12, 1, 13, 1, INK);
	stone.rect(3, 1, 9, 2, STOCK);
	stone.set(0, 2, INK);
	stone.set(14, 2, INK);
	stone.rect(1, 2, 13, 1, STOCK);
	text(stone, "RIP", 7, 5, { align: "center" });
	stone.line(4, 13, 10, 13, INK);
	stone.line(5, 15, 9, 15, INK);
	// Rising out of the ground: what's still below it isn't drawn.
	for (let y = 0; y < stone.height; y += 1) {
		const fieldY = GROUND - stone.height + y + sunk;
		if (fieldY >= GROUND) {
			continue;
		}
		for (let column = 0; column < stone.width; column += 1) {
			const value = stone.get(column, y);
			if (value !== CLEAR) {
				raster.set(x - 7 + column, fieldY, value === INK ? INK : STOCK);
			}
		}
	}
}

// Between the meters and the fighters' heads.
const BANNER_Y = 20;

function banner(raster: Raster, lines: readonly string[], y: number): void {
	const width = Math.max(...lines.map((line) => textWidth(line)));
	const height = lines.length * 7 - 1;
	const left = Math.round(FIELD_WIDTH / 2 - width / 2) - 4;
	raster.rect(left, y - 3, width + 8, height + 6, INK);
	raster.rect(left + 1, y - 2, width + 6, height + 4, STOCK);
	for (const [index, line] of lines.entries()) {
		text(raster, line, FIELD_WIDTH / 2, y + index * 7, { align: "center" });
	}
}

function verdict(field: Script, t: number, raster: Raster): void {
	if (t < INTRO_MS) {
		banner(raster, [`BOUT ${field.bout.number}`], BANNER_Y);
		return;
	}
	const { fallAt, bout, beats } = field;
	if (bout.winner !== null && fallAt !== null) {
		if (t >= fallAt + FALL_MS + VERDICT_DELAY_MS) {
			banner(
				raster,
				[`${nameOf(bout.fighters[bout.winner].host)} KEEPS THE FIELD`],
				BANNER_Y
			);
		}
		return;
	}
	const last = beats.at(-1);
	if (last !== undefined && t >= last.end + VERDICT_DELAY_MS) {
		banner(raster, ["NEITHER YIELDS"], BANNER_Y);
	}
}

function shakeAt(field: Script, t: number): Point {
	const index = currentIndex(field.beats, t);
	for (const beat of [field.beats[index - 1], field.beats[index]]) {
		if (beat?.event.outcome !== "hit" || !beat.event.critical) {
			continue;
		}
		const age = t - beat.impact;
		if (age >= 0 && age < SHAKE_MS) {
			const flip = Math.floor(age / 40) % 2 === 0 ? 1 : -1;
			return { x: flip, y: -flip };
		}
	}
	return { x: 0, y: 0 };
}

export interface Stage {
	readonly raster: Raster;
	readonly local: Raster;
	readonly looks: readonly [Look, Look];
	readonly backdrop: Raster;
}

// Each card's tears fall in their own order.
const TEAR_SEED_STEP = 7919;

function numeralFor(numeral: string, mirrored: boolean): Raster {
	const width = textWidth(numeral, true);
	const set = new Raster(width, GLYPH_ROWS);
	text(set, numeral, 0, 0, { numerals: true });
	if (!mirrored) {
		return set;
	}
	const backwards = new Raster(width, GLYPH_ROWS);
	backwards.stamp(set, { x: width - 1, y: 0 }, { x: 0, y: 0 }, { flip: true });
	return backwards;
}

function lookOf(field: Script, corner: Corner): Look {
	return {
		numeral: numeralFor(
			trumpAt(field.bout.fighters[corner].trump).numeral,
			corner === 1
		),
		gear: field.gear[corner],
		tears: tearOrder(field.seed + corner * TEAR_SEED_STEP),
		torn: 0,
	};
}

// What can be drawn once for a bout and reused every frame.
export function stage(field: Script): Stage {
	const backdrop = new Raster(FIELD_WIDTH, FIELD_HEIGHT);
	scenery(backdrop, field.seed);
	return {
		raster: new Raster(FIELD_WIDTH, FIELD_HEIGHT),
		local: new Raster(LOCAL.width, LOCAL.height),
		looks: [lookOf(field, 0), lookOf(field, 1)],
		backdrop,
	};
}

// The whole field at time t. Returns how far the frame is jolted, for a
// blow struck true.
export function drawField(field: Script, view: Stage, t: number): Point {
	const { raster, local, looks, backdrop } = view;
	raster.pixels.set(backdrop.pixels);
	const poses = [poseAt(field, 0, t), poseAt(field, 1, t)] as const;
	const health = healthAt(field, t);
	gravestone(field, t, raster);
	scraps(field, t, raster);
	// The fighter on the move is drawn last, so its blow crosses the other.
	const beat = field.beats[currentIndex(field.beats, t)];
	const front: Corner =
		beat !== undefined && t < beat.end ? beat.event.actor : 0;
	for (const corner of [other(front), front]) {
		const pose = poses[corner];
		const fallen =
			1 - health[corner] / Math.max(1, field.bout.maxHealth[corner]);
		const look = { ...looks[corner], torn: Math.round(MAX_TEARS * fallen) };
		drawFighter(local, look, pose, t);
		// Turned about its feet, a falling card is lifted by half its width,
		// so it comes to lie on the ground rather than half under it.
		const rest = Math.round(
			(BODY.width / 2) * Math.abs(Math.sin(pose.fall * DEGREES))
		);
		raster.stamp(
			local,
			PIVOT,
			{ x: pose.x, y: GROUND - pose.lift - rest + pose.sink },
			{
				flip: corner === 1,
				angle: pose.fall,
				invert: pose.invert,
				above: GROUND,
			}
		);
	}
	strikes(field, t, raster, poses);
	marks(field, t, raster, poses);
	hud(field, t, raster);
	verdict(field, t, raster);
	return shakeAt(field, t);
}
