ALTER TABLE "model_scenarios"
  ALTER COLUMN "user_growth" TYPE numeric(8, 4) USING "user_growth"::numeric(8, 4),
  ALTER COLUMN "churn_rate" TYPE numeric(8, 4) USING "churn_rate"::numeric(8, 4),
  ALTER COLUMN "farmer_growth" TYPE numeric(8, 4) USING "farmer_growth"::numeric(8, 4);

ALTER TABLE "model_settings"
  ALTER COLUMN "tax_rate" TYPE numeric(8, 4) USING "tax_rate"::numeric(8, 4),
  ALTER COLUMN "discount_rate" TYPE numeric(8, 4) USING "discount_rate"::numeric(8, 4),
  ALTER COLUMN "terminal_growth" TYPE numeric(8, 4) USING "terminal_growth"::numeric(8, 4);
