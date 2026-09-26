import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import { flow } from "effect/Function";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Redacted from "effect/Redacted";
import * as Schedule from "effect/Schedule";
import * as Schema from "effect/Schema";
import * as FetchHttpClient from "effect/unstable/http/FetchHttpClient";
import * as HttpClient from "effect/unstable/http/HttpClient";
import * as HttpClientRequest from "effect/unstable/http/HttpClientRequest";
import * as HttpClientResponse from "effect/unstable/http/HttpClientResponse";

import { env } from "@/env";

// GitHub rejects API requests that have no User-Agent.
const USER_AGENT = "oscargabriel.dev";
const CACHE_TTL_SECONDS = 300;

export const RepoStats = Schema.Struct({
	stars: Schema.Int,
	pushedAt: Schema.String,
});

// The fields we read from GET /repos/{owner}/{repo}; decoding drops the rest.
const RepoResponse = Schema.Struct({
	stargazers_count: Schema.Int,
	pushed_at: Schema.String,
});

export class GitHubError extends Schema.TaggedError<GitHubError>()(
	"GitHubError",
	{
		owner: Schema.String,
		repo: Schema.String,
		cause: Schema.Defect(),
	}
) {}

export class GitHub extends Context.Service<GitHub>()("app/GitHub", {
	make: Effect.gen(function* () {
		const cache = env.REPO_CACHE;
		const token = Redacted.make(env.GITHUB_TOKEN);
		const client = (yield* HttpClient.HttpClient).pipe(
			HttpClient.mapRequest(
				flow(
					HttpClientRequest.prependUrl("https://api.github.com"),
					HttpClientRequest.bearerToken(token),
					HttpClientRequest.setHeaders({
						Accept: "application/vnd.github+json",
						"User-Agent": USER_AGENT,
						"X-GitHub-Api-Version": "2022-11-28",
					})
				)
			),
			HttpClient.filterStatusOk,
			HttpClient.retryTransient({
				schedule: Schedule.exponential("200 millis"),
				times: 3,
			})
		);

		// The cache is best effort: a failed read counts as a miss, and a failed write is ignored.
		function readCache(key: string) {
			return Effect.tryPromise(async () => await cache.get(key, "json")).pipe(
				Effect.flatMap(Schema.decodeUnknownEffect(RepoStats)),
				Effect.option
			);
		}

		function writeCache(key: string, stats: typeof RepoStats.Type) {
			return Effect.tryPromise(async () => {
				await cache.put(key, JSON.stringify(stats), {
					expirationTtl: CACHE_TTL_SECONDS,
				});
			}).pipe(Effect.ignore);
		}

		function fetchStats(owner: string, repo: string) {
			return client.get(`/repos/${owner}/${repo}`).pipe(
				Effect.flatMap(HttpClientResponse.schemaBodyJson(RepoResponse)),
				Effect.map((body) => ({
					stars: body.stargazers_count,
					pushedAt: body.pushed_at,
				}))
			);
		}

		const repoStats = Effect.fn("GitHub.repoStats")(function* (
			owner: string,
			repo: string
		) {
			const key = `repo:${owner}/${repo}`;
			const cached = yield* readCache(key);
			if (Option.isSome(cached)) {
				return cached.value;
			}
			const stats = yield* fetchStats(owner, repo).pipe(
				Effect.mapError((cause) => new GitHubError({ owner, repo, cause }))
			);
			yield* writeCache(key, stats);
			return stats;
		});

		return { repoStats };
	}),
}) {
	static readonly layer = Layer.effect(this, this.make).pipe(
		Layer.provide(FetchHttpClient.layer)
	);
}
