// Seed TAAL assets into Supabase
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '..', '.env') })

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
// Use anon key — RLS is disabled so inserts work from client side too
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY

console.log('Connecting to:', SUPABASE_URL?.slice(0, 40), '...')
console.log('Using anon key')

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const ASSETS = [
  { item: '२६" पाने', qty: '7 पाने', custodian: 'संकेत दादा', category: 'पाने (Blades)', location: 'संकेत दादा' },
  { item: '२८" पाने', qty: 'थापी = 39 | धूम = 51', custodian: 'संकेत दादा', category: 'पाने (Blades)', location: 'संकेत दादा' },
  { item: '३०" पाने', qty: 'थापी = 08 | धूम = 09', custodian: 'संकेत दादा', category: 'पाने (Blades)', location: 'संकेत दादा' },
  { item: 'ढोलाची दोरी', qty: '47 नग', custodian: 'संकेत दादा', category: 'दोरी (Ropes)', location: 'संकेत दादा' },
  { item: 'टोलचे बोड', qty: '4 नग (1 Semi Circle)', custodian: 'कात्रज', category: 'टोल (Tol)', location: 'कात्रज' },
  { item: 'टोलचे गाडे', qty: '3 नग (1 Wide) Army', custodian: 'कात्रज', category: 'टोल (Tol)', location: 'कात्रज' },
  { item: 'टोलचे पाते', qty: '1 नग', custodian: 'कात्रज', category: 'टोल (Tol)', location: 'कात्रज' },
  { item: 'झालर Crazy Cheezy', qty: '43 नग', custodian: 'कात्रज', category: 'सजावट (Decoration)', location: 'कात्रज' },
  { item: 'ढोलाचे कव्हर', qty: '145 नग', custodian: 'कात्रज', category: 'कव्हर (Covers)', location: 'कात्रज' },
  { item: 'झाँज २१ जोड', qty: '1 (बिना मूठ)', custodian: 'कात्रज', category: 'वाद्य (Instruments)', location: 'कात्रज' },
  { item: 'वायर + छोटे हॅलोजन', qty: '1 पोती + 3 हॅलोजन (जुने खराब)', custodian: 'कात्रज', category: 'इलेक्ट्रिकल', location: 'कात्रज' },
  { item: 'कड्या', qty: '35 नग', custodian: 'कात्रज', category: 'साहित्य (Hardware)', location: 'कात्रज' },
  { item: 'स्क्रॅपर + टोचा + हातोडा', qty: 'प्रत्येकी 2 नग', custodian: 'कात्रज', category: 'अवजारे (Tools)', location: 'कात्रज' },
  { item: 'मेन छोटा बॉक्स', qty: '1 नग', custodian: 'कात्रज', category: 'इलेक्ट्रिकल', location: 'कात्रज' },
  { item: 'ध्वजाचे पाईप', qty: '6 नग', custodian: 'कात्रज', category: 'ध्वज (Flags)', location: 'कात्रज' },
  { item: 'लाकडी फळ्या', qty: '4 नग', custodian: 'कात्रज', category: 'साहित्य (Hardware)', location: 'कात्रज' },
  { item: 'पॅकिंग रॅपर', qty: '1 नग', custodian: 'कात्रज', category: 'पॅकिंग', location: 'कात्रज' },
  { item: 'घुंगरू', qty: '1 छोटा पोती', custodian: 'कात्रज', category: 'वाद्य (Instruments)', location: 'कात्रज' },
  { item: 'Blue Crate मोठा', qty: '1 (Extension Rope)', custodian: 'कात्रज', category: 'स्टोरेज', location: 'कात्रज' },
  { item: 'छत्री Crazy Cheesy + स्टँडी', qty: 'प्रत्येकी 1 नग', custodian: 'पवन', category: 'इव्हेंट साहित्य', location: 'कात्रज', note: '२८" पाने १० धूम / १० थापी / १० दोरी इव्हेंट करीता कात्रज ला ठेवली आहे' },
]

async function seed() {
  console.log(`Seeding ${ASSETS.length} TAAL assets...`)

  // Check if table exists by trying to read
  const { data: existing, error: checkErr } = await supabase
    .from('taal_assets')
    .select('id')
    .limit(1)

  if (checkErr) {
    console.error('Failed to query taal_assets:', checkErr.message)
    console.error('Full error:', JSON.stringify(checkErr, null, 2))
    process.exit(1)
  }

  if (existing && existing.length > 0) {
    console.log(`Table has ${existing.length}+ existing rows. Clearing old data...`)
    const { error: delErr } = await supabase.from('taal_assets').delete().gte('id', 1)
    if (delErr) {
      console.error('Failed to clear:', delErr.message)
      process.exit(1)
    }
    console.log('Old data cleared.')
  }

  const { data, error } = await supabase.from('taal_assets').insert(ASSETS).select('id')
  if (error) {
    console.error('Insert failed:', error.message)
    console.error('Details:', JSON.stringify(error, null, 2))
    process.exit(1)
  }

  console.log(`Done! ${data.length} assets seeded.`)
  process.exit(0)
}

seed()
