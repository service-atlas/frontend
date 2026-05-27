<script setup lang="ts">
import { ref as _ref, onMounted, computed, watch } from 'vue'
import type { ServiceDto } from '~/composables/useServices'
import { useServices } from '~/composables/useServices'
import { useTeams } from '~/composables/useTeams'
import { useReports } from '~/composables/useReports'

definePageMeta({
  title: 'Services'
})

const {
  services,
  loading,
  error,
  fetchServices,
  searchServices,
  createService,
  deleteService
} = useServices()

onMounted(() => {
  fetchServices()
  loadTeamData()
})

// Create modal state
const showCreate = _ref(false)
const createName = _ref('')
const createType = _ref('')
const createDescription = _ref('')
const createUrl = _ref('')
const canCreate = computed(() => createName.value.trim().length > 0)

// Type suggestions based on existing data
const existingTypes = computed(() => {
  const set = new Set<string>()
  for (const s of services.value) {
    if (s.type && s.type.trim().length > 0) set.add(s.type.trim())
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b))
})

const filteredTypes = computed(() => {
  const q = createType.value.trim().toLowerCase()
  if (!q) return existingTypes.value
  return existingTypes.value.filter(t => t.toLowerCase().includes(q))
})
const showTypeSuggestions = _ref(false)

async function _handleCreate() {
  if (!canCreate.value) return
  const payload: { name: string, type?: string, description?: string, url?: string } = { name: createName.value.trim() }
  const t = createType.value.trim()
  if (t) payload.type = t
  const desc = createDescription.value.trim()
  if (desc) payload.description = desc
  const url = createUrl.value.trim()
  if (url) payload.url = url

  await createService(payload)
  createName.value = ''
  createType.value = ''
  createDescription.value = ''
  createUrl.value = ''
  showTypeSuggestions.value = false
  showCreate.value = false
}

// Search state
const searchQuery = _ref('')
const searchResults = _ref<ServiceDto[]>([])
const hasQuery = computed(() => searchQuery.value.trim().length > 0)
const displayedServices = computed(() => hasQuery.value ? searchResults.value : services.value)

// Grouping state
const groupBy = _ref<'type' | 'tier' | 'team'>('type')
const groupByOptions = [
  { label: 'Type', value: 'type' },
  { label: 'Tier', value: 'tier' },
  { label: 'Team', value: 'team' }
]

const { teams, fetchTeams } = useTeams()
const { getServicesByTeam } = useReports()
const teamServicesMap = _ref<Record<string, ServiceDto[]>>({})
const loadingTeamsData = _ref(false)
const combinedLoading = computed(() => loading.value || (groupBy.value === 'team' && loadingTeamsData.value))

const serviceTeamsMap = computed(() => {
  const map: Record<string, string[]> = {}
  const sortedTeamNames = Object.keys(teamServicesMap.value).sort()
  for (const teamName of sortedTeamNames) {
    for (const s of teamServicesMap.value[teamName]) {
      if (!map[s.id]) map[s.id] = []
      map[s.id].push(teamName)
    }
  }
  return map
})

async function loadTeamData(force = false) {
  if (!force && Object.keys(teamServicesMap.value).length > 0) return
  loadingTeamsData.value = true
  try {
    await fetchTeams()
    const promises = teams.value.map(async (team) => {
      const svcs = await getServicesByTeam(team.id)
      return { teamName: team.name, services: svcs }
    })
    const results = await Promise.all(promises)
    const map: Record<string, ServiceDto[]> = {}
    for (const res of results) {
      map[res.teamName] = res.services
    }
    teamServicesMap.value = map
  } catch (e) {
    console.error('Failed to load team data', e)
  } finally {
    loadingTeamsData.value = false
  }
}

watch(groupBy, (val) => {
  if (val === 'team') {
    loadTeamData()
  }
})

const groupedServices = computed(() => {
  const groups: Record<string, ServiceDto[]> = {}
  const key = groupBy.value

  if (key === 'type') {
    for (const s of displayedServices.value) {
      const type = s.type || 'Other'
      if (!groups[type]) groups[type] = []
      groups[type].push(s)
    }
  } else if (key === 'tier') {
    for (const s of displayedServices.value) {
      const t = s.tier !== undefined ? `Tier ${s.tier}` : 'No Tier'
      if (!groups[t]) groups[t] = []
      groups[t].push(s)
    }
  } else if (key === 'team') {
    for (const teamName in teamServicesMap.value) {
      const svcs = teamServicesMap.value[teamName]
      const filtered = svcs.filter(s => displayedServices.value.some(ds => ds.id === s.id))
      if (filtered.length > 0) {
        groups[teamName] = filtered
      }
    }
    // Services not in any team
    const allAssignedServiceIds = new Set(Object.values(teamServicesMap.value).flat().map(s => s.id))
    const unassigned = displayedServices.value.filter(s => !allAssignedServiceIds.has(s.id))
    if (unassigned.length > 0) {
      groups['No Team'] = unassigned
    }
  }

  // Sort group names
  return Object.keys(groups)
    .sort((a, b) => {
      if (a === 'Other' || a === 'No Tier' || a === 'No Team') return 1
      if (b === 'Other' || b === 'No Tier' || b === 'No Team') return -1
      return a.localeCompare(b)
    })
    .map(name => ({
      type: name,
      services: groups[name].sort((a, b) => a.name.localeCompare(b.name))
    }))
})

