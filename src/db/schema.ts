import { sql } from "drizzle-orm";
import {
	integer,
	sqliteTable,
	text,
	uniqueIndex,
} from "drizzle-orm/sqlite-core";

export interface TocEntry {
	id: string;
	text: string;
	depth: number;
}

export const MediaFiles = sqliteTable("media", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	key: text("key").notNull().unique(),
	contentType: text("content_type").notNull(),
	size: integer("size").notNull(),
	alt: text("alt"),
	createdAt: integer("created_at", { mode: "timestamp" })
		.notNull()
		.default(sql`(unixepoch())`),
});

export const Posts = sqliteTable("posts", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	slug: text("slug").notNull().unique(),
	title: text("title").notNull(),
	summary: text("summary").notNull(),
	body: text("body").notNull(),
	html: text("html").notNull(),
	toc: text("toc", { mode: "json" }).$type<TocEntry[]>().notNull(),
	status: text("status", { enum: ["draft", "published"] })
		.notNull()
		.default("draft"),
	headerImageId: integer("header_image_id").references(() => MediaFiles.id, {
		onDelete: "set null",
	}),
	headerImageCaption: text("header_image_caption"),
	publishedAt: integer("published_at", { mode: "timestamp" }),
	createdAt: integer("created_at", { mode: "timestamp" })
		.notNull()
		.default(sql`(unixepoch())`),
	updatedAt: integer("updated_at", { mode: "timestamp" })
		.notNull()
		.default(sql`(unixepoch())`),
});

export const Projects = sqliteTable(
	"projects",
	{
		id: integer("id").primaryKey({ autoIncrement: true }),
		title: text("title").notNull(),
		description: text("description").notNull(),
		liveUrl: text("live_url").notNull(),
		repoOwner: text("repo_owner").notNull(),
		repoName: text("repo_name").notNull(),
		launchedAt: integer("launched_at", { mode: "timestamp" }).notNull(),
	},
	(table) => [
		uniqueIndex("projects_repo_idx").on(table.repoOwner, table.repoName),
	]
);
