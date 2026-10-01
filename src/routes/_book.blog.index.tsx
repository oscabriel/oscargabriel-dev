import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useSyncExternalStore } from "react";

import { SITE_NAME, SITE_URL } from "@/lib/site";
import { formatContentsDate } from "@/posts/date";
import { wasOpened } from "@/posts/opened";
import { orpc } from "@/rpc/client";

const DESCRIPTION =
	"Latest articles and updates from Oscar Gabriel on web development, AI-assisted coding, and technology insights.";

export const Route = createFileRoute("/_book/blog/")({
	loader: async ({ context }) => {
		await context.queryClient.query(orpc.posts.list.queryOptions());
	},
	head: () => ({
		meta: [
			{ title: `Writing | ${SITE_NAME}` },
			{ name: "description", content: DESCRIPTION },
			{ property: "og:type", content: "website" },
			{ property: "og:title", content: `Writing | ${SITE_NAME}` },
			{ property: "og:description", content: DESCRIPTION },
			{ property: "og:url", content: `${SITE_URL}/blog` },
		],
		links: [{ rel: "canonical", href: `${SITE_URL}/blog` }],
	}),
	component: BlogPage,
});

// A dagger after a post the reader has opened before. CSS :visited can't add
// a mark, so this reads the record the post page leaves behind.
function subscribeNever() {
	return () => {
		// The mark is read once per page load.
	};
}

function VisitedMark({ slug }: { slug: string }) {
	const opened = useSyncExternalStore(
		subscribeNever,
		() => wasOpened(slug),
		() => false
	);
	if (!opened) {
		return null;
	}
	return (
		<span
			className="-ml-2 shrink-0 text-ink-soft"
			title="You’ve opened this post before"
		>
			†
		</span>
	);
}

// The contents page, set like a book's: one line per post, the title, a dotted
// leader, and its date. On phones a long title wraps and the leader runs from
// its last line, as a printed contents page turns a long entry.
function BlogPage() {
	const { data: posts } = useSuspenseQuery(orpc.posts.list.queryOptions());

	return (
		<main className="px-6 py-10 md:px-12 md:pt-10 md:pb-16">
			<h1 className="sr-only">Writing</h1>
			{posts.length === 0 ? (
				<p className="text-ink-soft">Nothing published yet.</p>
			) : (
				<ol className="max-w-3xl">
					{posts.map((post) => (
						<li
							key={post.slug}
							className="flex items-end gap-3 py-1.5 md:items-baseline"
						>
							<Link
								to="/blog/$slug"
								params={{ slug: post.slug }}
								className="min-w-0 text-lg leading-snug text-ink no-underline hover:underline md:truncate md:text-xl"
							>
								{post.title}
							</Link>
							<VisitedMark slug={post.slug} />
							<span
								aria-hidden="true"
								className="mb-1 min-w-6 flex-1 border-b border-dotted border-ink-faint"
							/>
							{post.publishedAt && (
								<time
									dateTime={post.publishedAt.toISOString()}
									className="shrink-0 text-xs smallcaps text-ink-soft"
								>
									{formatContentsDate(post.publishedAt)}
								</time>
							)}
						</li>
					))}
				</ol>
			)}
		</main>
	);
}
