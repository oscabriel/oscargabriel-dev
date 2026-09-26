import * as cf from "cloudflare:workers";

import type { WebsiteEnv } from "../alchemy.run.ts";

// In development mode with TanStack Start, `import { env } from "cloudflare:workers"` does not work at the top level.
// As a workaround, we use a proxy to access the env object.
/* oxlint-disable typescript/no-unsafe-type-assertion */
// SAFETY: every read is forwarded to `cf.env`, which Alchemy fills with the bindings WebsiteEnv describes.
export const env = new Proxy({} as WebsiteEnv, {
	get(_, prop) {
		// SAFETY: `prop` is a WebsiteEnv key, since callers only see the WebsiteEnv type
		return cf.env[prop as keyof typeof cf.env];
	},
});
/* oxlint-enable typescript/no-unsafe-type-assertion */
