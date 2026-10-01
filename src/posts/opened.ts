// Which posts this reader has opened, kept in their own browser so the
// contents page can mark them with a dagger.
const OPENED_PREFIX = "opened:";

export function markOpened(slug: string) {
	try {
		localStorage.setItem(OPENED_PREFIX + slug, "1");
	} catch {
		// No storage, no mark.
	}
}

export function wasOpened(slug: string): boolean {
	try {
		return localStorage.getItem(OPENED_PREFIX + slug) !== null;
	} catch {
		return false;
	}
}
