import * as Alchemy from "alchemy";
import * as Cloudflare from "alchemy/Cloudflare";
import * as Effect from "effect/Effect";

export const Media = Cloudflare.R2.Bucket("Media");

export class Website extends Cloudflare.Website.Vite<Website>()("Website", {
	env: {
		MEDIA: Media,
	},
}) {}

export type WebsiteEnv = Cloudflare.InferEnv<typeof Website>;

export default Alchemy.Stack(
	"oscargabriel-dev",
	{
		providers: Cloudflare.providers(),
		state: Cloudflare.state(),
	},
	Effect.gen(function* () {
		const media = yield* Media;
		const website = yield* Website;

		return {
			mediaBucket: media.bucketName,
			websiteUrl: website.url.as<string>(),
		};
	})
);
