import { createFileRoute } from "@tanstack/react-router";
import { count } from "drizzle-orm";
import * as Effect from "effect/Effect";

import { Db } from "@/db/db";
import { MediaFiles, Posts, Projects } from "@/db/schema";
import { GitHub } from "@/github/github";
import { runRequest } from "@/server/run";

const check = Effect.gen(function* () {
	const db = yield* Db;
	const github = yield* GitHub;
	const [[posts], [projects], [media]] = yield* Effect.all([
		db.select({ value: count() }).from(Posts),
		db.select({ value: count() }).from(Projects),
		db.select({ value: count() }).from(MediaFiles),
	]);
	const repo = yield* github.repoStats("oscabriel", "oscargabriel-dev");
	return {
		posts: posts?.value,
		projects: projects?.value,
		media: media?.value,
		repo,
	};
});

export const Route = createFileRoute("/api/health")({
	server: {
		handlers: {
			GET: async () => Response.json(await runRequest(check)),
		},
	},
});
