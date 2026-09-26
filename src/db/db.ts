import * as D1Client from "@effect/sql-d1/D1Client";
import * as SQLiteD1Drizzle from "drizzle-orm/effect-d1";
import * as Context from "effect/Context";
import * as Layer from "effect/Layer";

import { env } from "@/env";

export class Db extends Context.Service<Db>()("app/Db", {
	make: SQLiteD1Drizzle.makeWithDefaults({}),
}) {
	static readonly layer = Layer.effect(this, this.make).pipe(
		Layer.provide(Layer.suspend(() => D1Client.layer({ db: env.DB })))
	);
}
