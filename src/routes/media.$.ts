import { createFileRoute } from "@tanstack/react-router";

import { env } from "@/env";

// Keys aren't content-hashed, so browsers recheck daily using the ETag.
const CACHE_CONTROL = "public, max-age=86400";

const GENERIC_CONTENT_TYPE = "application/octet-stream";

// Objects written over Cloudflare's HTTP API (the seed Action) are stored as
// octet-stream: @distilled.cloud's upload lets its body media type override
// the Content-Type we send. The media row keeps the real type.
async function lookupContentType(key: string): Promise<string | null> {
	return await env.DB.prepare("SELECT content_type FROM media WHERE key = ?")
		.bind(key)
		.first<string>("content_type");
}

export const Route = createFileRoute("/media/$")({
	server: {
		handlers: {
			GET: async ({ params, request }) => {
				const key = params._splat ?? "";
				const object = await env.MEDIA.get(key, {
					onlyIf: request.headers,
				});
				if (object === null) {
					return new Response("Not found", { status: 404 });
				}

				const headers = new Headers();
				object.writeHttpMetadata(headers);
				headers.set("etag", object.httpEtag);
				headers.set("cache-control", CACHE_CONTROL);
				headers.set("x-content-type-options", "nosniff");

				// R2 leaves out the body when the If-None-Match precondition matches.
				if (!("body" in object)) {
					return new Response(null, { status: 304, headers });
				}
				const storedType = object.httpMetadata?.contentType;
				if (storedType === undefined || storedType === GENERIC_CONTENT_TYPE) {
					const contentType = await lookupContentType(key);
					if (contentType !== null) {
						headers.set("content-type", contentType);
					}
				}
				return new Response(object.body, { headers });
			},
		},
	},
});
