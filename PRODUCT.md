# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Readers:** developers who arrive at long technical blog posts, usually from a shared link or a search, and read one post end to end.
- **The author:** Oscar Gabriel, the only person who writes or edits anything. The author drafts, edits and publishes posts in the site's own admin editor, and sometimes has coding agents edit them from the terminal through `bun run posts`.

## Product Purpose

oscargabriel.dev is Oscar Gabriel's personal site: long-form technical writing plus a list of projects they have built. It works if readers finish posts and the author finds writing and publishing in the admin pleasant enough to keep doing it.

## Operating Context

- **Posts:** markdown, rendered to HTML with a table of contents when saved. Each post can have a header image with a caption; the six existing header images are film and animation stills (for example _Fantastic Planet_, _Treasure Planet_, _The Skeleton Dance_).
- **Projects:** a list carried over from v1, each project linked to its GitHub repo.
- **Admin:** a private, single-user writing tool behind Cloudflare Access. Here the author writes posts, previews them live, saves drafts, publishes and unpublishes, deletes posts, and uploads header images with alt text.

## Capabilities and Constraints

- The site runs as a TanStack Start app on Cloudflare Workers, storing posts in D1 and images in R2.
- The admin renders only in the browser (no SSR). Its API rejects any request not signed in through Access.
- Saving a published post makes the edit live immediately; there is no separate draft copy of a published post.
- Images accepted: PNG, JPEG, GIF, WebP and AVIF, up to 5 MiB. Every image requires alt text.

## Brand Commitments

- **For the step 8 design pass (loose, not binding):** the author shared five reference sites: lauriparonen.com, shreygups.com, henry.codes, flowercomputer.com and jimmyl.ee. What the author likes about them:
  - an off-white background with off-black text, or the reverse;
  - main content and nav anchored to the left, with other content expanding out to the right;
  - minimal, stark contrast;
  - serif headings with sans-serif body text.
- **Typeface:** undecided. The author is leaning toward a bookish serif.
- **Current look:** the site currently uses placeholder shadcn neutrals and JetBrains Mono. That's not a commitment; it's meant to be replaced in step 8.

## Evidence on Hand

- Six published posts and their six header images (with alt text) are in D1 and R2.
- The projects list is in `src/db/seed/projects.sql`.
- There are no testimonials, metrics or press, and none should be invented.

## Product Principles

- **Writing comes first.** The admin exists so the author can write and publish without friction. Every screen should get out of the way of the text.
- **The reader gets a finished page.** Posts are rendered when saved, so readers only ever load stored HTML.
- **Only one person uses the admin.** There are no roles, teams or collaboration features, so none of them should be designed.
