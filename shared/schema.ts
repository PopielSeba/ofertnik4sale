import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  decimal,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table - updated for standard auth (with backward compatibility)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique().notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  passwordHash: varchar("password_hash"), // For standard auth, null for Replit users
  authProvider: varchar("auth_provider").default("standard").notNull(), // "replit" or "standard"
  role: varchar("role").notNull().default("employee"), // admin, employee, electrical_manager, transport_manager, general_manager, public_manager, shop_manager
  isActive: boolean("is_active").default(true).notNull(),
  isApproved: boolean("is_approved").default(false).notNull(), // admin approval required
  approvedAt: timestamp("approved_at"),
  approvedById: varchar("approved_by_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Equipment categories
export const equipmentCategories = pgTable("equipment_categories", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Equipment items
export const equipment = pgTable("equipment", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  categoryId: integer("category_id").references(() => equipmentCategories.id).notNull(),
  description: text("description"),
  model: varchar("model"),
  power: varchar("power"), // e.g., "90.18 kW", "235 kW"
  // Additional technical specifications for generators
  fuelConsumption75: decimal("fuel_consumption_75", { precision: 6, scale: 2 }), // l/h at 75% load
  dimensions: varchar("dimensions"), // LxWxH in mm
  weight: varchar("weight"), // in kg
  engine: varchar("engine"), // engine manufacturer/model
  alternator: varchar("alternator"), // alternator info
  fuelTankCapacity: integer("fuel_tank_capacity"), // liters
  imageUrl: varchar("image_url"), // equipment image URL

  quantity: integer("quantity").notNull().default(0),
  availableQuantity: integer("available_quantity").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Pricing tiers for different rental periods
export const equipmentPricing = pgTable("equipment_pricing", {
  id: serial("id").primaryKey(),
  equipmentId: integer("equipment_id").references(() => equipment.id).notNull(),
  periodStart: integer("period_start").notNull(), // days
  periodEnd: integer("period_end"), // days, null for 30+
  pricePerDay: decimal("price_per_day", { precision: 10, scale: 2 }).notNull(),
  discountPercent: decimal("discount_percent", { precision: 5, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Equipment additional equipment and accessories
export const equipmentAdditional = pgTable("equipment_additional", {
  id: serial("id").primaryKey(),
  equipmentId: integer("equipment_id").references(() => equipment.id).notNull(),
  type: varchar("type").notNull(), // "additional" or "accessories"
  name: varchar("name").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  position: integer("position").notNull().default(1), // 1-4 for ordering
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Clients/Customers
export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  companyName: varchar("company_name").notNull(),
  nip: varchar("nip"),
  contactPerson: varchar("contact_person"),
  phone: varchar("phone"),
  email: varchar("email"),
  address: text("address"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Pricing tiers/schemas - define different pricing strategies
export const pricingSchemas = pgTable("pricing_schemas", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull().unique(), // e.g., "Rabat od pierwszego dnia", "Rabat progowy"
  description: text("description"),
  calculationMethod: varchar("calculation_method").notNull().default("progressive"), // "first_day" or "progressive"
  isDefault: boolean("is_default").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// API Keys for external access
export const apiKeys = pgTable("api_keys", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(), // e.g., "Website Integration", "Partner API"
  keyValue: varchar("key_value").notNull().unique(),
  isActive: boolean("is_active").default(true).notNull(),
  permissions: jsonb("permissions").notNull().default(JSON.stringify(["quotes:create", "assessments:create"])), // array of permissions
  createdAt: timestamp("created_at").defaultNow(),
  createdById: varchar("created_by_id").references(() => users.id),
  lastUsedAt: timestamp("last_used_at"),
});

// Progressive pricing tiers for each pricing schema


// Quotes
export const quotes = pgTable("quotes", {
  id: serial("id").primaryKey(),
  quoteNumber: varchar("quote_number").notNull().unique(),
  clientId: integer("client_id").references(() => clients.id).notNull(),
  createdById: varchar("created_by_id").references(() => users.id),
  isGuestQuote: boolean("is_guest_quote").default(false).notNull(),
  guestEmail: varchar("guest_email"),
  pricingSchemaId: integer("pricing_schema_id").references(() => pricingSchemas.id),
  status: varchar("status").notNull().default("draft"), // draft, pending, approved, rejected
  totalNet: decimal("total_net", { precision: 12, scale: 2 }).notNull(),
  vatRate: decimal("vat_rate", { precision: 5, scale: 2 }).notNull().default("23"),
  totalGross: decimal("total_gross", { precision: 12, scale: 2 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});



// Quote items
export const quoteItems = pgTable("quote_items", {
  id: serial("id").primaryKey(),
  quoteId: integer("quote_id").references(() => quotes.id).notNull(),
  equipmentId: integer("equipment_id").references(() => equipment.id).notNull(),
  quantity: integer("quantity").notNull(),
  rentalPeriodDays: integer("rental_period_days").notNull(),
  pricePerDay: decimal("price_per_day", { precision: 10, scale: 2 }).notNull(),
  discountPercent: decimal("discount_percent", { precision: 5, scale: 2 }).notNull().default("0"),
  totalPrice: decimal("total_price", { precision: 12, scale: 2 }).notNull(),
  // Fuel cost fields for generators (motohours-based)
  fuelConsumptionLH: decimal("fuel_consumption_lh", { precision: 5, scale: 2 }), // liters per hour
  fuelPricePerLiter: decimal("fuel_price_per_liter", { precision: 6, scale: 2 }), // PLN per liter
  hoursPerDay: integer("hours_per_day").default(8), // operating hours per day
  totalFuelCost: decimal("total_fuel_cost", { precision: 12, scale: 2 }).default("0"),
  includeFuelCost: boolean("include_fuel_cost").default(false),
  // Fuel cost fields for vehicles (kilometers-based)
  fuelConsumptionPer100km: decimal("fuel_consumption_per_100km", { precision: 5, scale: 2 }), // liters per 100km for vehicles
  kilometersPerDay: integer("kilometers_per_day"), // kilometers driven per day
  // Maintenance/exploitation cost fields for generators (every 500 mth)
  includeMaintenanceCost: boolean("include_maintenance_cost").default(false),
  maintenanceIntervalHours: integer("maintenance_interval_hours").default(500), // every 500 mth for generators
  maintenanceIntervalKm: integer("maintenance_interval_km"), // service interval in kilometers for vehicles
  calculationType: varchar("calculation_type").default("motohours"), // 'motohours' or 'kilometers'
  // Filter costs (6 filters)
  fuelFilter1Cost: decimal("fuel_filter_1_cost", { precision: 8, scale: 2 }).default("49.00"),
  fuelFilter2Cost: decimal("fuel_filter_2_cost", { precision: 8, scale: 2 }).default("118.00"),
  oilFilterCost: decimal("oil_filter_cost", { precision: 8, scale: 2 }).default("45.00"),
  airFilter1Cost: decimal("air_filter_1_cost", { precision: 8, scale: 2 }).default("105.00"),
  airFilter2Cost: decimal("air_filter_2_cost", { precision: 8, scale: 2 }).default("54.00"),
  engineFilterCost: decimal("engine_filter_cost", { precision: 8, scale: 2 }).default("150.00"),
  // Oil cost
  oilCost: decimal("oil_cost", { precision: 8, scale: 2 }).default("162.44"),
  oilQuantityLiters: decimal("oil_quantity_liters", { precision: 5, scale: 1 }).default("14.7"),
  // Service work cost
  serviceWorkHours: decimal("service_work_hours", { precision: 4, scale: 1 }).default("2"),
  serviceWorkRatePerHour: decimal("service_work_rate_per_hour", { precision: 8, scale: 2 }).default("100.00"),
  // Service travel cost
  serviceTravelDistanceKm: decimal("service_travel_distance_km", { precision: 8, scale: 2 }).default("31"),
  serviceTravelRatePerKm: decimal("service_travel_rate_per_km", { precision: 6, scale: 2 }).default("1.15"),
  // Total maintenance cost for the rental period
  totalMaintenanceCost: decimal("total_maintenance_cost", { precision: 12, scale: 2 }).default("0"),
  expectedMaintenanceHours: integer("expected_maintenance_hours"), // expected operating hours for the rental period
  // Installation cost fields
  includeInstallationCost: boolean("include_installation_cost").default(false),
  installationDistanceKm: decimal("installation_distance_km", { precision: 8, scale: 2 }),
  numberOfTechnicians: integer("number_of_technicians").default(1),
  serviceRatePerTechnician: decimal("service_rate_per_technician", { precision: 8, scale: 2 }).default("150"),
  travelRatePerKm: decimal("travel_rate_per_km", { precision: 6, scale: 2 }).default("1.15"),
  totalInstallationCost: decimal("total_installation_cost", { precision: 10, scale: 2 }).default("0"),
  
  // Disassembly cost fields
  includeDisassemblyCost: boolean("include_disassembly_cost").default(false),
  disassemblyDistanceKm: decimal("disassembly_distance_km", { precision: 8, scale: 2 }),
  disassemblyNumberOfTechnicians: integer("disassembly_number_of_technicians").default(1),
  disassemblyServiceRatePerTechnician: decimal("disassembly_service_rate_per_technician", { precision: 8, scale: 2 }).default("150"),
  disassemblyTravelRatePerKm: decimal("disassembly_travel_rate_per_km", { precision: 6, scale: 2 }).default("1.15"),
  totalDisassemblyCost: decimal("total_disassembly_cost", { precision: 10, scale: 2 }).default("0"),
  
  // Travel/Service cost fields
  includeTravelServiceCost: boolean("include_travel_service_cost").default(false),
  travelServiceDistanceKm: decimal("travel_service_distance_km", { precision: 8, scale: 2 }),
  travelServiceNumberOfTechnicians: integer("travel_service_number_of_technicians").default(1),
  travelServiceServiceRatePerTechnician: decimal("travel_service_service_rate_per_technician", { precision: 8, scale: 2 }).default("150"),
  travelServiceTravelRatePerKm: decimal("travel_service_travel_rate_per_km", { precision: 6, scale: 2 }).default("1.15"),
  travelServiceNumberOfTrips: integer("travel_service_number_of_trips").default(1),
  totalTravelServiceCost: decimal("total_travel_service_cost", { precision: 10, scale: 2 }).default("0"),
  
  // Legacy travel cost fields (keeping for backward compatibility)
  includeTravelCost: boolean("include_travel_cost").default(false),
  travelDistanceKm: decimal("travel_distance_km", { precision: 8, scale: 2 }),
  hourlyRatePerTechnician: decimal("hourly_rate_per_technician", { precision: 8, scale: 2 }).default("150"),
  totalTravelCost: decimal("total_travel_cost", { precision: 10, scale: 2 }).default("0"),
  // Service items for heaters
  includeServiceItems: boolean("include_service_items").default(false),
  serviceItem1Cost: decimal("service_item_1_cost", { precision: 8, scale: 2 }).default("0.00"),
  serviceItem2Cost: decimal("service_item_2_cost", { precision: 8, scale: 2 }).default("0.00"),
  serviceItem3Cost: decimal("service_item_3_cost", { precision: 8, scale: 2 }).default("0.00"),
  serviceItem4Cost: decimal("service_item_4_cost", { precision: 8, scale: 2 }).default("0.00"),
  totalServiceItemsCost: decimal("total_service_items_cost", { precision: 10, scale: 2 }).default("0.00"),
  // Additional equipment tracking
  additionalCost: decimal("additional_cost", { precision: 10, scale: 2 }).default("0.00"),
  accessoriesCost: decimal("accessories_cost", { precision: 10, scale: 2 }).default("0.00"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Service cost configuration for equipment
export const equipmentServiceCosts = pgTable("equipment_service_costs", {
  id: serial("id").primaryKey(),
  equipmentId: integer("equipment_id").references(() => equipment.id).notNull().unique(),
  serviceIntervalMonths: integer("service_interval_months").default(12), // How often service is required for traditional equipment (months)
  serviceIntervalKm: integer("service_interval_km"), // Service interval in kilometers for vehicles
  serviceIntervalMotohours: integer("service_interval_motohours"), // Service interval in motohours for generators and lighting towers
  workerHours: decimal("worker_hours", { precision: 4, scale: 1 }).default("2.0").notNull(), // Fixed field name
  workerCostPerHour: decimal("worker_cost_per_hour", { precision: 8, scale: 2 }).default("100.00").notNull(), // Fixed field name
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Service items for equipment (configurable by admin)
export const equipmentServiceItems = pgTable("equipment_service_items", {
  id: serial("id").primaryKey(),
  equipmentId: integer("equipment_id").references(() => equipment.id).notNull(),
  itemName: varchar("item_name").notNull(), // e.g., "Filtr paliwa 1", "Filtr oleju", "Wymiana oleju"
  itemCost: decimal("item_cost", { precision: 8, scale: 2 }).default("0.00").notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Needs Assessment Questions
export const needsAssessmentQuestions = pgTable("needs_assessment_questions", {
  id: serial("id").primaryKey(),
  category: varchar("category").notNull(), // "Informacje ogólne", "Warunki otoczenia", etc.
  question: text("question").notNull(),
  type: varchar("type").notNull().default("text"), // text, select, checkbox, radio, textarea
  options: jsonb("options"), // for select/radio/checkbox options
  isRequired: boolean("is_required").default(false),
  position: integer("position").default(0),
  isActive: boolean("is_active").default(true),
  categoryType: varchar("category_type").notNull().default("general"), // "general" or "equipment"
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Needs Assessment Responses
export const needsAssessmentResponses = pgTable("needs_assessment_responses", {
  id: serial("id").primaryKey(),
  responseNumber: varchar("response_number").notNull().unique(),
  clientCompanyName: varchar("client_company_name"),
  clientContactPerson: varchar("client_contact_person"),
  clientPhone: varchar("client_phone"),
  clientEmail: varchar("client_email"),
  clientAddress: text("client_address"),
  responses: jsonb("responses").notNull(), // { questionId: answer }
  attachments: jsonb("attachments"), // [{ url, name, type, size }]
  userId: varchar("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Transport Vehicles
export const transportVehicles = pgTable("transport_vehicles", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(), // e.g., "Samochód osobowy", "Ciężarówka SOLO"
  description: text("description"),
  costPerKm: decimal("cost_per_km", { precision: 8, scale: 2 }).notNull(), // koszt za kilometr
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Transport Quotes
export const transportQuotes = pgTable("transport_quotes", {
  id: serial("id").primaryKey(),
  quoteNumber: varchar("quote_number").notNull().unique(),
  clientId: integer("client_id").references(() => clients.id),
  clientName: varchar("client_name"),
  vehicleId: integer("vehicle_id").references(() => transportVehicles.id).notNull(),
  fromAddress: text("from_address").notNull(),
  toAddress: text("to_address").notNull(),
  distance: decimal("distance", { precision: 8, scale: 2 }).notNull(), // dystans w kilometrach
  totalCost: decimal("total_cost", { precision: 10, scale: 2 }).notNull(),
  notes: text("notes"),
  userId: varchar("user_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Electrical Equipment Categories
export const electricalEquipmentCategories = pgTable("electrical_equipment_categories", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Electrical Equipment items
export const electricalEquipment = pgTable("electrical_equipment", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  categoryId: integer("category_id").references(() => electricalEquipmentCategories.id).notNull(),
  description: text("description"),
  model: varchar("model"),
  power: varchar("power"), // e.g., "90.18 kW", "235 kW"
  // Additional technical specifications for electrical equipment
  fuelConsumption75: decimal("fuel_consumption_75", { precision: 6, scale: 2 }), // l/h at 75% load
  dimensions: varchar("dimensions"), // LxWxH in mm
  weight: varchar("weight"), // in kg
  engine: varchar("engine"), // engine manufacturer/model
  alternator: varchar("alternator"), // alternator info
  fuelTankCapacity: integer("fuel_tank_capacity"), // liters
  imageUrl: varchar("image_url"), // equipment image URL

  quantity: integer("quantity").notNull().default(0),
  availableQuantity: integer("available_quantity").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Pricing tiers for different rental periods - electrical equipment
export const electricalEquipmentPricing = pgTable("electrical_equipment_pricing", {
  id: serial("id").primaryKey(),
  equipmentId: integer("equipment_id").references(() => electricalEquipment.id).notNull(),
  periodStart: integer("period_start").notNull(), // days
  periodEnd: integer("period_end"), // days, null for 30+
  pricePerDay: decimal("price_per_day", { precision: 10, scale: 2 }).notNull(),
  discountPercent: decimal("discount_percent", { precision: 5, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Electrical Equipment additional equipment and accessories
export const electricalEquipmentAdditional = pgTable("electrical_equipment_additional", {
  id: serial("id").primaryKey(),
  equipmentId: integer("equipment_id").references(() => electricalEquipment.id).notNull(),
  type: varchar("type").notNull(), // "additional" or "accessories"
  position: integer("position").notNull().default(0), // ordering position
  name: varchar("name").notNull(),
  description: text("description"),
  pricePerDay: decimal("price_per_day", { precision: 10, scale: 2 }).notNull().default("0"),
  isOptional: boolean("is_optional").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Electrical Quotes
export const electricalQuotes = pgTable("electrical_quotes", {
  id: serial("id").primaryKey(),
  quoteNumber: varchar("quote_number").notNull().unique(),
  clientId: integer("client_id").references(() => clients.id).notNull(),
  createdById: varchar("created_by_id").references(() => users.id),
  isGuestQuote: boolean("is_guest_quote").default(false).notNull(),
  guestEmail: varchar("guest_email"),
  pricingSchemaId: integer("pricing_schema_id").references(() => pricingSchemas.id),
  status: varchar("status").notNull().default("draft"), // draft, pending, approved, rejected
  totalNet: decimal("total_net", { precision: 12, scale: 2 }).notNull(),
  vatRate: decimal("vat_rate", { precision: 5, scale: 2 }).notNull().default("23"),
  totalGross: decimal("total_gross", { precision: 12, scale: 2 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Electrical Quote items
export const electricalQuoteItems = pgTable("electrical_quote_items", {
  id: serial("id").primaryKey(),
  quoteId: integer("quote_id").references(() => electricalQuotes.id).notNull(),
  equipmentId: integer("equipment_id").references(() => electricalEquipment.id).notNull(),
  quantity: integer("quantity").notNull(),
  rentalPeriodDays: integer("rental_period_days").notNull(),
  pricePerDay: decimal("price_per_day", { precision: 10, scale: 2 }).notNull(),
  discountPercent: decimal("discount_percent", { precision: 5, scale: 2 }).notNull().default("0"),
  totalPrice: decimal("total_price", { precision: 12, scale: 2 }).notNull(),
  // Fuel cost fields for generators (motohours-based)
  fuelConsumptionLH: decimal("fuel_consumption_lh", { precision: 5, scale: 2 }), // liters per hour
  fuelPricePerLiter: decimal("fuel_price_per_liter", { precision: 6, scale: 2 }), // PLN per liter
  hoursPerDay: integer("hours_per_day").default(8), // operating hours per day
  totalFuelCost: decimal("total_fuel_cost", { precision: 12, scale: 2 }).default("0"),
  includeFuelCost: boolean("include_fuel_cost").default(false),
  // Fuel cost fields for vehicles (kilometers-based)
  fuelConsumptionPer100km: decimal("fuel_consumption_per_100km", { precision: 5, scale: 2 }), // liters per 100km for vehicles
  kilometersPerDay: integer("kilometers_per_day"), // kilometers driven per day
  // Maintenance/exploitation cost fields for generators (every 500 mth)
  includeMaintenanceCost: boolean("include_maintenance_cost").default(false),
  maintenanceIntervalHours: integer("maintenance_interval_hours").default(500), // every 500 mth for generators
  maintenanceIntervalKm: integer("maintenance_interval_km"), // service interval in kilometers for vehicles
  calculationType: varchar("calculation_type").default("motohours"), // 'motohours' or 'kilometers'
  // Filter costs (6 filters)
  fuelFilter1Cost: decimal("fuel_filter_1_cost", { precision: 8, scale: 2 }).default("49.00"),
  fuelFilter2Cost: decimal("fuel_filter_2_cost", { precision: 8, scale: 2 }).default("118.00"),
  oilFilterCost: decimal("oil_filter_cost", { precision: 8, scale: 2 }).default("45.00"),
  airFilter1Cost: decimal("air_filter_1_cost", { precision: 8, scale: 2 }).default("105.00"),
  airFilter2Cost: decimal("air_filter_2_cost", { precision: 8, scale: 2 }).default("54.00"),
  engineFilterCost: decimal("engine_filter_costs", { precision: 8, scale: 2 }).default("150.00"),
  // Oil cost
  oilCost: decimal("oil_cost", { precision: 8, scale: 2 }).default("162.44"),
  oilQuantityLiters: decimal("oil_quantity_liters", { precision: 5, scale: 1 }).default("14.7"),
  // Service work cost
  serviceWorkHours: decimal("service_work_hours", { precision: 4, scale: 1 }).default("2"),
  serviceWorkRatePerHour: decimal("service_work_rate_per_hour", { precision: 8, scale: 2 }).default("100.00"),
  // Service travel cost
  serviceTravelDistanceKm: decimal("service_travel_distance_km", { precision: 8, scale: 2 }).default("31"),
  serviceTravelRatePerKm: decimal("service_travel_rate_per_km", { precision: 6, scale: 2 }).default("1.15"),
  // Total maintenance cost for the rental period
  totalMaintenanceCost: decimal("total_maintenance_cost", { precision: 12, scale: 2 }).default("0"),
  expectedMaintenanceHours: integer("expected_maintenance_hours"), // expected operating hours for the rental period
  // Installation cost fields
  includeInstallationCost: boolean("include_installation_cost").default(false),
  installationDistanceKm: decimal("installation_distance_km", { precision: 8, scale: 2 }),
  numberOfTechnicians: integer("number_of_technicians").default(1),
  serviceRatePerTechnician: decimal("service_rate_per_technician", { precision: 8, scale: 2 }).default("150"),
  travelRatePerKm: decimal("travel_rate_per_km", { precision: 6, scale: 2 }).default("1.15"),
  totalInstallationCost: decimal("total_installation_cost", { precision: 10, scale: 2 }).default("0"),
  
  // Disassembly cost fields
  includeDisassemblyCost: boolean("include_disassembly_cost").default(false),
  disassemblyDistanceKm: decimal("disassembly_distance_km", { precision: 8, scale: 2 }),
  disassemblyNumberOfTechnicians: integer("disassembly_number_of_technicians").default(1),
  disassemblyServiceRatePerTechnician: decimal("disassembly_service_rate_per_technician", { precision: 8, scale: 2 }).default("150"),
  disassemblyTravelRatePerKm: decimal("disassembly_travel_rate_per_km", { precision: 6, scale: 2 }).default("1.15"),
  totalDisassemblyCost: decimal("total_disassembly_cost", { precision: 10, scale: 2 }).default("0"),
  
  // Travel/Service cost fields
  includeTravelServiceCost: boolean("include_travel_service_cost").default(false),
  travelServiceDistanceKm: decimal("travel_service_distance_km", { precision: 8, scale: 2 }),
  travelServiceNumberOfTechnicians: integer("travel_service_number_of_technicians").default(1),
  travelServiceServiceRatePerTechnician: decimal("travel_service_service_rate_per_technician", { precision: 8, scale: 2 }).default("150"),
  travelServiceTravelRatePerKm: decimal("travel_service_travel_rate_per_km", { precision: 6, scale: 2 }).default("1.15"),
  travelServiceNumberOfTrips: integer("travel_service_number_of_trips").default(1),
  totalTravelServiceCost: decimal("total_travel_service_cost", { precision: 10, scale: 2 }).default("0"),
  
  // Legacy travel cost fields (keeping for backward compatibility)
  includeTravelCost: boolean("include_travel_cost").default(false),
  travelDistanceKm: decimal("travel_distance_km", { precision: 8, scale: 2 }),
  hourlyRatePerTechnician: decimal("hourly_rate_per_technician", { precision: 8, scale: 2 }).default("150"),
  totalTravelCost: decimal("total_travel_cost", { precision: 10, scale: 2 }).default("0"),
  // Service items for heaters
  includeServiceItems: boolean("include_service_items").default(false),
  serviceItem1Cost: decimal("service_item_1_cost", { precision: 8, scale: 2 }).default("0.00"),
  serviceItem2Cost: decimal("service_item_2_cost", { precision: 8, scale: 2 }).default("0.00"),
  serviceItem3Cost: decimal("service_item_3_cost", { precision: 8, scale: 2 }).default("0.00"),
  serviceItem4Cost: decimal("service_item_4_cost", { precision: 8, scale: 2 }).default("0.00"),
  totalServiceItemsCost: decimal("total_service_items_cost", { precision: 10, scale: 2 }).default("0.00"),
  // Additional equipment tracking
  additionalCost: decimal("additional_cost", { precision: 10, scale: 2 }).default("0.00"),
  accessoriesCost: decimal("accessories_cost", { precision: 10, scale: 2 }).default("0.00"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Service cost configuration for electrical equipment
export const electricalEquipmentServiceCosts = pgTable("electrical_equipment_service_costs", {
  id: serial("id").primaryKey(),
  equipmentId: integer("equipment_id").references(() => electricalEquipment.id).notNull().unique(),
  serviceIntervalMonths: integer("service_interval_months").default(12), // How often service is required for traditional equipment (months)
  serviceIntervalKm: integer("service_interval_km"), // Service interval in kilometers for vehicles
  serviceIntervalMotohours: integer("service_interval_motohours"), // Service interval in motohours for generators and lighting towers
  workerHours: decimal("worker_hours", { precision: 4, scale: 1 }).default("2.0").notNull(), // Fixed field name
  workerCostPerHour: decimal("worker_cost_per_hour", { precision: 8, scale: 2 }).default("100.00").notNull(), // Fixed field name
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Service items for electrical equipment (configurable by admin)
export const electricalEquipmentServiceItems = pgTable("electrical_equipment_service_items", {
  id: serial("id").primaryKey(),
  equipmentId: integer("equipment_id").references(() => electricalEquipment.id).notNull(),
  itemName: varchar("item_name").notNull(), // e.g., "Filtr paliwa 1", "Filtr oleju", "Wymiana oleju"
  itemCost: decimal("item_cost", { precision: 8, scale: 2 }).default("0.00").notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// General Equipment Categories
export const generalEquipmentCategories = pgTable("general_equipment_categories", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schema for general equipment categories
export const insertGeneralEquipmentCategorySchema = createInsertSchema(generalEquipmentCategories).omit({
  id: true,
  createdAt: true
});

export const selectGeneralEquipmentCategorySchema = createSelectSchema(generalEquipmentCategories);

// General Equipment items
export const generalEquipment = pgTable("general_equipment", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  categoryId: integer("category_id").references(() => generalEquipmentCategories.id).notNull(),
  description: text("description"),
  model: varchar("model"),
  power: varchar("power"), // e.g., "90.18 kW", "235 kW"
  // Additional technical specifications for general equipment
  fuelConsumption75: decimal("fuel_consumption_75", { precision: 6, scale: 2 }), // l/h at 75% load
  dimensions: varchar("dimensions"), // LxWxH in mm
  weight: varchar("weight"), // in kg
  engine: varchar("engine"), // engine manufacturer/model
  alternator: varchar("alternator"), // alternator info
  fuelTankCapacity: integer("fuel_tank_capacity"), // liters
  imageUrl: varchar("image_url"), // equipment image URL

  quantity: integer("quantity").notNull().default(0),
  availableQuantity: integer("available_quantity").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Pricing tiers for different rental periods - general equipment
export const generalEquipmentPricing = pgTable("general_equipment_pricing", {
  id: serial("id").primaryKey(),
  equipmentId: integer("equipment_id").references(() => generalEquipment.id).notNull(),
  periodStart: integer("period_start").notNull(), // days
  periodEnd: integer("period_end"), // days, null for 30+
  pricePerDay: decimal("price_per_day", { precision: 10, scale: 2 }).notNull(),
  discountPercent: decimal("discount_percent", { precision: 5, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at").defaultNow(),
});

// General Equipment additional equipment and accessories
export const generalEquipmentAdditional = pgTable("general_equipment_additional", {
  id: serial("id").primaryKey(),
  equipmentId: integer("equipment_id").references(() => generalEquipment.id).notNull(),
  type: varchar("type").notNull(), // "additional" or "accessories"
  position: integer("position").notNull().default(0), // ordering position
  name: varchar("name").notNull(),
  description: text("description"),
  pricePerDay: decimal("price_per_day", { precision: 10, scale: 2 }).notNull().default("0"),
  isOptional: boolean("is_optional").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// General Quotes
export const generalQuotes = pgTable("general_quotes", {
  id: serial("id").primaryKey(),
  quoteNumber: varchar("quote_number").notNull().unique(),
  clientId: integer("client_id").references(() => clients.id).notNull(),
  createdBy: varchar("created_by").references(() => users.id),
  status: varchar("status").notNull().default("draft"), // draft, pending, approved, rejected
  totalNet: decimal("total_net", { precision: 12, scale: 2 }).notNull(),
  totalGross: decimal("total_gross", { precision: 12, scale: 2 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// General Quote items
export const generalQuoteItems = pgTable("general_quote_items", {
  id: serial("id").primaryKey(),
  quoteId: integer("quote_id").references(() => generalQuotes.id).notNull(),
  equipmentId: integer("equipment_id").references(() => generalEquipment.id).notNull(),
  quantity: integer("quantity").notNull(),
  rentalPeriodDays: integer("rental_period_days").notNull(),
  pricePerDay: decimal("price_per_day", { precision: 10, scale: 2 }).notNull(),
  discountPercent: decimal("discount_percent", { precision: 5, scale: 2 }).notNull().default("0"),
  totalPrice: decimal("total_price", { precision: 12, scale: 2 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const equipmentRelations = relations(equipment, ({ one, many }) => ({
  category: one(equipmentCategories, {
    fields: [equipment.categoryId],
    references: [equipmentCategories.id],
  }),
  pricing: many(equipmentPricing),
  quoteItems: many(quoteItems),
  additionalEquipment: many(equipmentAdditional),
  serviceCosts: one(equipmentServiceCosts, {
    fields: [equipment.id],
    references: [equipmentServiceCosts.equipmentId],
  }),
  serviceItems: many(equipmentServiceItems),
}));

export const equipmentAdditionalRelations = relations(equipmentAdditional, ({ one }) => ({
  equipment: one(equipment, {
    fields: [equipmentAdditional.equipmentId],
    references: [equipment.id],
  }),
}));

export const equipmentCategoriesRelations = relations(equipmentCategories, ({ many }) => ({
  equipment: many(equipment),
}));

export const equipmentPricingRelations = relations(equipmentPricing, ({ one }) => ({
  equipment: one(equipment, {
    fields: [equipmentPricing.equipmentId],
    references: [equipment.id],
  }),
}));

export const clientsRelations = relations(clients, ({ many }) => ({
  quotes: many(quotes),
}));

export const pricingSchemasRelations = relations(pricingSchemas, ({ many }) => ({
  quotes: many(quotes),
}));



export const quotesRelations = relations(quotes, ({ one, many }) => ({
  client: one(clients, {
    fields: [quotes.clientId],
    references: [clients.id],
  }),
  createdBy: one(users, {
    fields: [quotes.createdById],
    references: [users.id],
  }),
  pricingSchema: one(pricingSchemas, {
    fields: [quotes.pricingSchemaId],
    references: [pricingSchemas.id],
  }),
  items: many(quoteItems),
}));

export const quoteItemsRelations = relations(quoteItems, ({ one }) => ({
  quote: one(quotes, {
    fields: [quoteItems.quoteId],
    references: [quotes.id],
  }),
  equipment: one(equipment, {
    fields: [quoteItems.equipmentId],
    references: [equipment.id],
  }),
}));

export const equipmentServiceCostsRelations = relations(equipmentServiceCosts, ({ one }) => ({
  equipment: one(equipment, {
    fields: [equipmentServiceCosts.equipmentId],
    references: [equipment.id],
  }),
}));

export const equipmentServiceItemsRelations = relations(equipmentServiceItems, ({ one }) => ({
  equipment: one(equipment, {
    fields: [equipmentServiceItems.equipmentId],
    references: [equipment.id],
  }),
}));

export const transportVehiclesRelations = relations(transportVehicles, ({ many }) => ({
  transportQuotes: many(transportQuotes),
}));

export const transportQuotesRelations = relations(transportQuotes, ({ one }) => ({
  client: one(clients, {
    fields: [transportQuotes.clientId],
    references: [clients.id],
  }),
  vehicle: one(transportVehicles, {
    fields: [transportQuotes.vehicleId],
    references: [transportVehicles.id],
  }),
  user: one(users, {
    fields: [transportQuotes.userId],
    references: [users.id],
  }),
}));

// Electrical Equipment Relations
export const electricalEquipmentRelations = relations(electricalEquipment, ({ one, many }) => ({
  category: one(electricalEquipmentCategories, {
    fields: [electricalEquipment.categoryId],
    references: [electricalEquipmentCategories.id],
  }),
  pricing: many(electricalEquipmentPricing),
  quoteItems: many(electricalQuoteItems),
  additionalEquipment: many(electricalEquipmentAdditional),
  serviceCosts: one(electricalEquipmentServiceCosts, {
    fields: [electricalEquipment.id],
    references: [electricalEquipmentServiceCosts.equipmentId],
  }),
  serviceItems: many(electricalEquipmentServiceItems),
}));

export const electricalEquipmentAdditionalRelations = relations(electricalEquipmentAdditional, ({ one }) => ({
  equipment: one(electricalEquipment, {
    fields: [electricalEquipmentAdditional.equipmentId],
    references: [electricalEquipment.id],
  }),
}));

export const electricalEquipmentCategoriesRelations = relations(electricalEquipmentCategories, ({ many }) => ({
  equipment: many(electricalEquipment),
}));

export const electricalEquipmentPricingRelations = relations(electricalEquipmentPricing, ({ one }) => ({
  equipment: one(electricalEquipment, {
    fields: [electricalEquipmentPricing.equipmentId],
    references: [electricalEquipment.id],
  }),
}));

export const electricalQuotesRelations = relations(electricalQuotes, ({ one, many }) => ({
  client: one(clients, {
    fields: [electricalQuotes.clientId],
    references: [clients.id],
  }),
  createdBy: one(users, {
    fields: [electricalQuotes.createdById],
    references: [users.id],
  }),
  pricingSchema: one(pricingSchemas, {
    fields: [electricalQuotes.pricingSchemaId],
    references: [pricingSchemas.id],
  }),
  items: many(electricalQuoteItems),
}));

export const electricalQuoteItemsRelations = relations(electricalQuoteItems, ({ one }) => ({
  quote: one(electricalQuotes, {
    fields: [electricalQuoteItems.quoteId],
    references: [electricalQuotes.id],
  }),
  equipment: one(electricalEquipment, {
    fields: [electricalQuoteItems.equipmentId],
    references: [electricalEquipment.id],
  }),
}));

export const electricalEquipmentServiceCostsRelations = relations(electricalEquipmentServiceCosts, ({ one }) => ({
  equipment: one(electricalEquipment, {
    fields: [electricalEquipmentServiceCosts.equipmentId],
    references: [electricalEquipment.id],
  }),
}));

export const electricalEquipmentServiceItemsRelations = relations(electricalEquipmentServiceItems, ({ one }) => ({
  equipment: one(electricalEquipment, {
    fields: [electricalEquipmentServiceItems.equipmentId],
    references: [electricalEquipment.id],
  }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  quotes: many(quotes),
  needsAssessmentResponses: many(needsAssessmentResponses),
}));

export const needsAssessmentResponsesRelations = relations(needsAssessmentResponses, ({ one }) => ({
  user: one(users, {
    fields: [needsAssessmentResponses.userId],
    references: [users.id],
  }),
}));

// Insert and select schemas
export const insertUserSchema = createInsertSchema(users);
export const insertEquipmentCategorySchema = createInsertSchema(equipmentCategories);
export const insertEquipmentSchema = createInsertSchema(equipment).extend({
  fuelConsumption75: z.union([z.string(), z.number()]).optional().transform((val) => {
    if (val === undefined || val === null || val === '') return undefined;
    return typeof val === 'number' ? val.toString() : val;
  }),
  fuelTankCapacity: z.union([z.string(), z.number()]).optional().transform((val) => {
    if (val === undefined || val === null || val === '') return undefined;
    return typeof val === 'number' ? val : parseInt(val?.toString() || '0') || undefined;
  }),
});
export const insertEquipmentPricingSchema = createInsertSchema(equipmentPricing);
export const insertClientSchema = createInsertSchema(clients);
export const insertQuoteSchema = createInsertSchema(quotes);
export const insertQuoteItemSchema = createInsertSchema(quoteItems);

export const insertEquipmentAdditionalSchema = createInsertSchema(equipmentAdditional);
export const insertPricingSchemaSchema = createInsertSchema(pricingSchemas);
export const insertEquipmentServiceCostsSchema = createInsertSchema(equipmentServiceCosts);
export const insertEquipmentServiceItemsSchema = createInsertSchema(equipmentServiceItems);
export const insertNeedsAssessmentQuestionSchema = createInsertSchema(needsAssessmentQuestions);
export const insertNeedsAssessmentResponseSchema = createInsertSchema(needsAssessmentResponses).omit({
  id: true,
  responseNumber: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTransportVehicleSchema = createInsertSchema(transportVehicles).extend({
  costPerKm: z.union([z.string(), z.number()]).transform((val) => String(val))
});
export const insertTransportQuoteSchema = createInsertSchema(transportQuotes).extend({
  distance: z.union([z.string(), z.number()]).transform((val) => String(val)),
  totalCost: z.union([z.string(), z.number()]).transform((val) => String(val))
});

export const selectUserSchema = createSelectSchema(users);
export const selectEquipmentCategorySchema = createSelectSchema(equipmentCategories);
export const selectEquipmentSchema = createSelectSchema(equipment);
export const selectEquipmentPricingSchema = createSelectSchema(equipmentPricing);
export const selectClientSchema = createSelectSchema(clients);
export const selectQuoteSchema = createSelectSchema(quotes);
export const selectQuoteItemSchema = createSelectSchema(quoteItems);

export const selectEquipmentAdditionalSchema = createSelectSchema(equipmentAdditional);
export const selectPricingSchemaSchema = createSelectSchema(pricingSchemas);
export const selectEquipmentServiceCostsSchema = createSelectSchema(equipmentServiceCosts);
export const selectEquipmentServiceItemsSchema = createSelectSchema(equipmentServiceItems);
export const selectNeedsAssessmentQuestionSchema = createSelectSchema(needsAssessmentQuestions);
export const selectNeedsAssessmentResponseSchema = createSelectSchema(needsAssessmentResponses);

export const selectTransportVehicleSchema = createSelectSchema(transportVehicles);
export const selectTransportQuoteSchema = createSelectSchema(transportQuotes);

// Electrical Equipment schemas
export const insertElectricalEquipmentCategorySchema = createInsertSchema(electricalEquipmentCategories);
export const insertElectricalEquipmentSchema = createInsertSchema(electricalEquipment).extend({
  fuelConsumption75: z.union([z.string(), z.number()]).optional().transform((val) => {
    if (val === undefined || val === null || val === '') return undefined;
    return typeof val === 'number' ? val.toString() : val;
  }),
  fuelTankCapacity: z.union([z.string(), z.number()]).optional().transform((val) => {
    if (val === undefined || val === null || val === '') return undefined;
    return typeof val === 'number' ? val : parseInt(val?.toString() || '0') || undefined;
  }),
});
export const insertElectricalEquipmentPricingSchema = createInsertSchema(electricalEquipmentPricing);
export const insertElectricalEquipmentAdditionalSchema = createInsertSchema(electricalEquipmentAdditional);
export const insertElectricalQuoteSchema = createInsertSchema(electricalQuotes);
export const insertElectricalQuoteItemSchema = createInsertSchema(electricalQuoteItems);
export const insertElectricalEquipmentServiceCostsSchema = createInsertSchema(electricalEquipmentServiceCosts);
export const insertElectricalEquipmentServiceItemsSchema = createInsertSchema(electricalEquipmentServiceItems);

export const selectElectricalEquipmentCategorySchema = createSelectSchema(electricalEquipmentCategories);
export const selectElectricalEquipmentSchema = createSelectSchema(electricalEquipment);
export const selectElectricalEquipmentPricingSchema = createSelectSchema(electricalEquipmentPricing);
export const selectElectricalEquipmentAdditionalSchema = createSelectSchema(electricalEquipmentAdditional);
export const selectElectricalQuoteSchema = createSelectSchema(electricalQuotes);
export const selectElectricalQuoteItemSchema = createSelectSchema(electricalQuoteItems);
export const selectElectricalEquipmentServiceCostsSchema = createSelectSchema(electricalEquipmentServiceCosts);
export const selectElectricalEquipmentServiceItemsSchema = createSelectSchema(electricalEquipmentServiceItems);

// General Equipment schemas
export const insertGeneralEquipmentSchema = createInsertSchema(generalEquipment).extend({
  fuelConsumption75: z.union([z.string(), z.number()]).optional().transform((val) => {
    if (val === undefined || val === null || val === '') return undefined;
    return typeof val === 'number' ? val.toString() : val;
  }),
  fuelTankCapacity: z.union([z.string(), z.number()]).optional().transform((val) => {
    if (val === undefined || val === null || val === '') return undefined;
    return typeof val === 'number' ? val : parseInt(val?.toString() || '0') || undefined;
  }),
  quantity: z.union([z.string(), z.number()]).transform((val) => {
    return typeof val === 'number' ? val : parseInt(val?.toString() || '0') || 0;
  }),
  availableQuantity: z.union([z.string(), z.number()]).transform((val) => {
    return typeof val === 'number' ? val : parseInt(val?.toString() || '0') || 0;
  }),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const selectGeneralEquipmentSchema = createSelectSchema(generalEquipment);

export const insertGeneralEquipmentPricingSchema = createInsertSchema(generalEquipmentPricing).omit({
  id: true,
  createdAt: true
});

export const selectGeneralEquipmentPricingSchema = createSelectSchema(generalEquipmentPricing);

export const insertGeneralEquipmentAdditionalSchema = createInsertSchema(generalEquipmentAdditional).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const selectGeneralEquipmentAdditionalSchema = createSelectSchema(generalEquipmentAdditional);


// Types
export type UpsertUser = z.infer<typeof insertUserSchema>;
export type User = z.infer<typeof selectUserSchema>;
export type InsertEquipmentCategory = z.infer<typeof insertEquipmentCategorySchema>;
export type EquipmentCategory = z.infer<typeof selectEquipmentCategorySchema>;
export type InsertEquipment = z.infer<typeof insertEquipmentSchema>;
export type Equipment = z.infer<typeof selectEquipmentSchema>;
export type InsertEquipmentPricing = z.infer<typeof insertEquipmentPricingSchema>;
export type EquipmentPricing = z.infer<typeof selectEquipmentPricingSchema>;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = z.infer<typeof selectClientSchema>;
export type InsertQuote = z.infer<typeof insertQuoteSchema>;
export type Quote = z.infer<typeof selectQuoteSchema>;
export type InsertQuoteItem = z.infer<typeof insertQuoteItemSchema>;
export type QuoteItem = z.infer<typeof selectQuoteItemSchema>;

export type InsertEquipmentAdditional = z.infer<typeof insertEquipmentAdditionalSchema>;
export type EquipmentAdditional = z.infer<typeof selectEquipmentAdditionalSchema>;
export type InsertPricingSchema = z.infer<typeof insertPricingSchemaSchema>;
export type PricingSchema = typeof pricingSchemas.$inferSelect;

export type InsertEquipmentServiceCosts = z.infer<typeof insertEquipmentServiceCostsSchema>;
export type EquipmentServiceCosts = z.infer<typeof selectEquipmentServiceCostsSchema>;
export type InsertEquipmentServiceItems = z.infer<typeof insertEquipmentServiceItemsSchema>;
export type EquipmentServiceItems = z.infer<typeof selectEquipmentServiceItemsSchema>;
export type InsertNeedsAssessmentQuestion = z.infer<typeof insertNeedsAssessmentQuestionSchema>;
export type NeedsAssessmentQuestion = z.infer<typeof selectNeedsAssessmentQuestionSchema>;
export type InsertNeedsAssessmentResponse = z.infer<typeof insertNeedsAssessmentResponseSchema>;
export type NeedsAssessmentResponse = z.infer<typeof selectNeedsAssessmentResponseSchema>;

export type InsertTransportVehicle = z.infer<typeof insertTransportVehicleSchema>;
export type TransportVehicle = z.infer<typeof selectTransportVehicleSchema>;
export type InsertTransportQuote = z.infer<typeof insertTransportQuoteSchema>;
export type TransportQuote = z.infer<typeof selectTransportQuoteSchema>;

// Electrical Equipment Types
export type InsertElectricalEquipmentCategory = z.infer<typeof insertElectricalEquipmentCategorySchema>;
export type ElectricalEquipmentCategory = z.infer<typeof selectElectricalEquipmentCategorySchema>;
export type InsertElectricalEquipment = z.infer<typeof insertElectricalEquipmentSchema>;
export type ElectricalEquipment = z.infer<typeof selectElectricalEquipmentSchema>;
export type InsertElectricalEquipmentPricing = z.infer<typeof insertElectricalEquipmentPricingSchema>;
export type ElectricalEquipmentPricing = z.infer<typeof selectElectricalEquipmentPricingSchema>;
export type InsertElectricalEquipmentAdditional = z.infer<typeof insertElectricalEquipmentAdditionalSchema>;
export type ElectricalEquipmentAdditional = z.infer<typeof selectElectricalEquipmentAdditionalSchema>;
export type InsertElectricalQuote = z.infer<typeof insertElectricalQuoteSchema>;
export type ElectricalQuote = z.infer<typeof selectElectricalQuoteSchema>;
export type InsertElectricalQuoteItem = z.infer<typeof insertElectricalQuoteItemSchema>;
export type ElectricalQuoteItem = z.infer<typeof selectElectricalQuoteItemSchema>;
export type InsertElectricalEquipmentServiceCosts = z.infer<typeof insertElectricalEquipmentServiceCostsSchema>;
export type ElectricalEquipmentServiceCosts = z.infer<typeof selectElectricalEquipmentServiceCostsSchema>;
export type InsertElectricalEquipmentServiceItems = z.infer<typeof insertElectricalEquipmentServiceItemsSchema>;
export type ElectricalEquipmentServiceItems = z.infer<typeof selectElectricalEquipmentServiceItemsSchema>;

// General Equipment Types
export type InsertGeneralEquipmentCategory = z.infer<typeof insertGeneralEquipmentCategorySchema>;
export type GeneralEquipmentCategory = z.infer<typeof selectGeneralEquipmentCategorySchema>;
export type InsertGeneralEquipment = z.infer<typeof insertGeneralEquipmentSchema>;
export type GeneralEquipment = z.infer<typeof selectGeneralEquipmentSchema>;
export type InsertGeneralEquipmentPricing = z.infer<typeof insertGeneralEquipmentPricingSchema>;
export type GeneralEquipmentPricing = z.infer<typeof selectGeneralEquipmentPricingSchema>;
export type InsertGeneralEquipmentAdditional = z.infer<typeof insertGeneralEquipmentAdditionalSchema>;
export type GeneralEquipmentAdditional = z.infer<typeof selectGeneralEquipmentAdditionalSchema>;

// Public Equipment Types
export type InsertPublicEquipmentCategory = z.infer<typeof publicEquipmentCategoriesInsertSchema>;
export type PublicEquipmentCategory = z.infer<typeof publicEquipmentCategoriesSelectSchema>;
export type InsertPublicEquipment = z.infer<typeof publicEquipmentInsertSchema>;
export type PublicEquipment = z.infer<typeof publicEquipmentSelectSchema>;
export type InsertPublicEquipmentPricing = z.infer<typeof publicEquipmentPricingInsertSchema>;
export type PublicEquipmentPricing = z.infer<typeof publicEquipmentPricingSelectSchema>;
export type InsertPublicEquipmentAdditional = z.infer<typeof publicEquipmentAdditionalInsertSchema>;
export type PublicEquipmentAdditional = z.infer<typeof publicEquipmentAdditionalSelectSchema>;
export type InsertPublicQuote = z.infer<typeof publicQuotesInsertSchema>;
export type PublicQuote = z.infer<typeof publicQuotesSelectSchema>;
export type InsertPublicQuoteItem = z.infer<typeof publicQuoteItemsInsertSchema>;
export type PublicQuoteItem = z.infer<typeof publicQuoteItemsSelectSchema>;
export type InsertPublicEquipmentServiceCosts = z.infer<typeof publicEquipmentServiceCostsInsertSchema>;
export type PublicEquipmentServiceCosts = z.infer<typeof publicEquipmentServiceCostsSelectSchema>;
export type InsertPublicEquipmentServiceItems = z.infer<typeof publicEquipmentServiceItemsInsertSchema>;
export type PublicEquipmentServiceItems = z.infer<typeof publicEquipmentServiceItemsSelectSchema>;

// ===============================================
// SHOP TABLES
// ===============================================

// Shop product categories
export const shopCategories = pgTable("shop_categories", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull().unique(),
  description: text("description"),
  icon: varchar("icon").default("Package"), // Icon name from Lucide icons
  createdAt: timestamp("created_at").defaultNow(),
});

// Shop products
export const shopProducts = pgTable("shop_products", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  categoryId: integer("category_id").references(() => shopCategories.id).notNull(),
  description: text("description"),
  model: varchar("model"),
  specifications: text("specifications"), // Technical specifications
  imageUrl: varchar("image_url"), // Primary/thumbnail image URL
  image1Url: varchar("image1_url"), // Additional image 1
  image2Url: varchar("image2_url"), // Additional image 2
  image3Url: varchar("image3_url"), // Additional image 3
  image4Url: varchar("image4_url"), // Additional image 4
  price: decimal("price", { precision: 10, scale: 2 }).notNull(), // Sale price
  quantity: integer("quantity").notNull().default(0),
  phone: varchar("phone").default(""), // Contact phone number for this product
  condition: varchar("condition").notNull().default("new"), // "new" or "used"
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Shop relations
export const shopCategoriesRelations = relations(shopCategories, ({ many }) => ({
  products: many(shopProducts),
}));

export const shopProductsRelations = relations(shopProducts, ({ one }) => ({
  category: one(shopCategories, {
    fields: [shopProducts.categoryId],
    references: [shopCategories.id],
  }),
}));

// Shop settings for default phone numbers
export const shopSettings = pgTable("shop_settings", {
  id: serial("id").primaryKey(),
  key: varchar("key").notNull().unique(),
  value: text("value"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Shop schemas
export const insertShopCategorySchema = createInsertSchema(shopCategories).omit({
  id: true,
  createdAt: true,
});

export const selectShopCategorySchema = createSelectSchema(shopCategories);

export const insertShopProductSchema = createInsertSchema(shopProducts).extend({
  price: z.union([z.string(), z.number()]).transform((val) => String(val)),
  quantity: z.union([z.string(), z.number()]).transform((val) => {
    return typeof val === 'number' ? val : parseInt(val?.toString() || '0') || 0;
  }),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const selectShopProductSchema = createSelectSchema(shopProducts);

export const insertShopSettingsSchema = createInsertSchema(shopSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const selectShopSettingsSchema = createSelectSchema(shopSettings);

// Shop types
export type InsertShopCategory = z.infer<typeof insertShopCategorySchema>;
export type ShopCategory = z.infer<typeof selectShopCategorySchema>;
export type InsertShopProduct = z.infer<typeof insertShopProductSchema>;
export type ShopProduct = z.infer<typeof selectShopProductSchema>;
export type InsertShopSettings = z.infer<typeof insertShopSettingsSchema>;
export type ShopSettings = z.infer<typeof selectShopSettingsSchema>;

// ===============================================
// PUBLIC RENTAL DEPARTMENT TABLES
// ===============================================

// Public equipment categories
export const publicEquipmentCategories = pgTable("public_equipment_categories", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Public equipment items
export const publicEquipment = pgTable("public_equipment", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  categoryId: integer("category_id").references(() => publicEquipmentCategories.id).notNull(),
  description: text("description"),
  model: varchar("model"),
  power: varchar("power"), // e.g., "90.18 kW", "235 kW"
  // Additional technical specifications for generators
  fuelConsumption75: decimal("fuel_consumption_75", { precision: 6, scale: 2 }), // l/h at 75% load
  dimensions: varchar("dimensions"), // LxWxH in mm
  weight: varchar("weight"), // in kg
  engine: varchar("engine"), // engine manufacturer/model
  alternator: varchar("alternator"), // alternator info
  fuelTankCapacity: integer("fuel_tank_capacity"), // liters
  imageUrl: varchar("image_url"), // equipment image URL

  quantity: integer("quantity").notNull().default(0),
  availableQuantity: integer("available_quantity").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Pricing tiers for different rental periods - Public
export const publicEquipmentPricing = pgTable("public_equipment_pricing", {
  id: serial("id").primaryKey(),
  equipmentId: integer("equipment_id").references(() => publicEquipment.id).notNull(),
  periodStart: integer("period_start").notNull(), // days
  periodEnd: integer("period_end"), // days, null for 30+
  pricePerDay: decimal("price_per_day", { precision: 10, scale: 2 }).notNull(),
  discountPercent: decimal("discount_percent", { precision: 5, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Public equipment additional equipment and accessories
export const publicEquipmentAdditional = pgTable("public_equipment_additional", {
  id: serial("id").primaryKey(),
  equipmentId: integer("equipment_id").references(() => publicEquipment.id).notNull(),
  type: varchar("type").notNull(), // "additional" or "accessories"
  name: varchar("name").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  position: integer("position").notNull().default(1), // 1-4 for ordering
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Public quotes
export const publicQuotes = pgTable("public_quotes", {
  id: serial("id").primaryKey(),
  quoteNumber: varchar("quote_number").notNull().unique(),
  clientId: integer("client_id").references(() => clients.id).notNull(),
  createdById: varchar("created_by_id").references(() => users.id),
  isGuestQuote: boolean("is_guest_quote").default(false).notNull(),
  guestEmail: varchar("guest_email"),
  pricingSchemaId: integer("pricing_schema_id").references(() => pricingSchemas.id),
  status: varchar("status").notNull().default("draft"), // draft, pending, approved, rejected
  totalNet: decimal("total_net", { precision: 12, scale: 2 }).notNull(),
  vatRate: decimal("vat_rate", { precision: 5, scale: 2 }).notNull().default("23"),
  totalGross: decimal("total_gross", { precision: 12, scale: 2 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Public quote items
export const publicQuoteItems = pgTable("public_quote_items", {
  id: serial("id").primaryKey(),
  quoteId: integer("quote_id").references(() => publicQuotes.id).notNull(),
  equipmentId: integer("equipment_id").references(() => publicEquipment.id).notNull(),
  quantity: integer("quantity").notNull(),
  rentalPeriodDays: integer("rental_period_days").notNull(),
  pricePerDay: decimal("price_per_day", { precision: 10, scale: 2 }).notNull(),
  discountPercent: decimal("discount_percent", { precision: 5, scale: 2 }).notNull().default("0"),
  totalPrice: decimal("total_price", { precision: 12, scale: 2 }).notNull(),
  // Fuel cost fields for generators (motohours-based)
  fuelConsumptionLH: decimal("fuel_consumption_lh", { precision: 5, scale: 2 }), // liters per hour
  fuelPricePerLiter: decimal("fuel_price_per_liter", { precision: 6, scale: 2 }), // PLN per liter
  hoursPerDay: integer("hours_per_day").default(8), // operating hours per day
  totalFuelCost: decimal("total_fuel_cost", { precision: 12, scale: 2 }).default("0"),
  includeFuelCost: boolean("include_fuel_cost").default(false),
  // Fuel cost fields for vehicles (kilometers-based)
  fuelConsumptionPer100km: decimal("fuel_consumption_per_100km", { precision: 5, scale: 2 }), // liters per 100km for vehicles
  kilometersPerDay: integer("kilometers_per_day"), // kilometers driven per day
  // Maintenance/exploitation cost fields for generators (every 500 mth)
  includeMaintenanceCost: boolean("include_maintenance_cost").default(false),
  maintenanceIntervalHours: integer("maintenance_interval_hours").default(500), // every 500 mth for generators
  maintenanceIntervalKm: integer("maintenance_interval_km"), // service interval in kilometers for vehicles
  calculationType: varchar("calculation_type").default("motohours"), // 'motohours' or 'kilometers'
  // Filter costs (6 filters)
  fuelFilter1Cost: decimal("fuel_filter_1_cost", { precision: 8, scale: 2 }).default("49.00"),
  fuelFilter2Cost: decimal("fuel_filter_2_cost", { precision: 8, scale: 2 }).default("118.00"),
  oilFilterCost: decimal("oil_filter_cost", { precision: 8, scale: 2 }).default("45.00"),
  airFilter1Cost: decimal("air_filter_1_cost", { precision: 8, scale: 2 }).default("105.00"),
  airFilter2Cost: decimal("air_filter_2_cost", { precision: 8, scale: 2 }).default("54.00"),
  engineFilterCost: decimal("engine_filter_cost", { precision: 8, scale: 2 }).default("150.00"),
  // Oil cost
  oilCost: decimal("oil_cost", { precision: 8, scale: 2 }).default("162.44"),
  oilQuantityLiters: decimal("oil_quantity_liters", { precision: 5, scale: 1 }).default("14.7"),
  // Service work cost
  serviceWorkHours: decimal("service_work_hours", { precision: 4, scale: 1 }).default("2"),
  serviceWorkRate: decimal("service_work_rate", { precision: 8, scale: 2 }).default("60"),
  serviceKmRate: decimal("service_km_rate", { precision: 8, scale: 2 }).default("5"),
  totalMaintenanceCost: decimal("total_maintenance_cost", { precision: 12, scale: 2 }).default("0"),
  // Installation cost fields
  includeInstallationCost: boolean("include_installation_cost").default(false),
  installationDistanceKm: integer("installation_distance_km").default(0), // distance to installation site (round trip)
  totalInstallationCost: decimal("total_installation_cost", { precision: 12, scale: 2 }).default("0"),
  // Disassembly cost fields
  includeDisassemblyCost: boolean("include_disassembly_cost").default(false),
  disassemblyDistanceKm: integer("disassembly_distance_km").default(0), // distance for disassembly (round trip)
  totalDisassemblyCost: decimal("total_disassembly_cost", { precision: 12, scale: 2 }).default("0"),
  // Travel cost fields
  includeTravelCost: boolean("include_travel_cost").default(false),
  travelDistanceKm: integer("travel_distance_km").default(0), // travel distance (round trip)
  travelCostPerKm: decimal("travel_cost_per_km", { precision: 6, scale: 2 }).default("5.00"), // PLN per km
  totalTravelCost: decimal("total_travel_cost", { precision: 12, scale: 2 }).default("0"),
  // Additional equipment tracking
  additionalCost: decimal("additional_cost", { precision: 10, scale: 2 }).default("0.00"),
  accessoriesCost: decimal("accessories_cost", { precision: 10, scale: 2 }).default("0.00"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Public equipment service costs
export const publicEquipmentServiceCosts = pgTable("public_equipment_service_costs", {
  id: serial("id").primaryKey(),
  equipmentId: integer("equipment_id").references(() => publicEquipment.id).notNull(),
  serviceIntervalMonths: integer("service_interval_months").notNull().default(6),
  serviceIntervalKm: integer("service_interval_km"), // for vehicles
  serviceIntervalMotohours: integer("service_interval_motohours"), // for generators
  workerHours: decimal("worker_hours", { precision: 4, scale: 1 }).notNull().default("2"),
  workerCostPerHour: decimal("worker_cost_per_hour", { precision: 8, scale: 2 }).notNull().default("100"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Public equipment service items (parts, filters, etc.)
export const publicEquipmentServiceItems = pgTable("public_equipment_service_items", {
  id: serial("id").primaryKey(),
  equipmentId: integer("equipment_id").references(() => publicEquipment.id).notNull(),
  itemName: varchar("item_name").notNull(),
  itemCost: decimal("item_cost", { precision: 8, scale: 2 }).notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations for public equipment
export const publicEquipmentCategoriesRelations = relations(publicEquipmentCategories, ({ many }) => ({
  equipment: many(publicEquipment),
}));

export const publicEquipmentRelations = relations(publicEquipment, ({ one, many }) => ({
  category: one(publicEquipmentCategories, {
    fields: [publicEquipment.categoryId],
    references: [publicEquipmentCategories.id],
  }),
  pricing: many(publicEquipmentPricing),
  additionalEquipment: many(publicEquipmentAdditional),
  quoteItems: many(publicQuoteItems),
  serviceCosts: one(publicEquipmentServiceCosts, {
    fields: [publicEquipment.id],
    references: [publicEquipmentServiceCosts.equipmentId],
  }),
  serviceItems: many(publicEquipmentServiceItems),
}));

export const publicEquipmentPricingRelations = relations(publicEquipmentPricing, ({ one }) => ({
  equipment: one(publicEquipment, {
    fields: [publicEquipmentPricing.equipmentId],
    references: [publicEquipment.id],
  }),
}));

export const publicEquipmentAdditionalRelations = relations(publicEquipmentAdditional, ({ one }) => ({
  equipment: one(publicEquipment, {
    fields: [publicEquipmentAdditional.equipmentId],
    references: [publicEquipment.id],
  }),
}));

export const publicQuotesRelations = relations(publicQuotes, ({ one, many }) => ({
  client: one(clients, {
    fields: [publicQuotes.clientId],
    references: [clients.id],
  }),
  createdBy: one(users, {
    fields: [publicQuotes.createdById],
    references: [users.id],
  }),
  pricingSchema: one(pricingSchemas, {
    fields: [publicQuotes.pricingSchemaId],
    references: [pricingSchemas.id],
  }),
  items: many(publicQuoteItems),
}));

export const publicQuoteItemsRelations = relations(publicQuoteItems, ({ one }) => ({
  quote: one(publicQuotes, {
    fields: [publicQuoteItems.quoteId],
    references: [publicQuotes.id],
  }),
  equipment: one(publicEquipment, {
    fields: [publicQuoteItems.equipmentId],
    references: [publicEquipment.id],
  }),
}));

export const publicEquipmentServiceCostsRelations = relations(publicEquipmentServiceCosts, ({ one }) => ({
  equipment: one(publicEquipment, {
    fields: [publicEquipmentServiceCosts.equipmentId],
    references: [publicEquipment.id],
  }),
}));

export const publicEquipmentServiceItemsRelations = relations(publicEquipmentServiceItems, ({ one }) => ({
  equipment: one(publicEquipment, {
    fields: [publicEquipmentServiceItems.equipmentId],
    references: [publicEquipment.id],
  }),
}));

// Insert and select schemas for public equipment
export const publicEquipmentCategoriesInsertSchema = createInsertSchema(publicEquipmentCategories);
export const publicEquipmentCategoriesSelectSchema = createSelectSchema(publicEquipmentCategories);

export const publicEquipmentInsertSchema = createInsertSchema(publicEquipment);
export const publicEquipmentSelectSchema = createSelectSchema(publicEquipment);

export const publicEquipmentPricingInsertSchema = createInsertSchema(publicEquipmentPricing);
export const publicEquipmentPricingSelectSchema = createSelectSchema(publicEquipmentPricing);

export const publicEquipmentAdditionalInsertSchema = createInsertSchema(publicEquipmentAdditional);
export const publicEquipmentAdditionalSelectSchema = createSelectSchema(publicEquipmentAdditional);

export const publicQuotesInsertSchema = createInsertSchema(publicQuotes);
export const publicQuotesSelectSchema = createSelectSchema(publicQuotes);

export const publicQuoteItemsInsertSchema = createInsertSchema(publicQuoteItems);
export const publicQuoteItemsSelectSchema = createSelectSchema(publicQuoteItems);

export const publicEquipmentServiceCostsInsertSchema = createInsertSchema(publicEquipmentServiceCosts);
export const publicEquipmentServiceCostsSelectSchema = createSelectSchema(publicEquipmentServiceCosts);

export const publicEquipmentServiceItemsInsertSchema = createInsertSchema(publicEquipmentServiceItems);
export const publicEquipmentServiceItemsSelectSchema = createSelectSchema(publicEquipmentServiceItems);

// API Keys schema
export const insertApiKeySchema = createInsertSchema(apiKeys, {
  permissions: z.array(z.string()),
}).omit({
  id: true,
  createdAt: true,
  lastUsedAt: true,
});

export type InsertApiKey = z.infer<typeof insertApiKeySchema>;
export type SelectApiKey = typeof apiKeys.$inferSelect;

// Public API schemas for external usage
export const publicQuoteSchema = z.object({
  clientCompanyName: z.string().min(1, "Nazwa firmy jest wymagana"),
  clientContactPerson: z.string().optional(),
  clientPhone: z.string().optional(),
  clientEmail: z.string().email().optional(),
  clientAddress: z.string().optional(),
  equipment: z.array(z.object({
    equipmentId: z.number(),
    quantity: z.number().min(1),
    rentalPeriod: z.number().min(1),
  })),
  additionalEquipment: z.array(z.object({
    equipmentId: z.number(),
    additionalId: z.number(),
    quantity: z.number().min(1),
  })).optional(),
});

export const publicAssessmentSchema = z.object({
  clientCompanyName: z.string().min(1, "Nazwa firmy jest wymagana"),
  clientContactPerson: z.string().optional(),
  clientPhone: z.string().optional(),
  clientEmail: z.string().email().optional(),
  clientAddress: z.string().optional(),
  responses: z.record(z.string()),
});

export type PublicQuoteData = z.infer<typeof publicQuoteSchema>;
export type PublicAssessmentData = z.infer<typeof publicAssessmentSchema>;

// Notifications table for employee popup notifications
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(), // User ID who receives this notification
  type: varchar("type").notNull(), // "guest_assessment" or "guest_quote"
  title: varchar("title").notNull(),
  message: text("message").notNull(),
  relatedId: integer("related_id").notNull(), // assessment_id or quote_id
  clientName: varchar("client_name").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertNotificationSchema = createInsertSchema(notifications);
export const selectNotificationSchema = createSelectSchema(notifications);
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type SelectNotification = z.infer<typeof selectNotificationSchema>;

// Extended types for API responses
export type EquipmentWithCategory = Equipment & {
  category: EquipmentCategory;
  pricing: EquipmentPricing[];
  additionalEquipment: EquipmentAdditional[];
  serviceCosts?: EquipmentServiceCosts;
  serviceItems: EquipmentServiceItems[];
};

export type QuoteWithDetails = Quote & {
  client: Client;
  createdBy: User;
  items: (QuoteItem & {
    equipment: EquipmentWithCategory;
  })[];
};

export type TransportQuoteWithDetails = TransportQuote & {
  vehicle: TransportVehicle;
  createdBy: User;
};

// Extended types for electrical equipment API responses
export type ElectricalEquipmentWithCategory = ElectricalEquipment & {
  category: ElectricalEquipmentCategory;
  pricing: ElectricalEquipmentPricing[];
  additionalEquipment: ElectricalEquipmentAdditional[];
  serviceCosts?: ElectricalEquipmentServiceCosts;
  serviceItems: ElectricalEquipmentServiceItems[];
};

export type ElectricalQuoteWithDetails = ElectricalQuote & {
  client: Client;
  createdBy: User;
  items: (ElectricalQuoteItem & {
    equipment: ElectricalEquipmentWithCategory;
  })[];
};

// Extended types for public equipment API responses
export type PublicEquipmentWithCategory = PublicEquipment & {
  category: PublicEquipmentCategory;
  pricing: PublicEquipmentPricing[];
  additionalEquipment: PublicEquipmentAdditional[];
  serviceCosts?: PublicEquipmentServiceCosts;
  serviceItems: PublicEquipmentServiceItems[];
};

export type PublicQuoteWithDetails = PublicQuote & {
  client: Client;
  createdBy: User;
  items: (PublicQuoteItem & {
    equipment: PublicEquipmentWithCategory;
  })[];
};
