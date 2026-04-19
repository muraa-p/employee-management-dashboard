import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://tibrlnbinpmapuvpxzzn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpYnJsbmJpbnBtYXB1dnB4enpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4ODEzNjEsImV4cCI6MjA5MDQ1NzM2MX0.zX6BCOjVXpLUFZilr7Vgs_O3G69Gs5tXAgLy6vt_mMw';

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
