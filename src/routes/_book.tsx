import { Outlet, createFileRoute } from "@tanstack/react-router";

import { Leaf } from "@/components/leaf";

// The book: a left leaf that never moves and a right leaf that turns.
export const Route = createFileRoute("/_book")({ component: Book });

function Book() {
	return (
		<div className="min-h-dvh md:grid md:grid-cols-[22rem_minmax(0,1fr)]">
			<Leaf />
			<div className="min-w-0">
				<Outlet />
			</div>
		</div>
	);
}
