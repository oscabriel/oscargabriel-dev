import { deriveSeed } from "@/arms/host";

// The deck the cards are drawn from: the 22 trumps of the Rider–Waite–Smith
// tarot, drawn by Pamela Colman Smith (William Rider & Son, 1909; public
// domain). Each site is dealt one. The judge draws it from what the site
// shows; a site rolled by fate alone gets the one its seed falls on. The
// pictures are cut by scripts/deck.ts.

export interface Trump {
	readonly numeral: string;
	readonly name: string;
	// Waite's upright meanings, said shortly: what the judge reads it by.
	readonly meaning: string;
}

// In the deck's own order, with Strength at VIII and Justice at XI as Waite
// numbered them.
export const TRUMPS = [
	{
		numeral: "0",
		name: "The Fool",
		meaning: "beginnings, a leap, trust in the road",
	},
	{
		numeral: "I",
		name: "The Magician",
		meaning: "will and skill, making it happen",
	},
	{
		numeral: "II",
		name: "The High Priestess",
		meaning: "hidden knowledge, intuition, the unsaid",
	},
	{
		numeral: "III",
		name: "The Empress",
		meaning: "abundance, nurture, making things grow",
	},
	{
		numeral: "IV",
		name: "The Emperor",
		meaning: "order, structure, authority",
	},
	{
		numeral: "V",
		name: "The Hierophant",
		meaning: "tradition, teaching, the established way",
	},
	{
		numeral: "VI",
		name: "The Lovers",
		meaning: "union, choice, values held together",
	},
	{
		numeral: "VII",
		name: "The Chariot",
		meaning: "drive, control, victory by will",
	},
	{
		numeral: "VIII",
		name: "Strength",
		meaning: "patience, courage, gentle mastery",
	},
	{
		numeral: "IX",
		name: "The Hermit",
		meaning: "solitude, study, a light for others",
	},
	{
		numeral: "X",
		name: "Wheel of Fortune",
		meaning: "cycles, chance, turning points",
	},
	{
		numeral: "XI",
		name: "Justice",
		meaning: "fairness, clarity, cause and effect",
	},
	{
		numeral: "XII",
		name: "The Hanged Man",
		meaning: "pause, surrender, a new angle",
	},
	{
		numeral: "XIII",
		name: "Death",
		meaning: "endings, change, clearing the way",
	},
	{
		numeral: "XIV",
		name: "Temperance",
		meaning: "balance, moderation, mixing well",
	},
	{
		numeral: "XV",
		name: "The Devil",
		meaning: "appetite, attachment, the shadow",
	},
	{
		numeral: "XVI",
		name: "The Tower",
		meaning: "upheaval, sudden change, revelation",
	},
	{
		numeral: "XVII",
		name: "The Star",
		meaning: "hope, renewal, quiet inspiration",
	},
	{
		numeral: "XVIII",
		name: "The Moon",
		meaning: "dreams, illusion, the uncanny",
	},
	{
		numeral: "XIX",
		name: "The Sun",
		meaning: "joy, clarity, success in the open",
	},
	{
		numeral: "XX",
		name: "Judgement",
		meaning: "awakening, reckoning, a calling",
	},
	{
		numeral: "XXI",
		name: "The World",
		meaning: "completion, wholeness, a journey done",
	},
] as const satisfies readonly Trump[];

// Past the candidates' and the craft's seeds.
const TRUMP_SEED_INDEX = 2000;

export function isTrump(index: number): boolean {
	return Number.isInteger(index) && index >= 0 && index < TRUMPS.length;
}

export function trumpAt(index: number): Trump {
	return TRUMPS[index] ?? TRUMPS[0];
}

// The trump a site's seed falls on, for arms rolled by fate alone.
export function fatedTrump(seed: number): number {
	return deriveSeed(seed, TRUMP_SEED_INDEX) % TRUMPS.length;
}

// The picture, served from public/.
export function trumpArt(index: number): string {
	return `/arms/trumps/${String(index).padStart(2, "0")}.png`;
}

// The cut picture's own size, in its pixels.
export const TRUMP_ART = { width: 160, height: 260 } as const;

// The trump a site holds: the judge's draw, or fate's when there was none.
export function dealtTrump(
	reading: { readonly trump?: { readonly index: number } } | null,
	seed: number
): number {
	return reading?.trump?.index ?? fatedTrump(seed);
}
