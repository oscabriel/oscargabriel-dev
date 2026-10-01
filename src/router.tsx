import { QueryClient } from "@tanstack/react-query";
import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";

import { routeTree } from "./routeTree.gen";

// Tailwind's md breakpoint. Below it the leaf sits above the page rather
// than beside it, so there is no fore-edge for a page to turn from.
const PHONE_QUERY = "(width < 48rem)";

export function getRouter() {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { staleTime: 60_000 } },
	});

	const router = createTanStackRouter({
		routeTree,
		context: { queryClient },
		scrollRestoration: true,
		defaultViewTransition: true,
		defaultPreload: "intent",
		defaultPreloadStaleTime: 0,
	});

	// Only a new page turns the page. A section link or heading anchor is a
	// hash-only navigation (the browser fires popstate, the router reloads),
	// and a view transition there replays the wipe and cross-fades the leaf,
	// doubling the manicule. `defaultViewTransition.types` could return false
	// instead, but the router only consults it where view-transition types are
	// supported; this runs everywhere, before the router decides. Phones
	// never turn the page, so they swap at once.
	router.subscribe("onBeforeNavigate", ({ pathChanged }) => {
		const onPhone =
			typeof window !== "undefined" && window.matchMedia(PHONE_QUERY).matches;
		if (!pathChanged || onPhone) {
			router.shouldViewTransition = false;
		}
	});

	setupRouterSsrQueryIntegration({ router, queryClient });

	return router;
}

declare module "@tanstack/react-router" {
	interface Register {
		router: ReturnType<typeof getRouter>;
	}
}
