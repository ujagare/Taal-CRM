import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '..', '.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const anonKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, anonKey)

console.log('--- COMPONENT PAYLOAD AUDIT ---\n')

// 1. Attendance: students
const { error: errStudents } = await supabase.from('students').insert([{ name: 'Test', phone: '123' }])
console.log('1. Attendance -> students insert:', errStudents ? `❌ FAILED: ${errStudents.message}` : '✅ OK')

// 2. Attendance: batches
const { error: errBatches } = await supabase.from('batches').insert([{ name: 'Test Batch' }])
console.log('2. Attendance -> batches insert:', errBatches ? `❌ FAILED: ${errBatches.message}` : '✅ OK')

// 3. Attendance: attendance
const { error: errAtt } = await supabase.from('attendance').insert([{ student_id: 1, batch_id: 1, attendance_date: '2026-07-25', status: 'Present' }])
console.log('3. Attendance -> attendance insert:', errAtt ? `❌ FAILED: ${errAtt.message}` : '✅ OK')

// 4. Expenses: expenses
const { error: errExp } = await supabase.from('expenses').insert([{ title: 'Test Expense', amount: 50, category: 'food' }])
console.log('4. Expenses -> expenses insert:', errExp ? `❌ FAILED: ${errExp.message}` : '✅ OK')

// 5. Daily Report: daily_reports
const { error: errRep } = await supabase.from('daily_reports').insert([{ report_date: '2026-07-25', dhol_number: '1', work_type: 'Test' }])
console.log('5. Daily Report -> daily_reports insert:', errRep ? `❌ FAILED: ${errRep.message}` : '✅ OK')

// 6. Dhol Pan: dhol_pan
const { error: errPan } = await supabase.from('dhol_pan').insert([{ pane_type: 'Test', size: 28 }])
console.log('6. Dhol Pan -> dhol_pan insert:', errPan ? `❌ FAILED: ${errPan.message}` : '✅ OK')

// 7. Dhol Maintenance: dhol_maintenance
const { error: errMaint } = await supabase.from('dhol_maintenance').insert([{ dhol_number: 1, issue_type: 'Test' }])
console.log('7. Dhol Maintenance -> dhol_maintenance insert:', errMaint ? `❌ FAILED: ${errMaint.message}` : '✅ OK')

// 8. Auth Logs: auth_activity_logs
const { error: errAuth } = await supabase.from('auth_activity_logs').insert([{ user_name: 'Test', event_type: 'login' }])
console.log('8. Auth Logs -> auth_activity_logs insert:', errAuth ? `❌ FAILED: ${errAuth.message}` : '✅ OK')
