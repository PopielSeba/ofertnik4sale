CREATE TABLE "api_keys" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL,
	"key_value" varchar NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"permissions" jsonb DEFAULT '["quotes:create","assessments:create"]' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"created_by_id" varchar,
	"last_used_at" timestamp,
	CONSTRAINT "api_keys_key_value_unique" UNIQUE("key_value")
);
--> statement-breakpoint
CREATE TABLE "electrical_equipment" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL,
	"category_id" integer NOT NULL,
	"description" text,
	"model" varchar,
	"power" varchar,
	"fuel_consumption_75" numeric(6, 2),
	"dimensions" varchar,
	"weight" varchar,
	"engine" varchar,
	"alternator" varchar,
	"fuel_tank_capacity" integer,
	"image_url" varchar,
	"quantity" integer DEFAULT 0 NOT NULL,
	"available_quantity" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "electrical_equipment_additional" (
	"id" serial PRIMARY KEY NOT NULL,
	"equipment_id" integer NOT NULL,
	"type" varchar NOT NULL,
	"name" varchar NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"position" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "electrical_equipment_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "electrical_equipment_categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "electrical_equipment_pricing" (
	"id" serial PRIMARY KEY NOT NULL,
	"equipment_id" integer NOT NULL,
	"period_start" integer NOT NULL,
	"period_end" integer,
	"price_per_day" numeric(10, 2) NOT NULL,
	"discount_percent" numeric(5, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "electrical_equipment_service_costs" (
	"id" serial PRIMARY KEY NOT NULL,
	"equipment_id" integer NOT NULL,
	"service_interval_months" integer DEFAULT 12,
	"service_interval_km" integer,
	"service_interval_motohours" integer,
	"worker_hours" numeric(4, 1) DEFAULT '2.0' NOT NULL,
	"worker_cost_per_hour" numeric(8, 2) DEFAULT '100.00' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "electrical_equipment_service_costs_equipment_id_unique" UNIQUE("equipment_id")
);
--> statement-breakpoint
CREATE TABLE "electrical_equipment_service_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"equipment_id" integer NOT NULL,
	"item_name" varchar NOT NULL,
	"item_cost" numeric(8, 2) DEFAULT '0.00' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "electrical_quote_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"quote_id" integer NOT NULL,
	"equipment_id" integer NOT NULL,
	"quantity" integer NOT NULL,
	"rental_period_days" integer NOT NULL,
	"price_per_day" numeric(10, 2) NOT NULL,
	"discount_percent" numeric(5, 2) DEFAULT '0' NOT NULL,
	"total_price" numeric(12, 2) NOT NULL,
	"fuel_consumption_lh" numeric(5, 2),
	"fuel_price_per_liter" numeric(6, 2),
	"hours_per_day" integer DEFAULT 8,
	"total_fuel_cost" numeric(12, 2) DEFAULT '0',
	"include_fuel_cost" boolean DEFAULT false,
	"fuel_consumption_per_100km" numeric(5, 2),
	"kilometers_per_day" integer,
	"include_maintenance_cost" boolean DEFAULT false,
	"maintenance_interval_hours" integer DEFAULT 500,
	"maintenance_interval_km" integer,
	"calculation_type" varchar DEFAULT 'motohours',
	"fuel_filter_1_cost" numeric(8, 2) DEFAULT '49.00',
	"fuel_filter_2_cost" numeric(8, 2) DEFAULT '118.00',
	"oil_filter_cost" numeric(8, 2) DEFAULT '45.00',
	"air_filter_1_cost" numeric(8, 2) DEFAULT '105.00',
	"air_filter_2_cost" numeric(8, 2) DEFAULT '54.00',
	"engine_filter_costs" numeric(8, 2) DEFAULT '150.00',
	"oil_cost" numeric(8, 2) DEFAULT '162.44',
	"oil_quantity_liters" numeric(5, 1) DEFAULT '14.7',
	"service_work_hours" numeric(4, 1) DEFAULT '2',
	"service_work_rate_per_hour" numeric(8, 2) DEFAULT '100.00',
	"service_travel_distance_km" numeric(8, 2) DEFAULT '31',
	"service_travel_rate_per_km" numeric(6, 2) DEFAULT '1.15',
	"total_maintenance_cost" numeric(12, 2) DEFAULT '0',
	"expected_maintenance_hours" integer,
	"include_installation_cost" boolean DEFAULT false,
	"installation_distance_km" numeric(8, 2),
	"number_of_technicians" integer DEFAULT 1,
	"service_rate_per_technician" numeric(8, 2) DEFAULT '150',
	"travel_rate_per_km" numeric(6, 2) DEFAULT '1.15',
	"total_installation_cost" numeric(10, 2) DEFAULT '0',
	"include_disassembly_cost" boolean DEFAULT false,
	"disassembly_distance_km" numeric(8, 2),
	"disassembly_number_of_technicians" integer DEFAULT 1,
	"disassembly_service_rate_per_technician" numeric(8, 2) DEFAULT '150',
	"disassembly_travel_rate_per_km" numeric(6, 2) DEFAULT '1.15',
	"total_disassembly_cost" numeric(10, 2) DEFAULT '0',
	"include_travel_service_cost" boolean DEFAULT false,
	"travel_service_distance_km" numeric(8, 2),
	"travel_service_number_of_technicians" integer DEFAULT 1,
	"travel_service_service_rate_per_technician" numeric(8, 2) DEFAULT '150',
	"travel_service_travel_rate_per_km" numeric(6, 2) DEFAULT '1.15',
	"travel_service_number_of_trips" integer DEFAULT 1,
	"total_travel_service_cost" numeric(10, 2) DEFAULT '0',
	"include_travel_cost" boolean DEFAULT false,
	"travel_distance_km" numeric(8, 2),
	"hourly_rate_per_technician" numeric(8, 2) DEFAULT '150',
	"total_travel_cost" numeric(10, 2) DEFAULT '0',
	"include_service_items" boolean DEFAULT false,
	"service_item_1_cost" numeric(8, 2) DEFAULT '0.00',
	"service_item_2_cost" numeric(8, 2) DEFAULT '0.00',
	"service_item_3_cost" numeric(8, 2) DEFAULT '0.00',
	"service_item_4_cost" numeric(8, 2) DEFAULT '0.00',
	"total_service_items_cost" numeric(10, 2) DEFAULT '0.00',
	"additional_cost" numeric(10, 2) DEFAULT '0.00',
	"accessories_cost" numeric(10, 2) DEFAULT '0.00',
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "electrical_quotes" (
	"id" serial PRIMARY KEY NOT NULL,
	"quote_number" varchar NOT NULL,
	"client_id" integer NOT NULL,
	"created_by_id" varchar,
	"is_guest_quote" boolean DEFAULT false NOT NULL,
	"guest_email" varchar,
	"pricing_schema_id" integer,
	"status" varchar DEFAULT 'draft' NOT NULL,
	"total_net" numeric(12, 2) NOT NULL,
	"vat_rate" numeric(5, 2) DEFAULT '23' NOT NULL,
	"total_gross" numeric(12, 2) NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "electrical_quotes_quote_number_unique" UNIQUE("quote_number")
);
--> statement-breakpoint
CREATE TABLE "transport_quotes" (
	"id" serial PRIMARY KEY NOT NULL,
	"quote_number" varchar NOT NULL,
	"client_id" integer NOT NULL,
	"vehicle_id" integer NOT NULL,
	"from_address" text NOT NULL,
	"to_address" text NOT NULL,
	"distance" numeric(8, 2) NOT NULL,
	"total_cost" numeric(10, 2) NOT NULL,
	"notes" text,
	"user_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "transport_quotes_quote_number_unique" UNIQUE("quote_number")
);
--> statement-breakpoint
CREATE TABLE "transport_vehicles" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL,
	"description" text,
	"cost_per_km" numeric(8, 2) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "needs_assessment_questions" ADD COLUMN "category_type" varchar DEFAULT 'general' NOT NULL;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "electrical_equipment" ADD CONSTRAINT "electrical_equipment_category_id_electrical_equipment_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."electrical_equipment_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "electrical_equipment_additional" ADD CONSTRAINT "electrical_equipment_additional_equipment_id_electrical_equipment_id_fk" FOREIGN KEY ("equipment_id") REFERENCES "public"."electrical_equipment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "electrical_equipment_pricing" ADD CONSTRAINT "electrical_equipment_pricing_equipment_id_electrical_equipment_id_fk" FOREIGN KEY ("equipment_id") REFERENCES "public"."electrical_equipment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "electrical_equipment_service_costs" ADD CONSTRAINT "electrical_equipment_service_costs_equipment_id_electrical_equipment_id_fk" FOREIGN KEY ("equipment_id") REFERENCES "public"."electrical_equipment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "electrical_equipment_service_items" ADD CONSTRAINT "electrical_equipment_service_items_equipment_id_electrical_equipment_id_fk" FOREIGN KEY ("equipment_id") REFERENCES "public"."electrical_equipment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "electrical_quote_items" ADD CONSTRAINT "electrical_quote_items_quote_id_electrical_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."electrical_quotes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "electrical_quote_items" ADD CONSTRAINT "electrical_quote_items_equipment_id_electrical_equipment_id_fk" FOREIGN KEY ("equipment_id") REFERENCES "public"."electrical_equipment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "electrical_quotes" ADD CONSTRAINT "electrical_quotes_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "electrical_quotes" ADD CONSTRAINT "electrical_quotes_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "electrical_quotes" ADD CONSTRAINT "electrical_quotes_pricing_schema_id_pricing_schemas_id_fk" FOREIGN KEY ("pricing_schema_id") REFERENCES "public"."pricing_schemas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transport_quotes" ADD CONSTRAINT "transport_quotes_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transport_quotes" ADD CONSTRAINT "transport_quotes_vehicle_id_transport_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."transport_vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transport_quotes" ADD CONSTRAINT "transport_quotes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;