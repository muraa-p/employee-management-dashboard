import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    'Missing Supabase env vars. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.'
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let _currentEmployee = null;

/** Returns the logged-in employee's full profile (cached). */
export async function getCurrentEmployee() {
  if (_currentEmployee) return _currentEmployee;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('employees')
    .select('*, departments(name)')
    .eq('email', user.email)
    .single();

  _currentEmployee = data;
  return data;
}

/** Clears the cached employee (call on logout). */
export function clearCurrentEmployee() {
  _currentEmployee = null;
}
