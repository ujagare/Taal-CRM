import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '..', '.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const anonKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, anonKey)

const dealTest = { company: 'Audit Corp', title: 'Audit Performance', stage: 'Lead', value: 10000 }
const { data, error } = await supabase.from('deals').insert([dealTest]).select()

if (error) {
  console.log('Deals insert error:', error.message)
} else {
  console.log('Deals insert SUCCESS! ID:', data[0].id)
  await supabase.from('deals').delete().eq('id', data[0].id)
}
