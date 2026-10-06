import { useState } from "react";
import type { PointerEvent } from "react";

import { TRUMP_ART, trumpArt, trumpAt } from "@/arms/arcana";
import { STATS } from "@/arms/set-world";
import type { Stat } from "@/arms/set-world";

// A site's arms as a card: the trump it was dealt on the front, printed in
// the site's ink on old stock, and the character on the back. Sizes are in
// container units, so one card reads the same at any width.

const STAT_SHORT: Readonly<Record<Stat, string>> = {
	strength: "Str",
	dexterity: "Dex",
	intelligence: "Int",
	wisdom: "Wis",
	agility: "Agi",
	vitality: "Vit",
	perception: "Per",
	resolve: "Res",
	luck: "Luck",
};

// How far the card tips under the pointer, at its edges.
const TILT_X_DEG = 10;
const TILT_Y_DEG = 14;

const numberFormat = new Intl.NumberFormat("en-US");

// A skill's flavour runs to a paragraph; the card has room for its opening.
const CLAUSE_END = /[,;:—]/u;

function firstClause(flavor: string): string {
	return flavor.split(CLAUSE_END)[0]?.trim() ?? flavor;
}

export interface CardFront {
	readonly host: string;
	readonly trump: number;
}

export interface CardBack {
	readonly className: string;
	readonly stats: Readonly<Record<Stat, number>>;
	readonly skills: readonly {
		readonly name: string;
		readonly flavor: string;
	}[];
	readonly blessings: readonly string[];
	readonly curses: readonly string[];
	readonly weapon: string;
	readonly powerRating: number;
}

function Front({ host, trump }: CardFront) {
	const { numeral } = trumpAt(trump);
	return (
		<span className="arms-card-face">
			<span className="arms-card-frame">
				<span className="arms-card-numeral">{numeral}</span>
				<img
					src={trumpArt(trump)}
					alt=""
					width={TRUMP_ART.width}
					height={TRUMP_ART.height}
					className="arms-card-art"
				/>
				<span className="arms-card-name">{host}</span>
			</span>
		</span>
	);
}

function Back({ trump, back }: { trump: number; back: CardBack }) {
	const { numeral, name } = trumpAt(trump);
	return (
		<span className="arms-card-face arms-card-back">
			<span className="arms-card-frame arms-card-reverse">
				<span className="arms-card-class">{back.className}</span>
				<span className="arms-card-drawn">
					{numeral}, {name}
				</span>

				<span className="arms-card-stats">
					{STATS.map((stat) => (
						<span key={stat} className="arms-card-stat">
							{back.stats[stat]}
							<span className="arms-card-label">{STAT_SHORT[stat]}</span>
						</span>
					))}
				</span>

				<span className="arms-card-lore">
					{back.skills.map((skill) => (
						<span key={skill.name} className="arms-card-skill">
							{skill.name}
							<span className="arms-card-flavor">
								{firstClause(skill.flavor)}
							</span>
						</span>
					))}
					{back.blessings.map((blessing) => (
						<span key={blessing} className="arms-card-trait">
							<span className="arms-card-trait-label">Blessed </span>
							{blessing}
						</span>
					))}
					{back.curses.map((curse) => (
						<span key={curse} className="arms-card-trait">
							<span className="arms-card-trait-label">Cursed </span>
							{curse}
						</span>
					))}
				</span>

				<span className="arms-card-weapon">{back.weapon}</span>
				<span className="arms-card-power">
					Power {numberFormat.format(back.powerRating)}
				</span>
			</span>
		</span>
	);
}

// The front alone, as the roll lays it out.
export function ArmsCard({
	host,
	trump,
	className,
}: CardFront & { className?: string }) {
	return (
		<span aria-hidden="true" className={`arms-card ${className ?? ""}`}>
			<span className="arms-card-tilt">
				<span className="arms-card-inner">
					<Front host={host} trump={trump} />
				</span>
			</span>
		</span>
	);
}

function tilt(event: PointerEvent<HTMLElement>) {
	if (event.pointerType === "touch") {
		return;
	}
	const card = event.currentTarget;
	const box = card.getBoundingClientRect();
	const x = (event.clientX - box.left) / box.width;
	const y = (event.clientY - box.top) / box.height;
	card.style.setProperty("--tilt-x", `${(0.5 - y) * 2 * TILT_X_DEG}deg`);
	card.style.setProperty("--tilt-y", `${(x - 0.5) * 2 * TILT_Y_DEG}deg`);
	card.style.setProperty("--glare-x", `${x * 100}%`);
	card.style.setProperty("--glare-y", `${y * 100}%`);
	card.style.setProperty("--glare", "1");
}

function settle(event: PointerEvent<HTMLElement>) {
	const card = event.currentTarget;
	for (const property of ["--tilt-x", "--tilt-y", "--glare"]) {
		card.style.removeProperty(property);
	}
}

// Both sides, held in the hand: it tips toward the pointer and turns over
// when pressed. The sheet beside it says everything the card does, so the
// card itself is only a button to the reader that hears the page.
export function TurnableCard({
	host,
	trump,
	back,
	className,
}: CardFront & { back: CardBack; className?: string }) {
	const [turned, setTurned] = useState(false);
	return (
		<button
			type="button"
			aria-pressed={turned}
			aria-label={`Turn ${host}’s card over`}
			onClick={() => {
				setTurned((was) => !was);
			}}
			onPointerMove={tilt}
			onPointerLeave={settle}
			className={`arms-card cursor-pointer text-left focus-visible:outline-offset-8 ${className ?? ""}`}
		>
			<span aria-hidden="true" className="arms-card-tilt">
				<span className="arms-card-inner" data-turned={turned}>
					<Front host={host} trump={trump} />
					<Back trump={trump} back={back} />
				</span>
			</span>
		</button>
	);
}
