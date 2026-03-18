CREATE TYPE "public"."live_room_member_role" AS ENUM('host', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."live_room_member_status" AS ENUM('approved', 'joined', 'left', 'removed');--> statement-breakpoint
CREATE TYPE "public"."live_room_status" AS ENUM('idle', 'live', 'ended');--> statement-breakpoint
CREATE TYPE "public"."live_session_status" AS ENUM('starting', 'live', 'ended', 'failed');--> statement-breakpoint
CREATE TABLE "live_room_members" (
	"room_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"role" "live_room_member_role" NOT NULL,
	"join_status" "live_room_member_status" DEFAULT 'approved' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "live_room_members_pk" PRIMARY KEY("room_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "live_room_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" uuid NOT NULL,
	"host_user_id" text NOT NULL,
	"status" "live_session_status" DEFAULT 'starting' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"ended_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "live_rooms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"created_by_user_id" text NOT NULL,
	"status" "live_room_status" DEFAULT 'idle' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "live_room_members" ADD CONSTRAINT "live_room_members_room_id_live_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."live_rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_room_members" ADD CONSTRAINT "live_room_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_room_sessions" ADD CONSTRAINT "live_room_sessions_room_id_live_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."live_rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_room_sessions" ADD CONSTRAINT "live_room_sessions_host_user_id_users_id_fk" FOREIGN KEY ("host_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_rooms" ADD CONSTRAINT "live_rooms_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "live_room_members_user_idx" ON "live_room_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "live_room_members_role_idx" ON "live_room_members" USING btree ("role");--> statement-breakpoint
CREATE INDEX "live_room_sessions_room_idx" ON "live_room_sessions" USING btree ("room_id");--> statement-breakpoint
CREATE INDEX "live_room_sessions_host_idx" ON "live_room_sessions" USING btree ("host_user_id");--> statement-breakpoint
CREATE INDEX "live_room_sessions_status_idx" ON "live_room_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "live_rooms_created_by_idx" ON "live_rooms" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "live_rooms_status_idx" ON "live_rooms" USING btree ("status");