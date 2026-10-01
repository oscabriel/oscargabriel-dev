import { cn } from "cn";
import { useSyncExternalStore } from "react";

import { SunMoon } from "@/components/sun-moon";

// Two states shown, three stored: nothing (follow the system), "light" or
// "dark" (an override). Storing a value that matches the system would pin it
// forever, so an override is only kept while it differs from the system.
// After https://lea.verou.me/blog/2026/dark-mode-toggles/
const STORAGE_KEY = "theme";
const DARK_QUERY = "(prefers-color-scheme: dark)";

// Runs inline in <head> before first paint so the page never flashes.
export const THEME_SCRIPT = `(function(){try{var s=localStorage.getItem(${JSON.stringify(STORAGE_KEY)});var d=s?s==="dark":matchMedia(${JSON.stringify(DARK_QUERY)}).matches;document.documentElement.classList.toggle("dark",d);}catch(e){}})();`;

function readStored(): "light" | "dark" | null {
	try {
		const value = localStorage.getItem(STORAGE_KEY);
		return value === "light" || value === "dark" ? value : null;
	} catch {
		return null;
	}
}

function apply(dark: boolean) {
	document.documentElement.classList.toggle("dark", dark);
}

// Subscribers learn of two things: the class flipping on <html>, and the
// system preference changing while no override is stored.
function subscribe(onChange: () => void) {
	const observer = new MutationObserver(onChange);
	observer.observe(document.documentElement, {
		attributes: true,
		attributeFilter: ["class"],
	});
	const media = matchMedia(DARK_QUERY);
	function onSystemChange(event: MediaQueryListEvent) {
		if (readStored() === null) {
			apply(event.matches);
		}
		onChange();
	}
	media.addEventListener("change", onSystemChange);
	return () => {
		observer.disconnect();
		media.removeEventListener("change", onSystemChange);
	};
}

function getSnapshot(): boolean {
	return document.documentElement.classList.contains("dark");
}

// The server has no idea, and neither does the first client render.
function getServerSnapshot(): undefined {
	return undefined;
}

function useResolvedDark(): boolean | undefined {
	return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

function choose(next: boolean) {
	const system = matchMedia(DARK_QUERY).matches;
	try {
		if (next === system) {
			localStorage.removeItem(STORAGE_KEY);
		} else {
			localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
		}
	} catch {
		// Private windows may refuse storage; the page still switches.
	}
	apply(next);
}

// The sun and moon at the foot of the leaf: the sun's wash shows by day and
// the crescent's by night, and hovering hints at the other. The server can't
// know the theme, so the pressed state and the title wait for the client;
// the washes don't, since the theme class is set before first paint.
export function ThemeToggle({ className }: { className?: string }) {
	const dark = useResolvedDark();

	function handleClick() {
		if (dark !== undefined) {
			choose(!dark);
		}
	}

	let title: string | undefined;
	if (dark !== undefined) {
		title = dark ? "Read by daylight" : "Read by moonlight";
	}

	return (
		<button
			type="button"
			aria-label="Dark theme"
			aria-pressed={dark}
			title={title}
			onClick={handleClick}
			className={cn(
				"group block w-fit cursor-pointer text-ink transition-colors motion-reduce:transition-none dark:text-ink-soft dark:hover:text-ink dark:focus-visible:text-ink",
				className
			)}
		>
			<SunMoon className="h-28 w-fit md:h-40" />
		</button>
	);
}
