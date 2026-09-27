import * as Arr from "effect/Array";
import * as Effect from "effect/Effect";
import * as Encoding from "effect/Encoding";
import * as FileSystem from "effect/FileSystem";
import * as Order from "effect/Order";
import * as Path from "effect/Path";
import * as Schema from "effect/Schema";
import { parse } from "yaml";

import { renderPost } from "../../posts/render";
import type { TocEntry } from "../schema";

const FRONTMATTER = /^---\n(?<yaml>[\s\S]*?)\n---\n/u;
const LEGACY_DATE = /^(?<year>\d{4})-(?<month>\d{1,2})-(?<day>\d{1,2})$/u;
const MILLIS_PER_SECOND = 1000;

const IMAGE_TYPES = new Map([
	[".jpeg", "image/jpeg"],
	[".jpg", "image/jpeg"],
	[".png", "image/png"],
	[".webp", "image/webp"],
]);

export const UPSERT_MEDIA = `
INSERT INTO media (key, content_type, size) VALUES (?, ?, ?)
ON CONFLICT (key) DO UPDATE SET
      content_type = excluded.content_type,
      size = excluded.size`;

export const UPSERT_POST = `
INSERT INTO posts (
      slug, title, summary, body, html, toc, status,
      header_image_id, header_image_caption, published_at, created_at, updated_at
) VALUES (
      ?, ?, ?, ?, ?, ?, 'published',
      (SELECT id FROM media WHERE key = ?), ?, ?, ?, ?
)
ON CONFLICT (slug) DO UPDATE SET
      title = excluded.title,
      summary = excluded.summary,
      body = excluded.body,
      html = excluded.html,
      toc = excluded.toc,
      status = excluded.status,
      header_image_id = excluded.header_image_id,
      header_image_caption = excluded.header_image_caption,
      published_at = excluded.published_at,
      updated_at = excluded.updated_at`;

const Frontmatter = Schema.Struct({
	title: Schema.String,
	summary: Schema.String,
	date: Schema.String,
	headerImage: Schema.String,
	headerImageCaption: Schema.String,
});

export interface SeedImage {
	key: string;
	contentType: string;
	bytes: Uint8Array;
}

export interface SeedPost {
	slug: string;
	title: string;
	summary: string;
	body: string;
	html: string;
	toc: TocEntry[];
	publishedAt: number;
	headerImage: SeedImage;
	headerImageCaption: string;
}

// v1 dates are YAML strings like "2026-1-31", so parse them by hand as UTC.
function toUnixSeconds(date: string): number | undefined {
	const groups = LEGACY_DATE.exec(date)?.groups;
	if (groups === undefined) {
		return undefined;
	}
	const { year, month, day } = groups;
	return (
		Date.UTC(Number(year), Number(month) - 1, Number(day)) / MILLIS_PER_SECOND
	);
}

export const loadSeedPosts = Effect.fn("loadSeedPosts")(function* (
	contentDir: string
) {
	const fs = yield* FileSystem.FileSystem;
	const path = yield* Path.Path;
	const postsDir = path.join(contentDir, "posts");
	const files = Arr.sort(
		(yield* fs.readDirectory(postsDir)).filter((file) => file.endsWith(".md")),
		Order.String
	);

	// oxlint-disable-next-line unicorn/no-array-for-each, unicorn/no-array-method-this-argument -- Effect.forEach, not Array#forEach
	return yield* Effect.forEach(files, (file) =>
		Effect.gen(function* () {
			const source = yield* fs.readFileString(path.join(postsDir, file));
			const match = FRONTMATTER.exec(source);
			const meta = yield* Schema.decodeUnknownEffect(Frontmatter)(
				parse(match?.groups?.yaml ?? "")
			);
			const body = source.slice(match?.[0].length ?? 0).trimStart();
			const publishedAt = toUnixSeconds(meta.date);
			const imageName = path.basename(meta.headerImage);
			const contentType = IMAGE_TYPES.get(path.extname(imageName));
			if (publishedAt === undefined || contentType === undefined) {
				return yield* Effect.die(`Invalid date or header image in ${file}`);
			}
			const post: SeedPost = {
				slug: path.basename(file, ".md"),
				title: meta.title,
				summary: meta.summary,
				body,
				...renderPost(body),
				publishedAt,
				headerImage: {
					key: `images/${imageName}`,
					contentType,
					bytes: yield* fs.readFile(path.join(contentDir, "images", imageName)),
				},
				headerImageCaption: meta.headerImageCaption,
			};
			return post;
		})
	);
}, Effect.orDie);

// Changes whenever a post, its rendered output or its image changes, so the
// seed Action re-runs only then.
export const digestSeedPosts = Effect.fn("digestSeedPosts")(function* (
	posts: readonly SeedPost[]
) {
	const text = JSON.stringify(
		posts.map((post) => ({
			...post,
			headerImage: {
				...post.headerImage,
				bytes: Encoding.encodeBase64(post.headerImage.bytes),
			},
		}))
	);
	const hash = yield* Effect.promise(
		async () =>
			await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text))
	);
	return Encoding.encodeHex(new Uint8Array(hash));
});
