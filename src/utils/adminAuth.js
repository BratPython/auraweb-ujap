import { supabase } from '../supabaseClient'

function normalizeRole(value) {
  return String(value || '').trim().toLowerCase()
}

function isRoleAdmin(value) {
  return normalizeRole(value) === 'admin'
}

export async function resolveIsAdmin(user) {
  if (!user?.id) return false

  try {
    const { data: profile, error } = await supabase
      .from('perfiles')
      .select('rol')
      .eq('id', user.id)
      .maybeSingle()

    if (!error && isRoleAdmin(profile?.rol)) {
      return true
    }
  } catch {
    // If perfiles check fails (missing row/RLS edge), continue with metadata fallback.
  }

  return (
    isRoleAdmin(user.app_metadata?.rol) ||
    isRoleAdmin(user.app_metadata?.role) ||
    isRoleAdmin(user.user_metadata?.rol) ||
    isRoleAdmin(user.user_metadata?.role)
  )
}
