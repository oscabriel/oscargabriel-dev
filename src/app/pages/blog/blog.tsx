export function Blog() {
	return (
		<div className="min-h-screen bg-background px-4 py-16">
			<div className="mx-auto max-w-3xl">
				<h1 className="mb-6 font-bold text-5xl">Blog</h1>
				<p className="text-lg text-muted-foreground">
					Coming soon. Stay tuned!
				</p>
				<div className="mt-8">
					<a
						href="/"
						className="text-foreground underline decoration-muted-foreground transition-colors hover:decoration-foreground"
					>
						← Back to home
					</a>
				</div>
			</div>
		</div>
	);
}
