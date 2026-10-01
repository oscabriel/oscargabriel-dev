import { TanStackDevtools } from "@tanstack/react-devtools";
import type { QueryClient } from "@tanstack/react-query";
import {
	HeadContent,
	Scripts,
	createRootRouteWithContext,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { useEffect } from "react";

import { startAnalytics } from "@/analytics/posthog";
import inkUrl from "@/components/sun-moon/ink.webp";
import { SITE_NAME } from "@/lib/site";
import { THEME_SCRIPT } from "@/theme/theme";

import appCss from "../styles.css?url";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()(
	{
		head: () => ({
			meta: [
				{
					charSet: "utf-8",
				},
				{
					name: "viewport",
					content: "width=device-width, initial-scale=1",
				},
				{
					title: SITE_NAME,
				},
			],
			links: [
				{
					rel: "stylesheet",
					href: appCss,
				},
				// The sun and moon's ink is a CSS mask, which the browser would only
				// fetch after the stylesheet; preloaded, it lands with the washes.
				// Masks are fetched in CORS mode, so the preload must be too or the
				// browser ignores it and fetches the image again.
				{
					rel: "preload",
					as: "image",
					href: inkUrl,
					crossOrigin: "anonymous",
				},
			],
			scripts: [{ children: THEME_SCRIPT }],
		}),
		shellComponent: RootDocument,
	}
);

// Analytics start in an effect, so never during server rendering.
function RootDocument({ children }: { children: React.ReactNode }) {
	useEffect(() => {
		startAnalytics();
	}, []);

	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<HeadContent />
			</head>
			<body>
				{children}
				<TanStackDevtools
					config={{
						position: "bottom-right",
					}}
					plugins={[
						{
							name: "Tanstack Router",
							render: <TanStackRouterDevtoolsPanel />,
						},
					]}
				/>
				<Scripts />
			</body>
		</html>
	);
}
