CREATE SCHEMA "neon_auth";
--> statement-breakpoint
CREATE TYPE "public"."platform" AS ENUM('windows', 'macos', 'macos_arm', 'linux', 'linux_appimage', 'linux_deb');--> statement-breakpoint
CREATE TYPE "public"."release_channel" AS ENUM('stable', 'beta', 'alpha');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('active', 'canceled', 'past_due', 'trialing');--> statement-breakpoint
CREATE TYPE "public"."subscription_tier" AS ENUM('free', 'pro', 'pro_plus');--> statement-breakpoint
CREATE TYPE "public"."usage_type" AS ENUM('ai_query', 'ai_embedding', 'plugin_install', 'search');--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" varchar(255) NOT NULL,
	"key_hash" varchar(255) NOT NULL,
	"key_prefix" varchar(12) NOT NULL,
	"last_used_at" timestamp,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "neon_auth"."users_sync" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text,
	"name" text,
	"image" text,
	"created_at" timestamp,
	"updated_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "plugin_ratings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"plugin_id" varchar(255) NOT NULL,
	"rating" integer NOT NULL,
	"review" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plugins" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"version" varchar(50) NOT NULL,
	"author_id" text,
	"author_name" varchar(255),
	"description" text,
	"long_description" text,
	"homepage" text,
	"repository" text,
	"download_url" text NOT NULL,
	"checksum" varchar(128),
	"permissions" jsonb DEFAULT '[]'::jsonb,
	"categories" jsonb DEFAULT '[]'::jsonb,
	"downloads" integer DEFAULT 0 NOT NULL,
	"rating" numeric(2, 1),
	"rating_count" integer DEFAULT 0 NOT NULL,
	"verified" boolean DEFAULT false,
	"featured" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"published_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "release_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"release_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"download_url" text NOT NULL,
	"file_size" integer,
	"content_type" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "releases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version" varchar(50) NOT NULL,
	"platform" "platform" NOT NULL,
	"channel" "release_channel" DEFAULT 'stable' NOT NULL,
	"download_url" text NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"file_size" integer,
	"checksum" varchar(128),
	"signature" text,
	"release_notes" text,
	"min_os_version" varchar(50),
	"is_latest" boolean DEFAULT false NOT NULL,
	"is_deprecated" boolean DEFAULT false NOT NULL,
	"downloads" integer DEFAULT 0 NOT NULL,
	"published_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"tier" "subscription_tier" DEFAULT 'free' NOT NULL,
	"status" "subscription_status" DEFAULT 'active' NOT NULL,
	"stripe_customer_id" varchar(255),
	"stripe_subscription_id" varchar(255),
	"current_period_start" timestamp,
	"current_period_end" timestamp,
	"cancel_at_period_end" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usage_aggregates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"month" varchar(7) NOT NULL,
	"ai_queries" integer DEFAULT 0 NOT NULL,
	"ai_embeddings" integer DEFAULT 0 NOT NULL,
	"plugin_installs" integer DEFAULT 0 NOT NULL,
	"searches" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usage_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"type" "usage_type" NOT NULL,
	"count" integer DEFAULT 1 NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_plugins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"plugin_id" varchar(255) NOT NULL,
	"installed_version" varchar(50) NOT NULL,
	"enabled" boolean DEFAULT true,
	"settings" jsonb DEFAULT '{}'::jsonb,
	"installed_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"user_id" text PRIMARY KEY NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "plugin_ratings" ADD CONSTRAINT "plugin_ratings_plugin_id_plugins_id_fk" FOREIGN KEY ("plugin_id") REFERENCES "public"."plugins"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "release_assets" ADD CONSTRAINT "release_assets_release_id_releases_id_fk" FOREIGN KEY ("release_id") REFERENCES "public"."releases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_plugins" ADD CONSTRAINT "user_plugins_plugin_id_plugins_id_fk" FOREIGN KEY ("plugin_id") REFERENCES "public"."plugins"("id") ON DELETE cascade ON UPDATE no action;