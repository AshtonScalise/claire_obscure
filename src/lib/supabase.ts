import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabaseConfigured = Boolean(url && anonKey)

// A placeholder client keeps the app importable before .env exists; App shows a setup screen instead.
export const supabase = createClient(url ?? 'http://localhost:54321', anonKey ?? 'not-configured')
