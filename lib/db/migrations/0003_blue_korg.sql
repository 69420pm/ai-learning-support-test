CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint
CREATE TABLE "material_chunks" (

	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"material_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"chunk_index" integer NOT NULL,
	"content" text NOT NULL,
	"token_count" integer DEFAULT 0 NOT NULL,
	"embedding" vector(768),
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "materials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"filename" text NOT NULL,
	"file_type" varchar(64) NOT NULL,
	"file_size" integer DEFAULT 0 NOT NULL,
	"storage_path" text NOT NULL,
	"status" varchar(32) DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "material_chunks" ADD CONSTRAINT "material_chunks_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_chunks" ADD CONSTRAINT "material_chunks_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_chunks" ADD CONSTRAINT "material_chunks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "materials" ADD CONSTRAINT "materials_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "materials" ADD CONSTRAINT "materials_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "material_chunks_material_id_idx" ON "material_chunks" USING btree ("material_id");--> statement-breakpoint
CREATE INDEX "material_chunks_project_id_idx" ON "material_chunks" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "material_chunks_project_id_chunk_idx" ON "material_chunks" USING btree ("project_id","chunk_index");--> statement-breakpoint
CREATE INDEX "material_chunks_embedding_hnsw_idx" ON "material_chunks" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "materials_project_id_idx" ON "materials" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "materials_user_id_idx" ON "materials" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "materials_project_id_created_at_idx" ON "materials" USING btree ("project_id","created_at");