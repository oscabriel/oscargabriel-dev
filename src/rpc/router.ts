import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import { Posts } from "@/posts/posts";
import { Projects } from "@/projects/projects";
import { pub } from "@/rpc/base";
import { Letterboxd } from "@/watching/letterboxd";

export const router = {
	projects: {
		list: pub.effect(function* () {
			const projects = yield* Projects;
			return yield* projects.list();
		}),
	},
	posts: {
		list: pub.effect(function* () {
			const posts = yield* Posts;
			return yield* posts.listPublished();
		}),
		bySlug: pub
			.errors({ NOT_FOUND: { message: "Post not found" } })
			.input(Schema.Struct({ slug: Schema.String }))
			.effect(function* ({ input, errors }) {
				const posts = yield* Posts;
				return yield* posts
					.bySlug(input.slug)
					.pipe(
						Effect.catchTag("PostNotFound", () =>
							Effect.fail(errors.NOT_FOUND())
						)
					);
			}),
	},
	watching: {
		// Provided here rather than in AppLayer, so no other page builds it.
		list: pub.effect(function* () {
			return yield* Effect.gen(function* () {
				const letterboxd = yield* Letterboxd;
				return yield* letterboxd.diary();
			}).pipe(Effect.provide(Letterboxd.layer));
		}),
	},
};
