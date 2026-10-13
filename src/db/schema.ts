import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export interface TocEntry {
	id: string;
	text: string;
	level: number;
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

// The Roll of Arms lives on the roll-of-arms branch and is off the site, but
// prod's D1 already has this table and its migration. Alchemy won't deploy a
// migration history that is missing an applied file, so the table stays
// declared here, unused, with its rows kept for when the branch comes back.
export const Arms = sqliteTable("arms", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	host: text("host").notNull().unique(),
	url: text("url").notNull(),
	seed: integer("seed").notNull(),
	castIndex: integer("cast_index").notNull(),
	candidates: text("candidates", { mode: "json" }).notNull(),
	birth: text("birth", { mode: "json" }).notNull(),
	contentVersion: text("content_version").notNull(),
	reading: text("reading", { mode: "json" }),
	sheet: text("sheet", { mode: "json" }).notNull(),
	page: text("page", { mode: "json" }).notNull(),
	plateKey: text("plate_key"),
	className: text("class_name").notNull(),
	calling: text("calling"),
	powerRating: integer("power_rating").notNull(),
	forgedAt: integer("forged_at", { mode: "timestamp" })
		.notNull()
		.default(sql`(unixepoch())`),
});
