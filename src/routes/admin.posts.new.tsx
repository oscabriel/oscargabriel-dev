import { createFileRoute } from "@tanstack/react-router";

import { PostEditor } from "@/admin/post-editor";
import { SITE_NAME } from "@/lib/site";

export const Route = createFileRoute("/admin/posts/new")({
	head: () => ({ meta: [{ title: `New post | ${SITE_NAME}` }] }),
	component: NewPost,
});

function NewPost() {
	return <PostEditor />;
}
