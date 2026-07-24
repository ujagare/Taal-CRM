import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '..', '.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const anonKey = process.env.VITE_SUPABASE_ANON_KEY
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('URL:', supabaseUrl)
console.log('Anon key prefix:', anonKey?.substring(0, 30) + '...')
console.log('Service key prefix:', serviceRoleKey?.substring(0, 30) + '...')

// Try with anon key first (for reads)
const supabase = createClient(supabaseUrl, anonKey)

const { data, error } = await supabase.from('new_members').select('id').limit(1)

if (error) {
  console.log('Table check error:', error.message)
  console.log('Table might not exist yet. Need to create it first.')
} else {
  console.log('Table exists! Current rows:', data?.length)
}
