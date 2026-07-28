import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "..", ".env") });

// Use SERVICE ROLE KEY to bypass RLS and check actual database
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, serviceKey);

console.log("🔍 Checking if tables exist in PostgreSQL database...\n");

// Check tables directly
const problematicTables = [
  "new_members",
  "dhols",
  "main_inventory",
  "dori_size_inventory",
  "daily_summary_reports",
];

console.log("Testing each table with Supabase SDK:\n");

for (const tableName of problematicTables) {
  const { data, error } = await supabase
    .from(tableName)
    .select("*", { count: "exact", head: true });

  if (error) {
    console.log(`❌ ${tableName.padEnd(30)} - ${error.message}`);
  } else {
    console.log(`✅ ${tableName.padEnd(30)} - EXISTS (accessible via SDK)`);
  }
}

console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("🔧 DIAGNOSIS:");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
console.log('If tables show as "Cannot find" or "does not exist":');
console.log("→ Tables were NEVER CREATED in Supabase database\n");
console.log("The schema.sql file contains CREATE statements,");
console.log("but they need to be executed in Supabase SQL Editor.\n");
console.log("💡 SOLUTION:");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
console.log("📝 STEP-BY-STEP FIX:\n");
console.log("1. Open Supabase Dashboard:");
console.log("   https://supabase.com/dashboard/project/rnpsuwkkafxufuqucikz\n");
console.log("2. Click SQL Editor (left sidebar)\n");
console.log('3. Click "New Query"\n');
console.log("4. Copy content from: supabase/schema.sql\n");
console.log('5. Run the ENTIRE schema.sql file (F5 or click "Run")\n');
console.log("6. Wait for success message\n");
console.log("7. Go to Table Editor - verify tables appear\n");
console.log("8. Run test_rest_api.mjs again to verify\n");
console.log("9. Refresh your app - 404 errors should be gone!\n");
