import type { UserManager } from 'oidc-client-ts'

export const useApi = () => {
  const config = useRuntimeConfig()
  const { enabled } = useAuth()

  // In development, route through Nuxt dev proxy at /api to avoid CORS.
  // In production, use the configured absolute API URL, falling back to /api if missing.
  const baseURL = (import.meta.dev ? '/api' : (config.public?.apiUrl as string) || '/api')

  const apiFetch = $fetch.create({
    baseURL,
    async onRequest({ options }) {
      if (enabled && import.meta.client) {
        const userManager = useNuxtApp().$userManager as UserManager | undefined
        if (userManager) {
          const user = await userManager.getUser()
          if (user?.access_token) {
            options.headers = {
              ...options.headers,
              Authorization: `Bearer ${user.access_token}`
            }
          }
        }
      }
    },
    async onResponseError({ response }) {
      if (response.status === 401) {
        // Future: Handle session expiration/refresh
        console.warn('API returned 401 Unauthorized')
      }
    }
  })

  return apiFetch
}
