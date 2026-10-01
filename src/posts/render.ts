import type {
	HtmlRenderContext,
	LinkNode,
	MarkdownExtension,
} from "@tanstack/markdown";
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
import { leavesSite } from "@/lib/site";

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

// Links out of the book open in a new tab (see leavesSite). The library
// draws the link as usual and this adds the target in front of the href, so
// the markup stays the library's own; the data migration
// 20261001185358_links_out_in_new_tab rewrites stored posts to match.
const LINK_OPEN = /^<a /u;
const NEW_TAB_LINK_OPEN = '<a target="_blank" rel="noopener noreferrer" ';
const drawing = new WeakSet<LinkNode>();

// Seen again while the library draws it, the link falls through to it.
function drawInNewTab(
	link: LinkNode,
	renderInline: HtmlRenderContext["renderInline"]
): string {
	drawing.add(link);
	const html = renderInline(link);
	drawing.delete(link);
	return html.replace(LINK_OPEN, NEW_TAB_LINK_OPEN);
}

const linksOut: MarkdownExtension = {
	name: "links-out",
	renderHtml: (node, { renderInline }) =>
		node.type === "link" && leavesSite(node.href) && !drawing.has(node)
			? drawInNewTab(node, renderInline)
			: undefined,
};

const extensions = [headingCollectionExtension(), twinkleplop, linksOut];

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
