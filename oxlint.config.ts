import { defineConfig } from "oxlint";
import antiSlop from "ultracite/oxlint/anti-slop";
import core from "ultracite/oxlint/core";
import react from "ultracite/oxlint/react";
import shadcn from "ultracite/oxlint/shadcn";
import tanstack from "ultracite/oxlint/tanstack";

const shadcnFiles = ["src/components/ui/**", "src/hooks/use-mobile.ts"];

export default defineConfig({
	extends: [core, react, tanstack, shadcn, antiSlop],
	ignorePatterns: [...(core.ignorePatterns ?? []), ...shadcnFiles],
	jsPlugins: shadcn.jsPlugins,
	options: {
		typeAware: true,
	},
	rules: {
		"func-names": "off",
		"func-style": ["error", "declaration"],
		"react/function-component-definition": [
			"error",
			{
				namedComponents: "function-declaration",
				unnamedComponents: "arrow-function",
			},
		],
	},
});
