import { useSyncExternalStore } from "react";

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

// A line of type, not an icon: it names the light you would switch to.
export function ThemeToggle({ className }: { className?: string }) {
	const dark = useResolvedDark();

	if (dark === undefined) {
		return <span className={className} aria-hidden="true" />;
	}

	return (
		<button
			type="button"
			className={className}
			aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
			onClick={() => {
				choose(!dark);
			}}
		>
			{dark ? "Read by daylight" : "Read by lamplight"}
		</button>
	);
}
