import { createFileRoute } from "@tanstack/react-router";
import * as Effect from "effect/Effect";

import { Posts } from "@/posts/posts";
import { Projects } from "@/projects/projects";
import { runRequest } from "@/server/run";

const check = Effect.gen(function* () {
	const posts = yield* Posts;
	const projects = yield* Projects;
	return {
		posts: yield* posts.listPublished(),
		projects: yield* projects.list(),
	};
});

export const Route = createFileRoute("/api/health")({
	server: {
		handlers: {
			GET: async () => Response.json(await runRequest(check)),
		},
	},
});
