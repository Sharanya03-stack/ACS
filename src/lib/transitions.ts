export const VALID_INSTALLATION_TRANSITIONS: Record<string, string[]> = {
  'NEW': ['PARTNER_ASSIGNED', 'TECHNICIAN_ASSIGNED', 'IN_PROGRESS', 'CANCELLED'],
  'PARTNER_ASSIGNED': ['TECHNICIAN_ASSIGNED', 'IN_PROGRESS', 'CANCELLED'],
  'TECHNICIAN_ASSIGNED': ['SCHEDULED', 'IN_PROGRESS', 'CANCELLED'],
  'SCHEDULED': ['IN_PROGRESS', 'CANCELLED', 'RESCHEDULED'],
  'IN_PROGRESS': ['UNDER_VERIFICATION', 'ON_HOLD', 'FAILED'],
  'ON_HOLD': ['IN_PROGRESS', 'CANCELLED'],
  'REVISIT_REQUIRED': ['IN_PROGRESS', 'UNDER_VERIFICATION'],
  'UNDER_VERIFICATION': ['VERIFIED', 'REVISIT_REQUIRED', 'FAILED'],
  'VERIFIED': ['COMPLETED'],
  'COMPLETED': [],
  'CANCELLED': [],
  'FAILED': []
};

export function isValidTransition(currentStatus: string, nextStatus: string): boolean {
  if (currentStatus === nextStatus) return true; // allow idempotent updates
  const allowed = VALID_INSTALLATION_TRANSITIONS[currentStatus];
  return allowed ? allowed.includes(nextStatus) : false;
}
