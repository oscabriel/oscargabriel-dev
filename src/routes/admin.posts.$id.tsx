import { ORPCError } from "@orpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, notFound } from "@tanstack/react-router";

import { PostEditor } from "@/admin/post-editor";
import { SITE_NAME } from "@/lib/site";
import { adminOrpc } from "@/rpc/admin-client";

export const Route = createFileRoute("/admin/posts/$id")({
	params: {
		parse: ({ id }) => ({ id: Number(id) }),
		stringify: ({ id }) => ({ id: String(id) }),
	},
	loader: async ({ context, params }) => {
		if (!Number.isInteger(params.id)) {
			throw notFound();
		}
		try {
			const post = await context.queryClient.query(
				adminOrpc.posts.byId.queryOptions({ input: { id: params.id } })
			);
			return { title: post.title };
		} catch (error) {
			if (error instanceof ORPCError && error.code === "NOT_FOUND") {
				throw notFound();
			}
			throw error;
		}
	},
	head: ({ loaderData }) => ({
		meta: [{ title: `${loaderData?.title ?? "Edit post"} | ${SITE_NAME}` }],
	}),
	component: EditPost,
	notFoundComponent: PostNotFound,
});

function EditPost() {
	const { id } = Route.useParams();
	const { data: post } = useSuspenseQuery(
		adminOrpc.posts.byId.queryOptions({ input: { id } })
	);
	// Keyed by id so switching posts starts a fresh editor instead of carrying
	// one post's unsaved text into another.
	return <PostEditor key={post.id} post={post} />;
}

function PostNotFound() {
	return (
		<div className="max-w-md p-8">
			<h1 className="text-lg font-semibold">This post doesn’t exist</h1>
			<p className="mt-2 text-sm text-muted-foreground">
				It may have been deleted. Choose another post from the list.
			</p>
		</div>
	);
}
