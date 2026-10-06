import type { Bout, Corner, TurnEvent } from "@/arms/duel";
import { mulberry32 } from "@/arms/duel";

// A bout told as a page of the book. Set has no words for blows, so the verbs
// here follow the motion its Anima System gives each mainhand (skill
// anima-derived-combat); the fighters are named by host, in small caps, the
// way a play names its speakers.

export type Run = { readonly name: Corner } | { readonly text: string };
export type Paragraph = readonly Run[];

export interface FighterTale {
	readonly host: string;
	readonly className: string;
	// The full name of what's in hand, e.g. "fine silver spear of the joyful".
	readonly weapon: string;
	// The base type, e.g. "spear".
	readonly mainhand: string;
}

// Set's own scheduling windows: one paragraph per five seconds of fight.
const WINDOW_MS = 5000;

const TOOLS_BY_ACTION = [
	["aim", "recurve bow|bow|longbow|shortbow|composite bow"],
	[
		"bash",
		"quarterstaff|crowbar|club|cudgel|truncheon|stick|cane|staff|jo|baton|tonfa|tetsubo|macana|jutte",
	],
	["blast", "hand cannon"],
	[
		"chop",
		"bill|axe|hatchet|cleaver|tabar|hammer|maul|morningstar|tree trunk|mace|bardiche|voulge|ice pick|pickaxe|halberd|kukri|patu",
	],
	["fire", "arbalest|crossbow|ballista"],
	["flick", "rod|wand|scepter"],
	["gaze", "eye"],
	["gunfire", "rifle"],
	["hurl", "javelin|pilum"],
	["jab", "talon|claw|fang|knuckle|katar|bands|cestus|pata"],
	["lash", "whip|chain|rope|dart|urumi"],
	["play", "flute"],
	["repulse", "orb"],
	["return", "boomerang|chakram"],
	["rupture", "tome|grimoire"],
	[
		"shieldBash",
		"small shield|pavise|heater shield|door|rondache|targe|buckler",
	],
	["skewer", "harpoon"],
	[
		"slash",
		"falchion|guisarme|shotel|longsword|shortsword|broadsword|flamberge|saber|talwar|sickle|sword|scimitar|katana|knife|blade|scythe|glaive|bokken|naginata|torch|falcata|khopesh|nodachi|karambit|dao|nagamaki|claymore|fauchard|shashka|seax|messer|tachi|balisong|kopis",
	],
	["strum", "harp"],
	["throw", "francisca|kunai|tomahawk|mambele|chair"],
	[
		"thrust",
		"estoc|rapier|dirk|dagger|kris|partizan|stiletto|poignard|rondel|spear|trident|spetum|pike|spike|lance|gladius|cinquedea|sai|yari|jian|assegai|ranseur|corseque|pugio|xiphos|sarissa|goad|tanto|iklwa",
	],
	["twirl", "nunchaku"],
	["whirl", "sling"],
] as const;

export type Action = (typeof TOOLS_BY_ACTION)[number][0];

const ACTION_BY_TOOL = new Map<string, Action>(
	TOOLS_BY_ACTION.flatMap(([action, tools]) =>
		tools.split("|").map((tool) => [tool, action] as const)
	)
);

// "… at" phrases: the attacker comes before, the target after.
const VERBS: Readonly<Record<Action, readonly string[]>> = {
	aim: ["looses an arrow at", "draws and looses at"],
	bash: ["swings the {mainhand} at", "brings the {mainhand} round at"],
	blast: ["fires the hand cannon at"],
	chop: ["brings the {mainhand} down on", "hacks at"],
	fire: ["looses a bolt at", "sends a bolt at"],
	flick: ["flicks the {mainhand} at", "points the {mainhand} at"],
	gaze: ["turns the eye on"],
	gunfire: ["fires on"],
	hurl: ["hurls the {mainhand} at"],
	jab: ["jabs at", "rakes at"],
	lash: ["lashes at", "cracks the {mainhand} at"],
	play: ["plays the flute at"],
	repulse: ["raises the orb against"],
	return: ["sends the {mainhand} spinning at"],
	rupture: ["reads from the {mainhand} against"],
	shieldBash: ["drives the {mainhand} into", "shoves the {mainhand} at"],
	skewer: ["casts the harpoon at"],
	slash: ["slashes at", "cuts at", "sweeps the {mainhand} at"],
	strum: ["strums the harp at"],
	throw: ["throws the {mainhand} at"],
	thrust: ["thrusts at", "lunges at", "drives the {mainhand} at"],
	twirl: ["whirls the nunchaku at"],
	whirl: ["whirls the sling at"],
};

const VOWEL_START = /^[aeiou]/iu;
const MAINHAND_SLOT = /\{mainhand\}/gu;

function article(phrase: string): string {
	return VOWEL_START.test(phrase) ? `an ${phrase}` : `a ${phrase}`;
}

