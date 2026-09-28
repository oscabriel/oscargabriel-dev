import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import { MediaStore, MediaUpload } from "@/media/media-store";
import { AdminPosts, PostDraft } from "@/posts/admin-posts";
import { admin } from "@/rpc/base";

const PostId = Schema.Struct({ id: Schema.Int });

const withNotFound = admin.errors({
	NOT_FOUND: { message: "Post not found" },
});

export const adminRouter = {
	posts: {
		listAll: admin.effect(function* () {
			const posts = yield* AdminPosts;
			return yield* posts.listAll();
		}),
		byId: withNotFound.input(PostId).effect(function* ({ input, errors }) {
			const posts = yield* AdminPosts;
			return yield* posts
				.byId(input.id)
				.pipe(
					Effect.catchTag("PostIdNotFound", () =>
						Effect.fail(errors.NOT_FOUND())
					)
				);
		}),
		save: withNotFound
			.errors({ CONFLICT: { message: "Slug already in use" } })
			.input(PostDraft)
			.effect(function* ({ input, errors }) {
				const posts = yield* AdminPosts;
				return yield* posts.save(input).pipe(
					Effect.catchTags({
						PostIdNotFound: () => Effect.fail(errors.NOT_FOUND()),
						SlugTaken: () => Effect.fail(errors.CONFLICT()),
					})
				);
			}),
		publish: withNotFound.input(PostId).effect(function* ({ input, errors }) {
			const posts = yield* AdminPosts;
			return yield* posts
				.publish(input.id)
				.pipe(
					Effect.catchTag("PostIdNotFound", () =>
						Effect.fail(errors.NOT_FOUND())
					)
				);
		}),
		unpublish: withNotFound.input(PostId).effect(function* ({ input, errors }) {
			const posts = yield* AdminPosts;
			return yield* posts
				.unpublish(input.id)
				.pipe(
					Effect.catchTag("PostIdNotFound", () =>
						Effect.fail(errors.NOT_FOUND())
					)
				);
		}),
	},
	media: {
		upload: admin
			.errors({
				UNSUPPORTED_MEDIA_TYPE: {
					message: "Only PNG, JPEG, GIF, WebP and AVIF images are accepted",
				},
			})
			.input(MediaUpload)
			.effect(function* ({ input, errors }) {
				const media = yield* MediaStore;
				return yield* media
					.upload(input)
					.pipe(
						Effect.catchTag("UnsupportedImage", () =>
							Effect.fail(errors.UNSUPPORTED_MEDIA_TYPE())
						)
					);
			}),
	},
};
