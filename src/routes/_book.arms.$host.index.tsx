import { ORPCError } from "@orpc/client";
import type { InferRouterOutputs } from "@orpc/server";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { CALLINGS, JUDGED_STATS, TOP_SCORE } from "@/arms/judge";
import type { JudgedStat } from "@/arms/judge";
import { SLOTS, STATS } from "@/arms/set-world";
import type { Slot, Stat } from "@/arms/set-world";
import { LinkOut } from "@/components/link-out";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { orpc } from "@/rpc/client";
import type { router } from "@/rpc/router";

export const Route = createFileRoute("/_book/arms/$host/")({
	loader: async ({ context, params }) => {
		try {
			const arms = await context.queryClient.query(
				orpc.arms.sheet.queryOptions({ input: { host: params.host } })
			);
			return {
				className: arms.character.class.name,
				flavor: arms.character.class.flavor,
			};
		} catch (error) {
			if (error instanceof ORPCError && error.code === "NOT_FOUND") {
				throw notFound();
			}
			throw error;
		}
	},
	head: ({ loaderData, params }) => {
		if (loaderData === undefined) {
			return {};
		}
		const title = `${params.host}, ${loaderData.className} | Roll of Arms`;
		const url = `${SITE_URL}/arms/${params.host}`;
		return {
			meta: [
				{ title: `${title} | ${SITE_NAME}` },
				{ name: "description", content: `${loaderData.flavor}.` },
				{ property: "og:title", content: title },
				{ property: "og:description", content: `${loaderData.flavor}.` },
				{ property: "og:url", content: url },
			],
			links: [{ rel: "canonical", href: url }],
		};
	},
	component: SheetPage,
	notFoundComponent: ArmsNotFound,
});

const numberFormat = new Intl.NumberFormat("en-US");
const dayFormat = new Intl.DateTimeFormat("en-US", {
	year: "numeric",
	month: "long",
	day: "numeric",
	timeZone: "America/Los_Angeles",
});

const STAT_LABELS: Readonly<Record<Stat, string>> = {
	strength: "Strength",
	dexterity: "Dexterity",
	intelligence: "Intelligence",
	wisdom: "Wisdom",
	agility: "Agility",
	vitality: "Vitality",
	perception: "Perception",
	resolve: "Resolve",
	luck: "Luck",
};

// What the work was read for, said plainly beside each judged stat.
const READ_FOR: Readonly<Record<JudgedStat, string>> = {
	strength: "work shown",
	dexterity: "craft in the site",
	intelligence: "technical depth",
	wisdom: "reflection",
	vitality: "how recent",
	perception: "eye for detail",
	resolve: "years at it",
};

const SLOT_LABELS: Readonly<Record<Slot, string>> = {
	tool: "Main hand",
	offhand: "Off hand",
	head: "Head",
	neck: "Neck",
	back: "Back",
	shoulders: "Shoulders",
	chest: "Chest",
	waist: "Waist",
	legs: "Legs",
	feet: "Feet",
	wrist: "Wrists",
	hand: "Hands",
	finger: "Fingers",
};

const VOWEL_START = /^[aeiou]/iu;

// The article body's list mark: a faint hedera hung in the margin.
const HEDERA_ITEM =
	"relative pl-6 justified leading-relaxed before:absolute before:left-0 before:text-ink-faint before:content-['❧']";

function withArticle(phrase: string): string {
	return VOWEL_START.test(phrase) ? `an ${phrase}` : `a ${phrase}`;
}

function percent(value: number): string {
	return `${Math.round(value * 100)}%`;
}

function totalEarned(earned: Readonly<Record<Stat, number>>): number {
	let total = 0;
	for (const stat of STATS) {
		total += earned[stat];
	}
	return total;
}

function isJudged(stat: Stat): stat is JudgedStat {
	return JUDGED_STATS.some((judged) => judged === stat);
}

