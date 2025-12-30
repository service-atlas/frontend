<script setup lang="ts">
import { ref as _ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useServices } from '~/composables/useServices'
import type { ServiceDto as ServiceItemDto } from '~/composables/useServices'
import { useTeams } from '~/composables/useTeams'
import type { TeamDto } from '~/composables/useTeams'
import { useDebt } from '~/composables/useDebt'
import type { DebtItemDto } from '~/composables/useDebt'
import { useReleases } from '~/composables/useReleases'

definePageMeta({
  title: 'Service'
})

const route = useRoute()
const serviceId = computed(() => String(route.params.id || ''))

const { getService, services, fetchServices } = useServices()
const { teams, fetchTeams } = useTeams()
const debt = useDebt()
const releases = useReleases()

const config = useRuntimeConfig()
// In development, route through Nuxt dev proxy at /api to avoid CORS.
// In production, use the configured absolute API URL, falling back to /api if missing.
const baseURL = (import.meta.dev ? '/api' : (config.public?.apiUrl as string) || '/api')
const client = $fetch.create({ baseURL })

type ServiceDto = Awaited<ReturnType<typeof getService>>

type DependencyDto = {
  id: string
  name?: string
  type?: string
  version?: string | null
}

// Dependents returned by GET /services/:id/dependents
type DependentDto = {
  id: string
  name?: string
  type?: string
}

type ReleaseCreatePayload = {
  url?: string
  version?: string
  release_date?: string
}

const service = _ref<ServiceDto | null>(null)
const loading = _ref(false)
const error = _ref<string | null>(null)

// Change Risk (from /reports/services/:id/change_risk)
type ChangeRiskDto = {
  risk?: string
  score?: number
}
const changeRisk = _ref<ChangeRiskDto | null>(null)
const changeRiskLoading = _ref(false)

async function fetchChangeRisk() {
  if (!serviceId.value) return
  changeRiskLoading.value = true
  try {
    const data = await client<ChangeRiskDto>(`/reports/services/${serviceId.value}/change_risk`, { method: 'GET' })
    changeRisk.value = data || null
  } catch {
    // Silent fail: leave changeRisk null so UI shows "unknown"
  } finally {
    changeRiskLoading.value = false
  }
}

const headerDescription = computed(() => {
  const parts: string[] = []
  if (service.value?.type) parts.push(`Type: ${service.value.type}`)
  const riskText = changeRiskLoading.value
    ? 'Change risk: Loading…'
    : `Change risk: ${(changeRisk.value?.risk ?? 'unknown')}${typeof changeRisk.value?.score === 'number' ? ` (${changeRisk.value.score})` : ''}`
  parts.push(riskText)
  return parts.join(' • ')
})

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

// Dependents state
const dependents = _ref<DependentDto[]>([])

// Releases state
const showAddRelease = _ref(false)
const newReleaseUrl = _ref('')
const newReleaseVersion = _ref('')
// We capture a local datetime string ('YYYY-MM-DDTHH:mm') and convert to UTC ISO if provided
const newReleaseDateLocal = _ref('')
const releaseFormError = _ref<string | null>(null)
const creatingRelease = _ref(false)

