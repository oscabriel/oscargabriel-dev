import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { SITE_NAME, SITE_URL } from "@/lib/site";
import { orpc } from "@/rpc/client";

const DESCRIPTION =
	"Things Oscar Gabriel has built, each linked to its source.";

const launchedFormat = new Intl.DateTimeFormat("en-US", {
	year: "numeric",
	month: "short",
	timeZone: "UTC",
});

export const Route = createFileRoute("/_book/projects")({
	loader: async ({ context }) => {
		await context.queryClient.query(orpc.projects.list.queryOptions());
	},
	head: () => ({
		meta: [
			{ title: `Projects | ${SITE_NAME}` },
			{ name: "description", content: DESCRIPTION },
			{ property: "og:title", content: `Projects | ${SITE_NAME}` },
			{ property: "og:description", content: DESCRIPTION },
			{ property: "og:url", content: `${SITE_URL}/projects` },
		],
		links: [{ rel: "canonical", href: `${SITE_URL}/projects` }],
	}),
	component: ProjectsPage,
});

// The same contents page as the writing, with a launch month for the date.
function ProjectsPage() {
	const { data: projects } = useSuspenseQuery(
		orpc.projects.list.queryOptions()
	);

	return (
		<main className="px-6 py-10 md:px-12 md:py-16">
			<h1 className="text-4xl leading-tight font-medium tracking-tight text-ink">
				Projects
			</h1>
			{projects.length === 0 ? (
				<p className="mt-6 text-ink-soft">Nothing built yet.</p>
			) : (
				<ol className="mt-10 max-w-prose">
					{projects.map((project) => (
						<li key={project.id} className="border-t border-rule py-6">
							<div className="md:flex md:items-baseline md:gap-3">
								<a
									href={project.liveUrl}
									className="text-xl font-medium text-ink no-underline hover:underline"
								>
									{project.title}
								</a>
								<span
									aria-hidden="true"
									className="mb-1 hidden min-w-6 flex-1 border-b border-dotted border-ink-faint md:block"
								/>
								<time
									dateTime={project.launchedAt.toISOString()}
									className="mt-1 block shrink-0 text-xs smallcaps text-ink-soft md:mt-0 md:inline"
								>
									{launchedFormat.format(project.launchedAt)}
								</time>
							</div>
							<p className="mt-2 max-w-[60ch] justified leading-relaxed text-ink-soft">
								{project.description}
							</p>
							<p className="mt-2 flex gap-5 text-xs smallcaps text-ink-soft">
								<a
									href={`https://github.com/${project.repoOwner}/${project.repoName}`}
									className="underline decoration-ink-faint hover:text-ink"
								>
									Source
								</a>
								{project.stats && <span>{project.stats.stars} stars</span>}
							</p>
						</li>
					))}
				</ol>
			)}
		</main>
	);
}
