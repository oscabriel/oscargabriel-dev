import { useQuery } from "@tanstack/react-query";
import { Link, useMatch } from "@tanstack/react-router";

import { ThumbIndexSections } from "@/components/table-of-contents";
import { SITE_NAME } from "@/lib/site";
import { orpc } from "@/rpc/client";
import { ThemeToggle } from "@/theme/theme";

const GITHUB_URL = "https://github.com/oscabriel";

// A stepped tab on the leaf's edge. The current one breaks the hairline, the
// way a thumb index notch cuts into a book's fore-edge.
const TAB_CLASS =
	"group flex items-baseline gap-2 border-b border-transparent px-3 py-1.5 smallcaps text-sm text-ink-soft transition-colors hover:text-ink aria-[current=page]:border-b-ink aria-[current=page]:text-ink md:relative md:border-r md:border-b-0 md:pr-5 md:pl-6 md:aria-[current=page]:border-r-paper md:aria-[current=page]:border-b-0";

function Manicule({ className }: { className?: string }) {
	return (
		<span aria-hidden="true" className={className}>
			☞
		</span>
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
	return <ThumbIndexSections toc={post.toc} postKey={post.slug} />;
}

export function Leaf() {
	return (
		<aside className="relative border-b border-rule book-leaf md:sticky md:top-0 md:h-dvh md:border-b-0 md:before:absolute md:before:inset-y-0 md:before:right-0 md:before:w-px md:before:bg-rule">
			<div className="flex flex-col md:h-full md:overflow-y-auto">
				<div className="px-6 pt-8 pb-6 md:pt-12">
					<Link
						to="/"
						className="text-base font-medium tracking-tight text-ink no-underline"
					>
						{SITE_NAME}
					</Link>
					<p className="mt-5 hidden max-w-[30ch] text-sm leading-relaxed text-ink-soft md:block">
						I build software for the web and write long, technical posts about
						what I learn along the way. This is where the writing lives, and the
						things I’ve built sit alongside it.
					</p>
				</div>
				<nav aria-label="Site" className="md:mt-2">
					<ul className="flex flex-wrap gap-x-1 px-3 pb-3 md:block md:px-0 md:pb-0">
						<li>
							<Link to="/blog" className={TAB_CLASS}>
								<Manicule className="hidden md:inline md:w-4 md:opacity-0 md:group-aria-[current=page]:opacity-100" />
								Writing
							</Link>
						</li>
						<li>
							<Link to="/projects" className={TAB_CLASS}>
								<Manicule className="hidden md:inline md:w-4 md:opacity-0 md:group-aria-[current=page]:opacity-100" />
								Projects
							</Link>
						</li>
						<li>
							<Link to="/cv" className={TAB_CLASS}>
								<Manicule className="hidden md:inline md:w-4 md:opacity-0 md:group-aria-[current=page]:opacity-100" />
								CV
							</Link>
						</li>
						<li>
							<a
								href={GITHUB_URL}
								target="_blank"
								rel="noopener noreferrer"
								className={TAB_CLASS}
							>
								<Manicule className="hidden md:inline md:w-4 md:opacity-0" />
								GitHub
							</a>
						</li>
					</ul>
				</nav>
				<div className="hidden md:block">
					<OpenPostSections />
				</div>
				<div className="mt-auto hidden px-6 pt-8 pb-6 text-xs text-ink-soft italic md:block">
					<p>Set in EB Garamond &amp; Courier Prime.</p>
					<ThemeToggle className="mt-1 text-ink-soft underline decoration-ink-faint hover:text-ink" />
				</div>
			</div>
		</aside>
	);
}
