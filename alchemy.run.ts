import * as Alchemy from "alchemy";
import * as Cloudflare from "alchemy/Cloudflare";
import * as Drizzle from "alchemy/Drizzle";
import * as RemovalPolicy from "alchemy/RemovalPolicy";
import * as Config from "effect/Config";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";

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
	dev: {
		host: "127.0.0.1",
		port: 3005,
		strictPort: true,
		// Local dev has no Access edge; act as a signed-in admin instead.
		access: { identity: { email: "dev@localhost" } },
	},
	env: {
		MEDIA: Media,
		DB: Database,
		REPO_CACHE: RepoCache,
		GITHUB_TOKEN: Config.Redacted("GITHUB_TOKEN"),
		ADMIN_EMAIL: Config.String("ADMIN_EMAIL"),
		ACCESS_TEAM_DOMAIN: Config.String("ACCESS_TEAM_DOMAIN").pipe(
			Config.withDefault("")
		),
		ACCESS_AUD: Config.String("ACCESS_AUD").pipe(Config.withDefault("")),
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

		// In dev, show the reverse-proxy HTTPS domain instead of the local port.
		const devUrl = caddyDevHost.pipe(
			Option.filter((host) => stage === "dev" && host !== ""),
			Option.map((host) => `https://${host}`)
		);

		return {
			mediaBucket: media.bucketName,
			databaseName: database.databaseName,
			websiteUrl: Option.getOrElse(devUrl, () => website.url.as<string>()),
		};
	})
);
