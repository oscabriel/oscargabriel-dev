import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import type { TocEntry } from "@/db/schema";

interface TocSection {
	entry: TocEntry;
	children: TocEntry[];
}

// Nest each h3 under the h2 before it. Deeper headings stay out of the list.
function groupSections(toc: readonly TocEntry[]): TocSection[] {
	const sections: TocSection[] = [];
	for (const entry of toc) {
		if (entry.level === 2) {
			sections.push({ entry, children: [] });
		} else if (entry.level === 3) {
			sections.at(-1)?.children.push(entry);
		}
	}
	return sections;
}

// The active heading is the last one above a line a quarter of the way down
// the viewport, or the last heading once the page can't scroll any further.
function useActiveHeading(toc: readonly TocEntry[]): string | undefined {
	const [activeId, setActiveId] = useState<string>();

	useEffect(() => {
		const headings = toc
			.filter((entry) => entry.level <= 3)
			.map((entry) => document.querySelector(`#${CSS.escape(entry.id)}`))
			.filter((heading) => heading !== null);

		function update() {
			const { scrollHeight } = document.documentElement;
			if (Math.ceil(window.scrollY + window.innerHeight) >= scrollHeight) {
				setActiveId(headings.at(-1)?.id);
				return;
			}
			const line = window.innerHeight / 4;
			let current: Element | undefined;
			for (const heading of headings) {
				if (heading.getBoundingClientRect().top > line) {
					break;
				}
				current = heading;
			}
			setActiveId(current?.id);
		}

		update();
		window.addEventListener("scroll", update, { passive: true });
		return () => {
			window.removeEventListener("scroll", update);
		};
	}, [toc]);

	return activeId;
}

// The ribbon: the section a reader was at when they last left this post.
// Read once per page load so it stays put while they read on.
const RIBBON_PREFIX = "ribbon:";
const ribbons = new Map<string, string | null>();

function readRibbon(postKey: string): string | null {
	const cached = ribbons.get(postKey);
	if (cached !== undefined) {
		return cached;
	}
	let stored: string | null = null;
	try {
		stored = localStorage.getItem(RIBBON_PREFIX + postKey);
	} catch {
		// No storage, no ribbon.
	}
	ribbons.set(postKey, stored);
	return stored;
}

function writeRibbon(postKey: string, id: string) {
	try {
		localStorage.setItem(RIBBON_PREFIX + postKey, id);
	} catch {
		// No storage, no ribbon.
	}
}

function subscribeNever() {
	return () => {
		// The ribbon never moves during a visit.
	};
}

function useRibbon(postKey: string, activeId: string | undefined) {
	const ribbonId = useSyncExternalStore(
		subscribeNever,
		() => readRibbon(postKey),
		() => null
	);
	useEffect(() => {
		if (activeId !== undefined) {
			writeRibbon(postKey, activeId);
		}
	}, [postKey, activeId]);
	return ribbonId;
}

function TocLink({
	entry,
	active,
	ribbon,
}: {
	entry: TocEntry;
	active: boolean;
	ribbon: boolean;
}) {
	return (
		<a
			href={`#${entry.id}`}
			aria-current={active ? "location" : undefined}
			className="block py-1 text-ink-soft transition-colors hover:text-ink aria-[current=location]:text-ink"
		>
			<span className={ribbon ? "border-l-2 border-ink pl-2" : undefined}>
				{entry.text}
				{ribbon && (
					<span className="ml-2 text-xs text-ink-soft italic">
						left off here
					</span>
				)}
			</span>
		</a>
	);
}

// One manicule for the whole index. It glides to the active entry rather
// than blinking on and off per row.
function useGlidingManicule(activeId: string | undefined) {
	const listRef = useRef<HTMLUListElement>(null);
	const markRef = useRef<HTMLSpanElement>(null);

	useEffect(() => {
		const list = listRef.current;
		const mark = markRef.current;
		if (list === null || mark === null) {
			return;
		}
		const link =
			activeId === undefined
				? null
				: list.querySelector<HTMLElement>(`a[href="#${CSS.escape(activeId)}"]`);
		if (link === null) {
			mark.style.opacity = "0";
			return;
		}
		mark.style.transform = `translateY(${link.offsetTop - list.offsetTop}px)`;
		mark.style.opacity = "1";
	}, [activeId]);

	return { listRef, markRef };
}

// The open post's headings, set into the leaf beneath the site tabs. The
// manicule points at the section under the reader's eye.
export function ThumbIndexSections({
	toc,
	postKey,
}: {
	toc: readonly TocEntry[];
	postKey: string;
}) {
	const activeId = useActiveHeading(toc);
	const ribbonId = useRibbon(postKey, activeId);
	const { listRef, markRef } = useGlidingManicule(activeId);
	const sections = groupSections(toc);
	// A ribbon at the very first section marks nothing worth pointing at.
	const ribbonAt =
		ribbonId !== null && ribbonId !== sections[0]?.entry.id ? ribbonId : null;

	if (sections.length === 0) {
		return null;
	}

	return (
		<nav
			aria-labelledby="toc-label"
			className="relative mt-8 border-t border-dashed border-rule px-6 pt-5 text-sm leading-snug"
		>
			<p id="toc-label" className="mb-3 text-xs smallcaps text-ink-soft">
				In this post
			</p>
			<span
				ref={markRef}
				aria-hidden="true"
				className="absolute py-1 opacity-0 transition-all duration-300 ease-out"
			>
				☞
			</span>
			<ul ref={listRef} className="pl-6">
				{sections.map(({ entry, children }) => (
					<li key={entry.id}>
						<TocLink
							entry={entry}
							active={entry.id === activeId}
							ribbon={entry.id === ribbonAt}
						/>
						{children.length > 0 && (
							<ul className="pl-4">
								{children.map((child) => (
									<li key={child.id}>
										<TocLink
											entry={child}
											active={child.id === activeId}
											ribbon={child.id === ribbonAt}
										/>
									</li>
								))}
							</ul>
						)}
					</li>
				))}
			</ul>
		</nav>
	);
}
