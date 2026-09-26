import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";

import { Db } from "@/db/db";

export class PostNotFound extends Schema.TaggedError<PostNotFound>()(
	"PostNotFound",
	{ slug: Schema.String }
) {}

export class Posts extends Context.Service<Posts>()("app/Posts", {
	make: Effect.gen(function* () {
		const db = yield* Db;

		const listPublished = Effect.fn("Posts.listPublished")(function* () {
			return yield* db.query.Posts.findMany({
				columns: { slug: true, title: true, summary: true, publishedAt: true },
				where: { status: "published" },
				orderBy: { publishedAt: "desc" },
			}).pipe(Effect.orDie);
		});

		const bySlug = Effect.fn("Posts.bySlug")(function* (slug: string) {
			const post = yield* db.query.Posts.findFirst({
				where: { slug, status: "published" },
				with: { headerImage: true },
			}).pipe(Effect.orDie);
			if (post === undefined) {
				return yield* new PostNotFound({ slug });
			}
			return post;
		});

		return { listPublished, bySlug };
	}),
}) {
	static readonly layer = Layer.effect(this, this.make).pipe(
		Layer.provide(Db.layer)
	);
}
