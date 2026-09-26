import "@orpc/experimental-effect/extensions/effect";
import "@orpc/experimental-effect/extensions/input-output";
import { middlewareGen } from "@orpc/experimental-effect";
import { os } from "@orpc/server";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { Posts } from "@/posts/posts";
import { Projects } from "@/projects/projects";

const AppLayer = Layer.mergeAll(Posts.layer, Projects.layer);

// Build the layers per call: workerd pins I/O objects to the request that created them.
const provideServices = middlewareGen(function* ({ next }) {
	return yield* Effect.scoped(
		Effect.gen(function* () {
			const services = yield* Layer.build(AppLayer);
			return yield* next({ context: { "effect/context": services } });
		})
	);
});

export const pub = os.use(provideServices);
