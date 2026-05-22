CREATE TABLE IF NOT EXISTS `resume_locks` (
	`id` text PRIMARY KEY NOT NULL,
	`locked_at` integer NOT NULL,
	`expires_at` integer NOT NULL
);
