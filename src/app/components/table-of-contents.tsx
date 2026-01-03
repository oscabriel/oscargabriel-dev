"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export interface Heading {
	id: string;
	text: string;
	level: number;
}

interface TableOfContentsProps {
	headings: Heading[];
}

interface GroupedHeading {
	heading: Heading;
	children: Heading[];
}

function groupHeadings(headings: Heading[]): GroupedHeading[] {
	const groups: GroupedHeading[] = [];
	let currentGroup: GroupedHeading | null = null;

	for (const heading of headings) {
		if (heading.level === 2) {
			if (currentGroup) groups.push(currentGroup);
			currentGroup = { heading, children: [] };
		} else if (heading.level === 3 && currentGroup) {
			currentGroup.children.push(heading);
		}
	}

	if (currentGroup) groups.push(currentGroup);
	return groups;
}

function scrollToHeading(id: string) {
	const element = document.getElementById(id);
	if (element) {
		const top = element.getBoundingClientRect().top + window.scrollY - 80;
		window.scrollTo({ top, behavior: "smooth" });
		window.history.pushState(null, "", `#${id}`);
	}
}

export function TableOfContents({ headings }: TableOfContentsProps) {
	const [activeId, setActiveId] = useState<string>("");
	const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

	const groups = useMemo(() => groupHeadings(headings), [headings]);

	useEffect(() => {
		const headingElements = headings.map((heading) =>
			document.getElementById(heading.id),
		);

		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						setActiveId(entry.target.id);
					}
				}
			},
			{
				rootMargin: "0% 0% -80% 0%",
				threshold: 1,
			},
		);

		for (const element of headingElements) {
			if (element) observer.observe(element);
		}

		return () => {
			for (const element of headingElements) {
				if (element) observer.unobserve(element);
			}
		};
	}, [headings]);

	if (headings.length === 0) return null;

	function toggleCollapse(id: string) {
		setCollapsed((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	}

	return (
		<nav className="max-h-[calc(100vh-8rem)] overflow-y-auto">
			<h3 className="mb-4 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
				Table of Contents
			</h3>
			<ul className="space-y-2 text-xs">
				{groups.map(({ heading, children }) => {
					const isActive = activeId === heading.id;
					const isCollapsed = collapsed.has(heading.id);
					const hasChildren = children.length > 0;

					return (
						<li key={heading.id}>
							<div className="flex items-center justify-between gap-2">
								<a
									href={`#${heading.id}`}
									className={`block py-1 transition-colors hover:text-primary ${
										isActive
											? "font-medium text-primary"
											: "text-muted-foreground"
									}`}
									onClick={(e) => {
										e.preventDefault();
										scrollToHeading(heading.id);
									}}
								>
									{heading.text}
								</a>
								{hasChildren && (
									<button
										type="button"
										onClick={() => toggleCollapse(heading.id)}
										className="p-0.5 text-muted-foreground transition-colors hover:text-primary"
									>
										<ChevronDown
											className={`h-3 w-3 transition-transform ${isCollapsed ? "-rotate-90" : ""}`}
										/>
									</button>
								)}
							</div>

							{hasChildren && !isCollapsed && (
								<ul className="ml-[7px] space-y-1 border-l border-border pl-3">
									{children.map((child) => {
										const isChildActive = activeId === child.id;
										return (
											<li key={child.id}>
												<a
													href={`#${child.id}`}
													className={`block py-1 transition-colors hover:text-primary ${
														isChildActive
															? "font-medium text-primary"
															: "text-muted-foreground"
													}`}
													onClick={(e) => {
														e.preventDefault();
														scrollToHeading(child.id);
													}}
												>
													{child.text}
												</a>
											</li>
										);
									})}
								</ul>
							)}
						</li>
					);
				})}
			</ul>
		</nav>
	);
}
