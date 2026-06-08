import { ref } from 'vue'

export interface TeamDto {
  id: string
  name: string
  created?: string
  updated?: string
}

export function useTeams() {
  const apiFetch = useApi()

  const teams = ref<TeamDto[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchTeams() {
    loading.value = true
    error.value = null
    try {
      const pageSize = 100
      let page = 1
      let allTeams: TeamDto[] = []
      let hasMore = true

      while (hasMore) {
        const data = await apiFetch<TeamDto[]>(`/teams?page=${page}&pageSize=${pageSize}`, { method: 'GET' })
        const pageTeams = Array.isArray(data) ? data : []
        allTeams = [...allTeams, ...pageTeams]

        if (pageTeams.length < pageSize) {
          hasMore = false
        } else {
          page++
        }
      }

      teams.value = allTeams
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to load teams'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function getTeam(id: string) {
    return await apiFetch<TeamDto>(`/teams/${id}`, { method: 'GET' })
  }

  async function createTeam(payload: { name: string }) {
    await apiFetch('/teams', { method: 'POST', body: payload })
    // refresh local list
    await fetchTeams()
  }

  async function updateTeam(payload: { id: string, name: string }) {
    await apiFetch(`/teams/${payload.id}`, { method: 'PUT', body: payload })
    await fetchTeams()
  }

  async function deleteTeam(id: string) {
    await apiFetch(`/teams/${id}`, { method: 'DELETE' })
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
