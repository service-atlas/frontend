export default defineNuxtRouteMiddleware((to) => {
  const { enabled, isAuthenticated } = useAuth()

  // If auth is disabled, allow all routes
  if (!enabled) {
    return
  }

  // Allow the callback and login routes to bypass authentication
  // This matches the redirect_uri configured in OIDC
  if (to.path === '/auth/callback' || to.path === '/auth/login' || to.path === '/auth/silent-callback') {
    return
  }

  // If the user is not authenticated, redirect to login
  if (!isAuthenticated.value) {
    console.info(`Auth middleware: Unauthenticated access to ${to.path}, redirecting to login...`)
    const { login } = useAuth()

    if (import.meta.client) {
      console.info('Auth middleware: Client-side redirecting to login')
      // On client, try login directly. If it doesn't return a redirect result (it usually returns void
      // because it uses window.location), we manually navigate to our login page.
      const result = login(to.fullPath)
      return (result as any) || navigateTo({
        path: '/auth/login',
        query: { redirect: to.fullPath }
      })
    } else {
      console.info('Auth middleware: Server-side redirecting to login')
      // On server, we must return a navigation result to block rendering
      return navigateTo({
        path: '/auth/login',
        query: { redirect: to.fullPath }
      })
    }
  }
})
