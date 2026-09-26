import * as Effect from "effect/Effect";

import { Db } from "@/db/db";

const AppLayer = Db.layer;

// Build the layers per request: workerd pins I/O objects to the request that created them.
export async function runRequest<A, E>(
	program: Effect.Effect<A, E, Db>
): Promise<A> {
	return await Effect.runPromise(program.pipe(Effect.provide(AppLayer)));
}
