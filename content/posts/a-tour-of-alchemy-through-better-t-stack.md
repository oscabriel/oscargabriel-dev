---
title: "A Tour of Alchemy via Better-T-Stack"
summary: "Alchemy brings infrastructure-as-code to Better-T-Stack, turning it into one of the premiere solutions for full-stack production deployment available today."
date: 2025-09-01
author: Oscar Gabriel
headerImage: "/images/lord-of-the-rings.jpg"
headerImageCaption: "The Lord of the Rings (1978) — Let alchemy guide you home."
---

Going from a blank folder on your computer to a real, live website is easier than it's ever been, but don't let anyone grift you into thinking it's trivial. 

One thing I quickly picked up on when I first dove into the wide world of web development in 2024 was that, at the very beginning, it's a lot less like "building" and a lot more like "shopping." It's browsing and looking and judging vibes, then it's picking out and trying on and putting back on the rack. And eventually, it's deciding and committing and taking home to add to your wardrobe.

I spent the first several months of learning just familiarizing myself with all the big names of frameworks, tools, solutions, libraries, etc that are out there in their varying states of maturity and usefulness. I would blindly follow tutorials word by word just to focus on one or two things at a time, not really trying to absorb much other than how it felt to use this or that thing. And as I slowly developed opinions on what felt right and what I wanted to learn more about, I found myself quickly running out of tutorials that could actually help me.

I found that most tutorials aren't built for you to be able to try lots of things quickly (which is fair, but I don't always want to spend four hours on building out a whole app just to try out one of the parts of the stack), nor are they often built with full-stack, maintainable deployment to production in mind (which is once again fair, but I want to feel like I've actually made something if I'm going through all the effort).

So, is there anything out there that can do it all? Be a great learning tool that you can deploy quickly and iterate on easily? That could cut through tutorial hell and the headaches involved with getting from zero to one?

I think there just might be.

## Infinite Tutorials

According to its test suite, [Better-T-Stack](https://better-t-stack.dev/) has well over 150 possible tech stack combinations. BTS represents everything I learned to love on my journey so far: it's 100% focused on Typescript and type-safety, it's wildly composable, and it's dedicated to tech stacks featuring discrete frontend and backend code.

With all of this, Better-T-Stack generates *excellent* development setups. Your local environment is beautifully setup for you. But here's the thing: that was typically where the easy fun ended and the deployment headaches began, *until now*.

The recent Alchemy integration into BTS heals all deployment headaches, allowing you to take your beautiful local dev environment and turn it into a production-ready app deployed to Cloudflare Workers. If you've tried out BTS but gave up on your project because of the difficulty of deploying, I highly encourage you to give it another shot with Alchemy in your stack.

It's not super important for what we're doing in this tour, but here's the stack we'll be using to explore Alchemy. It's my personal go-to within the available BTS options:
- **TanStack Router** for type-safe frontend routing
- **Hono** for lightning-fast backend APIs
- **SQLite/D1** for your database layer
- **Drizzle** as your type-safe ORM
- **Better-Auth** for the *best* authz/authn
- And last but not least **Alchemy** for deployment to Cloudflare

## Time to Learn What "IaC" Means

If you're unfamiliar with [Alchemy](https://alchemy.run/), then I'm delighted to be the first to show it to you. 

Infrastructure-as-Code ("IaC") is the incredible idea of pre-defining your app's infra configuration in code, rather than doing it manually in a cloud console after finishing your app. And Alchemy's not like other IaC offerings; it's written in pure Typescript (already established that that's a win), that doesn't depend on one or more wrapper layers above it to work, that is easy to understand and super flexible. Alchemy also features:

- **Cloudflare-first approach**: While other IaC tools treat Cloudflare as an afterthought, Alchemy is purpose-built for the edge with first-class support for Workers, D1, KV, Durable Objects, and the entire CF ecosystem. We're bullish on Cloudflare around here.

- **Just async functions**: Alchemy uses simple async functions for resources, making infrastructure code feel natural to write and immediate to edit.

- **Direct API integration**: Resources call service APIs directly using `fetch`, meaning we get fast deployments through direct Javascript execution.

- **Easy Secrets and Variables**: Alchemy manages sensitive values by encrypting them in state files, and gives you an easy way to access your secrets, resource bindings, and other environment variables through inferred and augmented `env` types.

## Out of the Box

Here's what your `alchemy.run.ts` config file will look like right after creating a fresh app with `bun create better-t-stack@latest`:

