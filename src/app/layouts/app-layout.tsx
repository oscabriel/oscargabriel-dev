import type { LayoutProps } from "rwsdk/router";

import { Header } from "@/app/components/navigation/header";
import { ClientProviders } from "@/app/providers/client-providers";

export function AppLayout({ children }: LayoutProps) {
	return (
		<ClientProviders>
			<div className="min-h-screen bg-background">
				<Header />
				<main className="pt-20">{children}</main>
			</div>
		</ClientProviders>
	);
}
