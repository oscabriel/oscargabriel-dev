// Pin the zone so the server and the browser render the same text.
const publishedFormat = new Intl.DateTimeFormat("en-US", {
	year: "numeric",
	month: "long",
	day: "numeric",
	timeZone: "UTC",
});

export function formatPublishedAt(date: Date): string {
	return publishedFormat.format(date);
}

// Contents lines abbreviate the month so a title keeps most of the line.
const contentsFormat = new Intl.DateTimeFormat("en-US", {
	year: "numeric",
	month: "short",
	day: "numeric",
	timeZone: "UTC",
});

export function formatContentsDate(date: Date): string {
	return contentsFormat.format(date);
}
