import { createFileRoute } from "@tanstack/react-router";

import { env } from "@/env";

// Keys aren't content-hashed, so browsers recheck daily using the ETag.
const CACHE_CONTROL = "public, max-age=86400";

export const Route = createFileRoute("/media/$")({
	server: {
		handlers: {
			GET: async ({ params, request }) => {
				const object = await env.MEDIA.get(params._splat ?? "", {
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
				return new Response(object.body, { headers });
			},
		},
	},
});
