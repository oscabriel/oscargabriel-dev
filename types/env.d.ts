import type { site } from "@/root/alchemy.run";

// Type intersection to add the right type for REALTIME_DURABLE_OBJECT to env
export type WorkerEnv = typeof site.Env & {
	REALTIME_DURABLE_OBJECT: DurableObjectNamespace<RealtimeDurableObject>;
};

declare module "cloudflare:workers" {
	namespace Cloudflare {
		export interface Env extends WorkerEnv {}
	}
}
