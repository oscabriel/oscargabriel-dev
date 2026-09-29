import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { RouterClient } from "@orpc/server";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";

import type { adminRouter } from "@/rpc/admin-router";

// Admin routes never render on the server (`ssr: false`), so unlike the public
// client this one only runs in the browser and always goes over HTTP, where
// Access attaches the signed-in admin's token.
const client: RouterClient<typeof adminRouter> = createORPCClient(
	new RPCLink({ url: "/api/admin/rpc" })
);

// Both routers have `posts`, so prefix the admin keys to keep caches apart.
export const adminOrpc = createTanstackQueryUtils(client, { prefix: "admin" });