```typescript
import alchemy from "alchemy";
import { Vite } from "alchemy/cloudflare";
import { Worker } from "alchemy/cloudflare";
import { D1Database } from "alchemy/cloudflare";
import { Exec } from "alchemy/os";
import { config } from "dotenv";

config({ path: "./.env" });
config({ path: "./apps/web/.env" });
config({ path: "./apps/server/.env" });

const app = await alchemy("your-app-name");

await Exec("db-generate", {
  cwd: "apps/server",
  command: "bun run db:generate",
});

const db = await D1Database("database", {
  migrationsDir: "apps/server/src/db/migrations",
});

export const web = await Vite("web", {
  cwd: "apps/web",
  assets: "dist",
  bindings: {
    VITE_SERVER_URL: process.env.VITE_SERVER_URL || "",
  },
  dev: {
    command: "bun run dev",
  },
});

export const server = await Worker("server", {
  cwd: "apps/server",
  entrypoint: "src/index.ts",
  compatibility: "node",
  bindings: {
    DB: db,
    CORS_ORIGIN: process.env.CORS_ORIGIN || "",
    BETTER_AUTH_SECRET: alchemy.secret(process.env.BETTER_AUTH_SECRET),
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL || "",
    GOOGLE_GENERATIVE_AI_API_KEY: alchemy.secret(
      process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    ),
  },
  dev: {
    port: 3000,
  },
});

console.log(`Web    -> ${web.url}`);
console.log(`Server -> ${server.url}`);

await app.finalize();
```

Let's break down this configuration chunk by chunk, following the same structure as the file itself.

## Defining Your `app`

The BTS Alchemy config starts with the main app initialization and environment setup:

```typescript
import alchemy from "alchemy";
import { config } from "dotenv";

config({ path: "./.env" });
config({ path: "./apps/web/.env" });
config({ path: "./apps/server/.env" });

const app = await alchemy("your-app-name");
```

**Environment cascading**: BTS projects use a monorepo structure with separate `apps/web` and `apps/server` directories, each with their own environment files. The dotenv config cascade loads environment variables from multiple locations, allowing for environment-specific overrides while maintaining sensible defaults across the entire monorepo.

**App initialization**: The `alchemy("your-app-name")` call creates your infrastructure context with a unique identifier. This ID becomes the namespace for all your resources, ensuring no conflicts across projects.

**Resource orchestration**: The app acts as the central coordinator for all your infrastructure resources, managing dependencies and ensuring proper deployment order.

**Build-time execution**: The `Exec` command runs your database generation before deployment, ensuring your schema is always in sync. Notice the `cwd: "apps/server"` configuration, which tells Alchemy to run the command in the server app's directory within our monorepo structure. After initial db creation, this line can be removed.

```typescript
await Exec("db-generate", {
  cwd: "apps/server",
  command: "bun run db:generate",
});
```

**Finalization**: The `await app.finalize()` call at the end ensures all resources are properly created and configured before deployment completes. Additionally, if you ever remove a previously-existing resource from your alchemy file, `finalize` will also clean up your alchemy state and delete that resource.

## SQLite at the Edge with `D1Database`

Cloudflare D1 is the easiest choice for database when deploying to Cloudflare, and Alchemy makes it effortless to configure:

```typescript
const db = await D1Database("database", {
  migrationsDir: "apps/server/src/db/migrations",
});
```

**Automatic provisioning**: Alchemy creates and configures your Cloudflare D1 database instance with zero manual setup. No clicking through dashboards, no wrangler CLI commands, and with the schema provided by BTS, no manual SQL execution.

**Migration management**: The `migrationsDir: "apps/server/src/db/migrations"` property points to your Drizzle migration files within the monorepo structure, and Alchemy automatically applies them to your cloud database. Changes to your db schema are automatically applied on every deploy.

**Resource binding**: The database resource can be referenced directly in other parts of your configuration (like the server worker bindings), allowing you to easily access your database across your app's server logic.

## Static Frontend with `Vite`

Cloudflare Workers manages your frontend for you with intelligent static asset handling:

```typescript
export const web = await Vite("web", {
  cwd: "apps/web",
  assets: "dist",
  bindings: {
    VITE_SERVER_URL: process.env.VITE_SERVER_URL || "",
  },
  dev: {
    command: "bun run dev",
  },
});
```

**Build integration**: Alchemy understands your Vite build process and automatically handles the compilation and deployment of your frontend assets. The `cwd: "apps/web"` configuration tells Alchemy to work within the web app's directory in our monorepo, while `assets: "dist"` specifies where to find the built static files relative to that directory.

**Environment variables**: The `bindings` configuration makes environment variables available to your Vite build process, enabling different configurations for development, staging, and production.

**Asset optimization**: Images, CSS, and JavaScript files are automatically optimized, compressed, and served with appropriate caching headers for maximum performance.

**Development workflow**: The `dev: { command: "bun run dev" }` line allows us to use our preferred dev command, from the apps/web `package.json`. That command specifies a port for our frontend dev server, ensuring a consistent and smooth monorepo dev experience.

**Global CDN deployment**: Static assets are automatically distributed across Cloudflare's global CDN network, ensuring fast loading times for everyone.

## API Worker and Bindings with `Worker`

Your backend API runs as a Cloudflare Worker with access to all your infrastructure resources:

