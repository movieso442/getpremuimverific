CREATE TABLE "account_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid,
	"item_title" text NOT NULL,
	"category" text NOT NULL,
	"price_xaf" numeric(12, 2) NOT NULL,
	"delivery_type" text DEFAULT 'instant' NOT NULL,
	"credentials_data" jsonb,
	"status" text DEFAULT 'completed' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"email" text NOT NULL,
	"full_name" text,
	"balance_xaf" numeric(12, 2) DEFAULT '0.00',
	"currency" text DEFAULT 'XAF',
	"avatar_url" text,
	"phone_number" text,
	"role" text DEFAULT 'client',
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "profiles_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "smm_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid,
	"service_id" integer NOT NULL,
	"service_name" text NOT NULL,
	"category" text NOT NULL,
	"target_link" text NOT NULL,
	"quantity" integer NOT NULL,
	"charge_xaf" numeric(12, 2) NOT NULL,
	"start_count" integer DEFAULT 0,
	"remains" integer DEFAULT 0,
	"status" text DEFAULT 'pending' NOT NULL,
	"api_order_id" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "smm_services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_id" integer NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"rate_usd" numeric(10, 4) NOT NULL,
	"rate_xaf" numeric(12, 2) NOT NULL,
	"min" integer NOT NULL,
	"max" integer NOT NULL,
	"dripfeed" boolean DEFAULT false,
	"refill" boolean DEFAULT false,
	"cancel" boolean DEFAULT false,
	"service_type" text DEFAULT 'Default',
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "smm_services_service_id_unique" UNIQUE("service_id")
);
--> statement-breakpoint
CREATE TABLE "sms_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid,
	"service_name" text NOT NULL,
	"service_code" text NOT NULL,
	"country_name" text NOT NULL,
	"country_code" text NOT NULL,
	"phone_number" text NOT NULL,
	"sms_code" text,
	"price_xaf" numeric(12, 2) NOT NULL,
	"status" text DEFAULT 'waiting_sms' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "wallet_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid,
	"amount" numeric(12, 2) NOT NULL,
	"type" text NOT NULL,
	"payment_method" text NOT NULL,
	"reference" text NOT NULL,
	"status" text DEFAULT 'completed' NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "wallet_transactions_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
ALTER TABLE "account_orders" ADD CONSTRAINT "account_orders_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "smm_orders" ADD CONSTRAINT "smm_orders_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sms_orders" ADD CONSTRAINT "sms_orders_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;