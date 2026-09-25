import { defineConfig } from "oxlint";
import antiSlop from "ultracite/oxlint/anti-slop";
import core from "ultracite/oxlint/core";
import react from "ultracite/oxlint/react";
import shadcn from "ultracite/oxlint/shadcn";
import tanstack from "ultracite/oxlint/tanstack";

export default defineConfig({
	extends: [core, react, tanstack, shadcn, antiSlop],
	ignorePatterns: core.ignorePatterns,
	jsPlugins: shadcn.jsPlugins,
	options: {
		typeAware: true,
	},
	rules: {
		"func-names": "off",
	},
});
