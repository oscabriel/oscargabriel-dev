// Lowercase words joined by single hyphens: the only slugs post URLs accept.
export const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

const APOSTROPHES = /['’]/gu;
const COMBINING_MARKS = /\p{M}/gu;
const NON_SLUG = /[^a-z0-9]+/gu;
const EDGE_HYPHENS = /^-+|-+$/gu;

// "TanStack's Open. AI. SDK." becomes "tanstacks-open-ai-sdk": accents and
// apostrophes drop out, and any other run of symbols becomes one hyphen.
export function slugify(title: string): string {
	return title
		.normalize("NFKD")
		.replace(COMBINING_MARKS, "")
		.replace(APOSTROPHES, "")
		.toLowerCase()
		.replace(NON_SLUG, "-")
		.replace(EDGE_HYPHENS, "");
}
