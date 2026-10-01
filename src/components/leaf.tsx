import { ListIcon, XIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { Link, useMatch } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

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
// edge from md, and in the menu under the running header on phones.
const TAB_CLASS =
	"group relative flex items-baseline py-1.5 pr-5 pl-6 smallcaps text-sm text-ink-soft transition-colors hover:text-ink aria-[current=page]:text-ink";

// At rest a tab's label lines up with the name. The current one steps right
// as the manicule slides in to point at it; both move by transform alone, so
// nothing around them reflows. A hovered tab nudges right too, except the
// current one, which holds its place clear of the hand.
const TAB_LABEL_CLASS =
	"transition-transform duration-200 ease-out group-aria-[current=page]:translate-x-6 motion-reduce:transition-none md:group-hover:translate-x-1 md:group-hover:group-aria-[current=page]:translate-x-6";

const MENU_ID = "site-menu";

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

interface TabProps {
	onNavigate: () => void;
}

function ContentsTab({
	to,
	label,
	onNavigate,
}: (typeof CONTENTS)[number] & TabProps) {
	return (
		<Link to={to} className={TAB_CLASS} onClick={onNavigate}>
			<Manicule />
			<span className={TAB_LABEL_CLASS}>{label}</span>
		</Link>
	);
}

// Links out never take the manicule at rest: the reader is leaving the book.
// A hand points them on their way under the pointer instead.
function ElsewhereTab({
	href,
	label,
	onNavigate,
}: (typeof ELSEWHERE)[number] & TabProps) {
	return (
		<a
			href={href}
			target="_blank"
			rel="noopener noreferrer"
			className={TAB_CLASS}
			onClick={onNavigate}
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
		<p className="text-2xl md:text-3xl">
			<Link
				to="/"
				aria-label={`${SITE_NAME}, home`}
				className="inline-flex items-baseline gap-1 text-ink transition-colors duration-200 hover:text-ink-soft focus-visible:text-ink-soft"
			>
				<DropCapO className="initial-on-field h-10 w-auto shrink-0 md:h-16" />
				<span aria-hidden="true">{NAME_AFTER_INITIAL}</span>
			</Link>
		</p>
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

// The phone's menu: open and shut by its button, shut again by Escape or by
// following any link inside it.
function useMenu() {
	const [open, setOpen] = useState(false);
	const buttonRef = useRef<HTMLButtonElement>(null);

	useEffect(() => {
		function onKeyDown(event: KeyboardEvent) {
			if (event.key === "Escape") {
				setOpen(false);
				buttonRef.current?.focus();
			}
		}
		if (open) {
			document.addEventListener("keydown", onKeyDown);
		}
		return () => {
			document.removeEventListener("keydown", onKeyDown);
		};
	}, [open]);

	return {
		open,
		buttonRef,
		handleToggle: () => {
			setOpen((previous) => !previous);
		},
		handleClose: () => {
			setOpen(false);
		},
	};
}

export function Leaf() {
	const { open, buttonRef, handleToggle, handleClose } = useMenu();

	return (
		<aside className="relative border-b border-rule book-leaf md:sticky md:top-0 md:h-dvh md:border-b-0 md:before:absolute md:before:inset-y-0 md:before:right-0 md:before:w-px md:before:bg-rule">
			<div className="flex flex-col md:h-full md:overflow-y-auto">
				{/* On phones the leaf is only a running header: the name, and a
				    button for the menu that holds the index and the theme switch.
				    From md the name's baseline lands 6.5rem down: 2.5rem of
				    padding and the 4rem cap, whose foot is the baseline. The pages
				    pad their titles to meet it (see each route's <main>). */}
				<div className="flex items-center justify-between gap-4 px-6 py-4 md:block md:pt-10 md:pb-6">
					<div>
						<Wordmark />
						<p className="mt-5 hidden justified text-sm leading-relaxed text-ink-soft md:block">
							I’m an engineer with a roundabout background. I studied math in
							New Orleans, made portraits as a working photographer, and spent
							years on warehouse and factory floors before I taught myself to
							code. These days I live in Portland.
						</p>
					</div>
					<button
						ref={buttonRef}
						type="button"
						aria-label="Menu"
						aria-expanded={open}
						aria-controls={MENU_ID}
						onClick={handleToggle}
						className="-mr-2 cursor-pointer p-2 text-ink-soft transition-colors hover:text-ink md:hidden"
					>
						{open ? (
							<XIcon aria-hidden="true" className="size-6" />
						) : (
							<ListIcon aria-hidden="true" className="size-6" />
						)}
					</button>
				</div>
				<div
					id={MENU_ID}
					className={`${open ? "block" : "hidden"} border-t border-rule pt-3 pb-5 md:contents`}
				>
					<nav aria-label="Site" className="md:mt-2">
						<ul aria-label="Contents">
							{CONTENTS.map((tab) => (
								<li key={tab.to}>
									<ContentsTab {...tab} onNavigate={handleClose} />
								</li>
							))}
						</ul>
						<ul aria-label="Elsewhere" className="mt-4 md:mt-6">
							{ELSEWHERE.map((tab) => (
								<li key={tab.href}>
									<ElsewhereTab {...tab} onNavigate={handleClose} />
								</li>
							))}
						</ul>
					</nav>
					<div className="mt-5 px-6 md:hidden">
						<ThemeToggle />
					</div>
				</div>
				<div className="hidden md:block">
					<OpenPostSections />
				</div>
				<div className="mt-auto hidden px-6 pt-6 pb-6 md:block">
					<ThemeToggle />
				</div>
			</div>
		</aside>
	);
}
