import { route } from "rwsdk/router";

import { BlogPage, BlogPost } from "./pages";

export const blogRoutes = [route("/", BlogPage), route("/:slug", BlogPost)];
