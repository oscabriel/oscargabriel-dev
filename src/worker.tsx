import { layout, render, route } from "rwsdk/router";
import { defineApp } from "rwsdk/worker";

import { Document } from "@/app/document/Document";
import { setCommonHeaders } from "@/app/document/headers";
import { AppLayout } from "@/app/layouts/app-layout";
import { BlogPage } from "@/app/pages/blog/blog-page";
import { Landing } from "@/app/pages/landing";
import { NotFound } from "@/app/pages/not-found";
import { ProjectsPage } from "@/app/pages/projects/projects-page";

export default defineApp([
	setCommonHeaders(),

	render(Document, [
		layout(AppLayout, [
			route("/", Landing),
			route("/blog", BlogPage),
			route("/projects", ProjectsPage),
			route("*", NotFound),
		]),
	]),
]);
