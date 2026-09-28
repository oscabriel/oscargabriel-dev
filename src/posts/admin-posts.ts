import { eq, sql } from "drizzle-orm";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";

import { Db } from "@/db/db";
import { Posts } from "@/db/schema";
import { renderPost } from "@/posts/render";

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

// What the editor sends. No `id` creates a post; an `id` overwrites that post.
export const PostDraft = Schema.Struct({
	id: Schema.optionalKey(Schema.Int),
	slug: Schema.String.check(Schema.isPattern(SLUG)),
	title: Schema.NonEmptyString,
	summary: Schema.String,
	body: Schema.String,
	headerImageId: Schema.NullOr(Schema.Int),
	headerImageCaption: Schema.NullOr(Schema.String),
});

export class PostIdNotFound extends Schema.TaggedError<PostIdNotFound>()(
	"PostIdNotFound",
	{ id: Schema.Int }
) {}

export class SlugTaken extends Schema.TaggedError<SlugTaken>()("SlugTaken", {
	slug: Schema.String,
}) {}

const now = sql`(unixepoch())`;

// An update by id returns no rows when that id doesn't exist.
function onlyRow<A>(rows: A[], id: number) {
	return Effect.fromNullishOr(rows[0]).pipe(
		Effect.mapError(() => new PostIdNotFound({ id }))
	);
}

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

			const byId = Effect.fn("AdminPosts.byId")(function* (id: number) {
				const post = yield* db.query.Posts.findFirst({
					where: { id },
					with: { headerImage: true },
				}).pipe(Effect.orDie);
				if (post === undefined) {
					return yield* new PostIdNotFound({ id });
				}
				return post;
			});

			// Renders on save, so readers only ever get stored HTML.
			const save = Effect.fn("AdminPosts.save")(function* (
				draft: typeof PostDraft.Type
			) {
				const { id, ...fields } = draft;
				const clash = yield* db.query.Posts.findFirst({
					columns: { id: true },
					where:
						id === undefined
							? { slug: fields.slug }
							: { slug: fields.slug, id: { ne: id } },
				}).pipe(Effect.orDie);
				if (clash !== undefined) {
					return yield* new SlugTaken({ slug: fields.slug });
				}
				const values = {
					...fields,
					...renderPost(fields.body),
					updatedAt: now,
				};
				if (id === undefined) {
					const created = yield* db
						.insert(Posts)
						.values(values)
						.returning()
						.pipe(Effect.orDie);
					return yield* Effect.fromNullishOr(created[0]).pipe(Effect.orDie);
				}
				const updated = yield* db
					.update(Posts)
					.set(values)
					.where(eq(Posts.id, id))
					.returning()
					.pipe(Effect.orDie);
				return yield* onlyRow(updated, id);
			});

			// `publishedAt` is set on the first publish only; unpublishing keeps
			// it, so a republished post keeps its original date.
			const setStatus = Effect.fn("AdminPosts.setStatus")(function* (
				id: number,
				status: "draft" | "published"
			) {
				const updated = yield* db
					.update(Posts)
					.set({
						status,
						publishedAt:
							status === "published"
								? sql`coalesce(${Posts.publishedAt}, unixepoch())`
								: undefined,
					})
					.where(eq(Posts.id, id))
					.returning({
						id: Posts.id,
						status: Posts.status,
						publishedAt: Posts.publishedAt,
					})
					.pipe(Effect.orDie);
				return yield* onlyRow(updated, id);
			});

			function publish(id: number) {
				return setStatus(id, "published");
			}

			function unpublish(id: number) {
				return setStatus(id, "draft");
			}

			return { listAll, byId, save, publish, unpublish };
		}),
	}
) {
	static readonly layer = Layer.effect(this, this.make).pipe(
		Layer.provide(Db.layer)
	);
}
