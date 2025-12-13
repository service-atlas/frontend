import { ref } from 'vue'

export interface ReleaseDto {
  id?: string
  url?: string | null
  version?: string | null
  release_date?: string // ISO string in UTC
}

export function useReleases() {
  const config = useRuntimeConfig()
  const baseURL = (import.meta.dev ? '/api' : (config.public?.apiUrl as string) || '/api')
  const client = $fetch.create({ baseURL })

  const items = ref<ReleaseDto[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function listReleases(serviceId: string) {
    loading.value = true
    error.value = null
    try {
      const data = await client<ReleaseDto[]>(`/services/${serviceId}/release`, { method: 'GET' })
      items.value = Array.isArray(data) ? data : []
    } catch (e: unknown) {
      const anyErr = e as never
      const status = anyErr?.statusCode
        ?? anyErr?.status
        ?? anyErr?.response?.status
        ?? anyErr?.data?.statusCode
        ?? anyErr?.data?.status

      const message: string | undefined = anyErr?.statusMessage
        ?? anyErr?.data?.message
        ?? anyErr?.message

      const code: string | undefined = anyErr?.data?.code || anyErr?.code

      const isNoReleases = (
        status === 404
        || status === 204
        || code === 'RELEASES_NOT_FOUND'
        || (typeof message === 'string' && /no\s+releases?|not\s+found/i.test(message))
      )

      if (isNoReleases) {
        items.value = []
        error.value = null
        return
      }
      error.value = e instanceof Error ? e.message : 'Failed to load releases'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function createRelease(
    serviceId: string,
    payload: {
      url?: string
      version?: string
      release_date?: string
    }
  ) {
    // Backend will default release_date to current UTC if not provided.
    await client(`/services/${serviceId}/release`, { method: 'POST', body: payload })
    await listReleases(serviceId)
  }

  return {
    items,
    loading,
    error,
    listReleases,
    createRelease
  }
}
