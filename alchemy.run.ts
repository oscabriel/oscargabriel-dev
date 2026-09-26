import * as Alchemy from "alchemy";
import * as Cloudflare from "alchemy/Cloudflare";
import * as Effect from "effect/Effect";

export const Media = Cloudflare.R2.Bucket("Media");

export default Alchemy.Stack(
	"oscargabriel-dev",
	{
		providers: Cloudflare.providers(),
		state: Cloudflare.state(),
	},
	Effect.gen(function* () {
		const media = yield* Media;

		return {
			mediaBucket: media.bucketName,
		};
	})
);
