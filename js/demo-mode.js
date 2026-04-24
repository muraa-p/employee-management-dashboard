const PUBLIC_DEMO_MODE = import.meta.env.VITE_PUBLIC_DEMO_MODE === 'true';
const PUBLIC_DEMO_EMAILS = new Set(['hr@test.com', 'emp@test.com']);

export function isPublicDemoMode() {
  return PUBLIC_DEMO_MODE;
}

export function isDemoAccount(employee) {
  const email = employee?.email?.toLowerCase();
  return Boolean(email && PUBLIC_DEMO_EMAILS.has(email));
}

export function isReadOnlyDemo(employee) {
  return PUBLIC_DEMO_MODE && isDemoAccount(employee);
}

export function blockDemoWrite(employee, message = 'This public demo is read-only.') {
  if (!isReadOnlyDemo(employee)) return false;
  alert(message);
  return true;
}
