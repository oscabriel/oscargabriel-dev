import "@orpc/experimental-effect/extensions/effect";
import "@orpc/experimental-effect/extensions/input-output";
import { middlewareGen } from "@orpc/experimental-effect";
import { ORPCError, os } from "@orpc/server";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { verifyAdmin } from "@/admin/access";
import type { AdminIdentity } from "@/admin/access";
import { AdminPosts } from "@/posts/admin-posts";
import { Posts } from "@/posts/posts";
import { Projects } from "@/projects/projects";

const AppLayer = Layer.mergeAll(Posts.layer, Projects.layer);

const AdminLayer = AdminPosts.layer;

// Build the layers per call: workerd pins I/O objects to the request that created them.
function provideLayer<ROut, E>(layer: Layer.Layer<ROut, E>) {
	return middlewareGen(function* ({ next }) {
		return yield* Effect.scoped(
			Effect.gen(function* () {
				const services = yield* Layer.build(layer);
				return yield* next({ context: { "effect/context": services } });
			})
		);
	});
}

// Runs before any layer is built, so a rejected request never touches D1.
const requireAdmin = middlewareGen<
	{ headers: Headers },
	{ admin: AdminIdentity }
>(function* ({ context, next }) {
	const admin = yield* verifyAdmin(context.headers).pipe(
		Effect.mapError(() => new ORPCError("UNAUTHORIZED"))
	);
	return yield* next({ context: { admin } });
});

export const pub = os.use(provideLayer(AppLayer));

export const admin = os
	.$context<{ headers: Headers }>()
	.use(requireAdmin)
	.use(provideLayer(AdminLayer));
