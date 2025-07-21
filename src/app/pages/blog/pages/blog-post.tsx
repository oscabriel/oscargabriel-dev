import { allPosts } from "content-collections";
import type { RequestInfo } from "rwsdk/worker";

export function BlogPost({ params }: RequestInfo) {
	const { slug } = params;
	const post = allPosts.find((p) => p._meta.path.replace(/\.md$/, "") === slug);

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

	return (
		<div className="bg-background px-4">
			<div className="mx-auto max-w-3xl">
				<nav className="mb-8">
					<a
						href="/blog"
						className="inline-flex h-9 items-center justify-center whitespace-nowrap rounded-md px-3 font-medium text-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
					>
						← Back to blog
					</a>
				</nav>

				<article>
					<header className="mb-8">
						<h1 className="mb-4 font-bold text-4xl leading-tight">
							{post.title}
						</h1>
						<div className="flex items-center gap-4 text-muted-foreground text-sm">
							<span>By {post.author}</span>
							<span>•</span>
							<time>
								{new Date(post.date).toLocaleDateString("en-US", {
									year: "numeric",
									month: "long",
									day: "numeric",
								})}
							</time>
						</div>
						<div className="mt-6 h-px bg-border" />
					</header>
					<div
						className="prose prose-gray dark:prose-invert prose-lg max-w-none prose-code:bg-muted prose-pre:bg-muted prose-headings:font-semibold prose-a:text-primary prose-headings:tracking-tight prose-a:no-underline hover:prose-a:underline"
						// biome-ignore lint/security/noDangerouslySetInnerHtml: Blog content is trusted markdown
						dangerouslySetInnerHTML={{ __html: post.html }}
					/>{" "}
				</article>

				<footer className="mt-12 pt-8">
					<div className="mb-8 h-px bg-border" />
					<div className="text-center">
						<a
							href="/blog"
							className="inline-flex h-10 items-center justify-center whitespace-nowrap rounded-md border border-input bg-background px-4 py-2 font-medium text-sm ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
						>
							← Back to all posts
						</a>
					</div>
				</footer>
			</div>
		</div>
	);
}
