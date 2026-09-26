import * as Alchemy from "alchemy";
import * as Cloudflare from "alchemy/Cloudflare";
import * as Drizzle from "alchemy/Drizzle";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

export const Media = Cloudflare.R2.Bucket("Media");

export const RepoCache = Cloudflare.KV.Namespace("RepoCache");

export const Database = Effect.gen(function* () {
	const schema = yield* Drizzle.Schema("Schema", {
		schema: "./src/db/schema.ts",
		out: "./src/db/migrations",
		dialect: "sqlite",
	});

	return yield* Cloudflare.D1.Database("Database", {
		migrations: schema,
	});
});

export class Website extends Cloudflare.Website.Vite<Website>()("Website", {
	env: {
		MEDIA: Media,
		DB: Database,
		REPO_CACHE: RepoCache,
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
		const media = yield* Media;
		const database = yield* Database;
		const website = yield* Website;

		return {
			mediaBucket: media.bucketName,
			databaseName: database.databaseName,
			websiteUrl: website.url.as<string>(),
		};
	})
);
