import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createRouterClient } from "@orpc/server";
import type { RouterClient } from "@orpc/server";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { createIsomorphicFn } from "@tanstack/react-start";

import { router } from "@/rpc/router";

// On the server, call the router in process; in the browser, call /api/rpc over HTTP.
const getClient = createIsomorphicFn()
	.server(() => createRouterClient(router, { context: {} }))
	.client((): RouterClient<typeof router> =>
		createORPCClient(new RPCLink({ url: "/api/rpc" }))
	);

export const client: RouterClient<typeof router> = getClient();

export const orpc = createTanstackQueryUtils(client);
