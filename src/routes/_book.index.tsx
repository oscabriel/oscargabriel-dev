import { createFileRoute } from "@tanstack/react-router";

import { SITE_NAME, SITE_URL } from "@/lib/site";

const DESCRIPTION =
	"Oscar Gabriel writes long, technical posts about building for the web, and keeps a list of the things he has built.";

export const Route = createFileRoute("/_book/")({
	head: () => ({
		meta: [
			{ title: SITE_NAME },
			{ name: "description", content: DESCRIPTION },
			{ property: "og:type", content: "website" },
			{ property: "og:title", content: SITE_NAME },
			{ property: "og:description", content: DESCRIPTION },
			{ property: "og:url", content: SITE_URL },
		],
		links: [{ rel: "canonical", href: SITE_URL }],
	}),
	component: Home,
});

// The book opens on a blank recto, facing the leaf that says who wrote it.
// Phones have no facing page: the leaf above is the whole of it.
function Home() {
	return (
		<main className="md:min-h-dvh md:px-12 md:py-16">
			<h1 className="sr-only">{SITE_NAME}</h1>
		</main>
	);
}
