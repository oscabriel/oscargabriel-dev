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
					"Nominally the job was sending out the daily plans. In practice I also did the plant’s operations analysis and built its tools, and planning for roasting, packaging, cold brew, logistics, procurement and sales ran through my desk.",
			},
			{
				title: "Manufacturing Operations Specialist",
				start: "2023-01",
				end: "2024-07",
				summary:
					"Collected the machines’ output data by hand every day, and used it to cut unplanned downtime 15% and bag waste by half.",
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
				title: "Math and Statistics Tutor",
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
			"Building production apps on Workers, D1, Durable Objects and Workflows.",
		href: "https://learn.backpine.com/",
	},
	{
		name: "TripleTen",
		credential: "BI Analytics certificate",
		start: "2023-08",
		end: "2023-12",
		detail: "SQL, Jupyter Notebook, Tableau, Power BI.",
	},
	{
		name: "University of New Orleans",
		start: "2014-08",
		end: "2016-05",
		detail:
			"Mathematics coursework: Calculus I–III, Mathematical Statistics, Applied Statistics, Programming in C++, Technical Writing.",
	},
];
