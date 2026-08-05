import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "..", ".env") });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey);

console.log("=== FIXING RLS FOR dhols & new_members WITH SERVICE ROLE KEY ===");

// Check if we can insert test row in new_members with service key
const { data: memData, error: memErr } = await supabase.from("new_members").insert({
  full_name: "RLS Test Member",
  whatsapp: "9998887779",
  exam_status: "pending"
}).select();

if (memErr) {
  console.log("Service key insert new_members error:", memErr.message);
} else {
  console.log("✅ Service key inserted new_members ID:", memData[0].id);
  await supabase.from("new_members").delete().eq("id", memData[0].id);
}

// Check dhols
const { data: dholData, error: dholErr } = await supabase.from("dhols").insert({
  dhol_number: 999,
  size: 28
}).select();

if (dholErr) {
  console.log("Service key insert dhols error:", dholErr.message);
} else {
  console.log("✅ Service key inserted dhols ID:", dholData[0].id);
  await supabase.from("dhols").delete().eq("id", dholData[0].id);
}
