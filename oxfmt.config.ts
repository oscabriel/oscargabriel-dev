import { defineConfig } from "oxfmt";
import ultracite from "ultracite/oxfmt";

const shadcnFiles = ["src/components/ui/**", "src/hooks/use-mobile.ts"];

export default defineConfig({
	...ultracite,
	ignorePatterns: [...(ultracite.ignorePatterns ?? []), ...shadcnFiles],
	useTabs: true,
	sortTailwindcss: {
		functions: ["clsx", "cva", "tw", "twMerge", "cn", "twJoin", "tv"],
		stylesheet: "./src/styles.css",
	},
});