function Section({
	id,
	title,
	children,
}: {
	id: string;
	title: string;
	children: ReactNode;
}) {
	return (
		<section aria-labelledby={id} className="mt-14">
			<h2 id={id} className="mb-4 text-2xl font-medium text-ink">
				{title}
			</h2>
			{children}
		</section>
	);
}

// A label beside its value. A row with a note keeps the value to a narrow
// column so the notes line up; one without lets the value run the width.
function Row({
	label,
	children,
	note,
}: {
	label: string;
	children: ReactNode;
	note?: ReactNode;
}) {
	return (
		<div className="grid grid-cols-[7.5rem_minmax(0,1fr)] items-baseline gap-x-4 border-t border-rule py-2 first:border-t-0 sm:grid-cols-[9rem_5rem_minmax(0,1fr)]">
			<dt className="text-xs smallcaps text-ink-soft">{label}</dt>
			<dd
				className={note === undefined ? "text-ink sm:col-span-2" : "text-ink"}
			>
				{children}
			</dd>
			{note !== undefined && (
				<dd className="col-start-2 text-sm text-ink-soft italic sm:col-start-3">
					{note}
				</dd>
			)}
		</div>
	);
}

type ArmsSheet = InferRouterOutputs<typeof router>["arms"]["sheet"];

function Heading({ arms }: { arms: ArmsSheet }) {
	const calling = arms.reading?.calling.choice ?? null;
	return (
		<>
			<Link
				to="/arms"
				className="text-xs smallcaps text-ink-soft no-underline hover:text-ink hover:underline"
			>
				Roll of Arms
			</Link>
			<h1 className="mt-6 text-4xl leading-tight font-medium tracking-tight text-balance text-ink">
				{arms.host}
			</h1>
			<p className="mt-2 text-2xl text-ink italic">
				{arms.character.class.name}
				{calling !== null && (
					<span className="text-ink-soft">, {calling.replace("-", " ")}</span>
				)}
			</p>
			<p className="mt-6 justified text-lg leading-relaxed text-ink-soft">
				{arms.character.class.flavor}.
			</p>
		</>
	);
}

function Plate({ arms }: { arms: ArmsSheet }) {
	if (arms.plate === null) {
		return null;
	}
	return (
		<figure className="mt-10">
			<img
				src={arms.plate}
				alt={`The front page of ${arms.host}, as the judge saw it.`}
				width={1280}
				height={800}
				className="aspect-[16/10] w-full border border-rule object-cover object-top"
			/>
			<figcaption className="mt-3 text-sm text-ink-soft italic">
				<span className="mr-3 text-xs smallcaps not-italic">Plate I</span>
				<LinkOut
					href={arms.url}
					className="underline decoration-ink-faint hover:text-ink hover:decoration-ink"
				>
					{arms.page.title ?? arms.host}
				</LinkOut>
				, as the judge saw it on {dayFormat.format(arms.forgedAt)}.
			</figcaption>
		</figure>
	);
}

function statNote(arms: ArmsSheet, stat: Stat): string {
	const { reading, sheet } = arms;
	if (stat === "luck") {
		return "left to fate";
	}
	if (reading === null) {
		return "fate alone";
	}
	const score = reading.scores[stat].toFixed(1);
	const read = isJudged(stat)
		? `${READ_FOR[stat]}, ${score} of ${TOP_SCORE}`
		: `measured, ${Math.round(arms.page.documentMs)} ms to arrive`;
	return sheet.branded ? `${read}; earned nothing` : read;
}

