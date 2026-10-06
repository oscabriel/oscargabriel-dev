import * as Schema from "effect/Schema";

// A site's place on the roll is its hostname. The scheme, the path and a
// leading "www." don't make it a different site, so they don't make a
// different character.

export class NotASite extends Schema.TaggedError<NotASite>()("NotASite", {
	input: Schema.String,
	reason: Schema.String,
}) {}

export interface Site {
	// "example.com": the roll's key and the seed's source.
	readonly host: string;
	// The page that gets read: the address as given, without query or hash.
	readonly url: string;
}

const SCHEME = /^[a-z][a-z\d+.-]*:\/\//iu;
const LEADING_WWW = /^www\./u;
const TRAILING_DOT = /\.$/u;
const IPV4 = /^\d{1,3}(?:\.\d{1,3}){3}$/u;
const TOP_LEVEL_DOMAIN = /^(?:[a-z]{2,63}|xn--[a-z\d-]{1,59})$/u;

// Names that only resolve on someone's own network. In dev the worker runs on
// this machine, so reading one would reach into the local network.
const PRIVATE_SUFFIXES = [
	".arpa",
	".home",
	".internal",
	".invalid",
	".lan",
	".local",
	".localhost",
	".test",
];

function refuse(input: string, reason: string): NotASite {
	return new NotASite({ input, reason });
}

// Accepts what a visitor would type ("example.com", "https://www.example.com/
// work") and answers the host and the page to read, or why it isn't a site.
export function parseSite(input: string): Site | NotASite {
	const trimmed = input.trim();
	if (trimmed === "") {
		return refuse(input, "No address given.");
	}
	const withScheme = SCHEME.test(trimmed) ? trimmed : `https://${trimmed}`;
	if (!URL.canParse(withScheme)) {
		return refuse(input, "That isn't a web address.");
	}
	const url = new URL(withScheme);
	if (url.protocol !== "https:" && url.protocol !== "http:") {
		return refuse(input, "Only web pages can be read.");
	}
	if (url.username !== "" || url.password !== "") {
		return refuse(input, "Addresses with credentials can't be read.");
	}
	if (url.port !== "") {
		return refuse(input, "Addresses with a port can't be read.");
	}

	const hostname = url.hostname.toLowerCase().replace(TRAILING_DOT, "");
	const labels = hostname.split(".");
	const topLevel = labels.at(-1) ?? "";
	const isPrivate =
		hostname === "localhost" ||
		PRIVATE_SUFFIXES.some((suffix) => hostname.endsWith(suffix));
	if (
		hostname.startsWith("[") ||
		IPV4.test(hostname) ||
		labels.length < 2 ||
		isPrivate ||
		!TOP_LEVEL_DOMAIN.test(topLevel)
	) {
		return refuse(input, "That needs to be a public site's name.");
	}

	const host = hostname.replace(LEADING_WWW, "");
	return {
		host,
		url: `${url.protocol}//${hostname}${url.pathname}`,
	};
}

const FNV_OFFSET_BASIS = 0x81_1c_9d_c5;
const FNV_PRIME = 0x01_00_01_93;

// Seeds are uint32s, so the hashing below is bitwise by nature.
/* oxlint-disable no-bitwise */

// FNV-1a over a string's bytes: a stable uint32 for anything that needs a seed.
export function fnv1a(text: string): number {
	let hash = FNV_OFFSET_BASIS;
	for (const byte of new TextEncoder().encode(text)) {
		hash ^= byte;
		hash = Math.imul(hash, FNV_PRIME);
	}
	return hash >>> 0;
}

// The seed Set rolls a host's candidates from. The host decides the
// character, so nobody can reroll for a better one.
export function hostSeed(host: string): number {
	return fnv1a(host);
}

const GOLDEN_RATIO_INCREMENT = 0x9e_37_79_b9;

// Set's own rule for turning one seed into many (skill: rolling-a-group), so
// a host's candidates are the same ones Set would derive.
export function deriveSeed(seed: number, index: number): number {
	return ((seed >>> 0) + Math.imul(index, GOLDEN_RATIO_INCREMENT)) >>> 0;
}
/* oxlint-enable no-bitwise */
