import { ORPCError } from "@orpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

import type { Paragraph } from "@/arms/chronicle";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { orpc } from "@/rpc/client";

const MAX_BOUT = 999;

const BoutSearch = Schema.Struct({
	bout: Schema.optional(
		Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: MAX_BOUT }))
	),
});

// The first bout needs no number in the address, and a bad number falls back
// to it.
// The address as the router parses it: "?bout=2" arrives as a number.
interface BoutAddress {
	readonly bout?: number | string;
}

function boutFrom(search: BoutAddress): { bout?: number } {
	const decoded = Schema.decodeUnknownOption(BoutSearch)(search);
	return Option.isSome(decoded) ? decoded.value : {};
}

export const Route = createFileRoute("/_book/arms/$host/vs/$rival")({
	validateSearch: boutFrom,
	loaderDeps: ({ search }) => ({ bout: search.bout ?? 1 }),
	loader: async ({ context, params, deps }) => {
		try {
			await context.queryClient.query(
				orpc.arms.bout.queryOptions({
					input: { host: params.host, rival: params.rival, bout: deps.bout },
				})
			);
		} catch (error) {
			if (error instanceof ORPCError && error.code === "NOT_FOUND") {
				throw notFound();
			}
			throw error;
		}
	},
	head: ({ params }) => {
		const title = `${params.host} against ${params.rival} | Roll of Arms`;
		const url = `${SITE_URL}/arms/${params.host}/vs/${params.rival}`;
		return {
			meta: [
				{ title: `${title} | ${SITE_NAME}` },
				{
					name: "description",
					content: `A bout between ${params.host} and ${params.rival}, told as it fell.`,
				},
				{ property: "og:title", content: title },
				{ property: "og:url", content: url },
			],
			links: [{ rel: "canonical", href: url }],
		};
	},
	component: BoutPage,
});

const ORDINALS = ["first", "second", "third", "fourth", "fifth"];

function boutName(bout: number): string {
	return ORDINALS[bout - 1] ?? `${bout}th`;
}

function Told({
	paragraph,
	hosts,
	className,
}: {
	paragraph: Paragraph;
	hosts: readonly [string, string];
	className?: string;
}) {
	return (
		<p className={className}>
			{paragraph.map((run, index) =>
				"name" in run ? (
					// Runs never reorder, so their place in the paragraph is their key.
					// oxlint-disable-next-line react/no-array-index-key
					<span key={index} className="smallcaps">
						{hosts[run.name]}
					</span>
				) : (
					run.text
				)
			)}
		</p>
	);
}

function BoutPage() {
	const { host, rival } = Route.useParams();
	const { bout = 1 } = Route.useSearch();
	const { data } = useSuspenseQuery(
		orpc.arms.bout.queryOptions({ input: { host, rival, bout } })
	);
	const { fight } = data;
	const hosts = [host, rival] as const;
	const [opening] = fight.paragraphs;
	const closing = fight.paragraphs.at(-1);
	const exchanges = fight.paragraphs.slice(1, -1);

	return (
		<main className="px-6 py-10 md:px-12 md:pt-10 md:pb-16">
			<article className="max-w-prose">
				<Link
					to="/arms"
					className="text-xs smallcaps text-ink-soft no-underline hover:text-ink hover:underline"
				>
					Roll of Arms
				</Link>
				<h1 className="mt-6 text-4xl leading-tight font-medium tracking-tight text-balance text-ink">
					{host} <span className="text-ink-soft italic">against</span> {rival}
				</h1>
				<p className="mt-2 text-xs smallcaps text-ink-soft">
					The {boutName(bout)} bout, {fight.turns} turns
				</p>

				{opening !== undefined && (
					<Told
						paragraph={opening}
						hosts={hosts}
						className="mt-10 justified text-lg leading-relaxed text-ink-soft"
					/>
				)}
				{exchanges.map((paragraph, index) => (
					<Told
						// The telling never changes for a bout, so its order is stable.
						// oxlint-disable-next-line react/no-array-index-key
						key={index}
						paragraph={paragraph}
						hosts={hosts}
						className="mt-5 justified leading-relaxed"
					/>
				))}
				{closing !== undefined && (
					<Told
						paragraph={closing}
						hosts={hosts}
						className="mt-8 justified leading-relaxed italic"
					/>
				)}

				<nav
					aria-label="More bouts"
					className="mt-16 flex flex-col gap-3 border-t border-rule pt-6"
				>
					<Link
						to="/arms/$host/vs/$rival"
						params={{ host, rival }}
						search={{ bout: bout + 1 }}
						className="text-ink no-underline hover:underline"
					>
						<span className="text-xs smallcaps text-ink-soft">Turn to </span>
						the {boutName(bout + 1)} bout →
					</Link>
					<Link
						to="/arms/$host/vs/$rival"
						params={{ host: rival, rival: host }}
						className="text-ink-soft no-underline hover:text-ink hover:underline"
					>
						<span className="text-xs smallcaps">Turn to </span>
						the return bout, {rival} challenging {host}
					</Link>
					<Link
						to="/arms/$host"
						params={{ host }}
						className="text-ink-soft no-underline hover:text-ink hover:underline"
					>
						<span className="text-xs smallcaps">Turn back to </span>
						{host}’s arms
					</Link>
				</nav>
			</article>
		</main>
	);
}
