import type { CaptureResult } from "posthog-js";
import { posthog } from "posthog-js";

import { SITE_URL } from "@/lib/site";

// Web analytics only. Page views and page leaves are the only events; every
// other feature is switched off at init, so none of its lazy bundles load and
// no /flags request is made. Events go through /ingest on this origin (see
// src/routes/ingest.$.ts) so they stay first-party. Cookieless: nothing is
// stored in the browser, so there is no banner; PostHog counts a visitor by a
// daily hash of IP and user agent, which needs Cookieless tracking switched on
// in the project's Web analytics settings or the events are dropped. The cost
// is daily uniques and no country data. The key is public (it
// ships in the bundle); an empty one keeps analytics off, which is how dev
// runs, and so does any host but the site's own, so a preview deploy with
// the key baked in stays out of the dashboard.
const ADMIN_PREFIX = "/admin";
const SITE_HOST = new URL(SITE_URL).hostname;

// The admin area stays out of the public dashboard.
function dropAdminEvents(event: CaptureResult | null): CaptureResult | null {
	if (window.location.pathname.startsWith(ADMIN_PREFIX)) {
		return null;
	}
	return event;
}

let started = false;

export function startAnalytics(): void {
	const key = import.meta.env.VITE_POSTHOG_KEY ?? "";
	const off =
		typeof window === "undefined" ||
		import.meta.env.DEV ||
		key === "" ||
		window.location.hostname !== SITE_HOST;
	if (off || started) {
		return;
	}
	started = true;
	posthog.init(key, {
		api_host: "/ingest",
		ui_host: "https://us.posthog.com",
		defaults: "2026-05-30",
		capture_pageview: "history_change",
		capture_pageleave: "if_capture_pageview",
		// Contents links put headings in the fragment; one page should be one URL.
		disable_capture_url_hashes: true,
		autocapture: false,
		capture_dead_clicks: false,
		capture_heatmaps: false,
		capture_performance: false,
		capture_exceptions: false,
		disable_session_recording: true,
		disable_surveys: true,
		advanced_disable_flags: true,
		disable_external_dependency_loading: true,
		cookieless_mode: "always",
		person_profiles: "identified_only",
		before_send: dropAdminEvents,
	});
}
