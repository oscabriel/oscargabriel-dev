import { RPCHandler } from "@orpc/server/fetch";
import { createFileRoute } from "@tanstack/react-router";

import { adminRouter } from "@/rpc/admin-router";

const handler = new RPCHandler(adminRouter);

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
