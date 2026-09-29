import { ORPCError } from "@orpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
	Link,
	Outlet,
	createFileRoute,
	useRouter,
} from "@tanstack/react-router";
import type { ErrorComponentProps } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SITE_NAME } from "@/lib/site";
import { formatPublishedAt } from "@/posts/date";
import { adminOrpc } from "@/rpc/admin-client";

const SKELETON_ROWS = ["a", "b", "c", "d", "e"];

// `ssr: false` is inherited by every /admin child: the server sends only the
// pending shell, and all admin data loads in the browser with the Access token.
export const Route = createFileRoute("/admin")({
	ssr: false,
	head: () => ({
		meta: [
			{ title: `Admin | ${SITE_NAME}` },
			{ name: "robots", content: "noindex" },
		],
	}),
	loader: async ({ context }) => {
		await context.queryClient.query(adminOrpc.posts.listAll.queryOptions());
	},
	pendingComponent: AdminPending,
	errorComponent: AdminError,
	component: AdminLayout,
});

function AdminLayout() {
	return (
		<div className="min-h-dvh md:grid md:grid-cols-[17rem_minmax(0,1fr)]">
			<aside className="flex flex-col border-b md:sticky md:top-0 md:h-dvh md:border-r md:border-b-0">
				<div className="flex items-center justify-between gap-2 px-4 py-3">
					<Link to="/admin" className="text-sm font-semibold">
						Posts
					</Link>
					<Button
						size="sm"
						nativeButton={false}
						render={<Link to="/admin/posts/new" />}
					>
						New post
					</Button>
				</div>
				<nav
					aria-label="Posts"
					className="max-h-64 min-h-0 flex-1 overflow-y-auto md:max-h-none"
				>
					<PostList />
				</nav>
				<a
					href="/blog"
					className="hidden border-t px-4 py-3 text-xs text-muted-foreground hover:text-foreground md:block"
				>
					View the blog
				</a>
			</aside>
			<main className="min-w-0">
				<Outlet />
			</main>
		</div>
	);
}

function PostList() {
	const { data: posts } = useSuspenseQuery(
		adminOrpc.posts.listAll.queryOptions()
	);

	if (posts.length === 0) {
		return (
			<p className="px-4 py-2 text-xs text-muted-foreground">
				Nothing written yet.
			</p>
		);
	}

	return (
		<ul className="pb-2">
			{posts.map((post) => (
				<li key={post.id}>
					<Link
						to="/admin/posts/$id"
						params={{ id: post.id }}
						className="block px-4 py-2 hover:bg-muted aria-[current=page]:bg-muted"
					>
						<span className="line-clamp-2 text-sm">{post.title}</span>
						<span className="text-xs text-muted-foreground">
							{post.status === "draft" || post.publishedAt === null
								? "Draft"
								: formatPublishedAt(post.publishedAt)}
						</span>
					</Link>
				</li>
			))}
		</ul>
	);
}

// Also what the server renders, since the layout itself never runs there.
function AdminPending() {
	return (
		<div className="min-h-dvh md:grid md:grid-cols-[17rem_minmax(0,1fr)]">
			<div className="space-y-4 border-b px-4 py-3 md:h-dvh md:border-r md:border-b-0">
				<Skeleton className="h-7 w-full" />
				{SKELETON_ROWS.map((row) => (
					<div key={row} className="space-y-1.5">
						<Skeleton className="h-4 w-11/12" />
						<Skeleton className="h-3 w-1/3" />
					</div>
				))}
			</div>
		</div>
	);
}

function AdminError({ error }: ErrorComponentProps) {
	const router = useRouter();
	const signedOut = error instanceof ORPCError && error.code === "UNAUTHORIZED";

	return (
		<main className="max-w-md p-8">
			<h1 className="text-lg font-semibold">
				{signedOut ? "You’re not signed in" : "The admin didn’t load"}
			</h1>
			<p className="mt-2 text-sm text-muted-foreground">
				{signedOut
					? "Admin requests need a Cloudflare Access login. Sign in through Access, then reload this page."
					: String(error instanceof Error ? error.message : error)}
			</p>
			<Button
				variant="outline"
				className="mt-4"
				onClick={() => {
					void router.invalidate();
				}}
			>
				Try again
			</Button>
		</main>
	);
}
