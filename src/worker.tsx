import { layout, prefix, render, route } from "rwsdk/router";
import { defineApp } from "rwsdk/worker";

import { Document } from "@/app/document/Document";
import { setCommonHeaders } from "@/app/document/headers";
import { AppLayout } from "@/app/layouts/app-layout";
import { blogRoutes } from "@/app/pages/blog/routes";
import { LandingPage } from "@/app/pages/landing-page";
import { NotFound } from "@/app/pages/not-found";
import { ProjectsPage } from "@/app/pages/projects/projects-page";

export default defineApp([
	setCommonHeaders(),

	render(Document, [
		layout(AppLayout, [
			route("/", LandingPage),
			prefix("/blog", blogRoutes),
			route("/projects", ProjectsPage),
			route("*", NotFound),
		]),
	]),
]);
