<script setup lang="ts">
import { ref as _ref, onMounted, computed } from 'vue'
import { useServices } from '~/composables/useServices'

definePageMeta({
  title: 'Services'
})

const {
  services,
  loading,
  error,
  fetchServices,
  createService,
  deleteService
} = useServices()

onMounted(() => {
  fetchServices()
})

// Create modal state
const showCreate = _ref(false)
const createName = _ref('')
const createType = _ref('')
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
  const payload: { name: string, type?: string } = { name: createName.value.trim() }
  const t = createType.value.trim()
  if (t) payload.type = t
  await createService(payload)
  createName.value = ''
  createType.value = ''
  showTypeSuggestions.value = false
  showCreate.value = false
}

// Delete confirm state
const showDelete = _ref(false)
const toDeleteId = _ref<string | null>(null)

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
          <UButton
            icon="lucide:rotate-cw"
            color="neutral"
            variant="ghost"
            :loading="loading"
            aria-label="Refresh"
            @click="fetchServices()"
          />
        </div>
      </div>

      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <span class="font-medium">Services</span>
            <span
              v-if="loading"
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
          v-if="!loading && services.length === 0"
          class="text-(--ui-text-muted)"
        >
          No services yet. Create your first service to get started.
        </div>

        <div
          v-else
          class="flex flex-col divide-y"
        >
          <div
            v-for="s in services"
            :key="s.id"
            class="py-3 flex items-center justify-between gap-3"
          >
            <div class="min-w-0">
              <NuxtLink
                class="font-medium truncate hover:underline"
                :to="`/service/${s.id}`"
              >
                {{ s.name }}
              </NuxtLink>
              <div class="mt-0.5">
                <UBadge
                  v-if="s.type"
                  color="neutral"
                  variant="subtle"
                  size="xs"
                >
                  {{ s.type }}
                </UBadge>
              </div>
              <div class="text-(--ui-text-muted) text-xs">
                <span v-if="s.updated">Updated: {{ new Date(s.updated).toLocaleString() }}</span>
                <span v-else-if="s.created">Created: {{ new Date(s.created).toLocaleString() }}</span>
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
          color="red"
          :loading="loading"
          label="Delete"
          @click="_handleDelete"
        />
      </template>
    </UModal>
  </div>
</template>
