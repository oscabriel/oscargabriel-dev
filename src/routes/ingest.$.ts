import { createFileRoute } from "@tanstack/react-router";

// A reverse proxy for PostHog on this origin, so the analytics requests are
// first-party and survive most ad blockers. Static assets go to the assets
// host and everything else to ingestion; the client never asks for assets
// (it bundles the SDK), but PostHog's checklist wants both routed. The
// visitor's IP is forwarded because the cookieless visitor hash is built from
// it; without it every visitor would hash to a Cloudflare data centre. Not
// under /admin, so Access leaves it alone.
const API_HOST = "us.i.posthog.com";
const ASSET_HOST = "us-assets.i.posthog.com";

function upstreamHost(path: string): string {
	const isAsset = path.startsWith("static/") || path.startsWith("array/");
	return isAsset ? ASSET_HOST : API_HOST;
}

export const Route = createFileRoute("/ingest/$")({
	server: {
		handlers: {
			ANY: async ({ params, request }) => {
				const path = params._splat ?? "";
				const { search } = new URL(request.url);
				const target = `https://${upstreamHost(path)}/${path}${search}`;

				// Cloudflare's own cf-* headers must not reach another Cloudflare
				// site, or its edge answers 403 (error 1000); the visitor's IP
				// goes on as X-Forwarded-For instead, which PostHog reads.
				const headers = new Headers(request.headers);
				headers.delete("host");
				headers.delete("cookie");
				headers.delete("authorization");
				const cloudflareNames = [...headers.keys()].filter((name) =>
					name.startsWith("cf-")
				);
				for (const name of cloudflareNames) {
					headers.delete(name);
				}
				headers.set(
					"x-forwarded-for",
					request.headers.get("cf-connecting-ip") ?? ""
				);

				// The body is read in full: a forwarded stream can drop POSTs.
				const hasBody = request.method !== "GET" && request.method !== "HEAD";
				return await fetch(target, {
					method: request.method,
					headers,
					body: hasBody ? await request.arrayBuffer() : null,
				});
			},
		},
	},
});
