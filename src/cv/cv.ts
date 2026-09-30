// The CV, merged from the tailored résumés into one general version. Contact
// details stop at the city: no phone, street or email on a public page.

// Months as "YYYY-MM", rendered as "Jan 2023" and used as <time> values.
type Month = `${number}-${number}`;

export interface Role {
	title: string;
	start: Month;
	end: Month;
	place?: string;
	note?: string;
	points: string[];
}

export interface Employer {
	name: string;
	place?: string;
	roles: Role[];
}

export interface CvProject {
	name: string;
	description: string;
	links: { label: string; href: string }[];
}

export interface Schooling {
	name: string;
	credential?: string;
	start?: Month;
	end: Month;
	detail?: string;
	href?: string;
}

export const CV_PLACE = "Portland, Oregon";

export const CV_LINKS = [
	{ label: "LinkedIn", href: "https://www.linkedin.com/in/oscar-gabriel" },
	{ label: "GitHub", href: "https://github.com/oscabriel" },
] as const;

export const CV_SUMMARY =
	"I learned to code on a factory floor, where nobody hands you a spec and the deadline is the shift. What I like is the moment a new capability lands and nobody has decided what it’s for yet. I take the half-formed idea and turn it into something people can click, usually alone, usually before the docs catch up. I’ve worked agent-first for a couple of years and share what I learn and build online. Two years as the only person writing code inside a coffee roastery taught me to ship for people who don’t care how it works, only that it does.";

export const CV_EXPERIENCE: Employer[] = [
	{
		name: "Stumptown Coffee Roasters",
		place: "Portland, OR",
		roles: [
			{
				title: "Production Planner",
				start: "2024-07",
				end: "2026-09",
				note: "Ostensibly a “just send the plans out every day” job, but in practice, I handled operations analysis and became the one-man tooling team. Decision-making for the roasting, packaging, cold brew, logistics, procurement, and sales teams all flowed through my desk.",
				points: [
					"Onboarded new wholesale customers into the fulfillment pipeline and built tools to support the operations teams in fulfilling their orders. 95% on-time delivery across 200+ SKUs and five sales channels.",
					"Built a demand-driven planning system from the ground up after a rough migration to Dynamics 365. Plan creation time down 40%, excess inventory down 30%.",
					"Built the packaging line’s production tracker, complete with a regression suite in CI, deployed to staging copies before the live workbooks, with weekly data reconciliation and backups. A write-ownership registry decided which columns operators or the scripts own, preventing accidental rewrites.",
					"Graded OEE against a per-SKU baseline instead of one plant-wide rate: a runtime-weighted historical average blended with the best observed run, computed only from complete days with nonzero output.",
					"Caught a Bags/hr metric that passed every check and was still wrong: it assumed weekend crews took lunch together. They didn’t. An agent could fix the math; finding the assumption took knowing the crews.",
					"Turned the tracker’s procedures into eight runbooks a coding agent could execute, with STOP conditions where a human takes over. The agent ran the deploy checklist unattended.",
				],
			},
			{
				title: "Manufacturing Operations Specialist",
				start: "2023-01",
				end: "2024-07",
				points: [
					"Collected machine output data daily by hand. Predictive maintenance experiments built on that data cut unplanned downtime by 15% year-over-year.",
					"Traced high bag waste to head-pressure drops between changeovers. Collected weeks of data from multiple machines to learn how to anticipate the drops, cutting waste in half.",
				],
			},
		],
	},
	{
		name: "Card Kingdom",
		place: "Seattle, WA",
		roles: [
			{
				title: "Operations Specialist",
				start: "2021-05",
				end: "2022-08",
				points: [
					"Ran and maintained trading card QA robots driven by an internal ML defect model. Cataloged recurring defect patterns to improve the model’s accuracy. Fulfillment time down 20%; shipped defects under 1% per batch.",
				],
			},
		],
	},
	{
		name: "Freelance",
		roles: [
			{
				title: "Photographer",
				start: "2020-05",
				end: "2023-01",
				place: "Seattle and Portland",
				points: ["Created portraits and art projects for paying clients."],
			},
			{
				title: "Math and Statistics Tutor",
				start: "2014-08",
				end: "2017-03",
				place: "University of New Orleans, part-time",
				points: [],
			},
		],
	},
];

export const CV_PROJECTS: CvProject[] = [
	{
		name: "Better Chat",
		description:
			"Multi-provider chat web app with MCP servers built in, made before that was commonplace. OpenAI, Anthropic, and Gemini behind one request format via AI SDK v5; streaming, reasoning, and tool calling run unchanged when the model string changes.",
		links: [
			{ label: "Live", href: "https://chat.oscargabriel.dev" },
			{ label: "Source", href: "https://github.com/oscabriel/better-chat" },
		],
	},
	{
		name: "Offworld",
		description:
			"CLI and online directory that give coding agents source-level context on any open source repo, without having to re-grep for the same knowledge every session.",
		links: [
			{ label: "Live", href: "https://offworld.sh" },
			{ label: "npm", href: "https://www.npmjs.com/package/offworld" },
			{ label: "Source", href: "https://github.com/oscabriel/offworld" },
		],
	},
	{
		name: "Nouveau",
		description:
			"A live index of new lots from specialty coffee roasters, built for the Convex All Gas Hackathon. Users can get alerted of new drops, leave reviews, and get recommendations for their next bag.",
		links: [
			{ label: "Live", href: "https://nouveau.coffee" },
			{ label: "Source", href: "https://github.com/oscabriel/nouveau" },
		],
	},
	{
		name: "pi extensions",
		description:
			"Five published packages that extend the coding agent I use every day, covering agent orchestration, codebase research, reusable skills, live token and cost readouts, and writing rules.",
		links: [{ label: "npm", href: "https://www.npmjs.com/~oscabriel" }],
	},
];

export const CV_EDUCATION: Schooling[] = [
	{
		name: "University of New Orleans",
		start: "2014-08",
		end: "2016-05",
		detail:
			"Mathematics coursework: Calculus I–III, Mathematical Statistics, Applied Statistics, Programming in C++, Technical Writing.",
	},
	{
		name: "TripleTen",
		credential: "BI Analytics certificate",
		start: "2023-08",
		end: "2023-12",
		detail: "SQL, Jupyter Notebook, Tableau, Power BI.",
	},
	{
		name: "Backpine Labs",
		credential: "Full-Stack on Cloudflare course",
		end: "2025-08",
		href: "https://learn.backpine.com/",
	},
];

export const CV_SKILLS = [
	{
		label: "Languages",
		text: "TypeScript (primary), SQL, Google Apps Script, Python (working level). Monorepos with Turborepo and pnpm workspaces.",
	},
	{
		label: "Platform",
		text: "Cloudflare (Workers, D1, Durable Objects, Workflows, Queues), Convex, React, TanStack, Hono, Better Auth, infrastructure as code, GitHub Actions.",
	},
	{
		label: "Models",
		text: "OpenAI, Anthropic, and Gemini through AI SDK and direct APIs; MCP servers and clients, tool calling, reasoning controls.",
	},
	{
		label: "Agents",
		text: "Daily coding-agent work with extensions and skill files I built myself; a year of running agents against live production systems, including unattended deploys.",
	},
	{
		label: "Open source",
		text: "PRs landed in RedwoodSDK, Alchemy, and Better-T-Stack; six packages on npm.",
	},
	{
		label: "Operations",
		text: "Production planning, wholesale customer onboarding, ERP integration (NetSuite, Dynamics 365), OEE and downtime analysis.",
	},
] as const;