async function runSearch(q: string) {
  const query = q.trim()
  if (!query) {
    searchResults.value = []
    return
  }
  try {
    const data = await searchServices(query)
    searchResults.value = data
  } catch {
    // error reactive state is handled in composable; keep prior results on error
  }
}

let _searchTimer: ReturnType<typeof setTimeout> | null = null
watch(searchQuery, (q) => {
  if (_searchTimer) clearTimeout(_searchTimer)
  _searchTimer = setTimeout(() => {
    runSearch(q)
  }, 300)
})

function refresh() {
  if (hasQuery.value) {
    runSearch(searchQuery.value)
  } else {
    fetchServices()
  }
  if (groupBy.value === 'team') {
    loadTeamData(true)
  }
}

// Delete confirm state
const showDelete = _ref(false)
const toDeleteId = _ref<string | null>(null)

// Collapsed groups state
const collapsedGroups = _ref<Set<string>>(new Set())

function toggleGroup(type: string) {
  if (collapsedGroups.value.has(type)) {
    collapsedGroups.value.delete(type)
  } else {
    collapsedGroups.value.add(type)
  }
}

function confirmDelete(id: string) {
  toDeleteId.value = id
  showDelete.value = true
}

async function _handleDelete() {
  if (!toDeleteId.value) return
  try {
    await deleteService(toDeleteId.value)
    toDeleteId.value = null
    showDelete.value = false
  } catch {
    throw new Error('Failed to delete service.')
  }
}
</script>

