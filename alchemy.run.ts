import * as Alchemy from "alchemy";
import * as AdoptPolicy from "alchemy/AdoptPolicy";
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

const SITE_DOMAIN = "oscargabriel.dev";
const ACCESS_TEAM_DOMAIN = "https://still-glitter-6c16.cloudflareaccess.com";

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
		importFiles: ["./src/db/seed/media-alt.sql"],
	}).pipe(retainInProd);
});

// One-time PIN exists at most once per account. Adopt it if the dashboard
// already made one, and keep it on destroy: other Access apps may use it.
export const OneTimePin = Cloudflare.Access.IdentityProvider("OneTimePin", {
	type: "onetimepin",
}).pipe(AdoptPolicy.adopt(true), RemovalPolicy.retain());

// Lets agents and scripts/posts.ts reach the admin API without a browser
// login. Cloudflare reveals the secret only on create, so Alchemy keeps it in
// state: `alchemy state read oscargabriel-dev/prod/AgentToken` shows it.
// It lasts a year; bump `clientSecretVersion` to rotate the secret.
export const AgentToken = Cloudflare.Access.ServiceToken("AgentToken", {
	name: "oscargabriel-dev-agents",
});

// Access gates only the admin paths; the public site stays open. `/admin/*`
// doesn't cover `/admin` itself, so both are listed.
export const AdminAccess = Effect.gen(function* () {
	const pin = yield* OneTimePin;
	const agentToken = yield* AgentToken;
	// Same value the Worker checks the JWT email against; it's required, so a
	// missing one should stop the deploy.
	const adminEmail = yield* Config.String("ADMIN_EMAIL").pipe(Effect.orDie);

	return yield* Cloudflare.Access.Application("AdminAccess", {
		type: "self_hosted",
		destinations: [
			{ type: "public", uri: `${SITE_DOMAIN}/admin` },
			{ type: "public", uri: `${SITE_DOMAIN}/admin/*` },
			{ type: "public", uri: `${SITE_DOMAIN}/api/admin/*` },
		],
		allowedIdps: [pin.identityProviderId],
		autoRedirectToIdentity: true,
		policies: [
			{ decision: "allow", include: [{ email: adminEmail }] },
			// `non_identity` admits the token without the PIN login.
			{
				decision: "non_identity",
				include: [{ serviceToken: agentToken.serviceTokenId }],
			},
		],
	});
});

// The domain and Access exist only in prod. Other stages keep workers.dev and
// the dev bypass, and their empty Access config makes the admin API fail closed.
const accessEnv = Effect.gen(function* () {
	const { stage } = yield* Alchemy.Stack;
	if (stage !== "prod") {
		return {
			ACCESS_TEAM_DOMAIN: "",
			ACCESS_AUD: "",
			ACCESS_AGENT_CLIENT_ID: "",
		};
	}
	const admin = yield* AdminAccess;
	const agentToken = yield* AgentToken;
	return {
		ACCESS_TEAM_DOMAIN,
		ACCESS_AUD: admin.aud,
		// The JWT's `common_name` for requests made with the agent token.
		ACCESS_AGENT_CLIENT_ID: agentToken.clientId,
	};
});

export class Website extends Cloudflare.Website.Vite<Website>()(
	"Website",
	Effect.gen(function* () {
		const { stage } = yield* Alchemy.Stack;

		return {
			dev: {
				host: "127.0.0.1",
				port: 3005,
				strictPort: true,
				// Local dev has no Access edge; act as a signed-in admin instead.
				access: { identity: { email: "dev@localhost" } },
			},
			domain: stage === "prod" ? SITE_DOMAIN : undefined,
			env: {
				MEDIA: Media,
				DB: Database,
				REPO_CACHE: RepoCache,
				GITHUB_TOKEN: Config.Redacted("GITHUB_TOKEN"),
				ADMIN_EMAIL: Config.String("ADMIN_EMAIL"),
				// The Roll of Arms: Clef reads a site, the browser draws it. Both
				// reach the real services even in dev: AI has no local stand-in,
				// and the local browser can't take the snapshot the forge asks for.
				AI: Cloudflare.Workers.AI(),
				BROWSER: Cloudflare.Workers.Browser().pipe(Alchemy.remote()),
				...(yield* accessEnv),
			},
		};
	})
) {}

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
