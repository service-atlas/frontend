<script setup lang="ts">
import { ref as _ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useServices } from '~/composables/useServices'
import type { ServiceDto as ServiceItemDto } from '~/composables/useServices'
import { useTeams } from '~/composables/useTeams'
import type { TeamDto } from '~/composables/useTeams'
import { useDebt } from '~/composables/useDebt'
import type { DebtItemDto } from '~/composables/useDebt'

definePageMeta({
  title: 'Service'
})

const route = useRoute()
const serviceId = computed(() => String(route.params.id || ''))

const { getService, services, fetchServices } = useServices()
const { teams, fetchTeams } = useTeams()
const debt = useDebt()

const config = useRuntimeConfig()
// In development, route through Nuxt dev proxy at /api to avoid CORS.
// In production, use the configured absolute API URL, falling back to /api if missing.
const baseURL = (import.meta.dev ? '/api' : (config.public?.apiUrl as string) || '/api')
const client = $fetch.create({ baseURL })

type ServiceDto = Awaited<ReturnType<typeof getService>>

type DependencyDto = {
  id: string
  name?: string
  version?: string | null
}

const service = _ref<ServiceDto | null>(null)
const loading = _ref(false)
const error = _ref<string | null>(null)

// Assigned teams for this service
const assigned = _ref<TeamDto[]>([])

// Dropdown state
const selectedTeamId = _ref<string | null>(null)

const unassignedTeams = computed(() => {
  const assignedIds = new Set(assigned.value.map(t => t.id))
  return teams.value.filter(t => !assignedIds.has(t.id))
})

// Dependencies state
const dependencies = _ref<DependencyDto[]>([])
const showAddDependency = _ref(false)
const selectedDependencyId = _ref<string | null>(null)
const selectedDependencyVersion = _ref<string>('')

const dependentIds = computed(() => new Set(dependencies.value.map(d => d.id)))
const availableDependencyOptions = computed(() => {
  const currentId = serviceId.value
  return (services.value || [])
    .filter(s => s.id !== currentId && !dependentIds.value.has(s.id))
    .map(s => ({ label: s.name, value: s.id }))
})

const serviceById = computed(() => {
  const map = new Map<string, ServiceItemDto>()
  for (const s of services.value || []) map.set(s.id, s)
  return map
})

async function loadAll() {
  if (!serviceId.value) return
  loading.value = true
  error.value = null
  try {
    // parallelize fetches
    const [svc] = await Promise.all([
      getService(serviceId.value),
      fetchTeams().catch(() => undefined),
      fetchAssignedTeams().catch(() => undefined),
      debt.listDebt(serviceId.value).catch(() => undefined),
      fetchDependencies().catch(() => undefined),
      fetchServices().catch(() => undefined)
    ])
    service.value = svc
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to load service.'
  } finally {
    loading.value = false
  }
}

async function fetchAssignedTeams() {
  if (!serviceId.value) return
  const data = await client<TeamDto[]>(`/services/${serviceId.value}/teams`, { method: 'GET' })
  assigned.value = Array.isArray(data) ? data : []
}

async function fetchDependencies() {
  if (!serviceId.value) return
  const data = await client<DependencyDto[]>(`/services/${serviceId.value}/dependencies`, { method: 'GET' })
  dependencies.value = Array.isArray(data) ? data : []
}

async function addDependency() {
  if (!serviceId.value || !selectedDependencyId.value) return
  try {
    loading.value = true
    await client(`/services/${serviceId.value}/dependency`, {
      method: 'POST',
      body: {
        id: selectedDependencyId.value,
        version: selectedDependencyVersion.value.trim() || undefined
      }
    })
    selectedDependencyId.value = null
    selectedDependencyVersion.value = ''
    showAddDependency.value = false
    await fetchDependencies()
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to add dependency.'
  } finally {
    loading.value = false
  }
}

async function removeDependency(targetId: string) {
  if (!serviceId.value) return
  try {
    loading.value = true
    await client(`/services/${serviceId.value}/dependency/${targetId}`, { method: 'DELETE' })
    await fetchDependencies()
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to remove dependency.'
  } finally {
    loading.value = false
  }
}

