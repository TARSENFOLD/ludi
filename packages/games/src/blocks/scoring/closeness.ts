/** Existing Doot closeness curve, independent of blocks and Vue. */
export function ballparkCloseness(error: number, maxError: number): number {
  if (maxError <= 0) return 1
  return Math.max(0, (maxError - error) / maxError)
}
