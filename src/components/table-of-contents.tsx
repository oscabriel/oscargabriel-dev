import { useEffect, useState } from "react";

import type { TocEntry } from "@/db/schema";
import { cn } from "@/lib/utils";

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
			className={cn(
				"block py-1 text-muted-foreground transition-colors hover:text-foreground",
				active && "font-medium text-foreground"
			)}
		>
			{entry.text}
		</a>
	);
}

export function TableOfContents({ toc }: { toc: readonly TocEntry[] }) {
	const activeId = useActiveHeading(toc);
	const sections = groupSections(toc);

	if (sections.length === 0) {
		return null;
	}

	return (
		<nav aria-labelledby="toc-label" className="text-xs">
			<p
				id="toc-label"
				className="mb-4 font-semibold tracking-wider text-muted-foreground uppercase"
			>
				On this page
			</p>
			<ul className="space-y-2">
				{sections.map(({ entry, children }) => (
					<li key={entry.id}>
						<TocLink entry={entry} active={entry.id === activeId} />
						{children.length > 0 && (
							<ul className="ml-2 space-y-1 border-l pl-3">
								{children.map((child) => (
									<li key={child.id}>
										<TocLink entry={child} active={child.id === activeId} />
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
