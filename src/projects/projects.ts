import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { Db } from "@/db/db";
import { GitHub } from "@/github/github";

export class Projects extends Context.Service<Projects>()("app/Projects", {
	make: Effect.gen(function* () {
		const db = yield* Db;
		const github = yield* GitHub;

		const list = Effect.fn("Projects.list")(function* () {
			const rows = yield* db.query.Projects.findMany({
				orderBy: { launchedAt: "desc" },
			}).pipe(Effect.orDie);
			// oxlint-disable-next-line unicorn/no-array-for-each -- Effect.forEach, not Array#forEach
			return yield* Effect.forEach(
				rows,
				(project) =>
					github.repoStats(project.repoOwner, project.repoName).pipe(
						// A project still renders when GitHub is down; it just has no stats.
						Effect.catchTag("GitHubError", (error) =>
							Effect.logWarning("GitHub stats unavailable", error).pipe(
								Effect.as(null)
							)
						),
						Effect.map((stats) => ({ ...project, stats }))
					),
				{ concurrency: "unbounded" }
			);
		});

		return { list };
	}),
}) {
	static readonly layer = Layer.effect(this, this.make).pipe(
		Layer.provide(Layer.mergeAll(Db.layer, GitHub.layer))
	);
}
