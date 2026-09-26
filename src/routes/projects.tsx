import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { orpc } from "@/rpc/client";

export const Route = createFileRoute("/projects")({
	loader: async ({ context }) => {
		await context.queryClient.query(orpc.projects.list.queryOptions());
	},
	component: ProjectsPage,
});

function ProjectsPage() {
	const { data: projects } = useSuspenseQuery(
		orpc.projects.list.queryOptions()
	);

	return (
		<main className="p-8">
			<h1 className="text-4xl font-bold">Projects</h1>
			{projects.length === 0 ? (
				<p className="mt-4">No projects yet.</p>
			) : (
				<ul className="mt-4 space-y-4">
					{projects.map((project) => (
						<li key={project.id}>
							<a href={project.liveUrl}>{project.title}</a>
							<p>{project.description}</p>
							{project.stats && <p>★ {project.stats.stars}</p>}
						</li>
					))}
				</ul>
			)}
		</main>
	);
}
