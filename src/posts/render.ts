import type { MarkdownExtension } from "@tanstack/markdown";
import { headingCollectionExtension } from "@tanstack/markdown/extensions/headings";
import { renderHtml } from "@tanstack/markdown/html";
import { parseMarkdown } from "@tanstack/markdown/parser";
import { language as bash } from "@twinkleplop/bash";
import { language as diff } from "@twinkleplop/diff";
import { language as javascript } from "@twinkleplop/javascript";
import { language as json } from "@twinkleplop/json";
import { create_renderer } from "@twinkleplop/markdown-core";
import { language as python } from "@twinkleplop/python";
import { language as sql } from "@twinkleplop/sql";
import { language as tsx } from "@twinkleplop/tsx";
import { language as typescript } from "@twinkleplop/typescript";
import GithubSlugger from "github-slugger";

import type { TocEntry } from "@/db/schema";

export interface RenderedPost {
	html: string;
	toc: TocEntry[];
}

const code = create_renderer({
	languages: {
		bash: bash(),
		diff: diff(),
		javascript: javascript(),
		js: "javascript",
		json: json(),
		jsx: "tsx",
		python: python(),
		sh: "bash",
		shell: "bash",
		sql: sql(),
		ts: "typescript",
		tsx: tsx(),
		typescript: typescript(),
	},
	on_unknown_language: "plain",
});

const twinkleplop: MarkdownExtension = {
	name: "twinkleplop",
	renderHtml: (node) =>
		node.type === "code"
			? (code.fence(node.lang ?? "plaintext", node.meta, node.value) ??
				undefined)
			: undefined,
};

const extensions = [headingCollectionExtension(), twinkleplop];

export function renderPost(body: string): RenderedPost {
	const slugger = new GithubSlugger();
	const options = {
		allowHtml: true,
		extensions,
		headingAnchors: true,
		headingIds: (text: string) => slugger.slug(text),
	};
	const document = parseMarkdown(body, options);
	const toc = (document.headings ?? []).map(({ id, text, level }) => ({
		id,
		level,
		text,
	}));
	return { html: renderHtml(document, options), toc };
}
