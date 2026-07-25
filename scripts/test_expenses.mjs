import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '..', '.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const anonKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, anonKey)

const expensePayload = {
  payer_name: 'Audit User',
  item_description: 'Test Fuel Expense',
  amount: 150,
  category: 'other',
  bill_date: '2026-07-25',
  payment_method: 'cash',
}

const { data, error } = await supabase.from('expenses').insert([expensePayload]).select()

if (error) {
  console.log('Expenses Insert Error:', error.message)
} else {
  console.log('Expenses Insert SUCCESS:', data)
}
