// Create missing Dashboard tables in Supabase
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '..', '.env') })

// Try service_role key first, fall back to anon
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

console.log('Connecting to:', SUPABASE_URL?.slice(0, 40), '...')

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const TABLES = [
  // deals — already in schema but may not be created yet
  {
    name: 'deals',
    sql: `CREATE TABLE IF NOT EXISTS deals (
      id bigint primary key generated always as identity,
      company text not null default '',
      title text not null default '',
      owner text not null default '',
      stage text not null default 'Lead',
      priority text not null default 'medium',
      value numeric not null default 0,
      close date,
      created_at timestamptz default now()
    )`,
  },
  // tasks
  {
    name: 'tasks',
    sql: `CREATE TABLE IF NOT EXISTS tasks (
      id bigint primary key generated always as identity,
      title text not null default '',
      due text,
      done boolean default false,
      owner text,
      priority text default 'Medium',
      created_at timestamptz default now()
    )`,
  },
  // activities
  {
    name: 'activities',
    sql: `CREATE TABLE IF NOT EXISTS activities (
      id bigint primary key generated always as identity,
      type text not null default '',
      description text,
      created_at timestamptz default now()
    )`,
  },
  // metrics
  {
    name: 'metrics',
    sql: `CREATE TABLE IF NOT EXISTS metrics (
      id bigint primary key generated always as identity,
      month text,
      revenue numeric not null default 0,
      target numeric not null default 0,
      created_at timestamptz default now()
    )`,
  },
]

async function run() {
  for (const t of TABLES) {
    console.log(`Creating ${t.name}...`)
    const { error } = await supabase.rpc('exec_sql', { query: t.sql })
    if (error) {
      // exec_sql RPC doesn't exist — try direct REST or just report
      console.log(`  Could not create via RPC (${error.message}) — trying direct check...`)

      // Check if table exists by querying
      const { error: qErr } = await supabase.from(t.name).select('id').limit(1)
      if (qErr) {
        console.log(`  ❌ Table "${t.name}" does not exist and cannot be auto-created.`)
        console.log(`     Run this SQL in Supabase SQL Editor:`)
        console.log(`     ${t.sql.replace(/\n/g, '\n     ')}`)
      } else {
        console.log(`  ✅ Table "${t.name}" already exists.`)
      }
    } else {
      console.log(`  ✅ Created ${t.name}`)
    }
  }
  console.log('\nDone.')
}

run()
