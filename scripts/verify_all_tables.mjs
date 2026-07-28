import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "..", ".env") });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !anonKey) {
  console.error("❌ Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, anonKey);

console.log("🔍 Verifying all required tables...\n");

// List of all tables required by the application
const requiredTables = [
  // Core CRM Tables
  "kpis",
  "revenue",
  "pipeline_stages",
  "deals",
  "tasks",
  "activities",
  "metrics",

  // TAAL Pathak Tables
  "taal_assets",
  "dhol_pan",
  "new_members",
  "dhols",
  "dhol_maintenance",
  "expenses",
  "daily_reports",

  // Inventory Tables
  "dori_inventory",
  "main_inventory",
  "dori_size_inventory",

  // Attendance Module
  "batches",
  "students",
  "attendance",
  "biometric_devices",
  "attendance_logs",

  // Auth & Reports
  "auth_activity_logs",
  "daily_summary_reports",
];

let existingCount = 0;
let missingCount = 0;
const missingTables = [];

for (const tableName of requiredTables) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select("*", { count: "exact", head: true });

    if (error) {
      console.log(`❌ ${tableName.padEnd(30)} - MISSING (${error.message})`);
      missingTables.push(tableName);
      missingCount++;
    } else {
      console.log(`✅ ${tableName.padEnd(30)} - EXISTS`);
      existingCount++;
    }
  } catch (err) {
    console.log(`❌ ${tableName.padEnd(30)} - ERROR (${err.message})`);
    missingTables.push(tableName);
    missingCount++;
  }
}

console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log(`📊 Summary:`);
console.log(`   ✅ Existing: ${existingCount}/${requiredTables.length}`);
console.log(`   ❌ Missing:  ${missingCount}/${requiredTables.length}`);
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

if (missingTables.length > 0) {
  console.log("⚠️  Missing Tables:");
  missingTables.forEach((t) => console.log(`   • ${t}`));
  console.log("\n📝 To fix this:");
  console.log("   1. Open Supabase Dashboard → SQL Editor");
  console.log("   2. Copy content from: supabase/schema.sql");
  console.log("   3. Run the SQL script");
  console.log("   4. Run this verification script again\n");
} else {
  console.log("🎉 All required tables exist! Database is ready.\n");
}
