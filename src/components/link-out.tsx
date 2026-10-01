import type { ComponentProps } from "react";

import { leavesSite } from "@/lib/site";

type LinkOutProps = Omit<ComponentProps<"a">, "href" | "target" | "rel"> & {
	href: string;
};

// A link that may leave the book. When it does it opens in a new tab, and
// says so to screen readers; a link to the book's own pages stays a plain
// link (see leavesSite).
export function LinkOut({ href, children, ...props }: LinkOutProps) {
	if (!leavesSite(href)) {
		return (
			<a href={href} {...props}>
				{children}
			</a>
		);
	}
	return (
		<a href={href} target="_blank" rel="noopener noreferrer" {...props}>
			{children}
			<span className="sr-only"> (opens in a new tab)</span>
		</a>
	);
}
