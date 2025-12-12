<script setup lang="ts">
import { ref as _ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useServices } from '~/composables/useServices'
import { useTeams } from '~/composables/useTeams'
import type { TeamDto } from '~/composables/useTeams'

definePageMeta({
  title: 'Service'
})

const route = useRoute()
const serviceId = computed(() => String(route.params.id || ''))

const { getService } = useServices()
const { teams, fetchTeams } = useTeams()

const config = useRuntimeConfig()
// In development, route through Nuxt dev proxy at /api to avoid CORS.
// In production, use the configured absolute API URL, falling back to /api if missing.
const baseURL = (import.meta.dev ? '/api' : (config.public?.apiUrl as string) || '/api')
const client = $fetch.create({ baseURL })

type ServiceDto = Awaited<ReturnType<typeof getService>>

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

async function loadAll() {
  if (!serviceId.value) return
  loading.value = true
  error.value = null
  try {
    // parallelize fetches
    const [svc] = await Promise.all([
      getService(serviceId.value),
      fetchTeams().catch(() => undefined),
      fetchAssignedTeams().catch(() => undefined)
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
          <div class="text-(--ui-text-muted) text-sm">
            Placeholder — will be implemented next.
          </div>
        </UCard>
        <UCard>
          <template #header>
            <div class="font-medium">
              Dependencies
            </div>
          </template>
          <div class="text-(--ui-text-muted) text-sm">
            Placeholder — will be implemented next.
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
  </div>
</template>
