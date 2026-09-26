import { defineRelations } from "drizzle-orm";

import * as schema from "@/db/schema";

export const relations = defineRelations(schema, (r) => ({
	Posts: {
		headerImage: r.one.MediaFiles({
			from: r.Posts.headerImageId,
			to: r.MediaFiles.id,
		}),
	},
}));
