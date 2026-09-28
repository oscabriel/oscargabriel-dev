import { AdminPosts } from "@/posts/admin-posts";
import { admin } from "@/rpc/base";

export const adminRouter = {
	posts: {
		listAll: admin.effect(function* () {
			const posts = yield* AdminPosts;
			return yield* posts.listAll();
		}),
	},
};
