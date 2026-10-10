import { describe, expect, it } from 'vitest'
import { ludiClientIp } from './ludi-client-ip'

describe('explicit proxy trust', () => {
  it('ignores spoofed headers on direct or untrusted connections', () => {
    expect(ludiClientIp('203.0.113.4', '198.51.100.1', undefined)).toBe('203.0.113.4')
    expect(ludiClientIp('203.0.113.4', '198.51.100.1', '172.18.0.2')).toBe('203.0.113.4')
  })
  it('uses only the valid last hop appended by the trusted proxy', () => {
    expect(ludiClientIp('::ffff:172.18.0.2', 'forged, 203.0.113.4', '172.18.0.2')).toBe('203.0.113.4')
    expect(ludiClientIp('172.18.0.2', '203.0.113.4, invalid', '172.18.0.2')).toBe('172.18.0.2')
    expect(ludiClientIp('172.18.0.2', undefined, '172.18.0.2')).toBe('172.18.0.2')
  })
})
