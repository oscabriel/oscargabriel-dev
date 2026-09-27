import * as Alchemy from "alchemy";
import * as Cloudflare from "alchemy/Cloudflare";
import * as Drizzle from "alchemy/Drizzle";
import * as RemovalPolicy from "alchemy/RemovalPolicy";
import * as Config from "effect/Config";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";

import {
	DELETE_MEDIA,
	digestSeedPosts,
	loadSeedPosts,
	RETIRED_MEDIA_KEYS,
	UPSERT_MEDIA,
	UPSERT_POST,
} from "./src/db/seed/posts.ts";

// Prod data outlives `alchemy destroy` and replacements; dev stays disposable.
// Piped here, not at a `yield*` site, because the first registration of a
// resource fixes its policy and Website's env yields these too.
const retainInProd = RemovalPolicy.retain(
	Alchemy.Stack.useSync((stack) => stack.stage === "prod")
);

export const Media = Cloudflare.R2.Bucket("Media").pipe(retainInProd);

export const RepoCache = Cloudflare.KV.Namespace("RepoCache");

export const Database = Effect.gen(function* () {
	const schema = yield* Drizzle.Schema("Schema", {
		schema: "./src/db/schema.ts",
		out: "./src/db/migrations",
		dialect: "sqlite",
	});

	return yield* Cloudflare.D1.Database("Database", {
		migrations: schema,
		importFiles: ["./src/db/seed/projects.sql"],
	}).pipe(retainInProd);
});

export class Website extends Cloudflare.Website.Vite<Website>()("Website", {
	dev: { host: "127.0.0.1", port: 3005, strictPort: true },
	env: {
		MEDIA: Media,
		DB: Database,
		REPO_CACHE: RepoCache,
		GITHUB_TOKEN: Config.Redacted("GITHUB_TOKEN"),
	},
}) {}

export type WebsiteEnv = Cloudflare.InferEnv<typeof Website>;

export default Alchemy.Stack(
	"oscargabriel-dev",
	{
		providers: Layer.mergeAll(Cloudflare.providers(), Drizzle.providers()),
		state: Cloudflare.state(),
	},
	Effect.gen(function* () {
		const { stage } = yield* Alchemy.Stack;
		const caddyDevHost = yield* Config.option(Config.String("CADDY_DEV_HOST"));
		const media = yield* Media;
		const database = yield* Database;
		const website = yield* Website;
		// Imports the v1 posts and their header images. Re-runs only when the
		// rendered posts or images change. Remove once the admin editor lands.
		const posts = yield* loadSeedPosts("content");
		const SeedPosts = Alchemy.Action(
			"SeedPosts",
			Effect.gen(function* () {
				const db = yield* Cloudflare.D1.QueryDatabase(database);
				const bucket = yield* Cloudflare.R2.WriteBucket(media);
				return Effect.fn(function* () {
					for (const { headerImage } of posts) {
						yield* bucket.put(headerImage.key, headerImage.bytes, {
							httpMetadata: { contentType: headerImage.contentType },
						});
					}
					const upserts = posts.flatMap((post) => [
						db
							.prepare(UPSERT_MEDIA)
							.bind(
								post.headerImage.key,
								post.headerImage.contentType,
								post.headerImage.bytes.byteLength
							),
						db
							.prepare(UPSERT_POST)
							.bind(
								post.slug,
								post.title,
								post.summary,
								post.body,
								post.html,
								JSON.stringify(post.toc),
								post.headerImage.key,
								post.headerImageCaption,
								post.publishedAt,
								post.publishedAt,
								post.publishedAt
							),
					]);
					// Runs after the upserts, so no post still points at a retired row.
					const retirements = RETIRED_MEDIA_KEYS.map((key) =>
						db.prepare(DELETE_MEDIA).bind(key)
					);
					yield* db.batch([...upserts, ...retirements]);
					yield* bucket.delete(RETIRED_MEDIA_KEYS);
					return { posts: posts.length };
				});
			}).pipe(
				Effect.provide(
					Layer.mergeAll(
						Cloudflare.D1.QueryDatabaseLocal,
						Cloudflare.R2.WriteBucketLocal
					)
				)
			)
		);
		const seeded = yield* SeedPosts({
			databaseId: database.databaseId,
			bucketName: media.bucketName,
			digest: yield* digestSeedPosts(posts),
		});

		// In dev, show the reverse-proxy HTTPS domain instead of the local port.
		const devUrl = caddyDevHost.pipe(
			Option.filter((host) => stage === "dev" && host !== ""),
			Option.map((host) => `https://${host}`)
		);

		return {
			mediaBucket: media.bucketName,
			databaseName: database.databaseName,
			websiteUrl: Option.getOrElse(devUrl, () => website.url.as<string>()),
			seededPosts: seeded.posts,
		};
	})
);
