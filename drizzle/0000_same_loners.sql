CREATE TABLE "agent_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"message_id" integer NOT NULL,
	"task_type" varchar(50) DEFAULT 'chat' NOT NULL,
	"status" varchar(30) DEFAULT 'pending' NOT NULL,
	"steps_taken" integer DEFAULT 0 NOT NULL,
	"plan" text,
	"result" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "attachments" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversation_id" integer NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"file_path" varchar(1000) NOT NULL,
	"file_type" varchar(100) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"title" varchar(255) DEFAULT 'Percakapan baru' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memories" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"key" varchar(255) NOT NULL,
	"value" text NOT NULL,
	"embedding" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversation_id" integer NOT NULL,
	"role" varchar(20) NOT NULL,
	"content" text NOT NULL,
	"model_provider_id" integer,
	"tokens_used" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "model_providers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"api_endpoint" varchar(500) NOT NULL,
	"priority" integer DEFAULT 1 NOT NULL,
	"cost_per_1k_token" numeric(10, 6) DEFAULT '0' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"quota_daily" integer DEFAULT 100 NOT NULL,
	"price" numeric(10, 2) DEFAULT '0' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tool_calls" (
	"id" serial PRIMARY KEY NOT NULL,
	"agent_task_id" integer NOT NULL,
	"tool_name" varchar(100) NOT NULL,
	"input" text NOT NULL,
	"output" text NOT NULL,
	"is_error" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usage_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"api_key_id" integer,
	"model_provider_id" integer NOT NULL,
	"source" varchar(30) DEFAULT 'internal_chat' NOT NULL,
	"tokens_input" integer DEFAULT 0 NOT NULL,
	"tokens_output" integer DEFAULT 0 NOT NULL,
	"cost" numeric(10, 6) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255),
	"plan_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_tasks" ADD CONSTRAINT "agent_tasks_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memories" ADD CONSTRAINT "memories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_model_provider_id_model_providers_id_fk" FOREIGN KEY ("model_provider_id") REFERENCES "public"."model_providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tool_calls" ADD CONSTRAINT "tool_calls_agent_task_id_agent_tasks_id_fk" FOREIGN KEY ("agent_task_id") REFERENCES "public"."agent_tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_logs" ADD CONSTRAINT "usage_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_logs" ADD CONSTRAINT "usage_logs_model_provider_id_model_providers_id_fk" FOREIGN KEY ("model_provider_id") REFERENCES "public"."model_providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_tasks_message_id_idx" ON "agent_tasks" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "agent_tasks_status_idx" ON "agent_tasks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "attachments_conversation_id_idx" ON "attachments" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "conversations_user_id_idx" ON "conversations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "conversations_updated_at_idx" ON "conversations" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "memories_user_id_idx" ON "memories" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "memories_user_key_idx" ON "memories" USING btree ("user_id","key");--> statement-breakpoint
CREATE INDEX "messages_conversation_id_idx" ON "messages" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "tool_calls_agent_task_id_idx" ON "tool_calls" USING btree ("agent_task_id");--> statement-breakpoint
CREATE INDEX "usage_logs_user_id_idx" ON "usage_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "usage_logs_source_idx" ON "usage_logs" USING btree ("source");--> statement-breakpoint
CREATE INDEX "usage_logs_created_at_idx" ON "usage_logs" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");