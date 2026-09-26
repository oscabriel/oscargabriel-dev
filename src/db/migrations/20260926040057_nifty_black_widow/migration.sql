CREATE TABLE `media` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`key` text NOT NULL UNIQUE,
	`content_type` text NOT NULL,
	`size` integer NOT NULL,
	`alt` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `posts` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`slug` text NOT NULL UNIQUE,
	`title` text NOT NULL,
	`summary` text NOT NULL,
	`body` text NOT NULL,
	`html` text NOT NULL,
	`toc` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`header_image_id` integer,
	`header_image_caption` text,
	`published_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT `fk_posts_header_image_id_media_id_fk` FOREIGN KEY (`header_image_id`) REFERENCES `media`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`live_url` text NOT NULL,
	`repo_owner` text NOT NULL,
	`repo_name` text NOT NULL,
	`launched_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `projects_repo_idx` ON `projects` (`repo_owner`,`repo_name`);