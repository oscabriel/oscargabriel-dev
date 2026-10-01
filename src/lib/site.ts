// Canonical and Open Graph URLs always name the production domain, whichever
// host served the page.
export const SITE_URL = "https://oscargabriel.dev";
export const SITE_HOST = new URL(SITE_URL).hostname;

export const SITE_NAME = "Oscar Gabriel";

export const GITHUB_URL = "https://github.com/oscabriel";
export const LINKEDIN_URL = "https://www.linkedin.com/in/oscar-gabriel";
export const TWITTER_URL = "https://x.com/oscabriel";

// Media keys can contain slashes, so encode each path segment on its own.
export function mediaPath(key: string): string {
	return `/media/${key.split("/").map(encodeURIComponent).join("/")}`;
}

// A link leaves the book when it names another site, and then it opens in a
// new tab so the reader's place here stays open. The book's own pages, by
// path or by full URL, stay in the tab.
export function leavesSite(href: string): boolean {
	if (!URL.canParse(href)) {
		return false;
	}
	const { protocol, hostname } = new URL(href);
	return (
		(protocol === "https:" || protocol === "http:") && hostname !== SITE_HOST
	);
}
