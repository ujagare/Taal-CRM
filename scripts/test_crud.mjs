import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '..', '.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const anonKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, anonKey)

// 1. Try to fetch 1 row from new_members
const { data: rows, error: selectErr } = await supabase.from('new_members').select('*').limit(5)
console.log('Select rows count:', rows?.length, 'error:', selectErr?.message)

// 2. Try to insert 1 test row
const testObj = {
  full_name: 'Test Member',
  email: 'test_candidate@gmail.com',
  whatsapp: '9999999999',
  exam_status: 'pending'
}
const { data: instData, error: instErr } = await supabase.from('new_members').insert([testObj]).select()
console.log('Insert test result:', instData, 'error:', instErr?.message)

// 3. Try to update row id=1
if (rows && rows.length > 0) {
  const { data: upData, error: upErr } = await supabase.from('new_members').update({ exam_notes: 'Updated note' }).eq('id', rows[0].id).select()
  console.log('Update result:', upData, 'error:', upErr?.message)
}
