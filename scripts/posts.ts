// Read and write the site's blog posts from the terminal. Posts come down as
// markdown files with a small frontmatter block, get edited like any file,
// and go back up through the same admin API the browser editor uses.
//
//   bun run posts list
//   bun run posts pull my-post            # writes posts/my-post.md
//   bun run posts pull --all
//   bun run posts push posts/my-post.md   # add --live if the post is published
//   bun run posts publish my-post         # a slug or a pulled file
//   bun run posts unpublish my-post
//   bun run posts media                   # the media library, for headerImageId
//   bun run posts upload cover.webp --alt="What the image shows"
//
// A file without an `id` creates a new draft when pushed. Each push sends the
// `updatedAt` from the file, so it fails if the post changed on the site since
// the pull; pull again, or pass --force to overwrite.
//
// It talks to https://oscargabriel.dev with the Access service token in
// CF_ACCESS_CLIENT_ID and CF_ACCESS_CLIENT_SECRET. `--url=http://127.0.0.1:3005`
// (or POSTS_URL) aims it at `bun run dev` instead, which needs no token.

import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { ORPCError, createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type {
	InferRouterInputs,
	InferRouterOutputs,
	RouterClient,
} from "@orpc/server";
import * as Result from "effect/Result";
import * as Schema from "effect/Schema";

import { SLUG } from "@/posts/slug";
import type { adminRouter } from "@/rpc/admin-router";

type AdminClient = RouterClient<typeof adminRouter>;
type SaveInput = InferRouterInputs<typeof adminRouter>["posts"]["save"];
type SavedPost = InferRouterOutputs<typeof adminRouter>["posts"]["save"];
type PostSummary = InferRouterOutputs<
	typeof adminRouter
>["posts"]["listAll"][number];
type Fields = Omit<SaveInput, "id" | "baseUpdatedAt">;

const DEFAULT_URL = "https://oscargabriel.dev";
const POSTS_DIR = "posts";

// The file's view of a post: the editable fields, plus where it came from.
interface PostFile {
	id: number | undefined;
	status: string | undefined;
	// Unix seconds, as of the last pull or push.
	updatedAt: number | undefined;
	fields: Fields;
}

// A mistake the person running the command can fix; printed without a trace.
class UsageError extends Error {
	override name = "UsageError";
}

function say(line: string) {
	process.stdout.write(`${line}\n`);
}

function warn(line: string) {
	process.stderr.write(`${line}\n`);
}

// ── Files ────────────────────────────────────────────────────────────────

const FRONTMATTER = /^---\n(?<head>[\s\S]*?)\n---\n?/u;
const FRONTMATTER_LINE = /^(?<key>[A-Za-z]+):\s*(?<value>.*)$/u;
const LEADING_BLANK_LINES = /^\n+/u;
const TRAILING_NEWLINES = /\n+$/u;
const CRLF = /\r\n/gu;

// Values are written as JSON, which is also YAML, so quotes and colons in a
// title survive. Text may be bare words too: `title: My post` reads as
// "My post", and `title: 2024` as the text "2024".
const Text = Schema.Union([
	Schema.fromJsonString(Schema.String),
	Schema.String,
]);
const WholeNumber = Schema.fromJsonString(Schema.Int);

const Frontmatter = Schema.Struct({
	id: Schema.optionalKey(WholeNumber),
	slug: Text.check(
		Schema.isPattern(SLUG, {
			message:
				"slug should be lowercase words joined by single hyphens, like my-first-post",
		})
	),
	title: Text.check(Schema.isNonEmpty({ message: "title is empty" })),
	summary: Schema.optionalKey(Text),
	headerImageId: Schema.optionalKey(
		Schema.fromJsonString(Schema.NullOr(Schema.Int))
	),
	headerImageCaption: Schema.optionalKey(
		Schema.Union([Schema.fromJsonString(Schema.NullOr(Schema.String)), Text])
	),
	status: Schema.optionalKey(Text),
	updatedAt: Schema.optionalKey(WholeNumber),
});

function unixSeconds(date: Date): number {
	return Math.floor(date.getTime() / 1000);
}

function normalizeBody(body: string): string {
	return body.replace(LEADING_BLANK_LINES, "").replace(TRAILING_NEWLINES, "");
}

function renderFile(file: PostFile): string {
	const { fields } = file;
	const lines = [
		file.id === undefined ? undefined : `id: ${file.id}`,
		`slug: ${JSON.stringify(fields.slug)}`,
		`title: ${JSON.stringify(fields.title)}`,
		`summary: ${JSON.stringify(fields.summary)}`,
		`headerImageId: ${JSON.stringify(fields.headerImageId)}`,
		`headerImageCaption: ${JSON.stringify(fields.headerImageCaption)}`,
		file.status === undefined
			? undefined
			: `status: ${JSON.stringify(file.status)}`,
		file.updatedAt === undefined
			? undefined
			: "# The version this file is based on. Leave it; push updates it.",
		file.updatedAt === undefined ? undefined : `updatedAt: ${file.updatedAt}`,
	].filter((line) => line !== undefined);
	return `---\n${lines.join("\n")}\n---\n\n${normalizeBody(fields.body)}\n`;
}

// Reads `key: value` lines into raw strings for the schema. Comment lines and
// empty values are skipped, so `summary:` with nothing after it is unset.
function readHead(head: string): Map<string, string> {
	const raw = new Map<string, string>();
	for (const line of head.split("\n")) {
		const groups = FRONTMATTER_LINE.exec(line.trim())?.groups;
		const value = groups?.value?.trim() ?? "";
		if (groups?.key !== undefined && value !== "") {
			raw.set(groups.key, value);
		}
	}
	return raw;
}

function parseFile(text: string, where: string): PostFile {
	const normalized = text.replace(CRLF, "\n");
	const match = FRONTMATTER.exec(normalized);
	if (match === null) {
		throw new UsageError(
			`${where}: no frontmatter. The file must start with a --- block.`
		);
	}
	const decoded = Schema.decodeUnknownResult(Frontmatter, { errors: "all" })(
		Object.fromEntries(readHead(match.groups?.head ?? ""))
	);
	if (Result.isFailure(decoded)) {
		throw new UsageError(`${where}: ${decoded.failure.message}`);
	}
	const head = decoded.success;
	return {
		id: head.id,
		status: head.status,
		updatedAt: head.updatedAt,
		fields: {
			slug: head.slug,
			title: head.title,
			summary: head.summary ?? "",
			body: normalizeBody(normalized.slice(match[0].length)),
			headerImageId: head.headerImageId ?? null,
			headerImageCaption: head.headerImageCaption ?? null,
		},
	};
}

function fromSaved(post: SavedPost): PostFile {
	return {
		id: post.id,
		status: post.status,
		updatedAt: unixSeconds(post.updatedAt),
		fields: {
			slug: post.slug,
			title: post.title,
			summary: post.summary,
			body: post.body,
			headerImageId: post.headerImageId,
			headerImageCaption: post.headerImageCaption,
		},
	};
}

function sameFields(a: Fields, b: Fields): boolean {
	return (
		a.slug === b.slug &&
		a.title === b.title &&
		a.summary === b.summary &&
		normalizeBody(a.body) === normalizeBody(b.body) &&
		a.headerImageId === b.headerImageId &&
		a.headerImageCaption === b.headerImageCaption
	);
}

async function readPostFile(file: string): Promise<PostFile> {
	return parseFile(await readFile(file, "utf-8"), file);
}

// ── The API ──────────────────────────────────────────────────────────────

const ACCESS_HELP =
	"Set CF_ACCESS_CLIENT_ID and CF_ACCESS_CLIENT_SECRET in .env.local to the agent token " +
	"(`bun x varlock run --inject vars -- alchemy state read oscargabriel-dev/prod/AgentToken`), " +
	"or pass --url=http://127.0.0.1:3005 to use the dev server.";

// Access answers a missing or wrong token with a redirect to its login page
// or an HTML error, neither of which oRPC can read. Say what happened instead.
async function fetchThroughAccess(
	url: string,
	init: RequestInit
): Promise<Response> {
	const response = await fetch(url, { ...init, redirect: "manual" });
	const isJson =
		response.headers.get("content-type")?.includes("json") ?? false;
	const isRedirect = response.status >= 300 && response.status < 400;
	if (isRedirect || (!response.ok && !isJson)) {
		throw new UsageError(
			`Cloudflare Access turned the request away (HTTP ${response.status}). ${ACCESS_HELP}`
		);
	}
	return response;
}

function connect(baseUrl: string): AdminClient {
	const clientId = process.env.CF_ACCESS_CLIENT_ID ?? "";
	const clientSecret = process.env.CF_ACCESS_CLIENT_SECRET ?? "";
	const headers: Record<string, string> =
		clientId !== "" && clientSecret !== ""
			? {
					"cf-access-client-id": clientId,
					"cf-access-client-secret": clientSecret,
				}
			: {};
	return createORPCClient(
		new RPCLink({
			origin: new URL(baseUrl).origin,
			url: "/api/admin/rpc",
			headers,
			fetch: fetchThroughAccess,
		})
	);
}

function findBySlug(posts: readonly PostSummary[], slug: string): PostSummary {
	const post = posts.find((candidate) => candidate.slug === slug);
	if (post === undefined) {
		throw new UsageError(
			`No post has the slug "${slug}". \`bun run posts list\` shows them all.`
		);
	}
	return post;
}

// ── Commands ─────────────────────────────────────────────────────────────

interface Options {
	args: string[];
	flags: Set<string>;
	values: Map<string, string>;
}

type Command = (client: AdminClient, options: Options) => Promise<void>;

function formatDate(date: Date | null): string {
	return date === null ? "not yet" : date.toISOString().slice(0, 10);
}

async function list(client: AdminClient, { flags }: Options) {
	const posts = await client.posts.listAll();
	if (flags.has("json")) {
		say(JSON.stringify(posts, null, 2));
		return;
	}
	for (const post of posts) {
		say(
			[
				String(post.id).padStart(3),
				post.status.padEnd(9),
				`updated ${formatDate(post.updatedAt)}`,
				post.slug,
			].join("  ")
		);
	}
}

async function pullOne(
	client: AdminClient,
	id: number,
	out: string,
	force: boolean
) {
	const post = await client.posts.byId({ id });
	const text = renderFile(fromSaved(post));
	if (!force && existsSync(out)) {
		const current = await readFile(out, "utf-8");
		if (current !== text) {
			warn(
				`${out} already exists and differs from the site. Push it first, or pull with --force to replace it.`
			);
			process.exitCode = 1;
			return;
		}
	}
	await mkdir(path.dirname(out), { recursive: true });
	await writeFile(out, text);
	say(`pulled ${post.slug} (${post.status}) to ${out}`);
}

async function pull(client: AdminClient, { args, flags, values }: Options) {
	const posts = await client.posts.listAll();
	const slugs = flags.has("all") ? posts.map((post) => post.slug) : args;
	if (slugs.length === 0) {
		throw new UsageError("Name a slug to pull, or pass --all.");
	}
	const out = values.get("out");
	if (out !== undefined && slugs.length > 1) {
		throw new UsageError("--out only works when pulling one post.");
	}
	const wanted = slugs.map((slug) => findBySlug(posts, slug));
	await Promise.all(
		wanted.map(async (post) => {
			await pullOne(
				client,
				post.id,
				out ?? path.join(POSTS_DIR, `${post.slug}.md`),
				flags.has("force")
			);
		})
	);
}

async function pushNew(client: AdminClient, file: string, local: PostFile) {
	const saved = await client.posts.save(local.fields);
	await writeFile(file, renderFile(fromSaved(saved)));
	say(`created draft ${saved.slug} (id ${saved.id}); ${file} now has its id`);
}

async function pushOne(client: AdminClient, file: string, flags: Set<string>) {
	const local = await readPostFile(file);
	if (local.id === undefined) {
		await pushNew(client, file, local);
		return;
	}
	const force = flags.has("force");
	if (local.updatedAt === undefined && !force) {
		throw new UsageError(
			`${file} has an id but no updatedAt, so there's no telling what it would overwrite. Pull it again, or push with --force.`
		);
	}

	const remote = await client.posts.byId({ id: local.id });
	if (sameFields(local.fields, remote)) {
		say(`${remote.slug}: no changes`);
		return;
	}
	// Saving a published post changes the live page at once; make that a choice.
	if (remote.status === "published" && !flags.has("live")) {
		throw new UsageError(
			`${remote.slug} is published, so pushing changes the live page right away. Run again with --live to do that.`
		);
	}

	const saved = await client.posts.save({
		...local.fields,
		id: local.id,
		baseUpdatedAt: force ? undefined : local.updatedAt,
	});
	await writeFile(file, renderFile(fromSaved(saved)));
	say(
		saved.status === "published"
			? `${saved.slug}: saved, and live`
			: `${saved.slug}: saved as a draft`
	);
}

// Returns why one file failed instead of throwing, so one bad file doesn't
// stop the rest.
async function pushOrExplain(
	client: AdminClient,
	file: string,
	flags: Set<string>
): Promise<string | undefined> {
	try {
		await pushOne(client, file, flags);
		return undefined;
	} catch (error) {
		if (error instanceof ORPCError && error.code === "PRECONDITION_FAILED") {
			return `${file}: the post changed on the site since this file was pulled. Pull it again (with --out to compare), or push with --force to overwrite it.`;
		}
		if (error instanceof ORPCError && error.code === "CONFLICT") {
			return `${file}: another post already uses that slug.`;
		}
		if (error instanceof UsageError) {
			return error.message;
		}
		throw error;
	}
}

async function push(client: AdminClient, { args, flags }: Options) {
	if (args.length === 0) {
		throw new UsageError("Name a file to push, like posts/my-post.md.");
	}
	const failures = await Promise.all(
		args.map(async (file) => await pushOrExplain(client, file, flags))
	);
	for (const failure of failures) {
		if (failure !== undefined) {
			warn(failure);
			process.exitCode = 1;
		}
	}
}

// A target is a slug, or a pulled file. A file must match what's on the site,
// since publishing publishes the saved post, not the file.
async function resolveTarget(client: AdminClient, target: string) {
	if (!target.endsWith(".md")) {
		const { id } = findBySlug(await client.posts.listAll(), target);
		return { id, file: undefined };
	}
	const local = await readPostFile(target);
	if (local.id === undefined) {
		throw new UsageError(`${target} has no id yet. Push it first.`);
	}
	const remote = await client.posts.byId({ id: local.id });
	if (!sameFields(local.fields, remote)) {
		throw new UsageError(
			`${target} has changes that aren't on the site yet. Push it first.`
		);
	}
	return { id: local.id, file: { path: target, post: local } };
}

async function setStatus(
	client: AdminClient,
	{ args }: Options,
	status: "published" | "draft"
) {
	const [target] = args;
	if (target === undefined) {
		throw new UsageError("Name a slug or a pulled file.");
	}
	const { id, file } = await resolveTarget(client, target);
	const result =
		status === "published"
			? await client.posts.publish({ id })
			: await client.posts.unpublish({ id });
	if (file !== undefined) {
		await writeFile(
			file.path,
			renderFile({ ...file.post, status: result.status })
		);
	}
	say(
		result.status === "published"
			? `published ${target} (dated ${formatDate(result.publishedAt)})`
			: `unpublished ${target}; it's a draft again`
	);
}

async function media(client: AdminClient, { flags }: Options) {
	const files = await client.media.list();
	if (flags.has("json")) {
		say(JSON.stringify(files, null, 2));
		return;
	}
	for (const file of files) {
		say(
			`${String(file.id).padStart(3)}  ${file.key}  ${JSON.stringify(file.alt ?? "")}`
		);
	}
}

async function upload(client: AdminClient, { args, values }: Options) {
	const [source] = args;
	const alt = values.get("alt") ?? "";
	if (source === undefined || alt.trim() === "") {
		throw new UsageError(
			'Name an image and describe it: upload cover.webp --alt="What it shows"'
		);
	}
	const file = new File([await readFile(source)], path.basename(source));
	const saved = await client.media.upload({ file, alt });
	say(
		`uploaded ${source} as media ${saved.id}; set headerImageId: ${saved.id} to use it`
	);
}

function commandNamed(name: string): Command | undefined {
	switch (name) {
		case "list": {
			return list;
		}
		case "pull": {
			return pull;
		}
		case "push": {
			return push;
		}
		case "publish": {
			return async (client, options) => {
				await setStatus(client, options, "published");
			};
		}
		case "unpublish": {
			return async (client, options) => {
				await setStatus(client, options, "draft");
			};
		}
		case "media": {
			return media;
		}
		case "upload": {
			return upload;
		}
		default: {
			return undefined;
		}
	}
}

function parseArgs(argv: readonly string[]): Options {
	const args: string[] = [];
	const flags = new Set<string>();
	const values = new Map<string, string>();
	for (const arg of argv) {
		if (!arg.startsWith("--")) {
			args.push(arg);
			continue;
		}
		const equals = arg.indexOf("=");
		if (equals === -1) {
			flags.add(arg.slice(2));
		} else {
			values.set(arg.slice(2, equals), arg.slice(equals + 1));
		}
	}
	return { args, flags, values };
}

async function main() {
	const [name = "help", ...rest] = process.argv.slice(2);
	const command = commandNamed(name);
	if (command === undefined) {
		say(
			"Commands: list, pull <slug…|--all>, push <file…>, publish <slug|file>, unpublish <slug|file>, media, upload <image> --alt=…"
		);
		say("Flags: --url=…, --force, --live, --json, --out=…");
		return;
	}
	const options = parseArgs(rest);
	// Varlock sets POSTS_URL to "" when .env.local leaves it empty.
	const fromEnv = process.env.POSTS_URL ?? "";
	const baseUrl =
		options.values.get("url") ?? (fromEnv === "" ? DEFAULT_URL : fromEnv);
	try {
		await command(connect(baseUrl), options);
	} catch (error) {
		if (error instanceof UsageError) {
			warn(error.message);
		} else if (error instanceof ORPCError && error.code === "UNAUTHORIZED") {
			warn(`The site didn't accept these credentials. ${ACCESS_HELP}`);
		} else if (error instanceof ORPCError) {
			warn(`${error.code}: ${error.message}`);
		} else {
			throw error;
		}
		process.exitCode = 1;
	}
}

await main();
