import { createClient } from '@supabase/supabase-js'

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  'https://rnpsuwkkafxufuqucikz.supabase.co'

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJucHN1d2trYWZ4dWZ1cXVjaWt6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ1NDAzMjksImV4cCI6MjEwMDExNjMyOX0.c5yYlR1UYG4eEcUlDn2qWgoZjvGk8bY1kfgkd5hjxwU'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
