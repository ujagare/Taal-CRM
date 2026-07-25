import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '..', '.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const anonKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, anonKey)

const testEmail = `admin_seed_${Date.now()}@taal.com`
const testPassword = 'TestPassword123!'

console.log('Attempting signup/signin to test authenticated insertion...')
let { data: authData, error: authError } = await supabase.auth.signUp({
  email: testEmail,
  password: testPassword,
})

if (authError) {
  console.log('SignUp error:', authError.message)
} else {
  console.log('SignUp successful, session created:', !!authData.session)
}

const members = JSON.parse(readFileSync(resolve(__dirname, 'members_data.json'), 'utf-8'))
const records = members.map(m => ({
  ...m,
  exam_status: m.exam_status || 'pending',
  exam_score: m.exam_score || null,
  exam_rhythm: m.exam_rhythm || null,
  exam_physical: m.exam_physical || null,
  exam_attitude: m.exam_attitude || null,
  batch_assigned: m.batch_assigned || null,
  shortlisted: m.shortlisted || false,
  exam_notes: m.exam_notes || null,
}))

const { data, error } = await supabase.from('new_members').insert(records).select('id')

if (error) {
  console.error('Authenticated Insert failed:', error.message)
} else {
  console.log(`Authenticated Insert SUCCESS! Inserted ${data.length} rows!`)
}
