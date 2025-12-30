import { ref } from 'vue'

export interface ServiceDto {
  id: string
  name: string
  type?: string
  description?: string
  url?: string
  tier?: number
  created?: string
  updated?: string
}

export function useServices() {
  const config = useRuntimeConfig()
  // In development, route through Nuxt dev proxy at /api to avoid CORS.
  // In production, use the configured absolute API URL, falling back to /api if missing.
  const baseURL = (import.meta.dev ? '/api' : (config.public?.apiUrl as string) || '/api')

  const services = ref<ServiceDto[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const client = $fetch.create({ baseURL })

  async function fetchServices() {
    loading.value = true
    error.value = null
    try {
      const data = await client<ServiceDto[]>('/services?page=1&pageSize=100', { method: 'GET' })
      services.value = Array.isArray(data) ? data : []
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to load services'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function getService(id: string) {
    return await client<ServiceDto>(`/services/${id}`, { method: 'GET' })
  }

  async function searchServices(query: string) {
    loading.value = true
    error.value = null
    try {
      const data = await client<ServiceDto[]>(`/services/search?query=${encodeURIComponent(query)}`, { method: 'GET' })
      return Array.isArray(data) ? data : []
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to search services'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function createService(payload: { name: string; type?: string }) {
    await client('/services', { method: 'POST', body: payload })
    await fetchServices()
  }

  async function updateService(payload: ServiceDto) {
    await client(`/services/${payload.id}`, { method: 'PUT', body: payload })
    await fetchServices()
  }

  async function deleteService(id: string) {
    await client(`/services/${id}`, { method: 'DELETE' })
    await fetchServices()
  }

  return {
    services,
    loading,
    error,
    fetchServices,
    getService,
    searchServices,
    createService,
    updateService,
    deleteService
  }
}
