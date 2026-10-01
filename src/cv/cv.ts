// The CV, merged from the tailored résumés into one general version: the work
// and the schooling only, since the projects and the writing have their own
// pages. Contact details stay off it entirely.

// Months as "YYYY-MM", rendered as "Jan 2023" and used as <time> values.
type Month = `${number}-${number}`;

export interface Role {
	title: string;
	start: Month;
	end: Month;
	place?: string;
	// One sentence on the work, set under the role's line.
	summary?: string;
}

export interface Employer {
	name: string;
	place?: string;
	roles: Role[];
}

export interface Schooling {
	name: string;
	credential?: string;
	start?: Month;
	end: Month;
	detail?: string;
	href?: string;
}

export const CV_EXPERIENCE: Employer[] = [
	{
		name: "Stumptown Coffee Roasters",
		place: "Portland, OR",
		roles: [
			{
				title: "Production Planner",
				start: "2024-07",
				end: "2026-09",
				summary:
					"Ostensibly the job was sending out the daily plans. In practice I did operations analysis and built internal tooling from scratch. The tooling included scripted spreadsheets and bespoke apps—production trackers, manager dashboards, small utilities—using handmade datasets and the careful craft for good software I’ve been learning on my own.",
			},
			{
				title: "Manufacturing Operations Specialist",
				start: "2023-01",
				end: "2024-07",
				summary:
					"Operated machines and collected data by hand to conduct efficiency experiments, and used it to cut unplanned downtime 15% and bag waste by half.",
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
				summary:
					"Ran the trading card QA robots and cataloged their recurring defects to improve the ML model behind them. Fulfillment time fell 20%.",
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
				summary: "Portraits and art projects for paying clients.",
			},
			{
				title: "Calculus and Statistics Tutor",
				start: "2014-08",
				end: "2017-03",
				place: "University of New Orleans, part-time",
			},
		],
	},
];

// Newest first, like the experience above it.
export const CV_EDUCATION: Schooling[] = [
	{
		name: "Backpine Labs",
		credential: "Full-Stack on Cloudflare course",
		end: "2025-08",
		detail:
			"Building production apps on Workers, D1, Durable Objects, Queues and Workflows.",
		href: "https://learn.backpine.com/",
	},
	{
		name: "TripleTen",
		credential: "BI Analytics certificate",
		start: "2023-08",
		end: "2023-12",
		detail: "SQL, Python, Jupyter Notebook, Power BI, Tableau.",
	},
	{
		name: "University of New Orleans",
		start: "2014-08",
		end: "2016-05",
		detail:
			"Math and CS coursework: Calculus I–III, Mathematical Statistics, Applied Statistics, Programming in Java and C++, Data Structures, Technical Writing.",
	},
];
