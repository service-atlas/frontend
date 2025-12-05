<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useTeams } from '~/composables/useTeams'
import type { TeamDto } from '~/composables/useTeams'

definePageMeta({
  title: 'Teams'
})

const {
  teams,
  loading,
  error,
  fetchTeams,
  createTeam,
  updateTeam,
  deleteTeam
} = useTeams()

onMounted(() => {
  fetchTeams()
})

// Create modal state
const showCreate = ref(false)
const createName = ref('')
const canCreate = computed(() => createName.value.trim().length > 0)

async function handleCreate() {
  if (!canCreate.value) return
  await createTeam({ name: createName.value.trim() })
  createName.value = ''
  showCreate.value = false
}

// Edit modal state
const showEdit = ref(false)
const editModel = ref<{ id: string, name: string } | null>(null)
const canUpdate = computed(() => !!editModel.value && editModel.value.name.trim().length > 0)

function openEdit(t: TeamDto) {
  editModel.value = { id: t.id, name: t.name }
  showEdit.value = true
}

async function handleUpdate() {
  if (!canUpdate.value || !editModel.value) return
  await updateTeam({ id: editModel.value.id, name: editModel.value.name.trim() })
  showEdit.value = false
}

// Delete confirm state
const showDelete = ref(false)
const toDeleteId = ref<string | null>(null)
function confirmDelete(id: string) {
  toDeleteId.value = id
  showDelete.value = true
}
async function handleDelete() {
  if (!toDeleteId.value) return
  await deleteTeam(toDeleteId.value)
  toDeleteId.value = null
  showDelete.value = false
}
</script>

<template>
  <div>
    <UPageHero
      title="Teams"
      description="Create, list, update and delete teams."
    />


    <UPageSection
      title="Manage"
      description="Create new teams and manage existing ones."
    >
      <div class="flex items-center justify-between gap-2 mb-3">

        <!-- Create Modal -->
        <UModal>
          <UButton
            icon="i-lucid-plus"
            label="New Team"
            @click="showCreate = true"
          />

            <template #content>
              <UCard>
              <div class="font-medium">
                New Team
              </div>

            <div class="space-y-3">
              <UForm @submit.prevent="handleCreate">
                <UFormField label="Name" required>
                  <UInput v-model="createName" placeholder="e.g., Platform" auto-focus />
                </UFormField>
                <div class="mt-4 flex justify-end gap-2">
                  <UButton color="neutral" variant="ghost" label="Cancel" @click="showCreate = false" />
                  <UButton :disabled="!canCreate" type="submit" label="Create" />
                </div>
              </UForm>
            </div>
          </UCard>
            </template>
        </UModal>

        <div class="flex items-center gap-2">
          <UButton
            icon="i-lucide-rotate-cw"
            color="neutral"
            variant="ghost"
            :loading="loading"
            @click="fetchTeams()"
            aria-label="Refresh"
          />
        </div>
      </div>

      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <span class="font-medium">Teams</span>
            <span v-if="loading" class="text-(--ui-text-muted) text-sm">Loading…</span>
          </div>
        </template>

        <div v-if="error" class="text-red-600 text-sm mb-2">
          {{ error }}
        </div>

        <div v-if="!loading && teams.length === 0" class="text-(--ui-text-muted)">
          No teams yet. Create your first team to get started.
        </div>

        <div v-else class="flex flex-col divide-y">
          <div
            v-for="t in teams"
            :key="t.id"
            class="py-3 flex items-center justify-between gap-3"
          >
            <div class="min-w-0">
              <div class="font-medium truncate">
                {{ t.name }}
              </div>
              <div class="text-(--ui-text-muted) text-xs">
                <span v-if="t.created">Created: {{ new Date(t.created).toLocaleString() }}</span>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <UButton
                size="sm"
                icon="i-lucide-pencil"
                color="neutral"
                variant="subtle"
                label="Edit"
                @click="openEdit(t)"
              />
              <UButton
                size="sm"
                icon="i-lucide-trash"
                color="neutral"
                variant="ghost"
                label="Delete"
                @click="confirmDelete(t.id)"
              />
            </div>
          </div>
        </div>
      </UCard>
    </UPageSection>



    <!-- Edit Modal -->
    <UModal v-model="showEdit">
      <UCard>
        <template #header>
          <div class="font-medium">
            Edit Team
          </div>
        </template>
        <div class="space-y-3" v-if="editModel">
          <UForm @submit.prevent="handleUpdate">
            <UFormField label="Name" required>
              <UInput v-model="editModel.name" />
            </UFormField>
            <div class="mt-4 flex justify-end gap-2">
              <UButton color="neutral" variant="ghost" label="Cancel" @click="showEdit = false" />
              <UButton :disabled="!canUpdate" type="submit" label="Save" />
            </div>
          </UForm>
        </div>
      </UCard>
    </UModal>

    <!-- Delete Confirm -->
    <UModal v-model="showDelete">
      <UCard>
        <template #header>
          <div class="font-medium">
            Delete Team
          </div>
        </template>
        <p class="text-(--ui-text-muted)">
          Are you sure you want to delete this team? This action cannot be undone.
        </p>
        <div class="mt-4 flex justify-end gap-2">
          <UButton color="neutral" variant="ghost" label="Cancel" @click="showDelete = false" />
          <UButton color="red" icon="i-lucide-trash" label="Delete" @click="handleDelete" />
        </div>
      </UCard>
    </UModal>
  </div>
</template>
