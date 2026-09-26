import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

const HTTPS_PORT = 443;

const config = defineConfig(({ mode }) => {
	// Set in gitignored .env.local when the dev server sits behind a reverse proxy.
	const caddyDevHost = loadEnv(mode, process.cwd(), "").CADDY_DEV_HOST;

	return {
		resolve: { tsconfigPaths: true },
		plugins: [devtools(), tailwindcss(), tanstackStart(), viteReact()],
		server: caddyDevHost
			? {
					allowedHosts: ["localhost", "127.0.0.1", caddyDevHost],
					hmr: {
						host: caddyDevHost,
						protocol: "wss",
						clientPort: HTTPS_PORT,
					},
				}
			: undefined,
	};
});

export default config;
