export interface ProjectItem {
	title: string;
	description: string;
	date: string;
	liveUrl: string;
	githubUrl: string;
	repo: { owner: string; name: string };
}

export const projects: ProjectItem[] = [
	{
		title: "Expense Tracker",
		description:
			"A simple expense tracker deployed to Fly.io built with React, Vite, Hono, Neon Postgres, and Kinde Auth. Add/edit/delete expenses, and view the total amount of expenses.",
		date: "2024-08-12",
		liveUrl: "https://parsus.fly.dev",
		githubUrl: "https://github.com/oscabriel/expense-tracker",
		repo: { owner: "oscabriel", name: "expense-tracker" },
	},
	{
		title: "Next Chat App",
		description:
			"An AI chat interface built with Next.js, Vercel AI SDK, OpenAI, Vercel Postgres, and NextAuth. Includes a streaming chat interface and a chat history.",
		date: "2024-11-24",
		liveUrl: "https://next-chat-app-oscabriel.vercel.app",
		githubUrl: "https://github.com/oscabriel/next-chat-app",
		repo: { owner: "oscabriel", name: "next-chat-app" },
	},
	{
		title: "Better Auth Tutorial",
		description:
			"A comprehensive tutorial project demonstrating a complex authentication flow with Better Auth. Built with Next.js, Neon Postgres, Prisma, and Resend.",
		date: "2025-02-27",
		liveUrl: "https://better-auth-tutorial.vercel.app",
		githubUrl: "https://github.com/oscabriel/better-auth-tutorial",
		repo: { owner: "oscabriel", name: "better-auth-tutorial" },
	},
	{
		title: "Better Cloud",
		description:
			"Fullstack typescript starter kit combining the best of Cloudflare with the modern React ecosystem, including Vite, Hono, Tanstack Router + Query, and Better Auth.",
		date: "2025-04-24",
		liveUrl: "https://better-cloud.dev",
		githubUrl: "https://github.com/oscabriel/better-cloud",
		repo: { owner: "oscabriel", name: "better-cloud" },
	},
	{
		title: "Turbo Cloud",
		description:
			"A monorepo starter kit for building web apps with Turborepo, Vite, Hono, and Cloudflare, based on Better Cloud.",
		date: "2025-05-06",
		liveUrl: "https://turbo-cloud.oscargabriel.workers.dev",
		githubUrl: "https://github.com/oscabriel/turbo-cloud",
		repo: { owner: "oscabriel", name: "turbo-cloud" },
	},
	{
		title: "RedwoodSDK Guestbook",
		description:
			"A guestbook where visitors can leave messages and thoughts. Built with RedwoodSDK, Alchemy, Better Auth, Drizzle, Tanstack Form, and Cloudflare D1 and R2.",
		date: "2025-05-30",
		liveUrl: "https://guestbook.oscargabriel.dev",
		githubUrl: "https://github.com/oscabriel/rwsdk-guestbook",
		repo: { owner: "oscabriel", name: "rwsdk-guestbook" },
	},
	{
		title: "Portfolio Site",
		description:
			"This exact site you're on, built with RedwoodSDK, Alchemy, Tailwind + shadcn/ui, Cloudflare KV, and Content Collections.",
		date: "2025-07-13",
		liveUrl: "https://oscargabriel.dev",
		githubUrl: "https://github.com/oscabriel/oscargabriel-dev",
		repo: { owner: "oscabriel", name: "oscargabriel-dev" },
	},
	{
		title: "Better Chat",
		description:
			"Better Chat through Durable Objects. Built with AI SDK v5, Tanstack Router, Hono, oRPC, and a dual-database approach with D1 and per-user Durable Objects managed by Drizzle.",
		date: "2025-10-06",
		liveUrl: "https://chat.oscargabriel.dev",
		githubUrl: "https://github.com/oscabriel/better-chat",
		repo: { owner: "oscabriel", name: "better-chat" },
	},
	{
		title: "Offworld",
		description:
			"CLI tool that gives coding agents instant context on any open source repo. Monorepo with CLI, web app, docs, and TUI. Built with Convex, Better Auth, Alchemy, and Turborepo.",
		date: "2026-01-27",
		liveUrl: "https://offworld.sh",
		githubUrl: "https://github.com/oscabriel/offworld",
		repo: { owner: "oscabriel", name: "offworld" },
	},
];
