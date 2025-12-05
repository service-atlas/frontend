import { ref } from 'vue'

export interface TeamDto {
  id: string
  name: string
  created?: string
  updated?: string
}

export function useTeams() {
  const config = useRuntimeConfig()
  // In development, route through Nuxt dev proxy at /api to avoid CORS.
  // In production, use the configured absolute API URL, falling back to /api if missing.
  const baseURL = (import.meta.dev ? '/api' : (config.public?.apiUrl as string) || '/api')

  const teams = ref<TeamDto[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const client = $fetch.create({ baseURL })

  async function fetchTeams() {
    loading.value = true
    error.value = null
    try {
      const data = await client<TeamDto[]>('/teams?page=1&pageSize=100', { method: 'GET' })
      teams.value = Array.isArray(data) ? data : []
    } catch (e: any) {
      error.value = e?.message ?? 'Failed to load teams'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function getTeam(id: string) {
    return await client<TeamDto>(`/teams/${id}`, { method: 'GET' })
  }

  async function createTeam(payload: { name: string }) {
    await client('/teams', { method: 'POST', body: payload })
    // refresh local list
    await fetchTeams()
  }

  async function updateTeam(payload: { id: string; name: string }) {
    await client(`/teams/${payload.id}`, { method: 'PUT', body: payload })
    await fetchTeams()
  }

  async function deleteTeam(id: string) {
    await client(`/teams/${id}`, { method: 'DELETE' })
    await fetchTeams()
  }

  return {
    // state
    teams,
    loading,
    error,
    // operations
    fetchTeams,
    getTeam,
    createTeam,
    updateTeam,
    deleteTeam
  }
}
