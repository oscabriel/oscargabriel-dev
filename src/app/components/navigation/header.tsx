"use client";

import { ModeToggle } from "@/app/components/navigation/mode-toggle";
import { link } from "@/lib/utils/links";

export function Header() {
	return (
		<header className="fixed top-0 z-50 w-full bg-background/80 px-4 backdrop-blur-sm">
			<nav className="mx-auto flex max-w-3xl items-center justify-between py-4">
				<a href={link("/")} className="text-3xl">
					☁️
				</a>
				<div className="flex items-center gap-6">
					<a
						href={link("/blog")}
						className="text-foreground underline decoration-muted-foreground transition-colors hover:decoration-foreground"
					>
						Blog
					</a>
					<a
						href={link("/projects")}
						className="text-foreground underline decoration-muted-foreground transition-colors hover:decoration-foreground"
					>
						Projects
					</a>
					<ModeToggle />
				</div>
			</nav>
		</header>
	);
}
