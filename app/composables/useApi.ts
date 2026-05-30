export const useApi = () => {
  const config = useRuntimeConfig()

  // In development, route through Nuxt dev proxy at /api to avoid CORS.
  // In production, use the configured absolute API URL, falling back to /api if missing.
  const baseURL = (import.meta.dev ? '/api' : (config.public?.apiUrl as string) || '/api')

  const apiFetch = $fetch.create({
    baseURL,
    async onResponseError({ response }) {
      if (response.status === 401) {
        // Future: Handle session expiration/refresh
        console.warn('API returned 401 Unauthorized')
      }
    }
  })

  return apiFetch
}
