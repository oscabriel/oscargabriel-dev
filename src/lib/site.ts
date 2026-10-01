// Canonical and Open Graph URLs always name the production domain, whichever
// host served the page.
export const SITE_URL = "https://oscargabriel.dev";

export const SITE_NAME = "Oscar Gabriel";

export const GITHUB_URL = "https://github.com/oscabriel";
export const LINKEDIN_URL = "https://www.linkedin.com/in/oscar-gabriel";
export const TWITTER_URL = "https://x.com/oscabriel";

// Media keys can contain slashes, so encode each path segment on its own.
export function mediaPath(key: string): string {
	return `/media/${key.split("/").map(encodeURIComponent).join("/")}`;
}
