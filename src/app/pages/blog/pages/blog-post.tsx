import { allPosts, type Post } from "content-collections";
import type { RequestInfo } from "rwsdk/worker";
import { CodeBlockWrapper } from "@/app/components/code-block-wrapper";
import { TableOfContents } from "@/app/components/table-of-contents";
import { extractHeadingsFromHtml } from "@/app/utils/extract-headings";

export function BlogPost({ params }: RequestInfo) {
	const { slug } = params;
	const post = allPosts.find(
		(p: Post) => p._meta.path.replace(/\.md$/, "") === slug,
	);

	if (!post) {
		return (
			<div className="bg-background px-4">
				<div className="mx-auto max-w-3xl py-16 text-center">
					<h1 className="mb-4 font-bold text-2xl text-muted-foreground">
						Post not found
					</h1>
					<p className="mb-8 text-muted-foreground">
						The blog post you're looking for doesn't exist.
					</p>
					<a
						href="/blog"
						className="inline-flex h-10 items-center justify-center whitespace-nowrap rounded-md border border-input bg-background px-4 py-2 font-medium text-sm ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
					>
						← Back to blog
					</a>
				</div>
			</div>
		);
	}

	// Check if post is protected (skip for now - no auth system)
	if (post.protected) {
		return (
			<div className="bg-background px-4">
				<div className="mx-auto max-w-3xl py-16 text-center">
					<div className="mb-4 flex justify-center">
						<span className="inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden whitespace-nowrap rounded-md border border-transparent bg-secondary px-2 py-0.5 font-medium text-secondary-foreground text-xs">
							🔒 Protected
						</span>
					</div>
					<h1 className="mb-4 font-bold text-2xl text-muted-foreground">
						Protected Post
					</h1>
					<p className="mb-8 text-muted-foreground">
						This post is marked as protected.
					</p>
					<a
						href="/blog"
						className="inline-flex h-10 items-center justify-center whitespace-nowrap rounded-md border border-input bg-background px-4 py-2 font-medium text-sm ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
					>
						← Back to blog
					</a>
				</div>
			</div>
		);
	}

	// Extract headings for table of contents (h2 and h3 elements)
	const headings = extractHeadingsFromHtml(post.html).filter(
		(h) => h.level === 2 || h.level === 3,
	);

	return (
		<>
			{/* SEO and OpenGraph Meta Tags */}
			<title>{`${post.title} | Oscar Gabriel`}</title>
			<meta name="description" content={post.summary} />

			{/* Open Graph / Facebook */}
			<meta property="og:type" content="article" />
			<meta property="og:title" content={post.title} />
			<meta property="og:description" content={post.summary} />
			<meta
				property="og:url"
				content={`https://oscargabriel.dev/blog/${slug}`}
			/>
			{post.headerImage && (
				<meta
					property="og:image"
					content={`https://oscargabriel.dev${post.headerImage}`}
				/>
			)}
			<meta
				property="article:published_time"
				content={post.date.toISOString()}
			/>
			<meta property="article:author" content={post.author} />

			{/* Canonical URL */}
			<link rel="canonical" href={`https://oscargabriel.dev/blog/${slug}`} />

			<div className="bg-background px-4">
				{/* Table of Contents - fixed to the left */}
				{headings.length > 0 && (
					<aside className="fixed left-4 hidden w-64 xl:block">
						<TableOfContents headings={headings} />
					</aside>
				)}

				{/* Main content - centered */}
				<div className="mx-auto max-w-3xl">
					<article>
						<header className="mb-8">
							<h1 className="mb-6 font-bold text-5xl">{post.title}</h1>{" "}
							<div className="flex items-center gap-4 text-muted-foreground text-sm">
								<span>By {post.author}</span>
								<span>•</span>
								<time>
									{new Date(post.date).toLocaleDateString("en-US", {
										year: "numeric",
										month: "long",
										day: "numeric",
										timeZone: "UTC",
									})}
								</time>
							</div>
							<div className="mt-6 h-px bg-border" />
						</header>
						{post.headerImage && (
							<figure className="mb-8">
								<div className="aspect-video overflow-hidden rounded-lg">
									<img
										src={post.headerImage}
										alt={post.title}
										className="h-full w-full object-cover"
									/>
								</div>
								{post.headerImageCaption && (
									<figcaption className="mt-2 text-center text-muted-foreground text-sm italic">
										{post.headerImageCaption}
									</figcaption>
								)}
							</figure>
						)}
						<CodeBlockWrapper>
							<div
								className="prose prose-gray dark:prose-invert prose-li:my-1 prose-ol:my-4 prose-ul:my-4 prose-headings:mt-8 prose-headings:mb-4 prose-p:mb-4 max-w-none prose-headings:scroll-mt-24 prose-headings:font-semibold prose-a:text-primary prose-p:text-base prose-p:leading-7 prose-headings:tracking-tight prose-a:underline prose-a:decoration-primary/70 prose-a:hover:text-primary prose-a:hover:decoration-primary"
								// biome-ignore lint/security/noDangerouslySetInnerHtml: Blog content is trusted markdown
								dangerouslySetInnerHTML={{ __html: post.html }}
							/>
						</CodeBlockWrapper>
						<footer className="mt-8 mb-8">
							<div className="mb-4 h-px bg-border" />
							<div>
								<a
									href="/blog"
									className="inline-flex h-9 items-center justify-center whitespace-nowrap rounded-md px-3 font-medium text-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
								>
									← Back to all posts
								</a>
							</div>
						</footer>
					</article>
				</div>
			</div>
		</>
	);
}
