export default defineNuxtRouteMiddleware((to) => {
  const { enabled, isAuthenticated } = useAuth()

  // If auth is disabled, allow all routes
  if (!enabled) {
    return
  }

  // Allow the callback route to bypass authentication
  // This matches the redirect_uri configured in OIDC
  if (to.path === '/auth/callback') {
    return
  }

  // If the user is not authenticated, redirect to login
  if (!isAuthenticated.value) {
    const { login } = useAuth()

    // On the server side, we cannot trigger the OIDC redirect directly via window.location
    // which is what userManager.signinRedirect() does.
    // However, Nuxt global middleware runs on both client and server.
    if (import.meta.client) {
      return login(to.fullPath)
    } else {
      // On server-side, we can't trigger signinRedirect but we can signal that
      // we need authentication. For now, we allow the request to proceed to the client.
    }
  }
})
