# oscargabriel.dev

My personal site: writing, projects, and a CV.

## Stack

- **App:** TanStack Start (React 19, Router, Query), Vite 8
- **API:** [oRPC](https://orpc.dev) with [Effect v4](https://effect.website)
- **Data:** Cloudflare D1 via Drizzle; R2 for media; KV for cached GitHub stats
- **Infra:** Cloudflare Workers, provisioned with [Alchemy](https://alchemy.run); Cloudflare Access for the admin
- **Posts:** markdown via [`@tanstack/markdown`](https://tanstack.com/markdown), highlighted with [Twinkleplop](https://twinkleplop.pngwn.at)
- **UI:** Tailwind v4, shadcn, EB Garamond and Courier Prime
- **Analytics:** [PostHog](https://posthog.com), cookieless, proxied through `/ingest`
- **Tooling:** Bun, TypeScript 7, [Ultracite](https://www.ultracite.ai) (Oxlint + Oxfmt), [Varlock](https://varlock.dev) for env

## Admin

`/admin` sits behind Cloudflare Access (one-time PIN to a single allowed email).

- Write and edit posts in markdown, with a live preview beside the text
- Save drafts, publish, unpublish and delete
- Upload images to an R2 media library and set a post's header image, with alt text

### From the terminal

`bun run posts` pulls posts down as markdown files into `posts/` (gitignored), pushes edits back, and publishes, unpublishes and uploads images. Agents use it through the `blog-posts` skill in `.agents/skills/`. Usage is at the top of `scripts/posts.ts`.

It reaches the admin API with an Access service token that the prod deploy creates. After the first deploy, copy `clientId` and `clientSecret` from

```sh
bun x varlock run --inject vars -- alchemy state read oscargabriel-dev/prod/AgentToken
```

into `.env.local` as `CF_ACCESS_CLIENT_ID` and `CF_ACCESS_CLIENT_SECRET`. Pass `--url=http://127.0.0.1:3005` to work against `bun run dev` instead; it needs no token.

A save carries the version it was based on, in the browser and the terminal alike. If the post changed since then, the save is refused instead of overwriting the other edit.
