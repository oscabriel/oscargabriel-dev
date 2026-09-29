import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { adminOrpc } from "@/rpc/admin-client";

export const Route = createFileRoute("/admin/")({ component: AdminHome });

function AdminHome() {
	const { data: posts } = useSuspenseQuery(
		adminOrpc.posts.listAll.queryOptions()
	);
	const drafts = posts.filter((post) => post.status === "draft").length;
	const published = posts.length - drafts;
	let tally = `${published} published, no drafts.`;
	if (drafts > 0) {
		tally = `${published} published, ${drafts} ${drafts === 1 ? "draft" : "drafts"}.`;
	}

	return (
		<div className="max-w-md p-8">
			<h1 className="text-lg font-semibold">
				{posts.length === 0 ? "No posts yet" : "Pick up where you left off"}
			</h1>
			<p className="mt-2 text-sm text-muted-foreground">
				{posts.length === 0
					? "Start a post; it stays a draft until you publish it."
					: `${tally} Choose a post from the list to edit it, or start a new one.`}
			</p>
			<Button
				className="mt-4"
				nativeButton={false}
				render={<Link to="/admin/posts/new" />}
			>
				New post
			</Button>
		</div>
	);
}
