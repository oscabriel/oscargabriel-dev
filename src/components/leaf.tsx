import { useQuery } from "@tanstack/react-query";
import { Link, useMatch } from "@tanstack/react-router";

import { DropCapO } from "@/components/drop-cap";
import { HoverHand } from "@/components/hover-hand";
import { ThumbIndexSections } from "@/components/table-of-contents";
import { GITHUB_URL, LINKEDIN_URL, SITE_NAME, TWITTER_URL } from "@/lib/site";
import { orpc } from "@/rpc/client";
import { ThemeToggle } from "@/theme/theme";

// The work first, then the record. /gallery and /watching still resolve but
// stay out of the index until they're ready to be found.
const CONTENTS = [
	{ to: "/blog", label: "Writing" },
	{ to: "/projects", label: "Projects" },
	{ to: "/cv", label: "CV" },
] as const;

const ELSEWHERE = [
	{ href: GITHUB_URL, label: "GitHub" },
	{ href: LINKEDIN_URL, label: "LinkedIn" },
	{ href: TWITTER_URL, label: "Twitter" },
] as const;

// The groups stack as the index, with a gap between the two: down the leaf's
// edge from md, and under the intro on the phone's home page.
// The tabs run the full width of the leaf's scrolling column, which would
// clip the focus ring's usual outset; theirs is drawn inside instead.
const TAB_CLASS =
	"group relative flex items-baseline py-1.5 pr-5 pl-6 smallcaps text-sm text-ink focus-visible:-outline-offset-2";

// At rest a tab's label lines up with the name. The current one steps right
// as the manicule slides in to point at it; both move by transform alone, so
// nothing around them reflows. A hovered tab nudges right too, except the
// current one, which holds its place clear of the hand.
const TAB_LABEL_CLASS =
	"transition-transform duration-200 ease-out group-aria-[current=page]:translate-x-6 motion-reduce:transition-none md:group-hover:translate-x-1 md:group-hover:group-aria-[current=page]:translate-x-6";

function Manicule() {
	return (
		<span
			aria-hidden="true"
			className="absolute -translate-x-2 opacity-0 transition duration-200 ease-out group-aria-[current=page]:translate-x-0 group-aria-[current=page]:opacity-100 motion-reduce:transition-none"
		>
			☞
		</span>
	);
}

function ContentsTab({ to, label }: (typeof CONTENTS)[number]) {
	return (
		<Link to={to} className={TAB_CLASS}>
			<Manicule />
			<span className={TAB_LABEL_CLASS}>{label}</span>
		</Link>
	);
}

// Links out never take the manicule at rest: the reader is leaving the book.
// A hand points them on their way under the pointer instead.
function ElsewhereTab({ href, label }: (typeof ELSEWHERE)[number]) {
	return (
		<a
			href={href}
			target="_blank"
			rel="noopener noreferrer"
			className={TAB_CLASS}
		>
			<span className={TAB_LABEL_CLASS}>
				{label}
				<HoverHand />
				<span className="sr-only"> (opens in a new tab)</span>
			</span>
		</a>
	);
}

// The ornamental O is the name's initial: the block stands on the text's
// baseline, as a printed initial does, with the rest of the name in roman
// beside it. It is the stippled field that stands on the line, not the thin
// outer rule (see .initial-on-field in styles.css). The whole block is the way home; it rests in ink and
// softens under the pointer.
const NAME_AFTER_INITIAL = SITE_NAME.slice(1);

function Wordmark() {
	return (
		<p className="text-wordmark md:text-wordmark-lg">
			<Link
				to="/"
				aria-label={`${SITE_NAME}, home`}
				className="inline-flex items-baseline gap-1 text-ink transition-colors duration-200 hover:text-ink-soft focus-visible:text-ink-soft"
			>
				<DropCapO className="initial-on-field h-10 w-auto shrink-0 md:h-16" />
				<span aria-hidden="true" className="font-medium">
					{NAME_AFTER_INITIAL}
				</span>
			</Link>
		</p>
	);
}

// Who is writing.
function Introduction({ className }: { className?: string }) {
	return (
		<div className={className}>
			<p className="justified text-sm leading-relaxed text-ink">
				Rising software engineer sharing what I learn and build online. Focused
				on learning strategic programming from a beginner perspective.
				Constantly experimenting with agents. Based in Portland, OR.
			</p>
			<p className="mt-3 text-sm leading-relaxed text-ink">
				Currently looking for something new.
			</p>
		</div>
	);
}

// The post's sections join the thumb index while a post is open.
function OpenPostSections() {
	const match = useMatch({ from: "/_book/blog/$slug", shouldThrow: false });
	const slug = match?.params.slug;
	const { data: post } = useQuery({
		...orpc.posts.bySlug.queryOptions({ input: { slug: slug ?? "" } }),
		enabled: slug !== undefined,
	});

	if (post === undefined) {
		return null;
	}
	// Keyed so a newly opened post starts with its sections folded.
	return <ThumbIndexSections key={post.slug} toc={post.toc} />;
}

// The hairline down the leaf's fore-edge. At / the right leaf is blank and
// there is no fold to mark, so it is drawn only beside a page, and fades in
// and out with the page turn's timing.
const FORE_EDGE_CLASS =
	"md:before:absolute md:before:inset-y-0 md:before:right-0 md:before:w-px md:before:bg-rule md:before:transition-opacity md:before:duration-360 md:before:ease-turn motion-reduce:before:transition-none";

// From md the whole leaf stands beside every page. On phones it stands above
// the page, and only the home page shows all of it: elsewhere it shrinks to
// the name, which leads back home to the index.
export function Leaf() {
	const atHome =
		useMatch({ from: "/_book/", shouldThrow: false }) !== undefined;
	const phoneShown = atHome ? "block" : "hidden md:block";
	const foreEdge = atHome ? "md:before:opacity-0" : "";

	return (
		<aside
			className={`relative book-leaf md:sticky md:top-0 md:h-dvh ${FORE_EDGE_CLASS} ${foreEdge}`}
		>
			<div className="flex flex-col md:h-full md:overflow-y-auto">
				{/* From md the name's baseline lands 6.5rem down: 2.5rem of
				    padding and the 4rem cap, whose foot is the baseline. The pages
				    pad their titles to meet it (see each route's <main>). */}
				<div className="px-6 py-4 md:pt-10 md:pb-6">
					<Wordmark />
					<Introduction className={`mt-5 ${phoneShown}`} />
				</div>
				<nav aria-label="Site" className={`mt-4 md:mt-2 ${phoneShown}`}>
					<ul aria-label="Contents">
						{CONTENTS.map((tab) => (
							<li key={tab.to}>
								<ContentsTab {...tab} />
							</li>
						))}
					</ul>
					<ul aria-label="Elsewhere" className="mt-4 md:mt-6">
						{ELSEWHERE.map((tab) => (
							<li key={tab.href}>
								<ElsewhereTab {...tab} />
							</li>
						))}
					</ul>
				</nav>
				<div className="hidden md:block">
					<OpenPostSections />
				</div>
				{/* The sun and moon stand at the leaf's foot from md, and in the
				    screen's corner on phones. */}
				<div
					className={`fixed right-6 bottom-6 md:static md:mt-auto md:px-6 md:pt-6 md:pb-6 ${phoneShown}`}
				>
					<ThemeToggle />
				</div>
			</div>
		</aside>
	);
}