// The base type inside an item's name: the longest known tool it contains.
export function toolIn(itemName: string): string | null {
	const words = ` ${itemName.toLowerCase()} `;
	let found: string | null = null;
	for (const tool of ACTION_BY_TOOL.keys()) {
		if (
			words.includes(` ${tool} `) &&
			(found === null || tool.length > found.length)
		) {
			found = tool;
		}
	}
	return found;
}

interface Teller {
	readonly pick: <T>(options: readonly T[]) => T;
}

function teller(seed: number): Teller {
	const random = mulberry32(seed);
	return {
		pick: (options) => {
			const option = options[Math.floor(random() * options.length)];
			if (option === undefined) {
				throw new Error("Nothing to pick from");
			}
			return option;
		},
	};
}

// How a mainhand is used, after Set's Anima System; anything unknown is
// swung like a club.
export function actionOf(mainhand: string): Action {
	return ACTION_BY_TOOL.get(mainhand) ?? "bash";
}

// The plainest way to say a blow, for a running log.
export function strikeVerb(mainhand: string): string {
	const [first = "strikes at"] = VERBS[actionOf(mainhand)];
	return first.replace(MAINHAND_SLOT, mainhand);
}

function verb(tale: FighterTale, tell: Teller): string {
	return tell
		.pick(VERBS[actionOf(tale.mainhand)])
		.replace(MAINHAND_SLOT, tale.mainhand);
}

function other(corner: Corner): Corner {
	return corner === 0 ? 1 : 0;
}

function name(corner: Corner): Run {
	return { name: corner };
}

function text(value: string): Run {
	return { text: value };
}

function opening(tales: readonly [FighterTale, FighterTale]): Paragraph {
	return [
		name(0),
		text(`, ${article(tales[0].className)}, meets `),
		name(1),
		text(`, ${article(tales[1].className)}. `),
		name(0),
		text(` carries ${article(tales[0].weapon)}; `),
		name(1),
		text(`, ${article(tales[1].weapon)}.`),
	];
}

function telling(
	event: TurnEvent,
	tales: readonly [FighterTale, FighterTale],
	tell: Teller,
	isLast: boolean
): Run[] {
	const { actor } = event;
	const target = other(actor);
	const strike = [
		name(actor),
		text(` ${verb(tales[actor], tell)} `),
		name(target),
	];

	if (event.outcome === "miss") {
		return [
			...strike,
			text(tell.pick([", who slips aside. ", " and finds only air. "])),
		];
	}
	if (isLast && event.healthAfter === 0) {
		return [
			...strike,
			text(` for ${event.damage}, and `),
			name(target),
			text(" falls. "),
		];
	}
	if (event.critical) {
		return [
			...strike,
			text(
				tell.pick([
					` and finds the gap, for ${event.damage}. `,
					`, a true blow: ${event.damage}. `,
				])
			),
		];
	}
	return [
		...strike,
		text(
			tell.pick([
				` for ${event.damage}. `,
				`, and it lands for ${event.damage}. `,
				` and draws ${event.damage}. `,
			])
		),
	];
}

function closing(
	bout: Bout,
	tales: readonly [FighterTale, FighterTale]
): Paragraph {
	const { winner } = bout;
	if (winner === null) {
		return [
			text("Dusk ends it with neither yielding: "),
			name(0),
			text(` stands at ${bout.health[0]}, `),
			name(1),
			text(` at ${bout.health[1]}.`),
		];
	}
	return [
		name(winner),
		text(
			` keeps the field, the ${tales[winner].className.toLowerCase()} with ${bout.health[winner]} of ${bout.maxHealth[winner]} health left.`
		),
	];
}

export function chronicle(
	bout: Bout,
	tales: readonly [FighterTale, FighterTale],
	seed: number
): Paragraph[] {
	const tell = teller(seed);
	const paragraphs: Paragraph[] = [opening(tales)];
	let current: Run[] = [];
	let window = 0;
	// A fighter catching breath is told once a paragraph, not every turn.
	const rested = new Set<Corner>();

	for (const [index, event] of bout.events.entries()) {
		const eventWindow = Math.floor(event.atMs / WINDOW_MS);
		if (eventWindow !== window && current.length > 0) {
			paragraphs.push(current);
			current = [];
			rested.clear();
		}
		window = eventWindow;

		if (event.outcome === "rest") {
			if (!rested.has(event.actor)) {
				rested.add(event.actor);
				current.push(
					name(event.actor),
					text(
						tell.pick([" gives ground to catch breath. ", " draws breath. "])
					)
				);
			}
			continue;
		}
		current.push(
			...telling(event, tales, tell, index === bout.events.length - 1)
		);
	}
	if (current.length > 0) {
		paragraphs.push(current);
	}
	paragraphs.push(closing(bout, tales));
	return paragraphs;
}
