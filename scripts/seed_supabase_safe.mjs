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

const members = JSON.parse(readFileSync(resolve(__dirname, 'members_data.json'), 'utf-8'))

console.log(`Seeding ${members.length} members safely into Supabase new_members table...`)

let insertedCount = 0
let errorCount = 0

// Track emails to avoid inserting duplicate email in same batch
const seenEmails = new Set()

for (const m of members) {
  let emailVal = m.email ? m.email.trim().toLowerCase() : null
  if (emailVal && seenEmails.has(emailVal)) {
    emailVal = null // avoid duplicate unique key conflict
  }
  if (emailVal) seenEmails.add(emailVal)

  const record = {
    timestamp: m.timestamp || new Date().toISOString().split('T')[0],
    full_name: m.full_name?.trim(),
    email: emailVal,
    gender: m.gender || 'Male',
    whatsapp: m.whatsapp ? String(m.whatsapp).trim() : null,
    parent_contact: m.parent_contact ? String(m.parent_contact).trim() : null,
    dob: m.dob || null,
    address: m.address || null,
    profession: m.profession || null,
    injury_info: m.injury_info || 'No',
    previous_pathak: m.previous_pathak || null,
    instruments_played: m.instruments_played || 'ढोल',
    experience: m.experience || 'Fresher',
    flag_dancing: m.flag_dancing || 'नाही',
    other_instruments: m.other_instruments || null,
    hobbies: m.hobbies || null,
    reference: m.reference || null,
    exam_status: m.exam_status || 'pending',
    exam_score: m.exam_score || null,
    exam_rhythm: m.exam_rhythm || null,
    exam_physical: m.exam_physical || null,
    exam_attitude: m.exam_attitude || null,
    batch_assigned: m.batch_assigned || null,
    shortlisted: m.shortlisted || false,
    exam_notes: m.exam_notes || null,
  }

  const { error } = await supabase.from('new_members').insert([record])
  if (error) {
    console.warn(`Failed row [${m.full_name}]:`, error.message)
    errorCount++
  } else {
    insertedCount++
  }
}

console.log(`\n🎉 SEED COMPLETE! Successfully inserted ${insertedCount} member records into Supabase (errors: ${errorCount})`)
