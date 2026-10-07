---
name: blog-posts
description: Read, edit, draft and publish oscargabriel.dev blog posts from the terminal with `bun run posts`. Use when asked to work on a post's text, frontmatter or header image, or to publish or unpublish one.
---

Posts live in the site's D1 database, not in this repo. `bun run posts` (source and usage: `scripts/posts.ts`) copies them down as markdown files into `posts/`, which is gitignored, and sends them back through the admin API the browser editor uses. The author edits the same posts in the browser at `/admin`, so the copy in `posts/` goes stale whenever they do.

## Editing a post

1. `bun run posts pull <slug>`, even when `posts/<slug>.md` already exists. If it refuses because the file differs, the file holds unpushed work: push it or ask the author before pulling with `--force`.
2. Edit the body and the `slug`, `title`, `summary`, `headerImageId` and `headerImageCaption` lines. Leave `id`, `status` and `updatedAt` as they are; push rewrites them.
3. `bun run posts push posts/<slug>.md`. Done when it prints `saved as a draft`, `saved, and live` or `no changes`.

A new post is a file with no `id` line: write `posts/<slug>.md` with frontmatter and body, push it, and it comes back as a draft with its `id`.

## Live changes need the author's yes

- Pushing to a published post fails without `--live`, because the save goes live at once. Ask the author before adding `--live`.
- Publish or unpublish only when the author asks for it.

## When a push is refused

`the post changed on the site since this file was pulled` means the author saved in the browser after your pull. Pull the site's version with `--out=posts/<slug>.site.md`, carry your edits into it, delete the old file and push the merged one. Use `--force` only when the author says to overwrite their version.

`Cloudflare Access turned the request away` or `didn't accept these credentials` means `CF_ACCESS_CLIENT_ID` and `CF_ACCESS_CLIENT_SECRET` are missing or wrong in `.env.local`. Stop and tell the author; the message says where the values come from.

## Header images

`bun run posts media` lists the library; set `headerImageId` to an id from it. `bun run posts upload <image> --alt="…"` adds a new one. The alt text describes what the image shows, the way the existing entries do.

## Trying things safely

`--url=http://127.0.0.1:3005` points every command at `bun run dev`, which has its own database and needs no token.
