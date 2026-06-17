<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { usePlatforms } from '~/composables/usePlatforms'
import { useAuth } from '~/composables/useAuth'

definePageMeta({
  title: 'Platforms'
})

const { platforms, loading, error, fetchPlatforms, createPlatform } = usePlatforms()
const { isAuthenticated } = useAuth()

onMounted(() => {
  if (isAuthenticated.value) {
    fetchPlatforms()
  }
})

// Create modal state
const showCreateModal = ref(false)
const createForm = ref({
  name: '',
  description: ''
})
const isCreating = ref(false)
const canCreate = computed(() => createForm.value.name.trim().length > 0)

async function handleCreate() {
  if (!canCreate.value) return
  isCreating.value = true
  try {
    const newPlatform = await createPlatform({
      name: createForm.value.name.trim(),
      description: createForm.value.description.trim()
    })
    showCreateModal.value = false
    createForm.value = { name: '', description: '' }
    // Navigate to the new platform's page
    navigateTo(`/platforms/${newPlatform.id}`)
  } catch (e) {
    console.error('Failed to create platform', e)
  } finally {
    isCreating.value = false
  }
}

const columns = [
  { id: 'name', key: 'name', label: 'Name', sortable: true },
  { id: 'description', key: 'description', label: 'Description' },
  { id: 'product_count', key: 'product_count', label: 'Products', sortable: true },
  { id: 'updated', key: 'updated', label: 'Updated', sortable: true }
]

function formatDate(dateStr?: string) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString()
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold tracking-tight">Platforms</h1>
        <p class="text-muted-foreground mt-1">Manage your business platforms and their products.</p>
      </div>
      <UButton
        icon="i-heroicons-plus"
        label="Add Platform"
        @click="showCreateModal = true"
      />
    </div>

    <template v-if="error">
      <UAlert
        icon="i-heroicons-exclamation-triangle"
        color="red"
        variant="soft"
        title="Error loading platforms"
        :description="error"
      />
    </template>

    <UCard :ui="{ body: { padding: 'p-0' } }">
      <UTable
        :rows="platforms"
        :columns="columns"
        :loading="loading"
        @select="(row) => navigateTo(`/platforms/${row.id}`)"
      >
        <template #name-data="{ row }">
          <NuxtLink :to="`/platforms/${row.id}`" class="text-primary font-medium hover:underline">
            {{ row.name }}
          </NuxtLink>
        </template>
        <template #product_count-data="{ row }">
          <UBadge color="gray" variant="soft">
            {{ row.product_count || 0 }} products
          </UBadge>
        </template>
        <template #updated-data="{ row }">
          <span class="text-sm text-muted-foreground">
            {{ formatDate(row.updated) }}
          </span>
        </template>
      </UTable>

      <div v-if="!loading && platforms.length === 0" class="flex flex-col items-center justify-center py-12 text-center">
        <UIcon name="i-heroicons-circle-stack" class="h-12 w-12 text-muted-foreground mb-4" />
        <h3 class="text-lg font-medium">No platforms found</h3>
        <p class="text-muted-foreground mb-6">Get started by creating your first platform.</p>
        <UButton
          label="Add Platform"
          icon="i-heroicons-plus"
          @click="showCreateModal = true"
        />
      </div>
    </UCard>

    <UModal v-model:open="showCreateModal" title="Add Platform" description="Create a new platform to manage its products.">
      <template #body>
        <div class="space-y-4 py-4">
          <UFormField label="Name" required>
            <UInput v-model="createForm.name" placeholder="e.g. E-Commerce Platform" autofocus />
          </UFormField>
          <UFormField label="Description">
            <UTextarea v-model="createForm.description" placeholder="Optional description..." />
          </UFormField>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-x-3">
          <UButton color="neutral" variant="ghost" label="Cancel" @click="showCreateModal = false" />
          <UButton color="primary" label="Create" :loading="isCreating" :disabled="!canCreate" @click="handleCreate" />
        </div>
      </template>
    </UModal>
  </div>
</template>
