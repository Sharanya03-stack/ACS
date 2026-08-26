export function isValidPhone(phone: string | null | undefined): boolean {
  if (!phone || phone.trim() === '') return true; // allow empty if not required. If required, check empty separately.
  
  const trimmed = phone.trim();
  return /^[6-9][0-9]{9}$/.test(trimmed);
}