<template>
  <div>
    <UPageSection
      title="Manage Services"
      description="Create new services and manage existing ones."
    >
      <div class="flex items-center justify-between gap-2 mb-3">
        <UButton
          icon="lucide:plus"
          label="New Service"
          @click="showCreate = true"
        />

        <div class="flex items-center gap-2">
          <USelect
            v-model="groupBy"
            :items="groupByOptions"
            icon="lucide:layers"
            class="w-32"
          />
          <UInput
            v-model="searchQuery"
            placeholder="Search services…"
            icon="lucide:search"
          />
          <UButton
            v-if="hasQuery"
            color="neutral"
            variant="ghost"
            icon="lucide:x"
            aria-label="Clear search"
            @click="searchQuery = ''"
          />
          <UButton
            icon="lucide:rotate-cw"
            color="neutral"
            variant="ghost"
            :loading="combinedLoading"
            aria-label="Refresh"
            @click="refresh()"
          />
        </div>
      </div>

      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <span class="font-medium">Services</span>
            <span
              v-if="combinedLoading"
              class="text-(--ui-text-muted) text-sm"
            >Loading…</span>
          </div>
        </template>

        <div
          v-if="error"
          class="text-red-600 text-sm mb-2"
        >
          {{ error }}
        </div>

        <div
          v-if="!loading && displayedServices.length === 0"
          class="text-(--ui-text-muted)"
        >
          <template v-if="hasQuery">
            No results found.
          </template>
          <template v-else>
            No services yet. Create your first service to get started.
          </template>
        </div>

        <div
          v-else
          class="flex flex-col"
        >
          <div
            v-for="group in groupedServices"
            :key="group.type"
            class="mb-2 last:mb-0"
          >
            <button
              class="w-full flex items-center justify-between gap-2 p-2 rounded-md bg-(--ui-bg-muted) hover:bg-(--ui-border-muted) transition-colors text-left"
              @click="toggleGroup(group.type)"
            >
              <div class="flex items-center gap-2">
                <UIcon
                  :name="collapsedGroups.has(group.type) ? 'lucide:chevron-right' : 'lucide:chevron-down'"
                  class="w-4 h-4 text-(--ui-text-muted)"
                />
                <h3 class="text-sm font-semibold uppercase tracking-wider">
                  {{ group.type }}
                </h3>
                <span class="text-xs text-(--ui-text-muted) px-2 py-0.5 rounded-full bg-(--ui-bg-elevated) border border-(--ui-border)">
                  {{ group.services.length }}
                </span>
              </div>
            </button>

            <div
              v-if="!collapsedGroups.has(group.type)"
              class="flex flex-col divide-y divide-(--ui-border-muted) px-2"
            >
              <div
                v-for="s in group.services"
                :key="s.id"
                class="py-3 flex items-center justify-between gap-3"
              >
                <div class="min-w-0">
                  <NuxtLink
                    class="font-medium truncate hover:underline block"
                    :to="`/service/${s.id}`"
                  >
                    {{ s.name }}
                  </NuxtLink>
                  <div class="flex items-center gap-x-3 text-xs text-(--ui-text-muted) mt-0.5 overflow-hidden">
                    <span
                      v-if="groupBy !== 'type' && s.type"
                      class="flex items-center gap-1 flex-shrink-0"
                    >
                      <UIcon
                        name="lucide:tag"
                        class="w-3.5 h-3.5"
                      />
                      {{ s.type }}
                    </span>
                    <span
                      v-if="groupBy !== 'tier' && s.tier !== undefined"
                      class="flex items-center gap-1 flex-shrink-0"
                    >
                      <UIcon
                        name="lucide:layers"
                        class="w-3.5 h-3.5"
                      />
                      Tier {{ s.tier }}
                    </span>
                    <span
                      v-if="groupBy !== 'team' && serviceTeamsMap[s.id]?.length"
                      class="flex items-center gap-1 truncate"
                    >
                      <UIcon
                        name="lucide:users"
                        class="w-3.5 h-3.5 flex-shrink-0"
                      />
                      <span class="truncate">{{ serviceTeamsMap[s.id].join(', ') }}</span>
                    </span>
                    <a
                      v-if="s.url"
                      :href="s.url"
                      target="_blank"
                      class="flex items-center gap-1 text-(--ui-primary) hover:underline flex-shrink-0"
                    >
                      <UIcon
                        name="i-lucide-link"
                        class="size-3.5"
                      />
                      External Link
                    </a>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <UButton
                    size="sm"
                    icon="lucide:trash"
                    color="neutral"
                    variant="ghost"
                    label="Delete"
                    @click="confirmDelete(s.id)"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </UCard>
    </UPageSection>

    <!-- Create Modal -->
    <UModal v-model:open="showCreate">
      <template #header>
        Create Service
      </template>
      <template #body>
        <UForm @submit.prevent="_handleCreate" class="space-y-4">
          <UFormField label="Service name">
            <UInput
              v-model="createName"
              autofocus
              placeholder="e.g. Payments API"
              style="margin-bottom: 0.5rem !important;"
              @keyup.enter="_handleCreate"
            />
          </UFormField>
          <UFormField label="Service type" description="Pick an existing type or enter a new one">
            <div>
              <UInput
                v-model="createType"
                placeholder="e.g. API, Web, Worker"
                @focus="showTypeSuggestions = true"
                @blur="setTimeout(() => showTypeSuggestions = false, 150)"
              />
              <div
                v-if="showTypeSuggestions && filteredTypes.length > 0"
                class="mt-1 w-full rounded-md border border-(--ui-border) bg-(--ui-bg-elevated) shadow-lg max-h-56 overflow-auto"
              >
                <button
                  v-for="t in filteredTypes"
                  :key="t"
                  type="button"
                  class="w-full text-left px-3 py-2 hover:bg-(--ui-bg-muted) text-sm"
                  @mousedown.prevent="createType = t; showTypeSuggestions = false"
                >
                  {{ t }}
                </button>
              </div>
            </div>
          </UFormField>
          <UFormField label="URL">
            <UInput
              v-model="createUrl"
              placeholder="https://example.com"
            />
          </UFormField>
          <UFormField label="Description">
            <UTextarea
              v-model="createDescription"
              placeholder="Service description..."
            />
          </UFormField>
        </UForm>
      </template>
      <template #footer>
        <UButton
          color="neutral"
          variant="ghost"
          label="Cancel"
          @click="showCreate = false"
        />
        <UButton
          icon="lucide:plus"
          :disabled="!canCreate || loading"
          label="Create"
          @click="_handleCreate"
        />
      </template>
    </UModal>

    <!-- Delete Modal -->
    <UModal v-model:open="showDelete">
      <template #header>
        Delete Service
      </template>
      <template #body>
        Are you sure you want to delete this service?
      </template>
      <template #footer>
        <UButton
          color="neutral"
          variant="ghost"
          label="Cancel"
          @click="showDelete = false"
        />
        <UButton
          icon="lucide:trash"
          color="warning"
          :loading="loading"
          label="Delete"
          @click="_handleDelete"
        />
      </template>
    </UModal>
  </div>
</template>
