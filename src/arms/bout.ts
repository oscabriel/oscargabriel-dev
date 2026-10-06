import { chronicle, toolIn } from "@/arms/chronicle";
import type { FighterTale, Paragraph } from "@/arms/chronicle";
import { duel } from "@/arms/duel";
import type { Corner, TurnEvent } from "@/arms/duel";
import type { Sheet } from "@/arms/forge";
import { fnv1a } from "@/arms/host";
import type { Character } from "@/arms/set-world";

// Two sites' arms set against each other. Nothing is stored: the same two
// hosts and bout number always tell the same fight.

export interface Contender extends FighterTale {
	readonly attributes: Readonly<Record<string, number>>;
}

export function contender(
	host: string,
	character: typeof Character.Type,
	sheet: Sheet
): Contender {
	// A crafted mainhand that beat the born one is the one carried.
	const craftedTool =
		sheet.craft?.item.slot === "tool" && sheet.craft.replaces !== null
			? sheet.craft.item.name
			: null;
	const weapon = craftedTool ?? character.equipment.tool.name;
	return {
		host,
		className: character.class.name,
		weapon,
		mainhand: toolIn(weapon) ?? character.class.mainhand,
		attributes: sheet.attributes,
	};
}

export interface Fight {
	readonly bout: number;
	readonly winner: Corner | null;
	readonly turns: number;
	readonly health: readonly [number, number];
	readonly maxHealth: readonly [number, number];
	readonly maxStamina: readonly [number, number];
	// Every turn, for playing the bout out.
	readonly events: readonly TurnEvent[];
	readonly paragraphs: readonly Paragraph[];
}

export function fight(
	challenger: Contender,
	defender: Contender,
	bout: number
): Fight {
	const seed = fnv1a(`${challenger.host}|${defender.host}|${bout}`);
	const result = duel(challenger.attributes, defender.attributes, seed);
	return {
		bout,
		winner: result.winner,
		turns: result.events.length,
		health: result.health,
		maxHealth: result.maxHealth,
		maxStamina: result.maxStamina,
		events: result.events,
		// The words have their own seed, so retelling never changes the fight.
		paragraphs: chronicle(
			result,
			[challenger, defender],
			fnv1a(`${seed}|words`)
		),
	};
}
