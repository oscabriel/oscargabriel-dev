import { render, route } from "rwsdk/router";
import { defineApp } from "rwsdk/worker";

import { Document } from "@/app/document/Document";
import { setCommonHeaders } from "@/app/document/headers";
import { Blog } from "@/app/pages/blog/blog";
import { Landing } from "@/app/pages/landing";
import { NotFound } from "@/app/pages/not-found";

export default defineApp([
	setCommonHeaders(),

	render(Document, [
		route("/", Landing),
		route("/blog", Blog),
		route("*", NotFound),
	]),
]);
