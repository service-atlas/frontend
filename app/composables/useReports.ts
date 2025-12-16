import { ref } from 'vue'

export interface ServiceRiskReportDto {
  DebtCount: Record<string, number>
  DependentCount: number
}

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
      const data = await client<ServiceRiskReportDto>(`/reports/services/${serviceId}/risk`, { method: 'GET' })
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

  return {
    loading,
    error,
    getServiceRisk
  }
}
