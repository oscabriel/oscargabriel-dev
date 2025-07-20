import type { LayoutProps } from "rwsdk/router";

import { link } from "@/lib/utils/links";

export function AppLayout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 z-50 w-full bg-background/80 backdrop-blur-sm px-4">
        <nav className="mx-auto flex max-w-3xl items-center justify-between py-4">
          <a href={link("/")} className="text-3xl">
            ☁️
          </a>
          <div className="flex gap-6">
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
          </div>
        </nav>
      </header>
      <main className="pt-20">{children}</main>
    </div>
  );
}
