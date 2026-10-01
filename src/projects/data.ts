// The projects, one entry per repo. The page dates and orders them by each
// repo's last push on GitHub, so their order here doesn't matter.

export interface Project {
	title: string;
	description: string;
	liveUrl: string;
	repoOwner: string;
	repoName: string;
}

export const PROJECTS: Project[] = [
	{
		title: "Nouveau",
		description:
			"An index of new lots from specialty coffee roasters, built for the Convex All Gas Hackathon. Log what you’ve tried, get emailed about new drops, and ask an agent to “Find my next bag”. Built with Convex, TypeSafe’s Jev, Firecrawl, and AgentMail.",
		liveUrl: "https://nouveau.coffee",
		repoOwner: "oscabriel",
		repoName: "nouveau",
	},
	{
		title: "Offworld",
		description:
			"One skill for your whole stack. A CLI that scans a project’s dependencies, clones each one, and writes reference files so coding agents read the source instead of guessing. Ships with a web directory, docs, and a TUI. Built with Convex, Better Auth, Alchemy, and Turborepo.",
		liveUrl: "https://offworld.sh",
		repoOwner: "oscabriel",
		repoName: "offworld",
	},
	{
		title: "Better Chat",
		description:
			"A multi-provider AI chat app where each user’s conversations live in their own Durable Object. Bring your own keys, add MCP servers, and track usage against quotas. Built with AI SDK, TanStack Router, Hono, oRPC, Better Auth, Drizzle, and Alchemy.",
		liveUrl: "https://chat.oscargabriel.dev",
		repoOwner: "oscabriel",
		repoName: "better-chat",
	},
	{
		title: "Portfolio Site",
		description:
			"This exact site you’re on, built with TanStack Start, Effect, oRPC, Drizzle, and Alchemy on Cloudflare Workers, D1, R2, and KV.",
		liveUrl: "https://oscargabriel.dev",
		repoOwner: "oscabriel",
		repoName: "oscargabriel-dev",
	},
	{
		title: "Better Cloud",
		description:
			"A full-stack starter for Cloudflare, with Workers, Durable Objects, D1, and KV behind a React app. A real-time counter and a guestbook show the pieces working together. Built with Vite, Hono, tRPC, TanStack Router and Query, Better Auth, Drizzle, and Alchemy.",
		liveUrl: "https://better-cloud.dev",
		repoOwner: "oscabriel",
		repoName: "better-cloud",
	},
	{
		title: "Pi Setup",
		description:
			"My pi coding-agent install as a repo: the extensions and settings that I use every day, including pi-skill-stacks, which toggles skills in named stacks to keep the system prompt small, and pi-herdr-btw, which opens side conversations in a new herdr pane.",
		liveUrl: "https://github.com/oscabriel/my-pi-setup",
		repoOwner: "oscabriel",
		repoName: "my-pi-setup",
	},
];
