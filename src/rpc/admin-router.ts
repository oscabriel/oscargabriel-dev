import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import { ArmsSmith } from "@/arms/roll";
import { MediaStore, MediaUpload } from "@/media/media-store";
import { AdminPosts, PostSave } from "@/posts/admin-posts";
import { admin } from "@/rpc/base";

const PostId = Schema.Struct({ id: Schema.Int });

const withNotFound = admin.errors({
	NOT_FOUND: { message: "Post not found" },
});

// Forging spends Clef and browser time, so only the author can do it for now.
const forgeArms = admin
	.errors({
		NOT_A_SITE: { message: "That isn't a public site" },
		REFUSED: { message: "The judge refused the site" },
		UNREADABLE: { message: "The site couldn't be read" },
		UNAVAILABLE: { message: "Set or Clef didn't answer" },
	})
	.input(Schema.Struct({ url: Schema.String, judge: Schema.Boolean }))
	.effect(function* ({ input, errors }) {
		const smith = yield* ArmsSmith;
		return yield* smith.forgeAndKeep(input.url, input.judge).pipe(
			Effect.catchTags({
				NotASite: (refusal) =>
					Effect.fail(errors.NOT_A_SITE({ message: refusal.reason })),
				ArmsRefused: (refusal) =>
					Effect.fail(errors.REFUSED({ message: refusal.reasons.join(" ") })),
				SurveyError: () => Effect.fail(errors.UNREADABLE()),
				SetWorldError: (error) =>
					Effect.logError("Set failed", error).pipe(
						Effect.andThen(Effect.fail(errors.UNAVAILABLE()))
					),
				ClefError: (error) =>
					Effect.logError("Clef failed", error).pipe(
						Effect.andThen(Effect.fail(errors.UNAVAILABLE()))
					),
				UnreadableAnswer: (error) =>
					Effect.logError("Clef answered oddly", error).pipe(
						Effect.andThen(Effect.fail(errors.UNAVAILABLE()))
					),
			})
		);
	});

export const adminRouter = {
	arms: { forge: forgeArms },
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
			.errors({
				CONFLICT: { message: "Slug already in use" },
				PRECONDITION_FAILED: {
					message: "The post changed since you last loaded it",
				},
			})
			.input(PostSave)
			.effect(function* ({ input, errors }) {
				const posts = yield* AdminPosts;
				return yield* posts.save(input).pipe(
					Effect.catchTags({
						PostIdNotFound: () => Effect.fail(errors.NOT_FOUND()),
						PostChanged: () => Effect.fail(errors.PRECONDITION_FAILED()),
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
		delete: withNotFound.input(PostId).effect(function* ({ input, errors }) {
			const posts = yield* AdminPosts;
			return yield* posts
				.remove(input.id)
				.pipe(
					Effect.catchTag("PostIdNotFound", () =>
						Effect.fail(errors.NOT_FOUND())
					)
				);
		}),
	},
	media: {
		list: admin.effect(function* () {
			const media = yield* MediaStore;
			return yield* media.list();
		}),
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
