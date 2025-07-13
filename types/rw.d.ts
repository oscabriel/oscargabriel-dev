import type { AppContext } from "@/types/app";

declare module "rwsdk/worker" {
	interface DefaultAppContext extends AppContext {}
}
