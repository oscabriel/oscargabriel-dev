import { defineConfig } from "oxlint";
import antiSlop from "ultracite/oxlint/anti-slop";
import core from "ultracite/oxlint/core";
import react from "ultracite/oxlint/react";
import shadcn from "ultracite/oxlint/shadcn";
import tanstack from "ultracite/oxlint/tanstack";

const shadcnFiles = ["src/components/ui/**", "src/hooks/use-mobile.ts"];
const generatedFiles = ["src/db/migrations/**"];
const vendoredFiles = [".claude/**", "tools/oxlint/anti-slop/**"];

export default defineConfig({
	extends: [core, react, tanstack, shadcn, antiSlop],
	ignorePatterns: [
		...(core.ignorePatterns ?? []),
		...shadcnFiles,
		...generatedFiles,
		...vendoredFiles,
	],
	jsPlugins: [
		...(shadcn.jsPlugins ?? []),
		{
			name: "anti-slop-effect",
			specifier: "./tools/oxlint/anti-slop/effect/index.ts",
		},
	],
	options: {
		typeAware: true,
	},
	rules: {
		"anti-slop-effect/no-manual-effect-error-tag": "error",
		"anti-slop-effect/no-manual-tag-comparison": "error",
		"anti-slop-effect/no-manual-tagged-construction": "error",
		"anti-slop-effect/no-service-constructor-imports": "error",
		"anti-slop-effect/prefer-effect-match": "error",
		// Effect defines services, errors and schemas as classes.
		"max-classes-per-file": "off",
		// False positive on Effect error constructors like `Schema.TaggedError<Self>()(...)`.
		"unicorn/throw-new-error": "off",
		"func-names": "off",
		// TanStack Router's notFound() and redirect() are thrown as plain values by design.
		"typescript/only-throw-error": [
			"error",
			{
				allow: [
					{
						from: "package",
						package: "@tanstack/router-core",
						name: ["NotFoundError", "Redirect"],
					},
				],
			},
		],
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
