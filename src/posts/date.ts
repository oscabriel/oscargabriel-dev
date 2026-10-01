// Pin the zone so the server and the browser render the same text. It is the
// author's: a post published on a Portland evening is dated that evening, not
// the next day in UTC.
const HOME_ZONE = "America/Los_Angeles";

const publishedFormat = new Intl.DateTimeFormat("en-US", {
	year: "numeric",
	month: "long",
	day: "numeric",
	timeZone: HOME_ZONE,
});

export function formatPublishedAt(date: Date): string {
	return publishedFormat.format(date);
}

// Contents lines abbreviate the month so a title keeps most of the line.
const contentsFormat = new Intl.DateTimeFormat("en-US", {
	year: "numeric",
	month: "short",
	day: "numeric",
	timeZone: HOME_ZONE,
});

export function formatContentsDate(date: Date): string {
	return contentsFormat.format(date);
}
