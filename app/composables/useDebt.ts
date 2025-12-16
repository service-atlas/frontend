import { ref } from 'vue'

export interface DebtItemDto {
  id: string
  title: string
  type?: 'code' | 'documentation' | 'testing' | 'architecture' | 'infrastructure' | 'security'
  status: 'pending' | 'in_progress' | 'remediated'
  description?: string
  created?: string
  updated?: string
}

export function useDebt() {
  const config = useRuntimeConfig()
  const baseURL = (import.meta.dev ? '/api' : (config.public?.apiUrl as string) || '/api')
  const client = $fetch.create({ baseURL })

  const items = ref<DebtItemDto[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function listDebt(serviceId: string) {
    loading.value = true
    error.value = null
    try {
      const data = await client<DebtItemDto[]>(`/services/${serviceId}/debt`, { method: 'GET' })
      items.value = Array.isArray(data) ? data : []
    } catch (e: unknown) {
      // Treat no-debt responses as empty, not errors. Some backends return 404/204 or custom 4xx.
      const anyErr = e as unknown as {
        statusCode?: number
        status?: number
        response?: { status: number }
        message?: string
        code?: string
        error?: { code?: string }
      }
      const status = anyErr?.statusCode
        ?? anyErr?.status
        ?? anyErr?.response?.status
      const message: string | undefined = anyErr?.message

      const code: string | undefined = anyErr?.code ?? anyErr?.error?.code

      const isNoDebt = (
        status === 404
        || status === 204
        || code === 'DEBT_NOT_FOUND'
        || (typeof message === 'string' && /no\s+debt|not\s+found/i.test(message))
      )

      if (isNoDebt) {
        items.value = []
        error.value = null
        return
      }
      error.value = e instanceof Error ? e.message : 'Failed to load debt items'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function createDebt(
    serviceId: string,
    payload: {
      title: string
      type?: DebtItemDto['type']
      description?: string
      status?: DebtItemDto['status']
    }
  ) {
    await client(`/services/${serviceId}/debt`, { method: 'POST', body: payload })
    await listDebt(serviceId)
  }

  async function updateDebtStatus(serviceId: string, debtId: string, status: DebtItemDto['status']) {
    await client(`/debt/${debtId}`, { method: 'PATCH', body: { status } })
    await listDebt(serviceId)
  }

  return {
    items,
    loading,
    error,
    listDebt,
    createDebt,
    updateDebtStatus
  }
}
