import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
const isLocalUrl = supabaseUrl?.startsWith('http://127.0.0.1:') || supabaseUrl?.startsWith('http://localhost:')

if (import.meta.env.DEV && supabaseUrl && !isLocalUrl) {
  console.error('Local development is configured with a non-local Supabase URL. Set VITE_SUPABASE_URL in .env.local to http://127.0.0.1:54321.')
}

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey && (!import.meta.env.DEV || isLocalUrl))

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabasePublishableKey || 'placeholder-publishable-key',
)