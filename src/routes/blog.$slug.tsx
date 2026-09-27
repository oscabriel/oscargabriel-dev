import { ORPCError } from "@orpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute, notFound } from "@tanstack/react-router";

import { TableOfContents } from "@/components/table-of-contents";
import { SITE_NAME, SITE_URL, mediaPath } from "@/lib/site";
import { formatPublishedAt } from "@/posts/date";
import { orpc } from "@/rpc/client";

export const Route = createFileRoute("/blog/$slug")({
	loader: async ({ context, params }) => {
		try {
			const post = await context.queryClient.query(
				orpc.posts.bySlug.queryOptions({ input: { slug: params.slug } })
			);
			// Only what head() needs. The page reads the full post from the query cache.
			return {
				title: post.title,
				summary: post.summary,
				publishedAt: post.publishedAt,
				imageKey: post.headerImage?.key,
			};
		} catch (error) {
			// Turn the procedure's typed NOT_FOUND into the router's 404.
			if (error instanceof ORPCError && error.code === "NOT_FOUND") {
				throw notFound();
			}
			throw error;
		}
	},
	head: ({ loaderData, params }) => {
		if (loaderData === undefined) {
			return {};
		}
		const url = `${SITE_URL}/blog/${params.slug}`;
		const meta = [
			{ title: `${loaderData.title} | ${SITE_NAME}` },
			{ name: "description", content: loaderData.summary },
			{ property: "og:type", content: "article" },
			{ property: "og:title", content: loaderData.title },
			{ property: "og:description", content: loaderData.summary },
			{ property: "og:url", content: url },
		];
		if (loaderData.imageKey !== undefined) {
			meta.push(
				{
					property: "og:image",
					content: `${SITE_URL}${mediaPath(loaderData.imageKey)}`,
				},
				{ name: "twitter:card", content: "summary_large_image" }
			);
		}
		if (loaderData.publishedAt) {
			meta.push({
				property: "article:published_time",
				content: loaderData.publishedAt.toISOString(),
			});
		}
		return { meta, links: [{ rel: "canonical", href: url }] };
	},
	component: PostPage,
	notFoundComponent: PostNotFound,
});

function PostPage() {
	const { slug } = Route.useParams();
	const { data: post } = useSuspenseQuery(
		orpc.posts.bySlug.queryOptions({ input: { slug } })
	);

	return (
		<main className="p-8">
			<aside className="fixed top-8 left-4 hidden max-h-[calc(100vh-4rem)] w-56 overflow-y-auto xl:block">
				<TableOfContents toc={post.toc} />
			</aside>
			<article className="mx-auto max-w-3xl">
				<h1 className="text-4xl font-bold">{post.title}</h1>
				{post.publishedAt && (
					<time dateTime={post.publishedAt.toISOString()}>
						{formatPublishedAt(post.publishedAt)}
					</time>
				)}
				{post.headerImage && (
					<figure className="mt-8">
						<img
							src={mediaPath(post.headerImage.key)}
							alt={post.headerImage.alt ?? ""}
							fetchPriority="high"
							className="aspect-video w-full rounded-lg object-cover"
						/>
						{post.headerImageCaption !== null && (
							<figcaption className="mt-2 text-center text-sm text-muted-foreground italic">
								{post.headerImageCaption}
							</figcaption>
						)}
					</figure>
				)}
				<div
					className="post-body mt-8"
					// oxlint-disable-next-line react/no-danger -- Rendered from the owner's own markdown when the post is saved.
					dangerouslySetInnerHTML={{ __html: post.html }}
				/>
			</article>
		</main>
	);
}

function PostNotFound() {
	return (
		<main className="p-8">
			<h1 className="text-4xl font-bold">Post not found</h1>
			<p className="mt-4">The post you’re looking for doesn’t exist.</p>
			<Link to="/blog" className="mt-4 inline-block">
				← Back to blog
			</Link>
		</main>
	);
}
