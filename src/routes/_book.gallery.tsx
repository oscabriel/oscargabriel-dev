import { createFileRoute } from "@tanstack/react-router";

import { SITE_NAME, SITE_URL } from "@/lib/site";

const TITLE = `Gallery | ${SITE_NAME}`;
const DESCRIPTION =
	"Film photographs by Oscar Gabriel, to be bound in as plates once they are scanned.";

export const Route = createFileRoute("/_book/gallery")({
	head: () => ({
		meta: [
			{ title: TITLE },
			{ name: "description", content: DESCRIPTION },
			{ property: "og:title", content: TITLE },
			{ property: "og:description", content: DESCRIPTION },
			{ property: "og:url", content: `${SITE_URL}/gallery` },
		],
		links: [{ rel: "canonical", href: `${SITE_URL}/gallery` }],
	}),
	component: GalleryPage,
});

// A section of plates not yet printed. The empty frame is the plate mark an
// intaglio leaves in the paper, 3:2 like the 35mm negative it will hold.
function GalleryPage() {
	return (
		<main className="px-6 py-10 md:px-12 md:pt-10 md:pb-16">
			<h1 className="sr-only">Gallery</h1>
			<p className="text-xs smallcaps text-ink-soft">Film photographs</p>
			<p className="mt-10 max-w-prose justified leading-relaxed text-ink-soft">
				The negatives are still being scanned. When they are, the photographs
				will be bound in here as plates, one to a leaf.
			</p>
			<figure className="mt-10 max-w-prose">
				<div
					aria-hidden="true"
					className="aspect-[3/2] w-full border border-rule"
				/>
				<figcaption className="mt-3 text-sm text-ink-soft italic">
					<span className="mr-3 text-xs smallcaps not-italic">Plate I</span>
					To come.
				</figcaption>
			</figure>
		</main>
	);
}
