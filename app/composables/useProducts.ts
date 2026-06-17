import { ref } from 'vue'

export interface ProductDto {
  id: string
  name: string
  description?: string
  platform_id: string
  flow_count?: number
  updated?: string
  created?: string
}

export function useProducts() {
  const { apiFetch } = useProductsApi()

  const products = ref<ProductDto[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchProductsByPlatform(platformId: string) {
    loading.value = true
    error.value = null
    try {
      const data = await apiFetch<ProductDto[]>(`/platforms/${platformId}/products`, { method: 'GET' })
      products.value = Array.isArray(data) ? data : []
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to load products'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function getProduct(id: string) {
    return await apiFetch<ProductDto>(`/products/${id}`, { method: 'GET' })
  }

  async function createProduct(payload: { name: string; description?: string; platform_id: string }) {
    const data = await apiFetch<ProductDto>('/products', { method: 'POST', body: payload })
    return data
  }

  async function updateProduct(id: string, payload: { name: string; description?: string }) {
    await apiFetch(`/products/${id}`, { method: 'PUT', body: payload })
  }

  async function deleteProduct(id: string) {
    await apiFetch(`/products/${id}`, { method: 'DELETE' })
  }

  return {
    products,
    loading,
    error,
    fetchProductsByPlatform,
    getProduct,
    createProduct,
    updateProduct,
    deleteProduct
  }
}
