import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Encoding from "effect/Encoding";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";

import { Db } from "@/db/db";
import { MediaFiles } from "@/db/schema";
import { env } from "@/env";
import { sniffImageType } from "@/media/sniff";

export const MediaUpload = Schema.Struct({
	file: Schema.File,
	alt: Schema.NonEmptyString,
});

export class UnsupportedImage extends Schema.TaggedError<UnsupportedImage>()(
	"UnsupportedImage",
	{ name: Schema.String }
) {}

export class MediaStore extends Context.Service<MediaStore>()(
	"app/MediaStore",
	{
		make: Effect.gen(function* () {
			const db = yield* Db;
			// Read when the layer is built, per request, not at module load.
			const bucket = env.MEDIA;

			// Keys are the SHA-256 of the bytes, so the same image uploaded twice
			// lands on the same object and row, and a key never changes content.
			const upload = Effect.fn("MediaStore.upload")(function* ({
				file,
				alt,
			}: typeof MediaUpload.Type) {
				const bytes = new Uint8Array(
					yield* Effect.promise(async () => await file.arrayBuffer())
				);
				const type = sniffImageType(bytes);
				if (type === undefined) {
					return yield* new UnsupportedImage({ name: file.name });
				}
				const digest = yield* Effect.promise(
					async () => await crypto.subtle.digest("SHA-256", bytes)
				);
				const key = `images/${Encoding.encodeHex(new Uint8Array(digest))}.${type.extension}`;
				// Object first, then row: a row never points at a missing object.
				yield* Effect.promise(
					async () =>
						await bucket.put(key, bytes, {
							httpMetadata: { contentType: type.contentType },
						})
				);
				const rows = yield* db
					.insert(MediaFiles)
					.values({
						key,
						contentType: type.contentType,
						size: bytes.byteLength,
						alt,
					})
					.onConflictDoUpdate({ target: MediaFiles.key, set: { alt } })
					.returning()
					.pipe(Effect.orDie);
				return yield* Effect.fromNullishOr(rows[0]).pipe(Effect.orDie);
			});

			return { upload };
		}),
	}
) {
	static readonly layer = Layer.effect(this, this.make).pipe(
		Layer.provide(Db.layer)
	);
}
