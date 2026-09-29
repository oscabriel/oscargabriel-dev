import { useDeferredValue, useEffect, useMemo, useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { PostArticle } from "@/posts/post-article";
import type { renderPost } from "@/posts/render";

interface PostPreviewProps {
	title: string;
	body: string;
	publishedAt: Date | null;
	headerImage: { key: string; alt: string | null } | null;
	headerImageCaption: string | null;
}

// The markdown renderer and its syntax highlighters are loaded only once a
// preview opens, so the rest of the admin never pays for them.
async function loadRenderer() {
	const renderer = await import("@/posts/render");
	return renderer.renderPost;
}

function useRenderer() {
	const [render, setRender] = useState<typeof renderPost>();
	useEffect(() => {
		let mounted = true;
		async function load() {
			const loaded = await loadRenderer();
			if (mounted) {
				setRender(() => loaded);
			}
		}
		void load();
		return () => {
			mounted = false;
		};
	}, []);
	return render;
}

// Renders the same way a save does, on every keystroke. Deferring the body
// lets typing stay responsive while the preview catches up.
export function PostPreview({
	title,
	body,
	publishedAt,
	headerImage,
	headerImageCaption,
}: PostPreviewProps) {
	const render = useRenderer();
	const deferredBody = useDeferredValue(body);
	const html = useMemo(
		() => render?.(deferredBody).html,
		[render, deferredBody]
	);

	if (html === undefined) {
		return (
			<div className="mx-auto max-w-3xl space-y-4" aria-busy="true">
				<Skeleton className="h-10 w-3/4" />
				<Skeleton className="h-4 w-full" />
				<Skeleton className="h-4 w-5/6" />
			</div>
		);
	}

	return (
		<PostArticle
			title={title.trim() === "" ? "Untitled" : title}
			publishedAt={publishedAt}
			headerImage={headerImage}
			headerImageCaption={headerImageCaption}
			html={html}
		/>
	);
}
