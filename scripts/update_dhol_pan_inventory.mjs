import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "..", ".env") });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const anonKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, anonKey);

console.log("🔄 Updating dhol_pan inventory...\n");

// Update 28" old pane stock
const { data, error } = await supabase
  .from("dhol_pan")
  .update({
    thapi: 37,
    dhoom: 51,
  })
  .eq("pane_type", "old")
  .eq("size", '२८"')
  .select();

if (error) {
  console.error("❌ Error updating:", error.message);
  console.log("\nℹ️  Trying alternate size format...");

  // Try with regular 28" format
  const { data: data2, error: error2 } = await supabase
    .from("dhol_pan")
    .update({
      thapi: 37,
      dhoom: 51,
    })
    .eq("pane_type", "old")
    .eq("size", '28"')
    .select();

  if (error2) {
    console.error("❌ Error with alternate format:", error2.message);
    console.log("\nℹ️  Checking what sizes exist in table...");

    // Check what sizes are in the table
    const { data: allData, error: err3 } = await supabase
      .from("dhol_pan")
      .select("*");

    if (err3) {
      console.error("❌ Cannot read table:", err3.message);
    } else {
      console.log("\n📊 Current dhol_pan data:");
      console.table(allData);
      console.log("\nℹ️  You can manually update in Supabase dashboard:");
      console.log("   1. Go to Table Editor → dhol_pan");
      console.log(
        '   2. Find row with pane_type="old" and size containing "28"',
      );
      console.log("   3. Update: thapi=37, dhoom=51");
    }
  } else {
    console.log("✅ Successfully updated!");
    console.log("\n📊 Updated data:");
    console.table(data2);
  }
} else {
  console.log("✅ Successfully updated!");
  console.log("\n📊 Updated data:");
  console.table(data);
}

// Verify current state
console.log("\n🔍 Verifying all dhol_pan inventory...\n");
const { data: allPan } = await supabase
  .from("dhol_pan")
  .select("*")
  .eq("pane_type", "old")
  .order("size");

if (allPan) {
  console.log("Current Old Pane Inventory:");
  allPan.forEach((row) => {
    const total = (row.thapi || 0) + (row.dhoom || 0);
    console.log(
      `  ${row.size}: Thapi=${row.thapi}, Dhoom=${row.dhoom}, Total=${total}`,
    );
  });
}
