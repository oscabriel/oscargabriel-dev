import {
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { fnv1a } from "@/arms/host";
import { CALLINGS } from "@/arms/judge";
import { ArmsCard } from "@/components/arms-card";
import { LinkOut } from "@/components/link-out";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { adminOrpc } from "@/rpc/admin-client";
import { orpc } from "@/rpc/client";

const TITLE = `Roll of Arms | ${SITE_NAME}`;
const DESCRIPTION =
	"Personal sites given arms: a character rolled by Set from each site's name, chosen and strengthened by what the site shows.";

const numberFormat = new Intl.NumberFormat("en-US");

export const Route = createFileRoute("/_book/arms/")({
	loader: async ({ context }) => {
		await context.queryClient.query(orpc.arms.roll.queryOptions());
	},
	head: () => ({
		meta: [
			{ title: TITLE },
			{ name: "description", content: DESCRIPTION },
			{ property: "og:title", content: TITLE },
			{ property: "og:description", content: DESCRIPTION },
			{ property: "og:url", content: `${SITE_URL}/arms` },
		],
		links: [{ rel: "canonical", href: `${SITE_URL}/arms` }],
	}),
	component: RollPage,
});

function callingLabel(calling: string | null): string | null {
	if (calling === null) {
		return null;
	}
	return Object.hasOwn(CALLINGS, calling) ? calling.replace("-", " ") : null;
}

// Cards laid by hand never sit quite square; each keeps its own angle.
const LAID = ["-rotate-2", "-rotate-1", "rotate-1", "rotate-2", "rotate-0"];

function layAt(host: string): string {
	return LAID[fnv1a(host) % LAID.length] ?? "rotate-0";
}

// Reading a site takes a while: the browser draws it, Set rolls eight
// candidates one at a time, and Clef reads the lot.
function ForgeForm() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [address, setAddress] = useState("");
	const [judge, setJudge] = useState(true);
	const forge = useMutation(
		adminOrpc.arms.forge.mutationOptions({
			onSuccess: async ({ host }) => {
				await queryClient.invalidateQueries({ queryKey: orpc.arms.key() });
				await navigate({ to: "/arms/$host", params: { host } });
			},
		})
	);

	function run(byJudge: boolean) {
		setJudge(byJudge);
		forge.mutate({ url: address, judge: byJudge });
	}

	return (
		<form
			onSubmit={(event) => {
				event.preventDefault();
				run(true);
			}}
			className="mt-10 max-w-prose"
		>
			<label htmlFor="arms-site" className="text-xs smallcaps text-ink-soft">
				Enter a site on the roll
			</label>
			<input
				id="arms-site"
				name="site"
				type="text"
				inputMode="url"
				autoComplete="url"
				spellCheck={false}
				required
				placeholder="example.com"
				value={address}
				onChange={(event) => {
					setAddress(event.target.value);
				}}
				disabled={forge.isPending}
				className="mt-1 block w-full border-0 border-b border-ink-faint bg-transparent px-0 py-1 text-xl text-ink placeholder:text-ink-faint focus-visible:border-ink focus-visible:outline-none disabled:text-ink-soft"
			/>
			<div className="mt-4 flex flex-wrap items-baseline gap-x-6 gap-y-2">
				<button
					type="submit"
					disabled={forge.isPending}
					className="cursor-pointer text-ink hover:underline disabled:cursor-wait disabled:no-underline"
				>
					Read it and roll →
				</button>
				<button
					type="button"
					onClick={(event) => {
						if (event.currentTarget.form?.reportValidity() === true) {
							run(false);
						}
					}}
					disabled={forge.isPending}
					className="cursor-pointer text-sm text-ink-soft hover:text-ink hover:underline disabled:cursor-wait disabled:no-underline"
				>
					or roll by fate alone
				</button>
			</div>
			<p aria-live="polite" className="mt-3 text-sm text-ink-soft italic">
				{forge.isPending &&
					(judge
						? "Reading the site, rolling eight candidates, and asking the judge…"
						: "Rolling by fate…")}
				{forge.isError && forge.error.message}
			</p>
		</form>
	);
}

function RollPage() {
	const { data: roll } = useSuspenseQuery(orpc.arms.roll.queryOptions());

	return (
		<main className="px-6 py-10 md:px-12 md:pt-10 md:pb-16">
			<h1 className="sr-only">Roll of Arms</h1>
			<p className="text-xs smallcaps text-ink-soft">Roll of Arms</p>
			<p className="mt-10 max-w-prose justified leading-relaxed text-ink-soft">
				Each site here has been read and given arms: a character that Set rolls
				from the site’s own name, which the judge then chooses from among eight
				and strengthens by what the work shows. Turn to any of them to set it
				against another.
			</p>

			{import.meta.env.DEV && <ForgeForm />}

			{roll.length === 0 ? (
				<p className="mt-10 max-w-prose text-ink-soft italic">
					No arms have been entered yet.
				</p>
			) : (
				<ol className="mt-12 grid max-w-prose grid-cols-2 gap-x-6 gap-y-12 sm:grid-cols-3 sm:gap-x-8">
					{roll.map((entry) => {
						const calling = callingLabel(entry.calling);
						return (
							<li key={entry.host}>
								<Link
									to="/arms/$host"
									params={{ host: entry.host }}
									className="group block no-underline"
								>
									<ArmsCard
										host={entry.host}
										trump={entry.trump}
										className={`transition-transform duration-300 ease-out group-hover:-translate-y-1.5 group-hover:rotate-0 group-focus-visible:rotate-0 motion-reduce:transition-none ${layAt(entry.host)}`}
									/>
									<span className="mt-4 block text-ink group-hover:underline">
										{entry.host}
									</span>
								</Link>
								<p className="mt-0.5 text-sm text-ink-soft italic">
									{entry.className}
									{calling !== null && `, ${calling}`}
								</p>
								<p className="mt-0.5 text-xs smallcaps text-ink-soft">
									Power {numberFormat.format(entry.powerRating)}
								</p>
							</li>
						);
					})}
				</ol>
			)}

			<p className="mt-16 max-w-prose text-sm leading-relaxed text-ink-soft">
				Characters, their arms and their prices come from{" "}
				<LinkOut
					href="https://set.world"
					className="underline decoration-ink-faint hover:text-ink hover:decoration-ink"
				>
					Set
				</LinkOut>
				, by Jimmy Lee. The sites are read by Cloudflare’s Clef, which answers
				only in probabilities and never writes a word of what’s here. The cards
				are the twenty-two trumps of the Rider–Waite–Smith tarot, drawn by
				Pamela Colman Smith in 1909 and long in the public domain, from the{" "}
				<LinkOut
					href="https://commons.wikimedia.org/wiki/Category:Rider-Waite_tarot_deck_(Roses_%26_Lilies)"
					className="underline decoration-ink-faint hover:text-ink hover:decoration-ink"
				>
					scans on Wikimedia Commons
				</LinkOut>
				.
			</p>
		</main>
	);
}
