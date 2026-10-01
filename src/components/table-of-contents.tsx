import { CaretRightIcon } from "@phosphor-icons/react";
import { useEffect, useId, useRef, useState } from "react";

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

function TocLink({ entry, active }: { entry: TocEntry; active: boolean }) {
	return (
		<a
			href={`#${entry.id}`}
			aria-current={active ? "location" : undefined}
			className="block min-w-0 py-1 text-ink"
		>
			{entry.text}
		</a>
	);
}

// Which sections are unfolded. Every section starts folded to its h2.
function useOpenSections() {
	const [open, setOpen] = useState<ReadonlySet<string>>(() => new Set());
	function toggle(id: string) {
		setOpen((previous) => {
			const next = new Set(previous);
			if (!next.delete(id)) {
				next.add(id);
			}
			return next;
		});
	}
	return { open, toggle };
}

// A folded section answers for its hidden h3s: the reader's place falls back
// to the h2 that holds them.
function visibleId(
	id: string | null | undefined,
	sections: readonly TocSection[],
	open: ReadonlySet<string>
): string | undefined {
	if (id === null || id === undefined) {
		return undefined;
	}
	const holder = sections.find(({ children }) =>
		children.some((child) => child.id === id)
	);
	if (holder === undefined || open.has(holder.entry.id)) {
		return id;
	}
	return holder.entry.id;
}

// One h2 and, once unfolded, the h3s beneath it.
function TocSectionItem({
	section: { entry, children },
	expanded,
	onToggle,
	activeId,
}: {
	section: TocSection;
	expanded: boolean;
	onToggle: () => void;
	activeId?: string;
}) {
	// The leaf's index and the phone's list can both be in the page at once.
	const listId = useId();
	return (
		<li>
			<div className="flex items-baseline gap-1">
				<TocLink entry={entry} active={entry.id === activeId} />
				{children.length > 0 && (
					<button
						type="button"
						aria-expanded={expanded}
						aria-controls={listId}
						aria-label={`Subsections of ${entry.text}`}
						onClick={onToggle}
						className="shrink-0 cursor-pointer self-center p-1.5 text-ink-faint transition-colors hover:text-ink"
					>
						<CaretRightIcon
							aria-hidden="true"
							className={`size-3 transition-transform duration-200 ease-out motion-reduce:transition-none ${expanded ? "rotate-90" : ""}`}
						/>
					</button>
				)}
			</div>
			{children.length > 0 && (
				<ul id={listId} hidden={!expanded} className="pl-4">
					{children.map((child) => (
						<li key={child.id}>
							<TocLink entry={child} active={child.id === activeId} />
						</li>
					))}
				</ul>
			)}
		</li>
	);
}

// The phone's sections list, folded the same way but with no place kept.
export function FoldedSections({ toc }: { toc: readonly TocEntry[] }) {
	const { open, toggle } = useOpenSections();
	return (
		<ul className="mt-3 text-sm leading-snug">
			{groupSections(toc).map((section) => (
				<TocSectionItem
					key={section.entry.id}
					section={section}
					expanded={open.has(section.entry.id)}
					onToggle={() => {
						toggle(section.entry.id);
					}}
				/>
			))}
		</ul>
	);
}

// One manicule for the whole index. It glides to the active entry rather
// than blinking on and off per row.
function useGlidingManicule(activeId: string | undefined) {
	const listRef = useRef<HTMLUListElement>(null);
	const markRef = useRef<HTMLSpanElement>(null);

	useEffect(() => {
		function place() {
			const list = listRef.current;
			const mark = markRef.current;
			if (list === null || mark === null) {
				return;
			}
			const link =
				activeId === undefined
					? null
					: list.querySelector<HTMLElement>(
							`a[href="#${CSS.escape(activeId)}"]`
						);
			if (link === null) {
				mark.style.opacity = "0";
				return;
			}
			mark.style.transform = `translateY(${link.offsetTop - list.offsetTop}px)`;
			mark.style.opacity = "1";
		}
		place();
		// Unfolding a section above the mark moves its row down.
		const observer = new ResizeObserver(place);
		if (listRef.current !== null) {
			observer.observe(listRef.current);
		}
		return () => {
			observer.disconnect();
		};
	}, [activeId]);

	return { listRef, markRef };
}

// The open post's headings, set into the leaf beneath the site tabs. The
// manicule points at the section under the reader's eye.
export function ThumbIndexSections({ toc }: { toc: readonly TocEntry[] }) {
	const sections = groupSections(toc);
	const { open, toggle } = useOpenSections();
	const activeId = visibleId(useActiveHeading(toc), sections, open);
	const { listRef, markRef } = useGlidingManicule(activeId);

	if (sections.length === 0) {
		return null;
	}

	return (
		<nav
			aria-labelledby="toc-label"
			className="relative mt-8 border-t border-dashed border-rule px-6 pt-5 text-sm leading-snug"
		>
			<p id="toc-label" className="mb-3 text-xs smallcaps text-ink">
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
				{sections.map((section) => (
					<TocSectionItem
						key={section.entry.id}
						section={section}
						expanded={open.has(section.entry.id)}
						onToggle={() => {
							toggle(section.entry.id);
						}}
						activeId={activeId}
					/>
				))}
			</ul>
		</nav>
	);
}
