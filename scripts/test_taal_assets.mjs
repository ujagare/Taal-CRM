import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '..', '.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const anonKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, anonKey)

const { data, error } = await supabase.from('taal_assets').select('*').limit(5)

if (error) {
  console.log('taal_assets error:', error.message)
} else {
  console.log('taal_assets EXISTS! Rows count:', data?.length)
}
