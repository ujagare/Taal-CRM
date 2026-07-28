// Run this script to create/seed new tables in Supabase for the Enhanced Daily Report
// Usage: node scripts/create_daily_report_tables.js

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTables() {
  console.log('🚀 Creating Enhanced Daily Report tables...\n');

  // 1. Seed main_inventory
  console.log('📦 Seeding main_inventory table...');
  for (const size of ['26"', '28"', '30"']) {
    const { error } = await supabase.from('main_inventory').upsert(
      { size, current_count: 0, notes: 'Initial stock' },
      { onConflict: 'size' }
    );
    if (error) {
      console.log(`  ⚠️ main_inventory ${size}: ${error.message}`);
      if (error.message.includes('does not exist') || error.message.includes('relation')) {
        console.log('  ℹ️  Table does not exist. Please run the SQL from supabase/schema.sql first.');
        break;
      }
    } else {
      console.log(`  ✅ main_inventory ${size}: OK`);
    }
  }

  // 2. Seed dori_size_inventory
  console.log('\n🧵 Seeding dori_size_inventory table...');
  const doriSeeds = { '26"': 10, '28"': 25, '30"': 12 };
  for (const [size, count] of Object.entries(doriSeeds)) {
    const { error } = await supabase.from('dori_size_inventory').upsert(
      { size, current_count: count, notes: `Initial stock — from total 47` },
      { onConflict: 'size' }
    );
    if (error) {
      console.log(`  ⚠️ dori_size_inventory ${size}: ${error.message}`);
      if (error.message.includes('does not exist') || error.message.includes('relation')) {
        console.log('  ℹ️  Table does not exist. Please run the SQL from supabase/schema.sql first.');
        break;
      }
    } else {
      console.log(`  ✅ dori_size_inventory ${size}: ${count} dori`);
    }
  }

  // 3. Test daily_summary_reports table
  console.log('\n📊 Testing daily_summary_reports table...');
  const { error: sumErr } = await supabase.from('daily_summary_reports').select('id').limit(1);
  if (sumErr) {
    console.log(`  ⚠️ daily_summary_reports: ${sumErr.message}`);
    console.log('  ℹ️  Please create this table in Supabase SQL Editor.');
  } else {
    console.log('  ✅ daily_summary_reports: exists and accessible');
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('If any tables are missing, run this SQL in Supabase SQL Editor:');
  console.log('File: supabase/schema.sql (scroll to bottom for new tables)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

createTables().catch(console.error);
