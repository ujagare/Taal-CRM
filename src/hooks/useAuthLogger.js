/**
 * useAuthLogger (Legacy shim — Supabase Auth)
 *
 * Auth logging is now handled directly in App.jsx via Supabase.
 * This file is kept as a no-op export so any leftover imports don't break.
 */
export function useAuthLogger() {
  return { handleLogout: () => {} };
}
