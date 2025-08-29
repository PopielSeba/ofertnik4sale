-- Transport Tables Migration
-- Create transport vehicles table
CREATE TABLE IF NOT EXISTS "transport_vehicles" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL,
	"description" text,
	"cost_per_km" numeric(8, 2) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);

-- Create transport quotes table
CREATE TABLE IF NOT EXISTS "transport_quotes" (
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

-- Add foreign key constraints
DO $$ BEGIN
 ALTER TABLE "transport_quotes" ADD CONSTRAINT "transport_quotes_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "transport_quotes" ADD CONSTRAINT "transport_quotes_vehicle_id_transport_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "transport_vehicles"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "transport_quotes" ADD CONSTRAINT "transport_quotes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Insert default transport vehicles
INSERT INTO "transport_vehicles" ("name", "description", "cost_per_km") VALUES
('Samochód osobowy', 'Standardowy samochód osobowy do przewozu osób', 2.50),
('Samochód dostawczy do 3,5 t', 'Samochód dostawczy o ładowności do 3,5 tony', 3.50),
('Ciężarówka SOLO', 'Ciężarówka bez przyczepy', 4.50),
('Ciężarówka Wywrotka', 'Ciężarówka z korbą wywrotką', 5.00),
('Ciężarówka Naczepa', 'Ciężarówka z naczepą', 5.50)
ON CONFLICT (name) DO NOTHING;