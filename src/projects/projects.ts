import * as Arr from "effect/Array";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Order from "effect/Order";

import { GitHub } from "@/github/github";
import { PROJECTS } from "@/projects/data";

// Newest push first; a project GitHub has never answered for goes last.
const newestFirst = Order.flip(
	Order.mapInput(
		Option.makeOrder(Order.Date),
		(project: { updatedAt: Date | null }) =>
			Option.fromNullOr(project.updatedAt)
	)
);

export class Projects extends Context.Service<Projects>()("app/Projects", {
	make: Effect.gen(function* () {
		const github = yield* GitHub;

		const list = Effect.fn("Projects.list")(function* () {
			// oxlint-disable-next-line unicorn/no-array-for-each -- Effect.forEach, not Array#forEach
			const projects = yield* Effect.forEach(
				PROJECTS,
				(project) =>
					github.repoStats(project.repoOwner, project.repoName).pipe(
						// GitHub down and nothing kept from before: the project still renders, without stats.
						Effect.catchTag("GitHubError", (error) =>
							Effect.logWarning("GitHub stats unavailable", error).pipe(
								Effect.as(null)
							)
						),
						// Dated by the repo's last push; null only when GitHub has
						// never been read for it.
						Effect.map((stats) => ({
							...project,
							stats,
							updatedAt: stats === null ? null : new Date(stats.pushedAt),
						}))
					),
				{ concurrency: "unbounded" }
			);
			// The most recently worked on comes first, so the order follows the pushes.
			return Arr.sort(projects, newestFirst);
		});

		return { list };
	}),
}) {
	static readonly layer = Layer.effect(this, this.make).pipe(
		Layer.provide(GitHub.layer)
	);
}
