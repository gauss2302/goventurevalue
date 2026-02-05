import { Pool } from "pg";

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@localhost:5432/goventurevalue";

const sql = `
ALTER TABLE "model_scenarios"
  ALTER COLUMN "user_growth" TYPE numeric(8, 4) USING "user_growth"::numeric(8, 4),
  ALTER COLUMN "churn_rate" TYPE numeric(8, 4) USING "churn_rate"::numeric(8, 4),
  ALTER COLUMN "farmer_growth" TYPE numeric(8, 4) USING "farmer_growth"::numeric(8, 4);

ALTER TABLE "model_settings"
  ALTER COLUMN "tax_rate" TYPE numeric(8, 4) USING "tax_rate"::numeric(8, 4),
  ALTER COLUMN "discount_rate" TYPE numeric(8, 4) USING "discount_rate"::numeric(8, 4),
  ALTER COLUMN "terminal_growth" TYPE numeric(8, 4) USING "terminal_growth"::numeric(8, 4);
`;

const run = async () => {
  const pool = new Pool({ connectionString });
  try {
    await pool.query(sql);
    console.log("Updated numeric precision for scenario/settings columns.");
  } finally {
    await pool.end();
  }
};

run().catch((error) => {
  console.error("Failed to update numeric precision:", error);
  process.exit(1);
});
