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
