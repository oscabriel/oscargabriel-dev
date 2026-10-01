import * as Schema from "effect/Schema";

// One diary entry from a Letterboxd member's RSS feed.
export const DiaryEntry = Schema.Struct({
	id: Schema.String,
	title: Schema.String,
	year: Schema.NullOr(Schema.Int),
	// Half stars out of five, so 3.5 is ★★★½; null when the watch went unrated.
	rating: Schema.NullOr(Schema.Finite),
	rewatch: Schema.Boolean,
	// The calendar day the member logged, "YYYY-MM-DD", with no time or zone.
	watchedOn: Schema.String,
	url: Schema.String,
	poster: Schema.NullOr(Schema.String),
});

const ITEM = /<item>(?<body>[\s\S]*?)<\/item>/gu;
const CDATA = /^<!\[CDATA\[(?<text>[\s\S]*)\]\]>$/u;
const ENTITY = /&(?<entity>#\d+|#x[\da-f]+|amp|lt|gt|quot|apos);/giu;
const POSTER = /<img\s[^>]*src="(?<src>[^"]+)"/u;
const WATCHED_ON = /^\d{4}-\d{2}-\d{2}$/u;
const DECIMAL = 10;
const HEX = 16;

const NAMED_ENTITIES = new Map([
	["amp", "&"],
	["lt", "<"],
	["gt", ">"],
	["quot", '"'],
	["apos", "'"],
]);

const MAX_CODE_POINT = 0x10_ff_ff;

// A numeric entity past the last code point would throw; it decodes to nothing.
function fromCodePoint(codePoint: number): string {
	const inRange = codePoint >= 0 && codePoint <= MAX_CODE_POINT;
	return inRange ? String.fromCodePoint(codePoint) : "";
}

function decodeEntity(entity: string): string {
	const lower = entity.toLowerCase();
	if (lower.startsWith("#x")) {
		return fromCodePoint(Number.parseInt(lower.slice(2), HEX));
	}
	if (lower.startsWith("#")) {
		return fromCodePoint(Number.parseInt(lower.slice(1), DECIMAL));
	}
	return NAMED_ENTITIES.get(lower) ?? "";
}

function decodeEntities(text: string): string {
	return text.replaceAll(ENTITY, (match: string, entity: string) =>
		entity === "" ? match : decodeEntity(entity)
	);
}

// The feed is one flat, machine-written shape, so reading tags by name is
// enough; Workers have no DOMParser to do more.
function tag(item: string, name: string): string | undefined {
	const open = item.indexOf(`<${name}`);
	// A longer tag name that shares the prefix is not this tag.
	const next = item.charAt(open + name.length + 1);
	if (open === -1 || !(next === ">" || next === " ")) {
		return undefined;
	}
	const start = item.indexOf(">", open) + 1;
	const end = item.indexOf(`</${name}>`, start);
	if (end === -1) {
		return undefined;
	}
	const raw = item.slice(start, end).trim();
	return CDATA.exec(raw)?.groups?.text ?? decodeEntities(raw);
}

function toNumber(value: string | undefined): number | null {
	if (value === undefined) {
		return null;
	}
	const number = Number(value);
	return Number.isFinite(number) ? number : null;
}

const MAX_RATING = 5;

// Letterboxd rates in half stars from a half to five; anything else is unrated.
function toRating(value: string | undefined): number | null {
	const rating = toNumber(value);
	const isHalfStars =
		rating !== null &&
		rating > 0 &&
		rating <= MAX_RATING &&
		Number.isInteger(rating * 2);
	return isHalfStars ? rating : null;
}

function nonEmpty(value: string | undefined): value is string {
	return value !== undefined && value !== "";
}

function parseItem(item: string): typeof DiaryEntry.Type | null {
	const watchedOn = tag(item, "letterboxd:watchedDate");
	const title = tag(item, "letterboxd:filmTitle");
	const url = tag(item, "link");
	const id = tag(item, "guid");
	const isDiaryEntry =
		nonEmpty(watchedOn) &&
		WATCHED_ON.test(watchedOn) &&
		nonEmpty(title) &&
		nonEmpty(url) &&
		nonEmpty(id);
	if (!isDiaryEntry) {
		return null;
	}
	const year = toNumber(tag(item, "letterboxd:filmYear"));
	const poster = POSTER.exec(tag(item, "description") ?? "")?.groups?.src;
	return {
		id,
		title,
		year: year !== null && Number.isInteger(year) ? year : null,
		rating: toRating(tag(item, "letterboxd:memberRating")),
		rewatch: tag(item, "letterboxd:rewatch") === "Yes",
		watchedOn,
		url,
		poster: nonEmpty(poster) ? decodeEntities(poster) : null,
	};
}

// Lists and other non-diary items carry no watched date, and are skipped.
export function parseDiary(xml: string): (typeof DiaryEntry.Type)[] {
	const entries: (typeof DiaryEntry.Type)[] = [];
	for (const match of xml.matchAll(ITEM)) {
		const entry = parseItem(match.groups?.body ?? "");
		if (entry !== null) {
			entries.push(entry);
		}
	}
	// The feed runs in logging order; a film logged late belongs by its day.
	// oxlint-disable-next-line unicorn/no-array-sort -- sorts the array built just above; toSorted is past the ES2022 lib
	return entries.sort((a, b) => b.watchedOn.localeCompare(a.watchedOn));
}
