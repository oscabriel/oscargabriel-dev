import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";

import { SITE_NAME, SITE_URL } from "@/lib/site";
import { formatPublishedAt } from "@/posts/date";
import { orpc } from "@/rpc/client";

const DESCRIPTION =
	"Latest articles and updates from Oscar Gabriel on web development, AI-assisted coding, and technology insights.";

export const Route = createFileRoute("/blog/")({
	loader: async ({ context }) => {
		await context.queryClient.query(orpc.posts.list.queryOptions());
	},
	head: () => ({
		meta: [
			{ title: `Blog | ${SITE_NAME}` },
			{ name: "description", content: DESCRIPTION },
			{ property: "og:type", content: "website" },
			{ property: "og:title", content: `Blog | ${SITE_NAME}` },
			{ property: "og:description", content: DESCRIPTION },
			{ property: "og:url", content: `${SITE_URL}/blog` },
		],
		links: [{ rel: "canonical", href: `${SITE_URL}/blog` }],
	}),
	component: BlogPage,
});

function BlogPage() {
	const { data: posts } = useSuspenseQuery(orpc.posts.list.queryOptions());

	return (
		<main className="p-8">
			<h1 className="text-4xl font-bold">Blog</h1>
			{posts.length === 0 ? (
				<p className="mt-4">No posts yet.</p>
			) : (
				<ul className="mt-4 space-y-6">
					{posts.map((post) => (
						<li key={post.slug}>
							<Link to="/blog/$slug" params={{ slug: post.slug }}>
								{post.title}
							</Link>
							{post.publishedAt && (
								<time dateTime={post.publishedAt.toISOString()}>
									{formatPublishedAt(post.publishedAt)}
								</time>
							)}
							<p>{post.summary}</p>
						</li>
					))}
				</ul>
			)}
		</main>
	);
}
