import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "..", ".env") });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, anonKey);

console.log("=========================================================================");
console.log("🚀 EXACT FRONTEND PAYLOAD SUPABASE AUDIT (ANON CLIENT KEY)");
console.log("=========================================================================\n");

const tests = [
  {
    name: "1. Shifting 1 (Asset Manager)",
    table: "taal_assets",
    insertPayload: { item: "Test Audit Asset", qty: "1 नग", custodian: "कात्रज", category: "Test", location: "कात्रज" },
    updatePayload: { qty: "2 नग" }
  },
  {
    name: "2. Dhol Pan Stock",
    table: "dhol_pan",
    insertPayload: { pane_type: "old", size: '28"', thapi: 1, dhoom: 1 },
    updatePayload: { thapi: 2 }
  },
  {
    name: "3. Dori Inventory",
    table: "dori_inventory",
    insertPayload: { current_count: 50, last_updated_by: "Test Audit" },
    updatePayload: { current_count: 55 }
  },
  {
    name: "4. Main Inventory",
    table: "main_inventory",
    insertPayload: { size: 'Total', current_count: 10, last_updated_by: "Test Audit" },
    updatePayload: { current_count: 15 }
  },
  {
    name: "5. Dhol Maintenance",
    table: "dhol_maintenance",
    insertPayload: { dhol_id: 999, dhol_number: 999, dhol_size: "28", maintenance_date: "2026-08-05", description: "Audit Test", done_by: "Audit User" },
    updatePayload: { description: "Audit Test Updated" }
  },
  {
    name: "6. Dhols Master",
    table: "dhols",
    insertPayload: { dhol_number: 999, size: 28 },
    updatePayload: { size: 30 }
  },
  {
    name: "7. Daily Reports",
    table: "daily_reports",
    insertPayload: { report_date: "2026-08-05", dhol_number: "999", dhol_size: "28", work_type: "Cleaning", repair_status: "Pending" },
    updatePayload: { repair_status: "Completed" }
  },
  {
    name: "8. Daily Summary Reports",
    table: "daily_summary_reports",
    insertPayload: { report_date: "2026-08-05", pdf_generated: false, whatsapp_sent: false },
    updatePayload: { pdf_generated: true }
  },
  {
    name: "9. Expense Tracker",
    table: "expenses",
    insertPayload: { payer_name: "Audit User", item_description: "Audit Expense", amount: 100, category: "other", bill_date: "2026-08-05", payment_method: "cash" },
    updatePayload: { amount: 150 }
  },
  {
    name: "10. Attendance (Batches)",
    table: "batches",
    insertPayload: { name: "Audit Batch 2026", year: 2026, course: "Dhol Tasha Training", trainer_name: "Audit Trainer" },
    updatePayload: { course: "Advanced Training" }
  },
  {
    name: "11. Attendance (Students)",
    table: "students",
    insertPayload: { roll_number: "9999", name: "Audit Student", phone: "9998887770", batch_name: "Audit Batch 2026", course: "Dhol Tasha Master", status: "Active" },
    updatePayload: { phone: "9998887771" }
  },
  {
    name: "12. Attendance (Records)",
    table: "attendance",
    insertPayload: { student_name: "Audit Student", attendance_date: "2026-08-05", status: "Present" },
    updatePayload: { status: "Absent" }
  },
  {
    name: "13. New Members (Exam)",
    table: "new_members",
    insertPayload: { full_name: "Audit Candidate", whatsapp: "9998887772", exam_status: "pending" },
    updatePayload: { exam_status: "passed" }
  },
  {
    name: "14. Auth Activity Logs",
    table: "auth_activity_logs",
    insertPayload: { user_name: "Audit Admin", event_type: "login", device_info: "Node Audit Script" },
    updatePayload: { event_type: "logout" }
  }
];

let passCount = 0;
let failCount = 0;

for (const t of tests) {
  console.log(`-------------------------------------------------------------------------`);
  console.log(`Checking ${t.name} -> Table: [${t.table}]`);

  // SELECT
  const { data: initialData, error: selErr } = await supabase.from(t.table).select("*").limit(1);
  if (selErr) {
    console.log(`  ❌ SELECT Error: ${selErr.message}`);
    failCount++;
    continue;
  }
  console.log(`  ✅ SELECT: OK`);

  // INSERT
  const { data: instData, error: instErr } = await supabase.from(t.table).insert([t.insertPayload]).select();
  if (instErr) {
    console.log(`  ❌ INSERT (SAVE) Error: ${instErr.message}`);
    failCount++;
    continue;
  }
  const insertedId = instData[0]?.id;
  console.log(`  ✅ INSERT (SAVE): Success (Inserted ID: ${insertedId})`);

  // UPDATE
  const { error: upErr } = await supabase.from(t.table).update(t.updatePayload).eq("id", insertedId);
  if (upErr) {
    console.log(`  ⚠️ UPDATE Error: ${upErr.message}`);
  } else {
    console.log(`  ✅ UPDATE: Success`);
  }

  // DELETE (Cleanup test row)
  if (insertedId) {
    const { error: delErr } = await supabase.from(t.table).delete().eq("id", insertedId);
    if (delErr) {
      console.log(`  ⚠️ DELETE Error: ${delErr.message}`);
    } else {
      console.log(`  ✅ DELETE (Cleanup): Success`);
    }
  }

  passCount++;
}

console.log("\n=========================================================================");
console.log(`📊 AUDIT SUMMARY: ${passCount} / ${tests.length} MODULE TABLES ARE FULLY OPERATIONAL FOR SAVING & READING IN SUPABASE`);
console.log("=========================================================================\n");
