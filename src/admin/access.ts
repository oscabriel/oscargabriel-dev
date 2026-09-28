import * as cf from "cloudflare:workers";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import { createRemoteJWKSet, jwtVerify } from "jose";

import { env } from "@/env";

export interface AdminIdentity {
	email: string;
}

export class AccessDenied extends Schema.TaggedError<AccessDenied>()(
	"AccessDenied",
	{ reason: Schema.String }
) {}

const AccessClaims = Schema.Struct({ email: Schema.String });

// `alchemy dev` sets ALCHEMY_DEV_ACCESS from `dev.access` in alchemy.run.ts. A
// deployed Worker never has it, so the bypass can't reach production.
const DevAccessEnv = Schema.Struct({
	ALCHEMY_DEV_ACCESS: Schema.Struct({
		identity: Schema.Struct({ email: Schema.String }),
	}),
});

function readDevAccess(): Option.Option<AdminIdentity> {
	return Schema.decodeUnknownOption(DevAccessEnv)(cf.env).pipe(
		Option.map(({ ALCHEMY_DEV_ACCESS }) => ALCHEMY_DEV_ACCESS.identity)
	);
}

// jose caches the fetched keys on the key set, so keep one per isolate.
const keySets = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function keySetFor(teamDomain: string): ReturnType<typeof createRemoteJWKSet> {
	const cached = keySets.get(teamDomain);
	if (cached !== undefined) {
		return cached;
	}
	const keySet = createRemoteJWKSet(
		new URL("/cdn-cgi/access/certs", teamDomain)
	);
	keySets.set(teamDomain, keySet);
	return keySet;
}

// Cloudflare Access puts a signed JWT on every request it lets through. Check
// it here too, so the admin API fails closed if Access is missing or misrouted.
export const verifyAdmin = Effect.fn("verifyAdmin")(function* (
	headers: Headers
) {
	const dev = readDevAccess();
	if (Option.isSome(dev)) {
		return dev.value;
	}

	const teamDomain = env.ACCESS_TEAM_DOMAIN;
	const audience = env.ACCESS_AUD;
	if (teamDomain === "" || audience === "") {
		return yield* new AccessDenied({ reason: "Access is not configured" });
	}

	const token = headers.get("cf-access-jwt-assertion");
	if (token === null) {
		return yield* new AccessDenied({ reason: "Missing Access token" });
	}

	const { payload } = yield* Effect.tryPromise({
		try: async () =>
			await jwtVerify(token, keySetFor(teamDomain), {
				issuer: teamDomain,
				audience,
			}),
		catch: () => new AccessDenied({ reason: "Invalid Access token" }),
	});
	const claims = yield* Schema.decodeUnknownEffect(AccessClaims)(payload).pipe(
		Effect.mapError(() => new AccessDenied({ reason: "Token has no email" }))
	);
	if (claims.email !== env.ADMIN_EMAIL) {
		return yield* new AccessDenied({ reason: "Not the admin" });
	}
	return { email: claims.email } satisfies AdminIdentity;
});
