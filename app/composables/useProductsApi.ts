import type { UserManager } from 'oidc-client-ts'

export const useProductsApi = () => {
  const config = useRuntimeConfig()
  const { enabled } = useAuth()

  const enableProducts = config.public.enableProducts
  const productsApiUrl = config.public.productsApiUrl || (import.meta.server ? config.productsApiUrl : '')

  // In development, we use the proxy /api/products
  // In production, we use the configured productsApiUrl
  const baseURL = import.meta.dev
    ? '/api/products'
    : (productsApiUrl || '/api/products')

  const apiFetch = $fetch.create({
    baseURL,
    async onRequest({ options }) {
      if (!import.meta.dev && !productsApiUrl) {
        throw new Error('Products API URL is not configured')
      }

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
        console.warn('Products API returned 401 Unauthorized')
      }
    }
  })

  return {
    apiFetch,
    enabled: enableProducts
  }
}
