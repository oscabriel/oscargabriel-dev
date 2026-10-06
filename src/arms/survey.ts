import * as Clock from "effect/Clock";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as HttpClient from "effect/http/HttpClient";
import * as HttpClientRequest from "effect/http/HttpClientRequest";
import * as Option from "effect/Option";
import * as Result from "effect/Result";
import * as Schema from "effect/Schema";

import type { Site } from "@/arms/host";

// Reading a site, before anyone judges it: the document as it arrives (timed,
// for agility) and the page as a browser draws it (for the text and the plate).

const USER_AGENT =
	"Mozilla/5.0 (compatible; RollOfArms/1.0; +https://oscargabriel.dev/arms)";

// About 4,000 tokens of the page: enough to know a site, small beside Clef's
// 64k window and the image.
const TEXT_LIMIT = 16_000;

export const SCREEN = { width: 1280, height: 800 } as const;

const DOCUMENT_TIMEOUT_MS = 15_000;
const DOCUMENT_TIMEOUT = `${DOCUMENT_TIMEOUT_MS} millis` as const;

export class SurveyError extends Schema.TaggedError<SurveyError>()(
	"SurveyError",
	{ url: Schema.String, cause: Schema.Defect() }
) {}

export class CameraError extends Schema.TaggedError<CameraError>()(
	"CameraError",
	{ url: Schema.String, cause: Schema.Defect() }
) {}

export interface Snapshot {
	// The DOM after scripts ran, so a single-page app still has words.
	readonly html: string;
	// Base64 JPEG of the first screen.
	readonly screenshot: string;
}

// Cloudflare Browser Rendering's snapshot action, reached through the
// Worker's binding on the site and the REST API from the script.
export class Camera extends Context.Service<
	Camera,
	{ readonly snapshot: (url: string) => Effect.Effect<Snapshot, CameraError> }
>()("arms/Camera") {}

// The body both the binding and the REST API take for a snapshot.
export function snapshotRequest(url: string) {
	return {
		url,
		viewport: SCREEN,
		gotoOptions: { waitUntil: "networkidle2", timeout: 20_000 },
		screenshotOptions: { type: "jpeg", quality: 70 },
	} as const;
}

export const SnapshotResponse = Schema.Struct({
	result: Schema.Struct({ content: Schema.String, screenshot: Schema.String }),
});

export interface Survey {
	readonly url: string;
	readonly title: string | null;
	readonly description: string | null;
	readonly text: string;
	// Time to read the whole HTML document, and its size: measured, not judged.
	readonly documentMs: number;
	readonly documentBytes: number;
	// Base64 JPEG, or null when the browser couldn't draw the page.
	readonly plate: string | null;
}

const DROPPED_ELEMENTS =
	/<(?<element>script|style|noscript|svg|template|iframe|canvas)\b[\s\S]*?<\/\k<element>\s*>/giu;
const COMMENTS = /<!--[\s\S]*?-->/gu;
const BLOCK_TAGS =
	/<\/?(?:p|div|section|article|header|footer|main|nav|aside|li|ul|ol|h[1-6]|br|tr|table|blockquote|figure|figcaption)\b[^>]*>/giu;
const TAGS = /<[^>]+>/gu;
const HEX_ENTITY = /&#x(?<digits>[\da-f]+);/giu;
const DECIMAL_ENTITY = /&#(?<digits>\d+);/gu;
const NAMED_ENTITY = /&(?<name>amp|lt|gt|quot|apos|nbsp);/gu;
const INLINE_SPACE = /[^\S\n]+/gu;
const BLANK_LINES = /\s*\n\s*/gu;
const TITLE = /<title[^>]*>(?<title>[\s\S]*?)<\/title>/iu;
const META_DESCRIPTION =
	/<meta\s[^>]*(?:name|property)=["'](?:description|og:description)["'][^>]*>/iu;
const CONTENT_ATTRIBUTE = /content=["'](?<content>[^"']*)["']/iu;

const NAMED = new Map([
	["amp", "&"],
	["lt", "<"],
	["gt", ">"],
	["quot", '"'],
	["apos", "'"],
	["nbsp", " "],
]);

const HEX = 16;
const DECIMAL = 10;

function codePoint(digits: string, radix: number): string {
	const value = Number.parseInt(digits, radix);
	return Number.isNaN(value) ? "" : String.fromCodePoint(value);
}

function decodeEntities(text: string): string {
	return text
		.replace(HEX_ENTITY, (_, digits: string) => codePoint(digits, HEX))
		.replace(DECIMAL_ENTITY, (_, digits: string) => codePoint(digits, DECIMAL))
		.replace(NAMED_ENTITY, (_, name: string) => NAMED.get(name) ?? "");
}

// The words a reader would see, one block to a line.
export function visibleText(html: string): string {
	return decodeEntities(
		html
			.replace(DROPPED_ELEMENTS, " ")
			.replace(COMMENTS, " ")
			.replace(BLOCK_TAGS, "\n")
			.replace(TAGS, " ")
	)
		.replace(INLINE_SPACE, " ")
		.replace(BLANK_LINES, "\n")
		.trim()
		.slice(0, TEXT_LIMIT);
}

function pageTitle(html: string): string | null {
	const title = TITLE.exec(html)?.groups?.title;
	return title === undefined ? null : decodeEntities(title).trim() || null;
}

function pageDescription(html: string): string | null {
	const tag = META_DESCRIPTION.exec(html)?.[0];
	const content =
		tag === undefined
			? undefined
			: CONTENT_ATTRIBUTE.exec(tag)?.groups?.content;
	return content === undefined ? null : decodeEntities(content).trim() || null;
}

export const survey = Effect.fn("survey")(function* (site: Site) {
	const client = (yield* HttpClient.HttpClient).pipe(
		HttpClient.mapRequest(
			HttpClientRequest.setHeaders({
				Accept: "text/html,application/xhtml+xml",
				"User-Agent": USER_AGENT,
			})
		),
		HttpClient.filterStatusOk
	);
	const camera = yield* Camera;

	const startedAt = yield* Clock.currentTimeMillis;
	const fetched = yield* client.get(site.url).pipe(
		Effect.flatMap((response) => response.text),
		Effect.timeout(DOCUMENT_TIMEOUT),
		Effect.mapError((cause) => new SurveyError({ url: site.url, cause })),
		Effect.result
	);
	const elapsedMs = (yield* Clock.currentTimeMillis) - startedAt;

	// No picture is a poorer reading, not a failed one: the text still stands.
	const snapshot = yield* camera.snapshot(site.url).pipe(
		Effect.tapError((error) =>
			Effect.logWarning("No snapshot of the site", error)
		),
		Effect.option
	);

	// Some sites turn away a plain fetch but let a browser in. Then the page is
	// read from the browser, and the document, never having arrived, is as slow
	// as the wait allows.
	if (Result.isFailure(fetched) && Option.isNone(snapshot)) {
		return yield* fetched.failure;
	}
	const document = Result.isSuccess(fetched) ? fetched.success : "";
	const html = Option.isSome(snapshot) ? snapshot.value.html : document;

	return {
		url: site.url,
		title: pageTitle(html) ?? pageTitle(document),
		description: pageDescription(html) ?? pageDescription(document),
		text: visibleText(html),
		documentMs: Result.isSuccess(fetched) ? elapsedMs : DOCUMENT_TIMEOUT_MS,
		documentBytes: new TextEncoder().encode(document).byteLength,
		plate: Option.isSome(snapshot) ? snapshot.value.screenshot : null,
	} satisfies Survey;
});
