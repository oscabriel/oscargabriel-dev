import { ORPCError } from "@orpc/client";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { useEffect } from "react";

import { FoldedSections } from "@/components/table-of-contents";
import { SITE_NAME, SITE_URL, mediaPath } from "@/lib/site";
import { markOpened } from "@/posts/opened";
import { PostArticle } from "@/posts/post-article";
import { orpc } from "@/rpc/client";

export const Route = createFileRoute("/_book/blog/$slug")({
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
	useEffect(() => {
		markOpened(slug);
	}, [slug]);

	return (
		/* The pages pad so their title baselines meet the name's on the leaf,
		   6.5rem down. A title's baseline falls 2.7rem below its padding; this
		   one is a size larger and falls 3.375rem, so it pads a little less. */
		<main className="px-6 py-10 md:px-12 md:pt-12.5 md:pb-16">
			<PostArticle
				title={post.title}
				publishedAt={post.publishedAt}
				headerImage={post.headerImage}
				headerImageCaption={post.headerImageCaption}
				html={post.html}
				afterHeader={
					post.toc.length > 0 ? (
						<details
							key={slug}
							className="mt-10 border-y border-rule py-3 md:hidden"
						>
							<summary className="cursor-pointer text-xs smallcaps text-ink-soft">
								In this post
							</summary>
							<FoldedSections toc={post.toc} />
						</details>
					) : undefined
				}
			/>
			<PostTurn slug={slug} />
		</main>
	);
}

// The turn at the foot of the page: the next post to read, and the one before.
function PostTurn({ slug }: { slug: string }) {
	const { data: posts } = useQuery(orpc.posts.list.queryOptions());
	if (posts === undefined) {
		return null;
	}
	const index = posts.findIndex((post) => post.slug === slug);
	if (index === -1) {
		return null;
	}
	// The list is newest first, so the next thing to read is the older post.
	const next = posts[index + 1];
	const previous = posts[index - 1];
	if (next === undefined && previous === undefined) {
		return null;
	}

	return (
		<nav
			aria-label="Other posts"
			className="mt-16 flex max-w-prose flex-col gap-3 border-t border-rule pt-6"
		>
			{next !== undefined && (
				<Link
					to="/blog/$slug"
					params={{ slug: next.slug }}
					className="text-ink no-underline hover:underline"
				>
					<span className="text-xs smallcaps text-ink-soft">Turn to </span>
					{next.title} →
				</Link>
			)}
			{previous !== undefined && (
				<Link
					to="/blog/$slug"
					params={{ slug: previous.slug }}
					className="text-ink-soft no-underline hover:text-ink hover:underline"
				>
					<span className="text-xs smallcaps">Turn back to </span>
					{previous.title}
				</Link>
			)}
		</nav>
	);
}

function PostNotFound() {
	return (
		<main className="px-6 py-10 md:px-12 md:pt-15.25 md:pb-16">
			<h1 className="text-4xl leading-tight font-medium tracking-tight text-ink">
				No such page
			</h1>
			<p className="mt-4 max-w-prose justified text-ink-soft">
				There’s no post at this address. It may have been unpublished, or the
				link was copied wrong.
			</p>
			<Link
				to="/blog"
				className="mt-6 inline-block text-ink underline decoration-ink-faint hover:decoration-ink"
			>
				Turn to the contents →
			</Link>
		</main>
	);
}
