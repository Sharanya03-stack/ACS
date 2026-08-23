export function isValidPhone(phone: string | null | undefined): boolean {
  if (!phone || phone.trim() === '') return true; // allow empty if not required. If required, check empty separately.
  
  // Basic validation: strip spaces, dashes, parentheses, plus
  const cleaned = phone.replace(/[\s\-\(\)\+]/g, '');
  
  // Must be digits only after cleanup, and have a reasonable length (e.g., 10-15 digits for international/Indian)
  if (!/^\d{10,15}$/.test(cleaned)) {
    return false;
  }
  return true;
}