const dependentIds = computed(() => new Set(dependencies.value.map(d => d.id)))
const availableDependencyOptions = computed(() => {
  const currentId = serviceId.value
  return (services.value || [])
    .filter(s => s.id !== currentId && !dependentIds.value.has(s.id))
    .map(s => ({
      label: s.type ? `${s.name} (${s.type})` : s.name,
      value: s.id
    }))
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
      fetchDependents().catch(() => undefined),
      fetchServices().catch(() => undefined),
      releases.listReleases(serviceId.value).catch(() => undefined),
      fetchChangeRisk().catch(() => undefined)
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

function openAddRelease() {
  releaseFormError.value = null
  newReleaseUrl.value = ''
  newReleaseVersion.value = ''
  newReleaseDateLocal.value = ''
  showAddRelease.value = true
}

function toUtcIso(local: string): string | undefined {
  if (!local) return undefined
  // local is like '2025-05-15T14:30'
  const dt = new Date(local)
  if (Number.isNaN(dt.getTime())) return undefined
  return dt.toISOString()
}

function formatUtc(iso?: string): string {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ''
    return d.toISOString().replace('T', ' ').replace('Z', 'Z')
  } catch {
    return ''
  }
}

async function _handleCreateRelease() {
  if (!serviceId.value) return
  releaseFormError.value = null
  if (!newReleaseUrl.value && !newReleaseVersion.value) {
    releaseFormError.value = 'Please provide at least URL or Version.'
    return
  }
  const payload: ReleaseCreatePayload = {}
  if (newReleaseUrl.value) payload.url = newReleaseUrl.value
  if (newReleaseVersion.value) payload.version = newReleaseVersion.value
  const iso = toUtcIso(newReleaseDateLocal.value)
  if (iso) payload.release_date = iso
  try {
    creatingRelease.value = true
    await releases.createRelease(serviceId.value, payload)
    showAddRelease.value = false
  } catch (e) {
    releaseFormError.value = e instanceof Error ? e.message : 'Failed to create release'
  } finally {
    creatingRelease.value = false
  }
}

async function fetchDependencies() {
  if (!serviceId.value) return
  const data = await client<DependencyDto[]>(`/services/${serviceId.value}/dependencies`, { method: 'GET' })
  dependencies.value = Array.isArray(data) ? data : []
}

async function fetchDependents() {
  if (!serviceId.value) return
  const data = await client<DependentDto[]>(`/services/${serviceId.value}/dependents`, { method: 'GET' })
  dependents.value = Array.isArray(data) ? data : []
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

// Dependencies: confirm remove modal state and helpers
const showRemoveDepConfirm = _ref(false)
const depToRemove = _ref<DependencyDto | null>(null)

function openRemoveDepConfirm(dep: DependencyDto) {
  depToRemove.value = dep
  showRemoveDepConfirm.value = true
}

async function _handleConfirmRemoveDep() {
  if (!depToRemove.value) return
  try {
    await removeDependency(depToRemove.value.id)
  } finally {
    showRemoveDepConfirm.value = false
    depToRemove.value = null
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
      :description="headerDescription"
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

      <!-- Full-width Debt card -->
      <UCard class="mb-4">
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

      <!-- Two half-width cards (Dependencies, Dependents) -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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
                      <span v-if="serviceById.get(dep.id)?.type || dep.type" class="px-2 py-0.5 rounded-md text-xs bg-(--ui-bg-muted)">
                        {{ serviceById.get(dep.id)?.type || dep.type }}
                      </span>
                      <span v-if="dep.version" class="px-2 py-0.5 rounded-md text-xs bg-(--ui-bg-muted)">
                        v{{ dep.version }}
                      </span>
                    </div>
                  </div>
                  <div class="shrink-0">
                    <UButton
                      size="xs"
                      color="neutral"
                      variant="ghost"
                      icon="lucide:trash"
                      label="Remove"
                      aria-label="Remove dependency"
                      :disabled="loading"
                      @click="openRemoveDepConfirm(dep)"
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

        <UCard>
          <template #header>
            <div class="font-medium">
              Dependents
            </div>
          </template>
          <div>
            <p v-if="loading && dependents.length === 0" class="text-(--ui-text-muted) text-sm">
              Loading dependents…
            </p>

            <div v-else>
              <p v-if="dependents.length === 0" class="text-(--ui-text-muted) text-sm">
                No dependents yet.
              </p>
              <div v-else class="space-y-2">
                <div
                  v-for="dep in dependents"
                  :key="dep.id"
                  class="flex items-center justify-between gap-3 p-3 rounded-md border border-(--ui-border) bg-(--ui-bg-elevated)"
                >
                  <div class="min-w-0">
                    <div class="flex items-center gap-2">
                      <NuxtLink :to="`/service/${dep.id}`" class="font-medium truncate underline text-(--ui-primary)">
                        {{ dep.name || dep.id }}
                      </NuxtLink>
                      <span v-if="dep.type" class="px-2 py-0.5 rounded-md text-xs bg-(--ui-bg-muted)">{{ dep.type }}</span>
                    </div>
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
          <div class="flex items-center justify-between">
            <div class="font-medium">
              Releases
            </div>
            <UButton
              size="xs"
              icon="lucide:plus"
              label="Add Release"
              :disabled="loading"
              @click="openAddRelease()"
            />
          </div>
        </template>
        <div>
          <div v-if="releases.loading.value" class="text-(--ui-text-muted) text-sm">
            Loading releases…
          </div>
          <UAlert v-else-if="releases.error.value" color="error" variant="subtle">
            {{ releases.error }}
          </UAlert>
          <div v-else>
            <div v-if="!releases.items.value.length" class="text-(--ui-text-muted) text-sm">
              No releases yet.
            </div>
            <div v-else class="space-y-2">
              <div
                v-for="r in releases.items.value"
                :key="r.id || r.release_date || (r.url || r.version)"
                class="p-3 rounded-md border border-(--ui-border) bg-(--ui-bg-elevated)"
              >
                <div class="flex flex-wrap items-center gap-2">
                  <span v-if="r.version" class="px-2 py-0.5 rounded-md text-xs bg-(--ui-bg-muted)">v{{ r.version }}</span>
                  <a v-if="r.url" :href="r.url" target="_blank" rel="noopener" class="underline text-(--ui-primary)">{{ r.url }}</a>
                  <span class="text-xs text-(--ui-text-muted)">{{ formatUtc(r.release_date) }}</span>
                </div>
              </div>
            </div>
          </div>
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
    <!-- Confirm remove dependency modal -->
    <UModal v-model:open="showRemoveDepConfirm">
      <template #header>
        Remove Dependency
      </template>
      <template #body>
        <div>
          Are you sure you want to remove dependency
          <span class="font-medium">
            {{ serviceById.get(depToRemove?.id || '')?.name || depToRemove?.name || depToRemove?.id }}
          </span>
          from this service?
        </div>
      </template>
      <template #footer>
        <UButton
          color="neutral"
          variant="ghost"
          label="Cancel"
          @click="showRemoveDepConfirm = false"
        />
        <UButton
          icon="lucide:trash"
          color="warning"
          :loading="loading"
          label="Remove"
          @click="_handleConfirmRemoveDep"
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

    <!-- Add Release Modal -->
    <UModal v-model:open="showAddRelease">
      <template #header>
        Add Release
      </template>
      <template #body>
        <UForm>
          <UFormField label="URL" description="Optional, but URL or Version is required">
            <UInput v-model="newReleaseUrl" placeholder="https://example.com/release-notes" />
          </UFormField>
          <UFormField label="Version" description="Optional, but URL or Version is required">
            <UInput v-model="newReleaseVersion" placeholder="e.g. 1.2.3" />
          </UFormField>
          <UFormField label="Release date" description="Optional. Defaults to current UTC if left blank.">
            <UInput v-model="newReleaseDateLocal" type="datetime-local" />
          </UFormField>
        </UForm>
        <UAlert v-if="releaseFormError" color="warning" variant="subtle" class="mt-2">
          {{ releaseFormError }}
        </UAlert>
      </template>
      <template #footer>
        <UButton
          color="neutral"
          variant="ghost"
          label="Cancel"
          @click="showAddRelease = false"
        />
        <UButton
          icon="lucide:save"
          :loading="creatingRelease"
          label="Create"
          @click="_handleCreateRelease"
        />
      </template>
    </UModal>
  </div>
</template>
