import { createClient } from './client'

// One shared browser client for the whole app (createBrowserClient is already a singleton).
export const supabase = createClient()
