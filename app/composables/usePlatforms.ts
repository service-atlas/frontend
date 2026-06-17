import { ref } from 'vue'

export interface PlatformDto {
  id: string
  name: string
  description?: string
  product_count?: number
  updated?: string
  created?: string
}

export function usePlatforms() {
  const { apiFetch } = useProductsApi()

  const platforms = ref<PlatformDto[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchPlatforms() {
    loading.value = true
    error.value = null
    try {
      const data = await apiFetch<PlatformDto[]>('/platforms', { method: 'GET' })
      platforms.value = Array.isArray(data) ? data : []
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to load platforms'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function getPlatform(id: string) {
    return await apiFetch<PlatformDto>(`/platforms/${id}`, { method: 'GET' })
  }

  async function createPlatform(payload: { name: string; description?: string }) {
    const data = await apiFetch<PlatformDto>('/platforms', { method: 'POST', body: payload })
    await fetchPlatforms()
    return data
  }

  async function updatePlatform(id: string, payload: { name: string; description?: string }) {
    await apiFetch(`/platforms/${id}`, { method: 'PUT', body: payload })
    await fetchPlatforms()
  }

  async function deletePlatform(id: string) {
    await apiFetch(`/platforms/${id}`, { method: 'DELETE' })
    await fetchPlatforms()
  }

  return {
    platforms,
    loading,
    error,
    fetchPlatforms,
    getPlatform,
    createPlatform,
    updatePlatform,
    deletePlatform
  }
}
