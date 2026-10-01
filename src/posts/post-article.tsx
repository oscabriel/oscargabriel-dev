import { mediaPath } from "@/lib/site";
import { formatPublishedAt } from "@/posts/date";

interface PostArticleProps {
	title: string;
	publishedAt: Date | null;
	headerImage: { key: string; alt: string | null } | null;
	headerImageCaption: string | null;
	html: string;
	// Rendered between the plate and the body; the post page puts the
	// small-screen sections list here.
	afterHeader?: React.ReactNode;
}

// The post itself, shared by the blog page and the admin preview so the
// preview can't drift from what readers see.
export function PostArticle({
	title,
	publishedAt,
	headerImage,
	headerImageCaption,
	html,
	afterHeader,
}: PostArticleProps) {
	return (
		<article className="max-w-prose">
			<header>
				{/* Set flush on both edges like the body, but never hyphenated. */}
				<h1 className="text-justify text-4xl leading-tight font-medium tracking-tight text-ink md:text-5xl">
					{title}
				</h1>
				{publishedAt && (
					<time
						dateTime={publishedAt.toISOString()}
						className="mt-4 block text-xs smallcaps text-ink-soft"
					>
						{formatPublishedAt(publishedAt)}
					</time>
				)}
			</header>
			{headerImage && (
				<figure className="mt-10">
					<img
						src={mediaPath(headerImage.key)}
						alt={headerImage.alt ?? ""}
						fetchPriority="high"
						className="aspect-video w-full object-cover"
					/>
					<figcaption className="mt-3 flex items-baseline gap-4 text-xs">
						<span className="shrink-0 smallcaps whitespace-nowrap text-ink-soft">
							Plate I
						</span>
						{headerImageCaption !== null && (
							<span className="text-ink-soft italic">{headerImageCaption}</span>
						)}
					</figcaption>
				</figure>
			)}
			{afterHeader}
			<div
				className="post-body mt-10"
				// oxlint-disable-next-line react/no-danger -- Rendered from the owner's own markdown when the post is saved.
				dangerouslySetInnerHTML={{ __html: html }}
			/>
		</article>
	);
}
