import { isIP } from 'node:net'

const normalize = (ip: string) => ip.startsWith('::ffff:') ? ip.slice(7) : ip

/** Only accept the last hop appended by our explicitly configured direct proxy. */
export function ludiClientIp(peer: string | undefined, forwarded: string | undefined, trusted: string | undefined) {
  const direct = normalize(peer ?? '')
  if (trusted && direct === normalize(trusted.trim()) && isIP(direct)) {
    const last = forwarded?.split(',').at(-1)?.trim()
    if (last && isIP(last)) return normalize(last)
  }
  return direct || 'unknown'
}
