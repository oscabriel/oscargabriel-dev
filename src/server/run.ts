import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { Posts } from "@/posts/posts";
import { Projects } from "@/projects/projects";

const AppLayer = Layer.mergeAll(Posts.layer, Projects.layer);

// Build the layers per request: workerd pins I/O objects to the request that created them.
export async function runRequest<A, E>(
	program: Effect.Effect<A, E, Posts | Projects>
): Promise<A> {
	return await Effect.runPromise(program.pipe(Effect.provide(AppLayer)));
}
