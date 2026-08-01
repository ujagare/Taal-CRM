import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "..", ".env") });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, serviceKey);

function getDholSize(num) {
  const n = Number(num);
  if (n >= 1 && n <= 10) return 30;
  if (n >= 53) return 26;
  return 28;
}

async function fixDholSizes() {
  console.log("🔍 Fetching all records from dhol_maintenance...");
  const { data: logs, error } = await supabase.from("dhol_maintenance").select("*");
  if (error) {
    console.error("❌ Error fetching logs:", error.message);
    return;
  }

  console.log(`Found ${logs.length} records in dhol_maintenance.`);

  let updatedCount = 0;
  for (const log of logs) {
    const dholNum = log.dhol_number || log.dhol_id;
    if (!dholNum) continue;

    const correctSize = String(getDholSize(dholNum));
    if (log.dhol_size !== correctSize) {
      console.log(`Updating log ID ${log.id} (Dhol #${dholNum}): old size="${log.dhol_size}" -> new size="${correctSize}"`);
      const { error: updateErr } = await supabase
        .from("dhol_maintenance")
        .update({ dhol_size: correctSize })
        .eq("id", log.id);

      if (updateErr) {
        console.error(`❌ Failed to update log ID ${log.id}:`, updateErr.message);
      } else {
        updatedCount++;
      }
    }
  }

  console.log(`\n✅ Done! Updated ${updatedCount} records with correct dhol_size.`);
}

fixDholSizes();
