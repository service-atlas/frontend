<script setup lang="ts">
import { ref as _ref, onMounted, computed } from 'vue'
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

// Create modal state (modal UI intentionally excluded in template for now)
const showCreate = _ref(false)
const createName = _ref('')
const canCreate = computed(() => createName.value.trim().length > 0)

async function _handleCreate() {
  if (!canCreate.value) return
  await createTeam({ name: createName.value.trim() })
  createName.value = ''
  showCreate.value = false
}

// Edit state (modal UI intentionally excluded in template for now)
const showEdit = _ref(false)
const editModel = _ref<{ id: string, name: string } | null>(null)
const canUpdate = computed(() => !!editModel.value && editModel.value.name.trim().length > 0)

function openEdit(t: TeamDto) {
  editModel.value = { id: t.id, name: t.name }
  showEdit.value = true
}

async function _handleUpdate() {
  if (!canUpdate.value || !editModel.value) return
  await updateTeam({ id: editModel.value.id, name: editModel.value.name.trim() })
  showEdit.value = false
}

// Delete confirm state (modal UI intentionally excluded in template for now)
const showDelete = _ref(false)
const toDeleteId = _ref<string | null>(null)

function confirmDelete(id: string) {
  toDeleteId.value = id
  showDelete.value = true
}

async function _handleDelete() {
  if (!toDeleteId.value) return

  try {
    await deleteTeam(toDeleteId.value)
    toDeleteId.value = null
    showDelete.value = false
  } catch {
    throw new Error('Failed to delete team.')
  }
}
</script>

<template>
  <div>
    <UPageSection
      title="Manage Teams"
      description="Create new teams and manage existing ones."
    >
      <div class="flex items-center justify-between gap-2 mb-3">
        <UButton
          icon="lucide:plus"
          label="New Team"
          @click="showCreate = true"
        />

        <div class="flex items-center gap-2">
          <UButton
            icon="lucide:rotate-cw"
            color="neutral"
            variant="ghost"
            :loading="loading"
            aria-label="Refresh"
            @click="fetchTeams()"
          />
        </div>
      </div>

      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <span class="font-medium">Teams</span>
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
          v-if="!loading && teams.length === 0"
          class="text-(--ui-text-muted)"
        >
          No teams yet. Create your first team to get started.
        </div>

        <div
          v-else
          class="flex flex-col divide-y"
        >
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
                icon="lucide:pen"
                color="neutral"
                variant="subtle"
                label="Edit"
                @click="openEdit(t)"
              />
              <UButton
                size="sm"
                icon="lucide:trash"
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

    <!-- Create Modal: body with form, footer with actions (no UCard) -->
    <UModal v-model:open="showCreate">
      <template #header>
        Create Team
      </template>
      <template #body>
        <UForm @submit.prevent="_handleCreate">
          <UFormGroup label="Team name">
            <UInput
              v-model="createName"
              autofocus
              placeholder="e.g. Platform"
              @keyup.enter="_handleCreate"
            />
          </UFormGroup>
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

    <!-- Edit Modal: simple form in modal body (no UCard) -->
    <UModal v-model:open="showEdit">
      <template #header>
        Edit Team
      </template>
      <template #body>
        <UForm
          v-if="editModel"
          @submit.prevent="_handleUpdate"
        >
          <UFormGroup label="Team name">
            <UInput
              v-model="editModel.name"
              autofocus
              placeholder="Update team name"
              @keyup.enter="_handleUpdate"
            />
          </UFormGroup>
        </UForm>
      </template>

      <template #footer>
        <UButton
          color="neutral"
          variant="ghost"
          label="Cancel"
          @click="showEdit = false"
        />
        <UButton
          icon="lucide:save"
          :disabled="!canUpdate || loading"
          label="Save"
          @click="_handleUpdate"
        />
      </template>
    </UModal>

    <!-- Delete Modal: simple confirm text and actions (no UCard) -->
    <UModal v-model:open="showDelete">
      <template #header>
        Delete Team
      </template>
      <template #body>
        <div class="space-y-2">
          <p>
            Are you sure you want to delete this team?
          </p>
          <p class="text-(--ui-text-muted) text-sm">
            This action cannot be undone.
          </p>
        </div>
      </template>

      <template #footer>
        <UButton
          color="neutral"
          variant="ghost"
          label="Cancel"
          @click="showDelete = false"
        />
        <UButton
          color="warning"
          icon="lucide:trash"
          :disabled="loading"
          label="Delete"
          @click="_handleDelete"
        />
      </template>
    </UModal>
  </div>
</template>
