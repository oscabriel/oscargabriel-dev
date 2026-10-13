CREATE TABLE `arms` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`host` text NOT NULL UNIQUE,
	`url` text NOT NULL,
	`seed` integer NOT NULL,
	`cast_index` integer NOT NULL,
	`candidates` text NOT NULL,
	`birth` text NOT NULL,
	`content_version` text NOT NULL,
	`reading` text,
	`sheet` text NOT NULL,
	`page` text NOT NULL,
	`plate_key` text,
	`class_name` text NOT NULL,
	`calling` text,
	`power_rating` integer NOT NULL,
	`forged_at` integer DEFAULT (unixepoch()) NOT NULL
);
