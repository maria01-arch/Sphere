
// True when a Supabase/Postgrest error means a column or table referenced in
// the query doesn't exist yet — i.e. supabase_migration_reply_and_stickers.sql
// hasn't been run on this project. Used to fall back gracefully instead of
// failing sends silently.
export function isMissingColumnError(error) {
  if(!error) return false
  const code = error.code||''
  const msg = (error.message||'').toLowerCase()
  return code==='42703' || code==='PGRST204' || code==='42P01' ||
    (msg.includes('column') && msg.includes('does not exist')) ||
    (msg.includes('could not find') && msg.includes('column')) ||
    msg.includes('relation') && msg.includes('does not exist')
}
