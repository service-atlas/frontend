import { ref } from 'vue'

export interface ServiceDto {
  id: string
  name: string
  type?: string
  description?: string
  url?: string
  tier?: number
  exposure?: 'public' | 'private' | 'mixed'
  impact_domain?: string[]
  created?: string
  updated?: string
}

export function useServices() {
  const apiFetch = useApi()

  const services = ref<ServiceDto[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchServices() {
    loading.value = true
    error.value = null
    try {
      const data = await apiFetch<ServiceDto[]>('/services?page=1&pageSize=100', { method: 'GET' })
      services.value = Array.isArray(data) ? data : []
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to load services'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function getService(id: string) {
    return await apiFetch<ServiceDto>(`/services/${id}`, { method: 'GET' })
  }

  async function searchServices(query: string) {
    loading.value = true
    error.value = null
    try {
      const data = await apiFetch<ServiceDto[]>(`/services/search?query=${encodeURIComponent(query)}`, { method: 'GET' })
      return Array.isArray(data) ? data : []
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to search services'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function createService(payload: { name: string; type?: string; description?: string; url?: string }) {
    await apiFetch('/services', { method: 'POST', body: payload })
    await fetchServices()
  }

  async function updateService(payload: ServiceDto) {
    await apiFetch(`/services/${payload.id}`, { method: 'PUT', body: payload })
    await fetchServices()
  }

  async function deleteService(id: string) {
    await apiFetch(`/services/${id}`, { method: 'DELETE' })
    await fetchServices()
  }

  async function fetchServiceTypes() {
    return await apiFetch<{ type: string; count: number }[]>('/services/types', { method: 'GET' })
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
    deleteService,
    fetchServiceTypes
  }
}
