import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { HoverHand } from "@/components/hover-hand";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { orpc } from "@/rpc/client";
import type { DiaryEntry as DiaryEntrySchema } from "@/watching/feed";

type DiaryEntry = typeof DiaryEntrySchema.Type;

const TITLE = `Watching | ${SITE_NAME}`;
const DESCRIPTION =
	"The films Oscar Gabriel has watched lately, with his ratings, from his Letterboxd diary.";

// Poster files are 2:3; the attributes keep the lead from jumping as it loads.
const POSTER_WIDTH = 600;
const POSTER_HEIGHT = 900;

// Watched dates are plain calendar days, so read and print them in UTC.
const longDay = new Intl.DateTimeFormat("en-US", {
	year: "numeric",
	month: "long",
	day: "numeric",
	timeZone: "UTC",
});
const shortDay = new Intl.DateTimeFormat("en-US", {
	month: "short",
	day: "numeric",
	timeZone: "UTC",
});
const monthYear = new Intl.DateTimeFormat("en-US", {
	year: "numeric",
	month: "long",
	timeZone: "UTC",
});

function toDate(day: string): Date {
	return new Date(`${day}T00:00:00Z`);
}

export const Route = createFileRoute("/_book/watching")({
	loader: async ({ context }) => {
		await context.queryClient.query(orpc.watching.list.queryOptions());
	},
	head: () => ({
		meta: [
			{ title: TITLE },
			{ name: "description", content: DESCRIPTION },
			{ property: "og:title", content: TITLE },
			{ property: "og:description", content: DESCRIPTION },
			{ property: "og:url", content: `${SITE_URL}/watching` },
		],
		links: [{ rel: "canonical", href: `${SITE_URL}/watching` }],
	}),
	component: WatchingPage,
});

// Letterboxd's own notation, half stars out of five. The glyphs are read as
// a picture, so the words go to screen readers instead.
function Rating({ value }: { value: number | null }) {
	if (value === null) {
		return <span className="text-ink-faint italic">unrated</span>;
	}
	const whole = Math.floor(value);
	const half = value - whole >= 0.5;
	const label = `${value} stars out of 5`;
	return (
		<span title={label}>
			<span aria-hidden="true" className="tracking-wide">
				{"★".repeat(whole)}
				{half && "½"}
			</span>
			<span className="sr-only">{label}</span>
		</span>
	);
}

function Latest({ entry, recent }: { entry: DiaryEntry; recent: boolean }) {
	return (
		<section aria-labelledby="latest" className="mt-10">
			<h2 id="latest" className="text-xs smallcaps text-ink-soft">
				{recent ? "Now showing" : "Last watched"}
			</h2>
			<div className="mt-4 flex items-start gap-6">
				{entry.poster !== null && (
					<figure className="w-28 shrink-0 md:w-40">
						<img
							src={entry.poster}
							alt={`Poster for ${entry.title}`}
							width={POSTER_WIDTH}
							height={POSTER_HEIGHT}
							decoding="async"
							className="block aspect-2/3 w-full object-cover"
						/>
						<figcaption className="mt-2 text-xs text-ink-soft">
							<span className="smallcaps not-italic">Plate I</span>{" "}
							<span className="italic">The poster</span>
						</figcaption>
					</figure>
				)}
				<div className="min-w-0">
					<p className="text-3xl leading-tight font-medium text-balance text-ink">
						<a
							href={entry.url}
							className="text-ink no-underline hover:underline"
						>
							{entry.title}
						</a>
					</p>
					{entry.year !== null && (
						<p className="mt-1 text-ink-soft">
							{entry.year}
							{entry.rewatch && <span className="italic">, seen again</span>}
						</p>
					)}
					<p className="mt-4 text-xl text-ink">
						<Rating value={entry.rating} />
					</p>
					<p className="mt-2 text-xs smallcaps text-ink-soft">
						Watched{" "}
						<time dateTime={entry.watchedOn}>
							{longDay.format(toDate(entry.watchedOn))}
						</time>
					</p>
				</div>
			</div>
		</section>
	);
}

// The diary by month, each film a contents line: title and year, a dotted
// leader, then its rating and day. On phones the rating drops under the title.
function DiaryLine({ entry }: { entry: DiaryEntry }) {
	return (
		<li className="border-t border-rule py-3">
			<div className="md:flex md:items-baseline md:gap-3">
				<p className="min-w-0">
					<a
						href={entry.url}
						className="text-lg font-medium text-ink no-underline hover:underline"
					>
						{entry.title}
					</a>
					{entry.year !== null && (
						<span className="text-ink-soft">, {entry.year}</span>
					)}
					{entry.rewatch && (
						<span className="text-ink-soft italic">, seen again</span>
					)}
				</p>
				<span
					aria-hidden="true"
					className="mb-1 hidden min-w-6 flex-1 border-b border-dotted border-ink-faint md:block"
				/>
				<p className="mt-1 flex shrink-0 items-baseline gap-4 whitespace-nowrap md:mt-0">
					<span className="text-ink">
						<Rating value={entry.rating} />
					</span>
					<time
						dateTime={entry.watchedOn}
						className="text-xs smallcaps text-ink-soft"
					>
						{shortDay.format(toDate(entry.watchedOn))}
					</time>
				</p>
			</div>
		</li>
	);
}

function groupByMonth(entries: readonly DiaryEntry[]) {
	const months = new Map<string, DiaryEntry[]>();
	for (const entry of entries) {
		const month = entry.watchedOn.slice(0, 7);
		const group = months.get(month);
		if (group) {
			group.push(entry);
		} else {
			months.set(month, [entry]);
		}
	}
	return [...months];
}

function WatchingPage() {
	const { data } = useSuspenseQuery(orpc.watching.list.queryOptions());
	const latest = data.entries.at(0);

	return (
		<main className="px-6 py-10 md:px-12 md:pt-10 md:pb-16">
			<div className="max-w-prose">
				<h1 className="sr-only">Watching</h1>
				<p className="justified text-ink-soft">
					What I’ve watched lately and what I made of it, copied from my diary
					on{" "}
					<a
						href={data.profile}
						className="text-ink underline decoration-ink-faint hover:decoration-ink"
					>
						Letterboxd
					</a>
					.
				</p>
				{latest === undefined ? (
					<p className="mt-10 text-ink-soft italic">
						{data.available
							? "Nothing watched yet."
							: "The diary can’t be reached just now; it’s kept on Letterboxd."}
					</p>
				) : (
					<>
						<Latest entry={latest} recent={data.latestIsRecent} />
						<section aria-labelledby="diary" className="mt-14">
							<h2 id="diary" className="text-2xl font-medium text-ink">
								The diary
							</h2>
							{groupByMonth(data.entries).map(([month, entries]) => (
								<div key={month} className="mt-8">
									<h3 className="mb-2 text-xs smallcaps text-ink-soft">
										{monthYear.format(toDate(`${month}-01`))}
									</h3>
									<ol>
										{entries.map((entry) => (
											<DiaryLine key={entry.id} entry={entry} />
										))}
									</ol>
								</div>
							))}
						</section>
						<p className="mt-16 border-t border-rule pt-6">
							<a
								href={data.profile}
								className="group text-ink no-underline hover:underline"
							>
								<span className="text-xs smallcaps text-ink-soft">
									Turn to{" "}
								</span>
								the whole diary on Letterboxd
								<HoverHand />
							</a>
						</p>
					</>
				)}
			</div>
		</main>
	);
}
