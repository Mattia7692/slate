// ID del profilo Founder — impostato via env var NEXT_PUBLIC_FOUNDER_ID
// Nessun admin può modificare o sospendere il profilo Founder.
const FOUNDER_ID = (process.env.NEXT_PUBLIC_FOUNDER_ID ?? '').trim()

export function isFounder(profileId: string): boolean {
  return FOUNDER_ID !== '' && profileId === FOUNDER_ID
}
