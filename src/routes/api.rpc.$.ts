import { RPCHandler } from "@orpc/server/fetch";
import { createFileRoute } from "@tanstack/react-router";

import { router } from "@/rpc/router";

const handler = new RPCHandler(router);

export const Route = createFileRoute("/api/rpc/$")({
	server: {
		handlers: {
			ANY: async ({ request }) => {
				const { response } = await handler.handle(request, {
					prefix: "/api/rpc",
					context: {},
				});
				return response ?? new Response("Not found", { status: 404 });
			},
		},
	},
});
