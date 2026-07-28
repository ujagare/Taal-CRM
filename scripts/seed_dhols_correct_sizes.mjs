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

console.log("🥁 Seeding dhols table with correct sizes...\n");

// Size mapping as per requirement
function getDholSize(num) {
  if (num <= 10) return 30;
  if (num >= 53) return 26;
  return 28;
}

// Create dhol records
const dhols = [];
for (let i = 1; i <= 54; i++) {
  dhols.push({
    dhol_number: i,
    size: getDholSize(i),
    maker_name: "",
    notes: `Dhol #${i} - ${getDholSize(i)}" size`,
  });
}

// Insert dhols (using upsert to avoid duplicates)
console.log("📊 Dhol Size Distribution:");
console.log('   30": Dhol #1-10 (10 dhols)');
console.log('   28": Dhol #11-52 (42 dhols)');
console.log('   26": Dhol #53-54 (2 dhols)');
console.log("   Total: 54 dhols\n");

console.log("💾 Inserting/Updating dhols in database...\n");

let successCount = 0;
let errorCount = 0;

for (const dhol of dhols) {
  const { error } = await supabase.from("dhols").upsert(dhol, {
    onConflict: "dhol_number",
    ignoreDuplicates: false,
  });

  if (error) {
    console.error(`❌ Error for Dhol #${dhol.dhol_number}:`, error.message);
    errorCount++;
  } else {
    successCount++;
    if (dhol.dhol_number % 10 === 0) {
      console.log(`✅ Processed ${dhol.dhol_number} dhols...`);
    }
  }
}

console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("📊 Summary:");
console.log(`   ✅ Success: ${successCount}/54`);
console.log(`   ❌ Errors: ${errorCount}/54`);
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

// Verify the seeded data
console.log("🔍 Verifying seeded data...\n");

const { data: allDhols, error: fetchError } = await supabase
  .from("dhols")
  .select("*")
  .order("dhol_number");

if (fetchError) {
  console.error("❌ Error fetching dhols:", fetchError.message);
} else {
  // Group by size
  const groupedBySize = {};
  allDhols.forEach((dhol) => {
    if (!groupedBySize[dhol.size]) {
      groupedBySize[dhol.size] = [];
    }
    groupedBySize[dhol.size].push(dhol.dhol_number);
  });

  console.log("📊 Dhol Distribution by Size:\n");
  Object.keys(groupedBySize)
    .sort((a, b) => b - a)
    .forEach((size) => {
      const numbers = groupedBySize[size];
      const rangeStart = Math.min(...numbers);
      const rangeEnd = Math.max(...numbers);
      console.log(
        `   ${size}": ${numbers.length} dhols (Range: #${rangeStart}-#${rangeEnd})`,
      );
    });

  // Verify correctness
  console.log("\n✅ Verification:");
  let correct = true;

  // Check 30" dhols
  const dhols30 = allDhols.filter((d) => d.size === 30);
  if (
    dhols30.length === 10 &&
    dhols30.every((d) => d.dhol_number >= 1 && d.dhol_number <= 10)
  ) {
    console.log('   ✅ 30" dhols: Correct (#1-#10)');
  } else {
    console.log('   ❌ 30" dhols: Incorrect!');
    correct = false;
  }

  // Check 28" dhols
  const dhols28 = allDhols.filter((d) => d.size === 28);
  if (
    dhols28.length === 42 &&
    dhols28.every((d) => d.dhol_number >= 11 && d.dhol_number <= 52)
  ) {
    console.log('   ✅ 28" dhols: Correct (#11-#52)');
  } else {
    console.log('   ❌ 28" dhols: Incorrect!');
    correct = false;
  }

  // Check 26" dhols
  const dhols26 = allDhols.filter((d) => d.size === 26);
  if (
    dhols26.length === 2 &&
    dhols26.every((d) => d.dhol_number >= 53 && d.dhol_number <= 54)
  ) {
    console.log('   ✅ 26" dhols: Correct (#53-#54)');
  } else {
    console.log('   ❌ 26" dhols: Incorrect!');
    correct = false;
  }

  if (correct) {
    console.log("\n🎉 All dhol sizes are correctly configured!");
  } else {
    console.log(
      "\n⚠️  Some dhol sizes need correction. Run SQL script manually.",
    );
  }
}

console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("✅ Dhol seeding complete!");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