async function addTeam() {
  if (!serviceId.value || !selectedTeamId.value) return
  try {
    loading.value = true
    // Backend expects PUT /teams/:teamId/services/:serviceId
    await client(`/teams/${selectedTeamId.value}/services/${serviceId.value}`, {
      method: 'PUT'
    })
    selectedTeamId.value = null
    await fetchAssignedTeams()
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to add team.'
  } finally {
    loading.value = false
  }
}

async function removeTeam(teamId: string) {
  if (!serviceId.value) return
  try {
    loading.value = true
    // Backend expects DELETE /teams/:teamId/services/:serviceId
    await client(`/teams/${teamId}/services/${serviceId.value}`, { method: 'DELETE' })
    await fetchAssignedTeams()
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to remove team.'
  } finally {
    loading.value = false
  }
}

// Confirm remove modal state
const showRemoveConfirm = _ref(false)
const teamToRemove = _ref<TeamDto | null>(null)

function openRemoveConfirm(team: TeamDto) {
  teamToRemove.value = team
  showRemoveConfirm.value = true
}

async function _handleConfirmRemove() {
  if (!teamToRemove.value) return
  try {
    await removeTeam(teamToRemove.value.id)
  } finally {
    // Always close modal, error (if any) is shown in alert area
    showRemoveConfirm.value = false
    teamToRemove.value = null
  }
}

// Debt: create modal state and helpers
const showCreateDebt = _ref(false)
const newDebtTitle = _ref('')
const newDebtType = _ref<DebtItemDto['type'] | null>(null)
const newDebtDescription = _ref('')
const newDebtStatus = _ref<DebtItemDto['status']>('pending')

const debtStatusItems = [
  { label: 'Pending', value: 'pending' },
  { label: 'In progress', value: 'in_progress' },
  { label: 'Remediated', value: 'remediated' }
]

const debtTypeItems = [
  { label: 'Code', value: 'code' },
  { label: 'Documentation', value: 'documentation' },
  { label: 'Testing', value: 'testing' },
  { label: 'Architecture', value: 'architecture' },
  { label: 'Infrastructure', value: 'infrastructure' },
  { label: 'Security', value: 'security' }
]

const canCreateDebt = computed(() => newDebtTitle.value.trim().length > 0)

async function handleCreateDebt() {
  if (!serviceId.value || !canCreateDebt.value) return
  try {
    loading.value = true
    await debt.createDebt(serviceId.value, {
      title: newDebtTitle.value.trim(),
      type: newDebtType.value || undefined,
      description: newDebtDescription.value.trim() || undefined,
      status: newDebtStatus.value
    })
    showCreateDebt.value = false
    newDebtTitle.value = ''
    newDebtType.value = null
    newDebtDescription.value = ''
    newDebtStatus.value = 'pending'
  } catch {
    // error surfaced via debt.error
  } finally {
    loading.value = false
  }
}

async function handleUpdateDebtStatus(item: DebtItemDto, status: DebtItemDto['status']) {
  if (!serviceId.value) return
  try {
    await debt.updateDebtStatus(serviceId.value, item.id, status)
  } catch {
    // error surfaced via debt.error
  }
}

onMounted(() => {
  loadAll()
})
</script>

