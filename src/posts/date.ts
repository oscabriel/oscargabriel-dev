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
