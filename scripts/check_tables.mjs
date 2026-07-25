import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '..', '.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const anonKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, anonKey)

const tables = ['new_members', 'expenses', 'daily_reports', 'dhol_pan', 'dhol_maintenance', 'students', 'batches', 'attendance']

for (const t of tables) {
  const { data, error } = await supabase.from(t).select('*', { count: 'exact', head: true })
  if (error) {
    console.log(`Table '${t}': ERROR -> ${error.message}`)
  } else {
    console.log(`Table '${t}': EXISTS (count: ${data?.length ?? 'OK'})`)
  }
}
