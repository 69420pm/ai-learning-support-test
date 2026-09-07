CREATE TABLE "exercises" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"material_id" uuid NOT NULL,
	"kc_id" uuid NOT NULL,
	"page_number" integer NOT NULL,
	"title" text,
	"prompt" text,
	"solution" text,
	"question_type" text NOT NULL,
	"difficulty" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_kc_id_knowledge_components_id_fk" FOREIGN KEY ("kc_id") REFERENCES "public"."knowledge_components"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_exercises_project" ON "exercises" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_exercises_material" ON "exercises" USING btree ("material_id");--> statement-breakpoint
CREATE INDEX "idx_exercises_kc" ON "exercises" USING btree ("kc_id");