function Stats({ arms }: { arms: ArmsSheet }) {
	const { sheet } = arms;
	return (
		<Section id="stats" title="Stats">
			<dl>
				{STATS.map((stat) => (
					<Row key={stat} label={STAT_LABELS[stat]} note={statNote(arms, stat)}>
						{sheet.stats[stat]}
						{sheet.raised[stat] > 0 && (
							<span className="text-ink-soft"> (+{sheet.raised[stat]})</span>
						)}
					</Row>
				))}
			</dl>
			<p className="mt-4 text-sm text-ink-soft">
				Power {numberFormat.format(sheet.powerRating)} of{" "}
				{numberFormat.format(sheet.powerRatingMax)}. In a fight:{" "}
				{Math.floor(sheet.attributes.maxHealth ?? 0)} health,{" "}
				{Math.floor(sheet.attributes.stamina ?? 0)} stamina,{" "}
				{(sheet.attributes.physicalDamage ?? 0).toFixed(1)} damage a blow,{" "}
				{percent(sheet.attributes.dodgeRate ?? 0)} to dodge,{" "}
				{percent(sheet.attributes.criticalHitChance ?? 0)} to strike true.
			</p>
		</Section>
	);
}

function spending(sheet: ArmsSheet["sheet"]): string {
	const parts = [
		`The work earned ${numberFormat.format(totalEarned(sheet.earned))} orbs, spent at Set’s prices on raising each stat it was earned for.`,
	];
	if (sheet.craft !== null) {
		const { item, orbs, replaces } = sheet.craft;
		const placed =
			replaces === null
				? "which went into the pack"
				: `worn in place of the ${replaces}`;
		parts.push(
			`What couldn’t buy another point went into one craft: ${withArticle(item.name)}, grade ${item.tierGrade}, for ${numberFormat.format(orbs)} orbs, ${placed}.`
		);
	}
	if (sheet.purse > 0) {
		parts.push(
			`${numberFormat.format(sheet.purse)} orbs are left in the purse.`
		);
	}
	return parts.join(" ");
}

function TheReading({ arms }: { arms: ArmsSheet }) {
	const { reading, sheet, character } = arms;
	if (reading === null) {
		return (
			<Section id="reading" title="The reading">
				<p className="justified leading-relaxed">
					These arms were rolled by fate alone. The site was not read, so it was
					given the first of the eight characters fate offered and earned
					nothing.
				</p>
			</Section>
		);
	}
	return (
		<Section id="reading" title="The reading">
			<p className="justified leading-relaxed">
				The judge read {arms.host} as one person’s own site (
				{percent(reading.portfolio)}) and fit to show ({percent(reading.safe)}).
				Its maker is {withArticle(reading.calling.choice.replace("-", " "))}:{" "}
				<span className="text-ink-soft italic">
					{CALLINGS[reading.calling.choice].toLowerCase()}
				</span>{" "}
				({percent(reading.calling.probabilities[reading.calling.choice] ?? 0)}).
			</p>
			<p className="mt-5 justified leading-relaxed">
				Of the eight characters fate offered, the judge chose the{" "}
				{character.class.name} (
				{percent(reading.cast.probabilities[reading.cast.choice] ?? 0)}):
			</p>
			<ol className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-soft">
				{arms.candidates.map((candidate, index) => (
					<li
						key={candidate.seed}
						className={index === arms.castIndex ? "text-ink" : undefined}
					>
						{index === arms.castIndex && <span aria-label="chosen">☞ </span>}
						{candidate.className}
					</li>
				))}
			</ol>
			<p className="mt-5 justified leading-relaxed">
				{sheet.branded
					? `The page spoke to the judge (${percent(reading.trickery)}), asking for a better reading, and so it earned nothing.`
					: spending(sheet)}
			</p>
		</Section>
	);
}

function Equipment({ arms }: { arms: ArmsSheet }) {
	const { character, sheet } = arms;
	const { craft } = sheet;
	return (
		<Section id="arms-and-armour" title="Arms and armour">
			<dl>
				{SLOTS.map((slot) => (
					<Row key={slot} label={SLOT_LABELS[slot]}>
						{[character.equipment[slot]].flat().map((item) => {
							const crafted =
								craft !== null &&
								craft.item.slot === slot &&
								craft.replaces === item.name
									? craft.item
									: null;
							const shown = crafted ?? item;
							return (
								<span key={item.name} className="block">
									{shown.name}
									<span className="ml-2 text-xs smallcaps text-ink-soft">
										{shown.tierGrade}
										{crafted !== null && ", crafted"}
									</span>
								</span>
							);
						})}
					</Row>
				))}
				{craft !== null && craft.replaces === null && (
					<Row label="In the pack">
						{craft.item.name}
						<span className="ml-2 text-xs smallcaps text-ink-soft">
							{craft.item.tierGrade}, crafted
						</span>
					</Row>
				)}
			</dl>
		</Section>
	);
}

