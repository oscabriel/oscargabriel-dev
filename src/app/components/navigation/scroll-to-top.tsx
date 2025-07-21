"use client";

import { useLayoutEffect } from "react";

export function ScrollToTop() {
	useLayoutEffect(() => {
		const observer = new MutationObserver(() => window.scrollTo(0, 0));
		const main = document.querySelector("main");

		if (main) {
			observer.observe(main, { childList: true, subtree: true });
		}

		return () => observer.disconnect();
	}, []);

	return null;
}
