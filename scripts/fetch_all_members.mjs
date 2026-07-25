import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '..', '.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const anonKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, anonKey)

const { data, error } = await supabase.from('new_members').select('*').order('created_at', { ascending: false })

if (error) {
  console.error('Error fetching members:', error.message)
} else {
  console.log(`FOUND ${data?.length} MEMBERS IN SUPABASE:`)
  console.log('--- RECENTLY CREATED/UPDATED MEMBERS ---')
  data.slice(0, 10).forEach((m, idx) => {
    console.log(`[${idx+1}] ID: ${m.id} | Name: ${m.full_name} | Phone: ${m.whatsapp} | Email: ${m.email} | Created: ${m.created_at} | Status: ${m.exam_status} | Score: ${m.exam_score} | Notes: ${m.exam_notes}`)
  })
}
