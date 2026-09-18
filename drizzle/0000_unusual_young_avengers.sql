CREATE TYPE "public"."audit_action" AS ENUM('FOUND', 'MATCHED', 'CLAIM_REQUESTED', 'RELEASED');--> statement-breakpoint
CREATE TYPE "public"."claim_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."item_status" AS ENUM('FOUND', 'MATCHED', 'CLAIM_REQUESTED', 'RELEASED');--> statement-breakpoint
CREATE TYPE "public"."notification_kind" AS ENUM('MATCH_FOUND', 'CLAIM_DECISION', 'SYSTEM');--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('OPEN', 'MATCHED', 'CLOSED');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('student', 'staff');--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"found_item_id" uuid NOT NULL,
	"actor_id" uuid,
	"actor_name" text NOT NULL,
	"action" "audit_action" NOT NULL,
	"detail" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"found_item_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"lost_report_id" uuid,
	"verification_answer" text NOT NULL,
	"status" "claim_status" DEFAULT 'PENDING' NOT NULL,
	"claimed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decided_at" timestamp with time zone,
	"decided_by_staff_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "claims_one_pending_per_item" UNIQUE NULLS NOT DISTINCT("found_item_id","status")
);
--> statement-breakpoint
CREATE TABLE "found_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"qr_code" text NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"location" text NOT NULL,
	"found_date" timestamp with time zone DEFAULT now() NOT NULL,
	"status" "item_status" DEFAULT 'FOUND' NOT NULL,
	"image_url" text,
	"qr_tag_ready" boolean DEFAULT false NOT NULL,
	"logged_by_staff_id" uuid NOT NULL,
	"last_scanned_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "found_items_qr_code_unique" UNIQUE("qr_code")
);
--> statement-breakpoint
CREATE TABLE "lost_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"category" text NOT NULL,
	"description" text NOT NULL,
	"date_lost" timestamp with time zone NOT NULL,
	"location_lost" text NOT NULL,
	"image_url" text,
	"status" "report_status" DEFAULT 'OPEN' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" "notification_kind" DEFAULT 'SYSTEM' NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"found_item_id" uuid,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_id" text NOT NULL,
	"email" text,
	"name" text NOT NULL,
	"role" "user_role" DEFAULT 'student' NOT NULL,
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_clerk_id_unique" UNIQUE("clerk_id")
);
--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_found_item_id_found_items_id_fk" FOREIGN KEY ("found_item_id") REFERENCES "public"."found_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claims" ADD CONSTRAINT "claims_found_item_id_found_items_id_fk" FOREIGN KEY ("found_item_id") REFERENCES "public"."found_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claims" ADD CONSTRAINT "claims_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claims" ADD CONSTRAINT "claims_lost_report_id_lost_reports_id_fk" FOREIGN KEY ("lost_report_id") REFERENCES "public"."lost_reports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claims" ADD CONSTRAINT "claims_decided_by_staff_id_users_id_fk" FOREIGN KEY ("decided_by_staff_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "found_items" ADD CONSTRAINT "found_items_logged_by_staff_id_users_id_fk" FOREIGN KEY ("logged_by_staff_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lost_reports" ADD CONSTRAINT "lost_reports_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_found_item_id_found_items_id_fk" FOREIGN KEY ("found_item_id") REFERENCES "public"."found_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_events_item_idx" ON "audit_events" USING btree ("found_item_id","created_at");--> statement-breakpoint
CREATE INDEX "claims_item_idx" ON "claims" USING btree ("found_item_id");--> statement-breakpoint
CREATE INDEX "claims_student_idx" ON "claims" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "found_items_status_idx" ON "found_items" USING btree ("status");--> statement-breakpoint
CREATE INDEX "lost_reports_student_idx" ON "lost_reports" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "notifications_user_idx" ON "notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role");