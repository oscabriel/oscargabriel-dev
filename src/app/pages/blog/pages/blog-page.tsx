import { allPosts } from "content-collections";

export function BlogPage() {
	return (
		<div className="bg-background px-4">
			<div className="mx-auto max-w-3xl">
				<div className="mb-8">
					<h1 className="mb-6 font-bold text-5xl">Blog</h1>
					<p className="text-base text-muted-foreground sm:text-lg">
						Latest articles and updates
					</p>
				</div>

				<div className="space-y-6">
					{allPosts
						.sort(
							(a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
						)
						.map((post) => {
							const slug = post._meta.path.replace(/\.md$/, "");

							return (
								<article
									key={post._meta.path}
									className="flex flex-col gap-6 rounded-xl border bg-card py-6 text-card-foreground shadow-sm transition-shadow hover:shadow-md"
								>
									<header className="px-6">
										<div className="flex items-start justify-between gap-4">
											<div className="flex-1">
												<h2 className="mb-2 font-semibold text-lg leading-tight sm:text-xl">
													{" "}
													<a
														href={`/blog/${slug}`}
														className="text-foreground transition-colors hover:text-primary"
													>
														{post.title}
													</a>
												</h2>
												<div className="flex items-center gap-3 text-muted-foreground text-xs sm:text-sm">
													{" "}
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
											</div>
											{post.protected && (
												<span className="inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden whitespace-nowrap rounded-md border border-transparent bg-secondary px-2 py-0.5 font-medium text-secondary-foreground text-xs">
													🔒 Protected
												</span>
											)}
										</div>
									</header>
									<div className="px-6">
										<p className="mb-4 text-muted-foreground text-sm leading-relaxed sm:text-base">
											{post.summary}
										</p>
										<a
											href={`/blog/${slug}`}
											className="font-medium text-primary text-xs transition-colors hover:underline sm:text-sm"
										>
											{" "}
											Read more →
										</a>
									</div>
								</article>
							);
						})}
				</div>
			</div>
		</div>
	);
}
