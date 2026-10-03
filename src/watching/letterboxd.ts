import * as Clock from "effect/Clock";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as FetchHttpClient from "effect/http/FetchHttpClient";
import * as HttpClient from "effect/http/HttpClient";
import * as HttpClientRequest from "effect/http/HttpClientRequest";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Schedule from "effect/Schedule";
import * as Schema from "effect/Schema";

import { env } from "@/env";
import { DiaryEntry, parseDiary } from "@/watching/feed";

export const LETTERBOXD_USERNAME = "oscabriel";
export const LETTERBOXD_PROFILE = `https://letterboxd.com/${LETTERBOXD_USERNAME}/`;

const FEED_URL = `${LETTERBOXD_PROFILE}rss/`;
const USER_AGENT = "oscargabriel.dev";
const CACHE_KEY = `letterboxd:diary:${LETTERBOXD_USERNAME}`;
// A diary changes a few times a week, so an hour-old copy is fresh enough.
const FRESH_MILLIS = 60 * 60 * 1000;
// KV keeps the copy for a month past that, to serve while Letterboxd is down.
const KEEP_SECONDS = 30 * 24 * 60 * 60;
// The author's days: "today" on this page is a day in Portland.
const HOME_ZONE = "America/Los_Angeles";
const DAY_MILLIS = 24 * 60 * 60 * 1000;

const CachedDiary = Schema.Struct({
	fetchedAt: Schema.Finite,
	entries: Schema.Array(DiaryEntry),
});

export class LetterboxdError extends Schema.TaggedError<LetterboxdError>()(
	"LetterboxdError",
	{ cause: Schema.Defect() }
) {}

// "YYYY-MM-DD" for the day it is at `millis` in the author's zone.
const dayFormat = new Intl.DateTimeFormat("en-CA", {
	year: "numeric",
	month: "2-digit",
	day: "2-digit",
	timeZone: HOME_ZONE,
});

function isRecent(watchedOn: string, now: number): boolean {
	const today = dayFormat.format(now);
	const yesterday = dayFormat.format(now - DAY_MILLIS);
	return watchedOn === today || watchedOn === yesterday;
}

export class Letterboxd extends Context.Service<Letterboxd>()(
	"app/Letterboxd",
	{
		make: Effect.gen(function* () {
			const cache = env.REPO_CACHE;
			const client = (yield* HttpClient.HttpClient).pipe(
				HttpClient.mapRequest(
					HttpClientRequest.setHeaders({
						Accept: "application/rss+xml",
						"User-Agent": USER_AGENT,
					})
				),
				HttpClient.filterStatusOk,
				HttpClient.retryTransient({
					schedule: Schedule.exponential("200 millis"),
					times: 2,
				})
			);

			// The cache is best effort: a failed read counts as a miss, and a failed write is ignored.
			const readCache = Effect.tryPromise(
				async () => await cache.get(CACHE_KEY, "json")
			).pipe(
				Effect.flatMap(Schema.decodeUnknownEffect(CachedDiary)),
				Effect.option
			);

			function writeCache(
				fetchedAt: number,
				entries: readonly (typeof DiaryEntry.Type)[]
			) {
				return Effect.tryPromise(async () => {
					await cache.put(CACHE_KEY, JSON.stringify({ fetchedAt, entries }), {
						expirationTtl: KEEP_SECONDS,
					});
				}).pipe(Effect.ignore);
			}

			const fetchDiary = client.get(FEED_URL).pipe(
				Effect.flatMap((response) => response.text),
				Effect.timeout("8 seconds"),
				Effect.mapError((cause) => new LetterboxdError({ cause })),
				// A challenge page with a 200 would parse to an empty diary and
				// overwrite a good copy, so anything but a feed is a failure, and so
				// is a feed the parser chokes on: both fall back to the stale copy.
				Effect.flatMap((body) =>
					body.includes("<rss")
						? Effect.try({
								try: () => parseDiary(body),
								catch: (cause) => new LetterboxdError({ cause }),
							})
						: Effect.fail(new LetterboxdError({ cause: "Not an RSS feed" }))
				)
			);

			const entries = Effect.fn("Letterboxd.entries")(function* (now: number) {
				const cached = yield* readCache;
				if (
					Option.isSome(cached) &&
					now - cached.value.fetchedAt < FRESH_MILLIS
				) {
					return cached.value.entries;
				}
				return yield* fetchDiary.pipe(
					Effect.tap((fresh) => writeCache(now, fresh)),
					// Letterboxd down: an old diary beats an empty page.
					Effect.catchTag("LetterboxdError", (error) =>
						Option.isSome(cached)
							? Effect.logWarning(
									"Serving a stale Letterboxd diary",
									error
								).pipe(Effect.as(cached.value.entries))
							: Effect.fail(error)
					)
				);
			});

			// The diary, newest first, and whether the newest watch was today or
			// yesterday: worked out per request, since the copy can be an hour old.
			// The page still renders with no copy at all; it just says so.
			const diary = Effect.fn("Letterboxd.diary")(function* () {
				const now = yield* Clock.currentTimeMillis;
				const list = yield* entries(now).pipe(
					Effect.catchTag("LetterboxdError", (error) =>
						Effect.logWarning("Letterboxd diary unavailable", error).pipe(
							Effect.as(null)
						)
					)
				);
				const latest = list?.[0];
				return {
					profile: LETTERBOXD_PROFILE,
					available: list !== null,
					entries: list ?? [],
					latestIsRecent:
						latest !== undefined && isRecent(latest.watchedOn, now),
				};
			});

			return { diary };
		}),
	}
) {
	static readonly layer = Layer.effect(this, this.make).pipe(
		Layer.provide(FetchHttpClient.layer)
	);
}
