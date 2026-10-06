// One-bit drawing for the field a bout is played on. Everything is set
// pixel by pixel into a small raster of stock and ink, then the canvas is
// enlarged without smoothing, so every line stays a printed line.

// Nothing set: whatever is behind shows through.
export const CLEAR = 0;
// The card's stock, painted over what's behind.
export const STOCK = 1;
export const INK = 2;

export type Pixel = typeof CLEAR | typeof STOCK | typeof INK;

export interface Point {
	readonly x: number;
	readonly y: number;
}

export interface StampOptions {
	// Mirrored left to right before turning.
	readonly flip?: boolean;
	// Degrees clockwise about the pivot.
	readonly angle?: number;
	// Stock and ink trade places: a fighter struck.
	readonly invert?: boolean;
	// Nothing is drawn on or below this row: the ground hides it.
	readonly above?: number;
}

const DEGREES = Math.PI / 180;

// A drawn pixel as it lands: stock and ink trade places when inverted.
function swap(value: number, invert: boolean): Pixel {
	if (value === INK) {
		return invert ? STOCK : INK;
	}
	return invert ? INK : STOCK;
}

export class Raster {
	readonly width: number;
	readonly height: number;
	readonly pixels: Uint8Array;

	constructor(width: number, height: number) {
		this.width = width;
		this.height = height;
		this.pixels = new Uint8Array(width * height);
	}

	clear(): void {
		this.pixels.fill(CLEAR);
	}

	get(x: number, y: number): number {
		const column = Math.round(x);
		const row = Math.round(y);
		if (column < 0 || row < 0 || column >= this.width || row >= this.height) {
			return CLEAR;
		}
		return this.pixels[row * this.width + column] ?? CLEAR;
	}

	set(x: number, y: number, value: Pixel): void {
		const column = Math.round(x);
		const row = Math.round(y);
		if (column < 0 || row < 0 || column >= this.width || row >= this.height) {
			return;
		}
		this.pixels[row * this.width + column] = value;
	}

	rect(x: number, y: number, width: number, height: number, value: Pixel) {
		for (let row = 0; row < height; row += 1) {
			for (let column = 0; column < width; column += 1) {
				this.set(x + column, y + row, value);
			}
		}
	}

	// Bresenham's line, between rounded ends.
	line(x0: number, y0: number, x1: number, y1: number, value: Pixel): void {
		let x = Math.round(x0);
		let y = Math.round(y0);
		const endX = Math.round(x1);
		const endY = Math.round(y1);
		const dx = Math.abs(endX - x);
		const dy = -Math.abs(endY - y);
		const stepX = x < endX ? 1 : -1;
		const stepY = y < endY ? 1 : -1;
		let error = dx + dy;
		for (;;) {
			this.set(x, y, value);
			if (x === endX && y === endY) {
				return;
			}
			const doubled = 2 * error;
			if (doubled >= dy) {
				error += dy;
				x += stepX;
			}
			if (doubled <= dx) {
				error += dx;
				y += stepY;
			}
		}
	}

	// Another raster's set pixels, with its `pivot` placed at `at`.
	stamp(
		source: Raster,
		pivot: Point,
		at: Point,
		{
			flip = false,
			angle = 0,
			invert = false,
			above = Number.POSITIVE_INFINITY,
		}: StampOptions = {}
	): void {
		if (angle === 0) {
			this.stampUpright(source, pivot, at, { flip, invert, above });
			return;
		}
		const cos = Math.cos(-angle * DEGREES);
		const sin = Math.sin(-angle * DEGREES);
		const reach = Math.ceil(Math.hypot(source.width, source.height));
		const originX = Math.round(at.x);
		const originY = Math.round(at.y);
		for (let dy = -reach; dy <= reach; dy += 1) {
			for (let dx = -reach; dx <= reach; dx += 1) {
				// Back from the page to the source: unturn, then unmirror.
				const turnedX = dx * cos - dy * sin;
				const turnedY = dx * sin + dy * cos;
				const value = source.get(
					pivot.x + (flip ? -turnedX : turnedX),
					pivot.y + turnedY
				);
				if (value !== CLEAR && originY + dy < above) {
					this.set(originX + dx, originY + dy, swap(value, invert));
				}
			}
		}
	}

	// Unturned, the source's pixels map straight across.
	private stampUpright(
		source: Raster,
		pivot: Point,
		at: Point,
		{ flip, invert, above }: { flip: boolean; invert: boolean; above: number }
	): void {
		const originX = Math.round(at.x);
		const originY = Math.round(at.y);
		for (let y = 0; y < source.height; y += 1) {
			for (let x = 0; x < source.width; x += 1) {
				const value = source.pixels[y * source.width + x] ?? CLEAR;
				const row = originY + y - pivot.y;
				if (value !== CLEAR && row < above) {
					const dx = flip ? pivot.x - x : x - pivot.x;
					this.set(originX + dx, row, swap(value, invert));
				}
			}
		}
	}
}

// A drawing as rows: "#" ink, "o" stock, anything else clear.
export function sprite(rows: readonly string[]): Raster {
	const raster = new Raster(rows[0]?.length ?? 0, rows.length);
	for (const [y, row] of rows.entries()) {
		for (let x = 0; x < row.length; x += 1) {
			const mark = row.charAt(x);
			if (mark === "#") {
				raster.set(x, y, INK);
			} else if (mark === "o") {
				raster.set(x, y, STOCK);
			}
		}
	}
	return raster;
}