```typescript
export const server = await Worker("server", {
  cwd: "apps/server",
  entrypoint: "src/index.ts",
  compatibility: "node",
  bindings: {
    DB: db,
    CORS_ORIGIN: process.env.CORS_ORIGIN || "",
    BETTER_AUTH_SECRET: alchemy.secret(process.env.BETTER_AUTH_SECRET),
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL || "",
    GOOGLE_GENERATIVE_AI_API_KEY: alchemy.secret(
      process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    ),
  },
  dev: {
    port: 3000,
  },
});
```

**Resource bindings**: The `DB: db` binding automatically gives your Worker access to the D1 database created above.

**Secret management**: The `alchemy.secret()` wrapper ensures sensitive values like API keys are encrypted in your state files and securely injected into your Worker at runtime. Non-secret environment variables simply passed through with dotenv and are defined in plaintext in your state files.

**Monorepo-aware deployment**: The `cwd: "apps/server"` and `entrypoint: "src/index.ts"` lines tells Alchemy to build and deploy from the `index.ts` file in the `apps/server/src/` directory.

**Compatibility Flags**: The `compatibility: "node"` line enables Node.js APIs in your Worker, making it easier to use existing npm packages and libraries. You can also specify other compatibility flags as desired with `compatibilityFlags`.

**Development server**: The `dev: { port: 3000 }` line sets up local development with a consistent, separate port from your frontend dev server.

**Edge deployment**: Your API runs on Cloudflare's global edge network, handling anywhere from zero to millions of requests without any infrastructure management on your part.

## Where to Go from Here

Now that you get the gist of what Alchemy offers you in your Better-T-Stack app, here's a few advanced tips.

### Enhanced Environment Management

As your app matures, you'll want proper staging and production environments. Alchemy makes this incredibly straightforward with stage-based configuration. To make this possible with our monorepo structure, we can enhance our dotenv config:

```typescript
const stage = process.env.ALCHEMY_STAGE || "dev";

config({ path: `./.env.${stage}` });
config({ path: `./apps/web/.env.${stage}` });
config({ path: `./apps/server/.env.${stage}` });
```

Then, we create separate environment files for each stage:
- `.env.dev` - Development configurations with relaxed CORS, debug logging, and local service endpoints
- `.env.prod` - Production settings with strict security policies and production API keys

Make use of the different stages with `ALCHEMY_STAGE=prod bun alchemy deploy` or `ALCHEMY_STAGE=dev bun alchemy dev`. You could even add `test` or `staging` stages, as well. There are ways to handle only your local secrets in your local files, and only your real production secrets in Cloudflare itself, but I've found this method of keeping each stage isolated, all within the same local codebase, to be very convenient.

### Adding More Cloudflare Resources

Your basic setup can grow into a full production system by adding more of Cloudflare's offerings:

**KV Storage for Caching and Sessions**:
```typescript
import { KVNamespace } from "alchemy/cloudflare";

const cache = await KVNamespace("app-cache", {
  title: "app-cache",
});

// Add to server bindings
bindings: {
  DB: db,
  CACHE: cache,
}
```

**Queues for Background Processing**:
```typescript
import { Queue } from "alchemy/cloudflare";

const queue = await Queue("email-queue", {
  name: "email-queue",
});

// Bind to a worker with settings
await Worker("processor", {
  bindings: {
    QUEUE: queue,
  },
  eventSources: [{
    queue,
    settings: {
      batchSize: 10,  // Process 10 messages at once
      maxWaitTimeMs: 2000,  // Wait up to 2 seconds to fill a batch
    }
  }]
});
```

**Durable Objects for Stateful Services**:
```typescript
import { DurableObjectNamespace } from "alchemy/cloudflare";

const gameRooms = await DurableObjectNamespace("game-rooms", {
  class_name: "GameRoom",
  sqlite: true  // SQLite-backed DO
});
```

**Custom Domains and SSL**:
```typescript
// Give your server worker a custom API subdomain
const server = await Worker("api", {
  name: "api-worker",
  domains: [
    {
      domainName: "api.example.com",
      zoneId: "YOUR_ZONE_ID",
      adopt: true,
    },
  ],
});
```
And more!

### Making the Most of the Edge

As your application scales, Alchemy and Cloudflare provide enterprise-grade features with zero additional infrastructure:

**Global Performance**: Cloudflare is unmatched in delivering your app fast, meeting your users where they are, anywhere in the world.

**Built-in Security**: DDoS protection, bot management, and WAF rules come standard. Add rate limiting and access controls with a few extra lines of configuration.

**Cost Optimization**: Pay only for what you use. Most apps stay within Cloudflare's generous free tiers until they're generating significant revenue, and even then you'll probably be able to stay within their dead-simple $5/month [Workers Paid](https://developers.cloudflare.com/workers/platform/pricing/#workers) subscription plan.

If you're building on the web, you should probably be choosing Cloudflare.

And if you're building with Better-T-Stack, you should probably be choosing Alchemy.

---

*Want to see this stack in action? I'll be building a real app with Better-T-Stack + Alchemy and documenting the entire journey. Follow along on [Twitter](https://twitter.com/oscabriel).*