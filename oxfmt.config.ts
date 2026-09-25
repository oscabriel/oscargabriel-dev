import { defineConfig } from "oxfmt";
import ultracite from "ultracite/oxfmt";

export default defineConfig({
	...ultracite,
	useTabs: true,
	sortTailwindcss: {
		functions: ["clsx", "cva", "tw", "twMerge", "cn", "twJoin", "tv"],
		stylesheet: "./src/styles.css",
	},
});
