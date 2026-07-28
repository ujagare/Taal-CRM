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

console.log("🔍 Testing REST API Endpoints Directly...\n");
console.log(`🌐 Supabase URL: ${supabaseUrl}`);
console.log(`🔑 Using Anon Key: ${anonKey.substring(0, 20)}...\n`);

// Tables that are showing 404 errors
const testTables = [
  "new_members",
  "dhols",
  "main_inventory",
  "dori_size_inventory",
  "daily_summary_reports",
];

async function testTable(tableName) {
  const url = `${supabaseUrl}/rest/v1/${tableName}?select=*&limit=1`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
    });

    const statusColor = response.ok ? "✅" : "❌";
    console.log(
      `${statusColor} ${tableName.padEnd(30)} → HTTP ${response.status} ${response.statusText}`,
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`   ⚠️  Error: ${errorText}`);
    } else {
      const data = await response.json();
      console.log(`   📊 Rows: ${data.length} (sample fetch successful)`);
    }

    return response.ok;
  } catch (error) {
    console.log(`❌ ${tableName.padEnd(30)} → Network Error`);
    console.log(`   ⚠️  ${error.message}`);
    return false;
  }
}

console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("Testing Tables with 404 Errors:");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

let successCount = 0;
for (const table of testTables) {
  const success = await testTable(table);
  if (success) successCount++;
  console.log(); // blank line
}

console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log(
  `📊 Results: ${successCount}/${testTables.length} tables accessible`,
);
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

if (successCount < testTables.length) {
  console.log("⚠️  Some tables are not accessible via REST API");
  console.log("\n📝 Possible Fixes:");
  console.log("   1. Run SQL script: supabase/fix_api_permissions.sql");
  console.log("   2. Check Supabase Dashboard → Table Settings → Disable RLS");
  console.log("   3. Verify anon role has GRANT permissions");
  console.log("   4. Check Settings → API → Ensure tables are exposed\n");
} else {
  console.log("🎉 All tables are accessible! API is working correctly.\n");
}