<template>
  <div>
    <UPageSection
      :title="service?.name || 'Service'"
      :description="service?.type ? `Type: ${service.type}` : undefined"
    >
      <!-- Full-width Service Info and Teams Card -->
      <UCard class="mb-4">
        <template #header>
          <div class="flex items-center justify-between w-full">
            <div class="font-medium">
              Service details
            </div>
            <span v-if="loading" class="text-(--ui-text-muted) text-sm">
              Loading…
            </span>
          </div>
        </template>

        <div class="space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div class="text-xs text-(--ui-text-muted)">
                Service ID
              </div>
              <div class="font-mono text-sm break-all">
                {{ service?.id }}
              </div>
            </div>
            <div>
              <div class="text-xs text-(--ui-text-muted)">
                Type
              </div>
              <div class="text-sm">
                {{ service?.type || '—' }}
              </div>
            </div>
            <div>
              <div class="text-xs text-(--ui-text-muted)">
                Created
              </div>
              <div class="text-sm">
                {{ service?.created ? new Date(service.created).toLocaleString() : '—' }}
              </div>
            </div>
            <div>
              <div class="text-xs text-(--ui-text-muted)">
                Updated
              </div>
              <div class="text-sm">
                {{ service?.updated ? new Date(service.updated).toLocaleString() : '—' }}
              </div>
            </div>
          </div>

          <div>
            <div class="font-medium mb-2">
              Teams
            </div>

            <div class="flex flex-wrap items-center gap-2 mb-3">
              <USelect
                v-model="selectedTeamId"
                :items="unassignedTeams.map(t => ({ label: t.name, value: t.id }))"
                placeholder="Add team…"
                class="min-w-[220px]"
              />
              <UButton
                icon="lucide:plus"
                :disabled="!selectedTeamId || loading"
                label="Add"
                @click="addTeam"
              />
            </div>

            <div v-if="assigned.length === 0" class="text-(--ui-text-muted) text-sm">
              No teams assigned yet.
            </div>
            <div v-else class="flex flex-wrap gap-2">
              <span
                v-for="t in assigned"
                :key="t.id"
                class="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-(--ui-bg-elevated) border border-(--ui-border) text-sm"
              >
                <span class="truncate max-w-[200px]">
                  {{ t.name }}
                </span>
                <UButton
                  size="xs"
                  color="neutral"
                  variant="ghost"
                  icon="lucide:x"
                  aria-label="Remove team"
                  @click="openRemoveConfirm(t)"
                />
              </span>
            </div>
          </div>

          <UAlert
            v-if="error"
            color="error"
            variant="subtle"
            class="mt-2"
          >
            {{ error }}
          </UAlert>
        </div>
      </UCard>

      <!-- Two half-width cards (Debt, Dependencies) -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <UCard>
          <template #header>
            <div class="font-medium">
              Debt
            </div>
          </template>
          <div>
            <div class="flex items-center justify-between mb-3">
              <p class="text-(--ui-text-muted) text-sm">
                Track technical debt items for this service.
              </p>
              <UButton
                icon="lucide:plus"
                label="New"
                :disabled="loading"
                @click="showCreateDebt = true"
              />
            </div>
            <p v-if="debt.loading.value === true" class="text-(--ui-text-muted) text-sm">
              Loading debts…
            </p>
            <div v-else>
              <p v-if="debt.items.value.length === 0" class="text-(--ui-text-muted) text-sm">
                No debts to display.
              </p>
              <div v-else class="space-y-2">
                <div
                  v-for="d in debt.items.value"
                  :key="d.id"
                  class="flex items-start justify-between gap-3 p-3 rounded-md border border-(--ui-border) bg-(--ui-bg-elevated)"
                >
                  <div class="min-w-0">
                    <div class="flex items-center gap-2">
                      <span class="font-medium truncate">{{ d.title }}</span>
                      <span v-if="d.type" class="px-2 py-0.5 rounded-md text-xs bg-(--ui-bg-muted)">{{ d.type }}</span>
                    </div>
                    <p v-if="d.description" class="text-sm text-(--ui-text-muted) truncate max-w-[480px]">
                      {{ d.description }}
                    </p>
                  </div>
                  <div class="flex items-center gap-2 shrink-0">
                    <USelect
                      :items="debtStatusItems"
                      :model-value="d.status"
                      class="min-w-[150px]"
                      @update:model-value="(v) => handleUpdateDebtStatus(d, v as DebtItemDto['status'])"
                    />
                  </div>
                </div>
              </div>
            </div>

            <UAlert
              v-if="debt.error && debt.items.length > 0"
              color="error"
              variant="subtle"
              class="mt-3"
            >
              {{ debt.error }}
            </UAlert>
          </div>
        </UCard>

        <!-- Create Debt Modal -->
        <UModal v-model:open="showCreateDebt">
          <template #header>
            New Debt Item
          </template>
          <template #body>
            <UForm>
              <UFormField label="Title" required>
                <UInput v-model="newDebtTitle" placeholder="e.g. Replace legacy library" />
              </UFormField>
              <UFormField label="Type" description="Categorize the debt">
                <USelect v-model="newDebtType" :items="debtTypeItems" class="min-w-[200px]" />
              </UFormField>
              <UFormField label="Status">
                <USelect v-model="newDebtStatus" :items="debtStatusItems" class="min-w-[200px]" />
              </UFormField>
              <UFormField label="Description">
                <UTextarea v-model="newDebtDescription" placeholder="Add more details…" />
              </UFormField>
            </UForm>
          </template>
          <template #footer>
            <UButton
              color="neutral"
              variant="ghost"
              label="Cancel"
              @click="showCreateDebt = false"
            />
            <UButton
              icon="lucide:plus"
              :disabled="!canCreateDebt || loading"
              :loading="loading"
              label="Create"
              @click="handleCreateDebt"
            />
          </template>
        </UModal>
        <UCard>
          <template #header>
            <div class="font-medium">
              Dependencies
            </div>
          </template>
          <div>
            <div class="flex items-center justify-between mb-3">
              <p class="text-(--ui-text-muted) text-sm">
                Services this service depends on.
              </p>
              <UButton
                icon="lucide:plus"
                label="Add dependency"
                :disabled="loading"
                @click="showAddDependency = true"
              />
            </div>

            <p v-if="loading && dependencies.length === 0" class="text-(--ui-text-muted) text-sm">
              Loading dependencies…
            </p>

            <div v-else>
              <p v-if="dependencies.length === 0" class="text-(--ui-text-muted) text-sm">
                No dependencies yet.
              </p>
              <div v-else class="space-y-2">
                <div
                  v-for="dep in dependencies"
                  :key="dep.id"
                  class="flex items-center justify-between gap-3 p-3 rounded-md border border-(--ui-border) bg-(--ui-bg-elevated)"
                >
                  <div class="min-w-0">
                    <div class="flex items-center gap-2">
                      <span class="font-medium truncate">
                        {{ serviceById.get(dep.id)?.name || dep.name || dep.id }}
                      </span>
                      <span v-if="dep.version" class="px-2 py-0.5 rounded-md text-xs bg-(--ui-bg-muted)">
                        v{{ dep.version }}
                      </span>
                    </div>
                    <div class="text-xs text-(--ui-text-muted) font-mono truncate">
                      {{ dep.id }}
                    </div>
                  </div>
                  <div class="shrink-0">
                    <UButton
                      size="xs"
                      color="neutral"
                      variant="ghost"
                      icon="lucide:trash"
                      aria-label="Remove dependency"
                      :disabled="loading"
                      @click="removeDependency(dep.id)"
                    />
                  </div>
                </div>
              </div>
            </div>

            <UAlert
              v-if="error"
              color="error"
              variant="subtle"
              class="mt-3"
            >
              {{ error }}
            </UAlert>
          </div>
        </UCard>
      </div>

      <!-- Full width Releases card -->
      <UCard>
        <template #header>
          <div class="font-medium">
            Releases
          </div>
        </template>
        <div class="text-(--ui-text-muted) text-sm">
          Placeholder — will be implemented later.
        </div>
      </UCard>
    </UPageSection>

    <!-- Confirm remove team modal -->
    <UModal v-model:open="showRemoveConfirm">
      <template #header>
        Remove Team
      </template>
      <template #body>
        <div>
          Are you sure you want to remove
          <span class="font-medium">{{ teamToRemove?.name }}</span>
          from this service?
        </div>
      </template>
      <template #footer>
        <UButton
          color="neutral"
          variant="ghost"
          label="Cancel"
          @click="showRemoveConfirm = false"
        />
        <UButton
          icon="lucide:trash"
          color="warning"
          :loading="loading"
          label="Remove"
          @click="_handleConfirmRemove"
        />
      </template>
    </UModal>
    <!-- Add Dependency Modal -->
    <UModal v-model:open="showAddDependency">
      <template #header>
        Add Dependency
      </template>
      <template #body>
        <UForm>
          <UFormField label="Service" required>
            <USelect
              v-model="selectedDependencyId"
              :items="availableDependencyOptions"
              placeholder="Select a service…"
              class="min-w-[260px]"
            />
          </UFormField>
          <UFormField label="Version" description="Optional">
            <UInput v-model="selectedDependencyVersion" placeholder="e.g. 1.5.0 (optional)" />
          </UFormField>
        </UForm>
      </template>
      <template #footer>
        <UButton
          color="neutral"
          variant="ghost"
          label="Cancel"
          @click="showAddDependency = false"
        />
        <UButton
          icon="lucide:plus"
          :disabled="!selectedDependencyId || loading"
          :loading="loading"
          label="Add"
          @click="addDependency"
        />
      </template>
    </UModal>
  </div>
</template>
