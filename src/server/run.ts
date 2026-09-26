import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { Db } from "@/db/db";
import { GitHub } from "@/github/github";

const AppLayer = Layer.mergeAll(Db.layer, GitHub.layer);

// Build the layers per request: workerd pins I/O objects to the request that created them.
export async function runRequest<A, E>(
	program: Effect.Effect<A, E, Db | GitHub>
): Promise<A> {
	return await Effect.runPromise(program.pipe(Effect.provide(AppLayer)));
}
