-- Projects list, seeded from v1. Alchemy re-imports this file whenever it changes.
INSERT INTO projects (title, description, live_url, repo_owner, repo_name, launched_at)
VALUES
	('Expense Tracker', 'A simple expense tracker deployed to Fly.io built with React, Vite, Hono, Neon Postgres, and Kinde Auth. Add/edit/delete expenses, and view the total amount of expenses.', 'https://parsus.fly.dev', 'oscabriel', 'expense-tracker', unixepoch('2024-08-12')),
	('Next Chat App', 'An AI chat interface built with Next.js, Vercel AI SDK, OpenAI, Vercel Postgres, and NextAuth. Includes a streaming chat interface and a chat history.', 'https://next-chat-app-oscabriel.vercel.app', 'oscabriel', 'next-chat-app', unixepoch('2024-11-24')),
	('Better Auth Tutorial', 'A comprehensive tutorial project demonstrating a complex authentication flow with Better Auth. Built with Next.js, Neon Postgres, Prisma, and Resend.', 'https://better-auth-tutorial.vercel.app', 'oscabriel', 'better-auth-tutorial', unixepoch('2025-02-27')),
	('Better Cloud', 'Fullstack typescript starter kit combining the best of Cloudflare with the modern React ecosystem, including Vite, Hono, Tanstack Router + Query, and Better Auth.', 'https://better-cloud.dev', 'oscabriel', 'better-cloud', unixepoch('2025-04-24')),
	('Turbo Cloud', 'A monorepo starter kit for building web apps with Turborepo, Vite, Hono, and Cloudflare, based on Better Cloud.', 'https://turbo-cloud.oscargabriel.workers.dev', 'oscabriel', 'turbo-cloud', unixepoch('2025-05-06')),
	('RedwoodSDK Guestbook', 'A guestbook where visitors can leave messages and thoughts. Built with RedwoodSDK, Alchemy, Better Auth, Drizzle, Tanstack Form, and Cloudflare D1 and R2.', 'https://guestbook.oscargabriel.dev', 'oscabriel', 'rwsdk-guestbook', unixepoch('2025-05-30')),
	('Portfolio Site', 'This exact site you''re on, built with RedwoodSDK, Alchemy, Tailwind + shadcn/ui, Cloudflare KV, and Content Collections.', 'https://oscargabriel.dev', 'oscabriel', 'oscargabriel-dev', unixepoch('2025-07-13')),
	('Better Chat', 'Better Chat through Durable Objects. Built with AI SDK v5, Tanstack Router, Hono, oRPC, and a dual-database approach with D1 and per-user Durable Objects managed by Drizzle.', 'https://chat.oscargabriel.dev', 'oscabriel', 'better-chat', unixepoch('2025-10-06')),
	('Offworld', 'CLI tool that gives coding agents instant context on any open source repo. Monorepo with CLI, web app, docs, and TUI. Built with Convex, Better Auth, Alchemy, and Turborepo.', 'https://offworld.sh', 'oscabriel', 'offworld', unixepoch('2026-01-27'))
ON CONFLICT (repo_owner, repo_name) DO UPDATE SET
	title = excluded.title,
	description = excluded.description,
	live_url = excluded.live_url,
	launched_at = excluded.launched_at;
