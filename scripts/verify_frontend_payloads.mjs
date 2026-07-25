import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '..', '.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const anonKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, anonKey)

console.log('=== VERIFYING FRONTEND PAYLOADS POST-SQL FIX ===\n')

// 1. Expenses
const expTest = {
  payer_name: 'Audit User',
  item_description: 'Fuel Refill',
  amount: 250,
  category: 'other',
  bill_date: '2026-07-25',
  payment_method: 'cash'
}
const { data: dExp, error: eExp } = await supabase.from('expenses').insert([expTest]).select()
console.log('1. Expense Tracker (expenses):', eExp ? `❌ ${eExp.message}` : `✅ OK (ID: ${dExp[0].id})`)
if (dExp?.[0]?.id) await supabase.from('expenses').delete().eq('id', dExp[0].id)

// 2. Daily Report
const repTest = {
  report_date: '2026-07-25',
  dhol_number: '1',
  dhol_size: '28',
  work_type: 'Cleaning',
  repair_status: 'Pending'
}
const { data: dRep, error: eRep } = await supabase.from('daily_reports').insert([repTest]).select()
console.log('2. Daily Report (daily_reports):', eRep ? `❌ ${eRep.message}` : `✅ OK (ID: ${dRep[0].id})`)
if (dRep?.[0]?.id) await supabase.from('daily_reports').delete().eq('id', dRep[0].id)

// 3. Batches
const batTest = { name: 'Audit Batch 2026' }
const { data: dBat, error: eBat } = await supabase.from('batches').insert([batTest]).select()
console.log('3. Attendance Manager (batches):', eBat ? `❌ ${eBat.message}` : `✅ OK (ID: ${dBat[0].id})`)
if (dBat?.[0]?.id) await supabase.from('batches').delete().eq('id', dBat[0].id)

// 4. Auth Activity Logs
const authTest = { user_name: 'Admin Audit', event_type: 'login' }
const { data: dAuth, error: eAuth } = await supabase.from('auth_activity_logs').insert([authTest]).select()
console.log('4. Auth Logs (auth_activity_logs):', eAuth ? `❌ ${eAuth.message}` : `✅ OK (ID: ${dAuth[0].id})`)
if (dAuth?.[0]?.id) await supabase.from('auth_activity_logs').delete().eq('id', dAuth[0].id)

// 5. Dashboard Deals
const dealTest = { company: 'Audit Corp', title: 'Audit Performance', stage: 'Lead', value: 10000 }
const { data: dDeal, error: eDeal } = await supabase.from('deals').insert([dealTest]).select()
console.log('5. Dashboard (deals):', eDeal ? `❌ ${eDeal.message}` : `✅ OK (ID: ${dDeal[0].id})`)
if (dDeal?.[0]?.id) await supabase.from('deals').delete().eq('id', dDeal[0].id)

// 6. New Member Exam
const memTest = { full_name: 'Audit Member', whatsapp: '9998887776', exam_status: 'pending' }
const { data: dMem, error: eMem } = await supabase.from('new_members').insert([memTest]).select()
console.log('6. New Member Exam (new_members):', eMem ? `❌ ${eMem.message}` : `✅ OK (ID: ${dMem[0].id})`)
if (dMem?.[0]?.id) await supabase.from('new_members').delete().eq('id', dMem[0].id)
