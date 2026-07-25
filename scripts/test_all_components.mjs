import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '..', '.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const anonKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, anonKey)

console.log('=== TESTING REAL COMPONENT PAYLOADS AGAINST SUPABASE DATABASE ===\n')

// 1. Daily Reports
const { error: errRep } = await supabase.from('daily_reports').insert([{
  report_date: '2026-07-25',
  dhol_number: '1',
  dhol_size: '28',
  work_type: 'Cleaning',
  repair_status: 'Pending',
}])
console.log('1. Daily Report (daily_reports):', errRep ? `❌ FAILS: ${errRep.message}` : '✅ WORKS')

// 2. Dhol Pan
const { error: errPan } = await supabase.from('dhol_pan').insert([{
  pane_type: 'Goli',
  size: 28,
  quantity: 5,
  stock_status: 'Available',
}])
console.log('2. Dhol Pan (dhol_pan):', errPan ? `❌ FAILS: ${errPan.message}` : '✅ WORKS')

// 3. Dhol Maintenance
const { error: errMaint } = await supabase.from('dhol_maintenance').insert([{
  dhol_number: 1,
  dhol_size: '28',
  broken_part: 'Pan',
  status: 'Pending',
}])
console.log('3. Dhol Maintenance (dhol_maintenance):', errMaint ? `❌ FAILS: ${errMaint.message}` : '✅ WORKS')

// 4. Attendance: students
const { error: errStu } = await supabase.from('students').insert([{
  name: 'Test Student',
  phone: '9999999999',
  instrument: 'ढोल',
}])
console.log('4. Attendance (students):', errStu ? `❌ FAILS: ${errStu.message}` : '✅ WORKS')

// 5. Attendance: batches
const { error: errBat } = await supabase.from('batches').insert([{
  name: 'Morning Batch A',
}])
console.log('5. Attendance (batches):', errBat ? `❌ FAILS: ${errBat.message}` : '✅ WORKS')

// 6. Attendance: attendance
const { error: errAtt } = await supabase.from('attendance').insert([{
  student_id: '1',
  batch_id: '1',
  date: '2026-07-25',
  status: 'Present',
}])
console.log('6. Attendance (attendance):', errAtt ? `❌ FAILS: ${errAtt.message}` : '✅ WORKS')

// 7. Expenses
const { error: errExp } = await supabase.from('expenses').insert([{
  payer_name: 'Test User',
  item_description: 'Fuel',
  amount: 100,
  category: 'other',
  bill_date: '2026-07-25',
  payment_method: 'cash',
}])
console.log('7. Expense Tracker (expenses):', errExp ? `❌ FAILS: ${errExp.message}` : '✅ WORKS')

// 8. Auth Logs
const { error: errAuth } = await supabase.from('auth_activity_logs').insert([{
  user_name: 'Test Admin',
  event_type: 'login',
}])
console.log('8. Auth Activity Logs (auth_activity_logs):', errAuth ? `❌ FAILS: ${errAuth.message}` : '✅ WORKS')

// 9. Deals (Dashboard)
const { error: errDeals } = await supabase.from('deals').insert([{
  company: 'Test Co',
  title: 'Test Deal',
  stage: 'Lead',
}])
console.log('9. Dashboard (deals):', errDeals ? `❌ FAILS: ${errDeals.message}` : '✅ WORKS')
