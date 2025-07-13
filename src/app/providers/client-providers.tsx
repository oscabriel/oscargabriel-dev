"use client";

import type { ReactNode } from "react";

import { ThemeProvider } from "@/app/providers/theme-provider";

interface ClientProvidersProps {
	children: ReactNode;
}

export function ClientProviders({ children }: ClientProvidersProps) {
	return (
		<ThemeProvider defaultTheme="system" storageKey="oscar-gabriel-theme">
			{children}
		</ThemeProvider>
	);
}
