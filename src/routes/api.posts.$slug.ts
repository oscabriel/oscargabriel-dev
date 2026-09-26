import { createFileRoute } from "@tanstack/react-router";
import * as Effect from "effect/Effect";

import { Posts } from "@/posts/posts";
import { runRequest } from "@/server/run";

function getPost(slug: string) {
	return Effect.gen(function* () {
		const posts = yield* Posts;
		return Response.json(yield* posts.bySlug(slug));
	}).pipe(
		Effect.catchTag("PostNotFound", (notFound) =>
			Effect.succeed(
				Response.json(
					{ error: `No post with slug "${notFound.slug}"` },
					{ status: 404 }
				)
			)
		)
	);
}

export const Route = createFileRoute("/api/posts/$slug")({
	server: {
		handlers: {
			GET: async ({ params }) => await runRequest(getPost(params.slug)),
		},
	},
});