// Three by five capitals, figures and a little punctuation.
const GLYPH_ROWS = {
	A: [".#.", "#.#", "###", "#.#", "#.#"],
	B: ["##.", "#.#", "##.", "#.#", "##."],
	C: [".##", "#..", "#..", "#..", ".##"],
	D: ["##.", "#.#", "#.#", "#.#", "##."],
	E: ["###", "#..", "##.", "#..", "###"],
	F: ["###", "#..", "##.", "#..", "#.."],
	G: [".##", "#..", "#.#", "#.#", ".##"],
	H: ["#.#", "#.#", "###", "#.#", "#.#"],
	I: ["###", ".#.", ".#.", ".#.", "###"],
	J: ["..#", "..#", "..#", "#.#", ".#."],
	K: ["#.#", "#.#", "##.", "#.#", "#.#"],
	L: ["#..", "#..", "#..", "#..", "###"],
	M: ["#.#", "###", "###", "#.#", "#.#"],
	N: ["##.", "#.#", "#.#", "#.#", "#.#"],
	O: [".#.", "#.#", "#.#", "#.#", ".#."],
	P: ["##.", "#.#", "##.", "#..", "#.."],
	Q: [".#.", "#.#", "#.#", "##.", ".##"],
	R: ["##.", "#.#", "##.", "#.#", "#.#"],
	S: [".##", "#..", ".#.", "..#", "##."],
	T: ["###", ".#.", ".#.", ".#.", ".#."],
	U: ["#.#", "#.#", "#.#", "#.#", "###"],
	V: ["#.#", "#.#", "#.#", "#.#", ".#."],
	W: ["#.#", "#.#", "###", "###", "#.#"],
	X: ["#.#", "#.#", ".#.", "#.#", "#.#"],
	Y: ["#.#", "#.#", ".#.", ".#.", ".#."],
	Z: ["###", "..#", ".#.", "#..", "###"],
	"0": ["###", "#.#", "#.#", "#.#", "###"],
	"1": [".#.", "##.", ".#.", ".#.", "###"],
	"2": ["##.", "..#", ".#.", "#..", "###"],
	"3": ["##.", "..#", ".#.", "..#", "##."],
	"4": ["#.#", "#.#", "###", "..#", "..#"],
	"5": ["###", "#..", "##.", "..#", "##."],
	"6": [".##", "#..", "###", "#.#", "###"],
	"7": ["###", "..#", ".#.", ".#.", ".#."],
	"8": ["###", "#.#", "###", "#.#", "###"],
	"9": ["###", "#.#", "###", "..#", "##."],
	".": [".", ".", ".", ".", "#"],
	"-": ["...", "...", "###", "...", "..."],
	"!": ["#", "#", "#", ".", "#"],
	"'": ["#", "#", ".", ".", "."],
	" ": ["..", "..", "..", "..", ".."],
} as const satisfies Record<string, readonly string[]>;

const GLYPHS = new Map<string, readonly string[]>(Object.entries(GLYPH_ROWS));

// The numerals on a card's body: the I is a single stroke, so XVIII fits.
const NUMERAL_GLYPHS = new Map<string, readonly string[]>([
	["0", GLYPH_ROWS["0"]],
	["I", ["#", "#", "#", "#", "#"]],
	["V", GLYPH_ROWS.V],
	["X", GLYPH_ROWS.X],
	["L", GLYPH_ROWS.L],
]);

const SPRITES = new Map<string, Raster>();

function glyph(
	set: ReadonlyMap<string, readonly string[]>,
	mark: string
): Raster {
	const rows = set.get(mark) ?? GLYPH_ROWS[" "];
	const key = rows.join("/");
	let drawn = SPRITES.get(key);
	if (drawn === undefined) {
		drawn = sprite(rows);
		SPRITES.set(key, drawn);
	}
	return drawn;
}

// The field's type has capitals only, and only ASCII.
function marks(value: string): string[] {
	const upper = value.toUpperCase();
	const found: string[] = [];
	for (let index = 0; index < upper.length; index += 1) {
		found.push(upper.charAt(index));
	}
	return found;
}

export function textWidth(value: string, numerals = false): number {
	const set = numerals ? NUMERAL_GLYPHS : GLYPHS;
	const widths = marks(value).map((mark) => glyph(set, mark).width);
	return widths.reduce((sum, width) => sum + width, 0) + widths.length - 1;
}

export type Align = "left" | "center" | "right";

// Text set in ink, with its top edge at y.
export function text(
	raster: Raster,
	value: string,
	x: number,
	y: number,
	{
		align = "left",
		numerals = false,
	}: { align?: Align; numerals?: boolean } = {}
): void {
	const set = numerals ? NUMERAL_GLYPHS : GLYPHS;
	const width = textWidth(value, numerals);
	let left = Math.round(x);
	if (align === "center") {
		left = Math.round(x - width / 2);
	} else if (align === "right") {
		left = Math.round(x - width + 1);
	}
	for (const mark of marks(value)) {
		const drawn = glyph(set, mark);
		raster.stamp(drawn, { x: 0, y: 0 }, { x: left, y });
		left += drawn.width + 1;
	}
}
