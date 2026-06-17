import { ref } from 'vue'

export interface FlowDto {
  id: string
  name: string
  description?: string
  product_id: string
  step_count?: number
  status?: string
  updated?: string
  created?: string
}

export function useFlows() {
  const { apiFetch } = useProductsApi()

  const flows = ref<FlowDto[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchFlowsByProduct(productId: string) {
    loading.value = true
    error.value = null
    try {
      const data = await apiFetch<FlowDto[]>(`/products/${productId}/flows`, { method: 'GET' })
      flows.value = Array.isArray(data) ? data : []
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to load flows'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function getFlow(id: string) {
    return await apiFetch<FlowDto>(`/flows/${id}`, { method: 'GET' })
  }

  async function createFlow(payload: { name: string; description?: string; product_id: string }) {
    const data = await apiFetch<FlowDto>('/flows', { method: 'POST', body: payload })
    return data
  }

  async function updateFlow(id: string, payload: { name: string; description?: string; status?: string }) {
    await apiFetch(`/flows/${id}`, { method: 'PUT', body: payload })
  }

  async function deleteFlow(id: string) {
    await apiFetch(`/flows/${id}`, { method: 'DELETE' })
  }

  return {
    flows,
    loading,
    error,
    fetchFlowsByProduct,
    getFlow,
    createFlow,
    updateFlow,
    deleteFlow
  }
}
