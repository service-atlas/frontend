<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { usePlatforms } from '~/composables/usePlatforms'
import { useAuth } from '~/composables/useAuth'

definePageMeta({
  title: 'Platforms'
})

const { platforms, loading, error, fetchPlatforms, createPlatform } = usePlatforms()
const { isAuthenticated } = useAuth()

async function loadPlatforms() {
  try {
    await fetchPlatforms()
  } catch (e) {
    console.error('Failed to load platforms', e)
    return
  }
  // Fetch product counts for each platform
  await Promise.all(platforms.value.map(async (platform) => {
    try {
      const { apiFetch } = useProductsApi()
      const products = await apiFetch<unknown[]>(`/platforms/${platform.id}/products`, { method: 'GET' })
      platform.product_count = products.length
    } catch (e) {
      console.error(`Failed to fetch products for platform ${platform.id}`, e)
    }
  }))
}

onMounted(() => {
  if (isAuthenticated.value) {
    loadPlatforms()
  }
})

watch(isAuthenticated, (val) => {
  if (val) {
    loadPlatforms()
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
</script>

<template>
  <div class="space-y-6 mx-[2%]">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold tracking-tight">
          Platforms
        </h1>
        <p class="text-muted-foreground mt-1">
          Manage your business platforms and their products.
        </p>
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
        color="error"
        variant="soft"
        title="Error loading platforms"
        :description="error"
      />
    </template>

    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-medium">Platforms</span>
          <span v-if="loading" class="text-sm text-muted-foreground">Loading...</span>
        </div>
      </template>

      <div v-if="!loading && platforms.length === 0" class="flex flex-col items-center justify-center py-12 text-center">
        <UIcon name="i-heroicons-circle-stack" class="h-12 w-12 text-muted-foreground mb-4" />
        <h3 class="text-lg font-medium">
          No platforms found
        </h3>
        <p class="text-muted-foreground mb-6">
          Get started by creating your first platform.
        </p>
        <UButton
          label="Add Platform"
          icon="i-heroicons-plus"
          @click="showCreateModal = true"
        />
      </div>

      <div v-else class="flex flex-col divide-y divide-gray-100 dark:divide-gray-800">
        <div v-for="platform in platforms" :key="platform.id" class="py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors px-4 -mx-4 cursor-pointer" @click="navigateTo(`/platforms/${platform.id}`)">
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <NuxtLink :to="`/platforms/${platform.id}`" class="text-primary font-medium hover:underline truncate" @click.stop>
                {{ platform.name }}
              </NuxtLink>
              <UBadge color="neutral" variant="soft" size="sm">
                {{ platform.product_count || 0 }} products
              </UBadge>
            </div>
            <p v-if="platform.description" class="text-sm text-muted-foreground truncate mt-1">
              {{ platform.description }}
            </p>
          </div>
          <div class="flex items-center gap-4 ml-4">
            <UIcon name="i-heroicons-chevron-right" class="h-5 w-5 text-muted-foreground" />
          </div>
        </div>
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
