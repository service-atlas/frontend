import { ref } from 'vue'

export function useReports() {
  const config = useRuntimeConfig()
  const baseURL = (import.meta.dev ? '/api' : (config.public?.apiUrl as string) || '/api')
  const client = $fetch.create({ baseURL })

  const loading = ref(false)
  const error = ref<string | null>(null)

  async function getServiceRisk(serviceId: string) {
    loading.value = true
    error.value = null
    try {
      // Return exactly what the API sends (camelCase expected)
      const data = await client<any>(`/reports/services/${serviceId}/risk`, { method: 'GET' })
      return data
    } catch (e: unknown) {
      const anyErr = e as any
      const status: number | undefined = anyErr?.statusCode || anyErr?.status || anyErr?.response?.status
      if (status === 400) error.value = 'Invalid service id.'
      else if (status === 404) error.value = 'The service was not found.'
      else error.value = e instanceof Error ? e.message : 'Failed to load service risk report.'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function getServicesByTeam(teamId: string) {
    loading.value = true
    error.value = null
    try {
      // Return payload exactly as provided by the API (array of services)
      const data = await client<any>(`/teams/${teamId}/services`, { method: 'GET' })
      return Array.isArray(data) ? data : []
    } catch (e: unknown) {
      const anyErr = e as any
      const status: number | undefined = anyErr?.statusCode || anyErr?.status || anyErr?.response?.status
      if (status === 404) {
        // Treat not-found as empty list (team has no services or team not found)
        return []
      }
      error.value = e instanceof Error ? e.message : 'Failed to load services for team.'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function getReleasesInRange(startDate: string, endDate: string, page: number = 1, pageSize: number = 25) {
    loading.value = true
    error.value = null
    try {
      // Backend returns a flat array with snake_case fields
      const query = new URLSearchParams({
        page: String(page ?? 1),
        pageSize: String(pageSize ?? 25)
      })
      const data = await client<any>(`/releases/${startDate}/${endDate}?${query.toString()}`, { method: 'GET' })
      return Array.isArray(data) ? data : []
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to load releases.'
      throw e
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    error,
    getServiceRisk,
    getServicesByTeam,
    getReleasesInRange
  }
}
