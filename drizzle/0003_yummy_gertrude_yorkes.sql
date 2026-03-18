CREATE TYPE "public"."media_call_mode" AS ENUM('direct_call');--> statement-breakpoint
CREATE TYPE "public"."media_call_status" AS ENUM('ringing', 'active', 'ended', 'declined', 'missed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."media_participant_join_status" AS ENUM('invited', 'joined', 'declined', 'missed', 'left');--> statement-breakpoint
CREATE TYPE "public"."media_participant_role" AS ENUM('caller', 'callee');--> statement-breakpoint
CREATE TABLE "media_call_participants" (
	"call_session_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"role" "media_participant_role" NOT NULL,
	"join_status" "media_participant_join_status" DEFAULT 'invited' NOT NULL,
	"joined_at" timestamp with time zone,
	"left_at" timestamp with time zone,
	CONSTRAINT "media_call_participants_pk" PRIMARY KEY("call_session_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "media_call_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"mode" "media_call_mode" DEFAULT 'direct_call' NOT NULL,
	"status" "media_call_status" DEFAULT 'ringing' NOT NULL,
	"initiated_by_user_id" text NOT NULL,
	"started_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	"ended_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "media_call_participants" ADD CONSTRAINT "media_call_participants_call_session_id_media_call_sessions_id_fk" FOREIGN KEY ("call_session_id") REFERENCES "public"."media_call_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_call_participants" ADD CONSTRAINT "media_call_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_call_sessions" ADD CONSTRAINT "media_call_sessions_conversation_id_chat_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."chat_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_call_sessions" ADD CONSTRAINT "media_call_sessions_initiated_by_user_id_users_id_fk" FOREIGN KEY ("initiated_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "media_call_participants_user_idx" ON "media_call_participants" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "media_call_participants_role_idx" ON "media_call_participants" USING btree ("role");--> statement-breakpoint
CREATE INDEX "media_call_sessions_conversation_idx" ON "media_call_sessions" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "media_call_sessions_initiated_by_idx" ON "media_call_sessions" USING btree ("initiated_by_user_id");--> statement-breakpoint
CREATE INDEX "media_call_sessions_status_idx" ON "media_call_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "media_call_sessions_updated_idx" ON "media_call_sessions" USING btree ("updated_at");