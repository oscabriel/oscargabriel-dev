import { RPCHandler } from "@orpc/server/fetch";
import { RequestLimitHandlerPlugin } from "@orpc/server/plugins";
import { createFileRoute } from "@tanstack/react-router";

import { adminRouter } from "@/rpc/admin-router";

// Covers uploads and post bodies alike; rejects before buffering past the cap.
const MAX_BODY_BYTES = 5 * 1024 * 1024;

const handler = new RPCHandler(adminRouter, {
	plugins: [new RequestLimitHandlerPlugin({ maxBodySize: MAX_BODY_BYTES })],
});

export const Route = createFileRoute("/api/admin/rpc/$")({
	server: {
		handlers: {
			ANY: async ({ request }) => {
				const { response } = await handler.handle(request, {
					prefix: "/api/admin/rpc",
					context: { headers: request.headers },
				});
				return response ?? new Response("Not found", { status: 404 });
			},
		},
	},
});
