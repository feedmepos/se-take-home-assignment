CREATE TABLE `order_numbers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`created_at` integer DEFAULT (unixepoch())
);
--> statement-breakpoint
ALTER TABLE `orders` ADD `processing_started_at` integer;--> statement-breakpoint
CREATE UNIQUE INDEX `orders_order_number_active` ON `orders` (`order_number`) WHERE "orders"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX `orders_processing_bot_active` ON `orders` (`bot_id`) WHERE "orders"."status" = 'PROCESSING' and "orders"."deleted_at" is null and "orders"."bot_id" is not null;