function Traits({ arms }: { arms: ArmsSheet }) {
	const { traits } = arms.character;
	return (
		<Section id="skills" title="Skills and traits">
			<ul className="space-y-2">
				{traits.skills.map((skill) => (
					<li key={skill.name} className={HEDERA_ITEM}>
						<span className="smallcaps">{skill.name}</span>
						<span className="text-ink-soft italic">: {skill.flavor}.</span>
					</li>
				))}
				{traits.advantages?.map((trait) => (
					<li key={trait.name} className={HEDERA_ITEM}>
						<span className="text-ink-soft italic">Blessed with </span>
						{trait.name}.
					</li>
				))}
				{traits.disadvantages?.map((trait) => (
					<li key={trait.name} className={HEDERA_ITEM}>
						<span className="text-ink-soft italic">Cursed with </span>
						{trait.name}.
					</li>
				))}
			</ul>
		</Section>
	);
}

function Challenges({ arms }: { arms: ArmsSheet }) {
	if (arms.rivals.length === 0) {
		return null;
	}
	return (
		<nav
			aria-label="Challenge"
			className="mt-16 flex flex-col gap-3 border-t border-rule pt-6"
		>
			{arms.rivals.map((rival) => (
				<Link
					key={rival.host}
					to="/arms/$host/vs/$rival"
					params={{ host: arms.host, rival: rival.host }}
					className="text-ink no-underline hover:underline"
				>
					<span className="text-xs smallcaps text-ink-soft">Challenge </span>
					{rival.host}, {withArticle(rival.className)} →
				</Link>
			))}
		</nav>
	);
}

function Colophon({ arms }: { arms: ArmsSheet }) {
	const birthSeed = arms.candidates[arms.castIndex]?.seed;
	const { contentVersion } = arms.character;
	return (
		<p className="mt-16 text-sm leading-relaxed text-ink-soft">
			Rolled by Set from seed {birthSeed}, at content version {contentVersion}.{" "}
			<LinkOut
				href={`https://set.world/roll/character?seed=${birthSeed}&contentVersion=${contentVersion}`}
				className="underline decoration-ink-faint hover:text-ink hover:decoration-ink"
			>
				Its birth certificate at set.world
			</LinkOut>{" "}
			shows it as it was rolled, before the work raised it.
		</p>
	);
}

function SheetPage() {
	const { host } = Route.useParams();
	const { data: arms } = useSuspenseQuery(
		orpc.arms.sheet.queryOptions({ input: { host } })
	);
	return (
		<main className="px-6 py-10 md:px-12 md:pt-10 md:pb-16">
			<article className="max-w-prose">
				<Heading arms={arms} />
				<Plate arms={arms} />
				<Stats arms={arms} />
				<TheReading arms={arms} />
				<Equipment arms={arms} />
				<Traits arms={arms} />
				<Challenges arms={arms} />
				<Colophon arms={arms} />
			</article>
		</main>
	);
}

function ArmsNotFound() {
	return (
		<main className="px-6 py-10 md:px-12 md:pt-15.25 md:pb-16">
			<h1 className="text-4xl leading-tight font-medium tracking-tight text-ink">
				No such arms
			</h1>
			<p className="mt-4 max-w-prose justified text-ink-soft">
				That site isn’t on the roll yet.
			</p>
			<Link
				to="/arms"
				className="mt-6 inline-block text-ink underline decoration-ink-faint hover:decoration-ink"
			>
				Turn to the Roll of Arms →
			</Link>
		</main>
	);
}
