import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { Db } from "@/db/db";

// Admin-side post access: sees drafts as well as published posts.
export class AdminPosts extends Context.Service<AdminPosts>()(
	"app/AdminPosts",
	{
		make: Effect.gen(function* () {
			const db = yield* Db;

			const listAll = Effect.fn("AdminPosts.listAll")(function* () {
				return yield* db.query.Posts.findMany({
					columns: {
						id: true,
						slug: true,
						title: true,
						status: true,
						publishedAt: true,
						updatedAt: true,
					},
					orderBy: { updatedAt: "desc" },
				}).pipe(Effect.orDie);
			});

			return { listAll };
		}),
	}
) {
	static readonly layer = Layer.effect(this, this.make).pipe(
		Layer.provide(Db.layer)
	);
}
