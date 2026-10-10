/** A runtime deployment profile: legacy Doot remains available in other installs. */
export default defineEventHandler((event) => {
  if (process.env.LUDI_PUBLIC_ONLY !== '1') return
  const path = getRequestURL(event).pathname
  const read = event.method === 'GET' || event.method === 'HEAD'
  if (read && path === '/') return sendRedirect(event, '/ludi', 302)
  const invitation = /^\/play\/([^/]+)$/.exec(path)
  if (read && invitation) return sendRedirect(event, `/ludi/salas/${encodeURIComponent(invitation[1]!)}`, 302)
  // Only the adapted games and their transport are public on this deployment.
  // In particular, auth, first-admin bootstrap via signup, MCP and legacy writes
  // cannot be reached even by callers who bypass the application navigation.
  if (path === '/api/ludi/rooms' || path.startsWith('/api/ludi/rooms/')) return
  if (read && (
    path === '/api/health' || path === '/ludi' || path.startsWith('/ludi/') ||
    path === '/duo' ||
    path.startsWith('/_nuxt/') || path === '/favicon.svg'
  )) return
  throw createError({ statusCode: 404, statusMessage: 'Not Found' })
})
