import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import type { Forged, Sheet } from "@/arms/forge";
import type { Reading } from "@/arms/judge";

// What was read from a site's page, kept beside its arms.
export interface ArmsPage {
	title: string | null;
	description: string | null;
	documentMs: number;
	documentBytes: number;
}

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

// The Roll of Arms: one row per site, made once and replaced only when the
// site is read again.
export const Arms = sqliteTable("arms", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	host: text("host").notNull().unique(),
	url: text("url").notNull(),
	// The seed Set rolled the candidates from, and which of them the site is.
	seed: integer("seed").notNull(),
	castIndex: integer("cast_index").notNull(),
	candidates: text("candidates", { mode: "json" })
		.$type<Forged["candidates"]>()
		.notNull(),
	// Set's response for the chosen candidate, unedited: Set keeps no old
	// snapshots, so this is the only copy of the character as it was rolled.
	birth: text("birth", { mode: "json" }).$type<unknown>().notNull(),
	contentVersion: text("content_version").notNull(),
	// Clef's answers as they were when the site was read; null for fate alone.
	reading: text("reading", { mode: "json" }).$type<Reading>(),
	sheet: text("sheet", { mode: "json" }).$type<Sheet>().notNull(),
	page: text("page", { mode: "json" }).$type<ArmsPage>().notNull(),
	plateKey: text("plate_key"),
	// Copied out of birth and reading so the roll lists without parsing them.
	className: text("class_name").notNull(),
	calling: text("calling"),
	powerRating: integer("power_rating").notNull(),
	forgedAt: integer("forged_at", { mode: "timestamp" })
		.notNull()
		.default(sql`(unixepoch())`),
});
