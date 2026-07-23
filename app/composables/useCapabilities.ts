import { ref } from 'vue'

export interface CapabilityDto {
  id: string | number
  product_id: string | number
  name: string
  description?: string
  created_at?: string
  updated_at?: string
}

export function useCapabilities() {
  const { apiFetch } = useProductsApi()

  const capabilities = ref<CapabilityDto[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchCapabilitiesByProduct(productId: string | number) {
    loading.value = true
    error.value = null
    try {
      const data = await apiFetch<CapabilityDto[]>(`/products/${productId}/capabilities`, { method: 'GET' })
      capabilities.value = Array.isArray(data) ? data : []
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to load capabilities'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function getCapability(id: string | number) {
    return await apiFetch<CapabilityDto>(`/capabilities/${id}`, { method: 'GET' })
  }

  async function createCapability(payload: { product_id: string | number; name: string; description?: string }) {
    const data = await apiFetch<CapabilityDto>('/capabilities', {
      method: 'POST',
      body: payload
    })
    return data
  }

  async function updateCapability(id: string | number, payload: { name: string; description?: string }) {
    return await apiFetch<CapabilityDto>(`/capabilities/${id}`, {
      method: 'PUT',
      body: payload
    })
  }

  async function deleteCapability(id: string | number) {
    await apiFetch(`/capabilities/${id}`, { method: 'DELETE' })
  }

  async function createCapabilityStep(payload: { capability_id: string | number; flow_step_id: string | number; protocol?: string; target?: string }) {
    return await apiFetch('/capability-steps', {
      method: 'POST',
      body: payload
    })
  }

  async function deleteCapabilityStep(id: string | number) {
    await apiFetch(`/capability-steps/${id}`, { method: 'DELETE' })
  }

  return {
    capabilities,
    loading,
    error,
    fetchCapabilitiesByProduct,
    getCapability,
    createCapability,
    updateCapability,
    deleteCapability,
    createCapabilityStep,
    deleteCapabilityStep
  }
}
