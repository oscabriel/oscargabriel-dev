import { mediaPath } from "@/lib/site";
import { formatPublishedAt } from "@/posts/date";

interface PostArticleProps {
	title: string;
	publishedAt: Date | null;
	headerImage: { key: string; alt: string | null } | null;
	headerImageCaption: string | null;
	html: string;
}

// The post itself, shared by the blog page and the admin preview so the
// preview can't drift from what readers see.
export function PostArticle({
	title,
	publishedAt,
	headerImage,
	headerImageCaption,
	html,
}: PostArticleProps) {
	return (
		<article className="mx-auto max-w-3xl">
			<h1 className="text-4xl font-bold">{title}</h1>
			{publishedAt && (
				<time dateTime={publishedAt.toISOString()}>
					{formatPublishedAt(publishedAt)}
				</time>
			)}
			{headerImage && (
				<figure className="mt-8">
					<img
						src={mediaPath(headerImage.key)}
						alt={headerImage.alt ?? ""}
						fetchPriority="high"
						className="aspect-video w-full rounded-lg object-cover"
					/>
					{headerImageCaption !== null && (
						<figcaption className="mt-2 text-center text-sm text-muted-foreground italic">
							{headerImageCaption}
						</figcaption>
					)}
				</figure>
			)}
			<div
				className="post-body mt-8"
				// oxlint-disable-next-line react/no-danger -- Rendered from the owner's own markdown when the post is saved.
				dangerouslySetInnerHTML={{ __html: html }}
			/>
		</article>
	);
}
