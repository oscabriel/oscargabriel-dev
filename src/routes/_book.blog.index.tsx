import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useSyncExternalStore } from "react";

import { SITE_NAME, SITE_URL } from "@/lib/site";
import { formatPublishedAt } from "@/posts/date";
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

// A dagger after a post the reader has opened before, read from the ribbon
// the post page leaves behind. CSS :visited can't add a mark, so this can.
function subscribeNever() {
	return () => {
		// The mark is read once per page load.
	};
}

function readOpened(slug: string): boolean {
	try {
		return localStorage.getItem(`ribbon:${slug}`) !== null;
	} catch {
		return false;
	}
}

function VisitedMark({ slug }: { slug: string }) {
	const opened = useSyncExternalStore(
		subscribeNever,
		() => readOpened(slug),
		() => false
	);
	if (!opened) {
		return null;
	}
	return (
		<span className="ml-1 text-ink-soft" title="You’ve opened this post before">
			†
		</span>
	);
}

// The contents page: each entry a title, a dotted leader, and its date.
function BlogPage() {
	const { data: posts } = useSuspenseQuery(orpc.posts.list.queryOptions());

	return (
		<main className="px-6 py-10 md:px-12 md:py-16">
			<h1 className="text-4xl leading-tight font-medium tracking-tight text-ink">
				Writing
			</h1>
			{posts.length === 0 ? (
				<p className="mt-6 text-ink-soft">Nothing published yet.</p>
			) : (
				<ol className="mt-10 max-w-prose">
					{posts.map((post) => (
						<li key={post.slug} className="border-t border-rule py-6">
							<div className="flex items-baseline gap-3">
								<Link
									to="/blog/$slug"
									params={{ slug: post.slug }}
									className="text-xl font-medium text-ink no-underline hover:underline"
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
										{formatPublishedAt(post.publishedAt)}
									</time>
								)}
							</div>
							<p className="mt-2 max-w-[60ch] leading-relaxed text-ink-soft">
								{post.summary}
							</p>
						</li>
					))}
				</ol>
			)}
		</main>
	);
}
