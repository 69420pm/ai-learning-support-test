CREATE TABLE "knowledge_components" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"pacer_category" text NOT NULL,
	"bloom_level" integer NOT NULL,
	"aliases" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"embedding" vector(768),
	"source_material_id" uuid,
	"status" text DEFAULT 'active' NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_dependencies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"source_kc_id" uuid NOT NULL,
	"target_kc_id" uuid NOT NULL,
	"relationship_type" text DEFAULT 'prerequisite' NOT NULL,
	"reasoning" text,
	"is_transitive" boolean DEFAULT false NOT NULL,
	"source_material_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "knowledge_components" ADD CONSTRAINT "knowledge_components_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_components" ADD CONSTRAINT "knowledge_components_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_components" ADD CONSTRAINT "knowledge_components_source_material_id_materials_id_fk" FOREIGN KEY ("source_material_id") REFERENCES "public"."materials"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_dependencies" ADD CONSTRAINT "knowledge_dependencies_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_dependencies" ADD CONSTRAINT "knowledge_dependencies_source_kc_id_knowledge_components_id_fk" FOREIGN KEY ("source_kc_id") REFERENCES "public"."knowledge_components"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_dependencies" ADD CONSTRAINT "knowledge_dependencies_target_kc_id_knowledge_components_id_fk" FOREIGN KEY ("target_kc_id") REFERENCES "public"."knowledge_components"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_dependencies" ADD CONSTRAINT "knowledge_dependencies_source_material_id_materials_id_fk" FOREIGN KEY ("source_material_id") REFERENCES "public"."materials"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_kc_project_slug" ON "knowledge_components" USING btree ("project_id","slug");--> statement-breakpoint
CREATE INDEX "idx_kc_project_id" ON "knowledge_components" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_kd_project_source_target_rel" ON "knowledge_dependencies" USING btree ("project_id","source_kc_id","target_kc_id","relationship_type");--> statement-breakpoint
CREATE INDEX "idx_kd_project_target" ON "knowledge_dependencies" USING btree ("project_id","target_kc_id");--> statement-breakpoint
CREATE INDEX "idx_kd_project_source" ON "knowledge_dependencies" USING btree ("project_id","source_kc_id");