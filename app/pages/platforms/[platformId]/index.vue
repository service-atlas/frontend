<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { usePlatforms, type PlatformDto } from '~/composables/usePlatforms'
import { useProducts } from '~/composables/useProducts'
import { useAuth } from '~/composables/useAuth'

const route = useRoute()
const platformId = route.params.platformId as string

const { getPlatform } = usePlatforms()
const { products, loading, error, fetchProductsByPlatform, createProduct } = useProducts()
const { isAuthenticated } = useAuth()

const platform = ref<PlatformDto | null>(null)

async function loadData() {
  if (!isAuthenticated.value) return
  try {
    const [p] = await Promise.all([
      getPlatform(platformId),
      fetchProductsByPlatform(platformId)
    ])
    platform.value = p
  } catch (e) {
    console.error('Failed to load platform data', e)
  }
}

onMounted(() => {
  loadData()
})

definePageMeta({
  title: 'Platform Details'
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
    const newProduct = await createProduct({
      name: createForm.value.name.trim(),
      description: createForm.value.description.trim(),
      platform_id: platformId
    })
    showCreateModal.value = false
    createForm.value = { name: '', description: '' }
    navigateTo(`/platforms/${platformId}/products/${newProduct.id}`)
  } catch (e) {
    console.error('Failed to create product', e)
  } finally {
    isCreating.value = false
  }
}

const columns = [
  { id: 'name', key: 'name', label: 'Name', sortable: true },
  { id: 'description', key: 'description', label: 'Description' },
  { id: 'flow_count', key: 'flow_count', label: 'Flows', sortable: true },
  { id: 'updated', key: 'updated', label: 'Updated', sortable: true }
]

const breadcrumbs = computed(() => [
  { label: 'Platforms', to: '/platforms' },
  { label: platform.value?.name || 'Loading...' }
])

function formatDate(dateStr?: string) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString()
}
</script>

<template>
  <div class="space-y-6">
    <UBreadcrumb :links="breadcrumbs" />

    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold tracking-tight">{{ platform?.name || 'Platform' }}</h1>
        <p v-if="platform?.description" class="text-muted-foreground mt-1">{{ platform.description }}</p>
      </div>
      <UButton
        icon="i-heroicons-plus"
        label="Add Product"
        @click="showCreateModal = true"
      />
    </div>

    <template v-if="error">
      <UAlert
        icon="i-heroicons-exclamation-triangle"
        color="red"
        variant="soft"
        title="Error loading products"
        :description="error"
      />
    </template>

    <UCard :ui="{ body: { padding: 'p-0' } }">
      <UTable
        :rows="products"
        :columns="columns"
        :loading="loading"
        @select="(row) => navigateTo(`/platforms/${platformId}/products/${row.id}`)"
      >
        <template #name-data="{ row }">
          <NuxtLink :to="`/platforms/${platformId}/products/${row.id}`" class="text-primary font-medium hover:underline">
            {{ row.name }}
          </NuxtLink>
        </template>
        <template #flow_count-data="{ row }">
          <UBadge color="gray" variant="soft">
            {{ row.flow_count || 0 }} flows
          </UBadge>
        </template>
        <template #updated-data="{ row }">
          <span class="text-sm text-muted-foreground">
            {{ formatDate(row.updated) }}
          </span>
        </template>
      </UTable>

      <div v-if="!loading && products.length === 0" class="flex flex-col items-center justify-center py-12 text-center">
        <UIcon name="i-heroicons-beaker" class="h-12 w-12 text-muted-foreground mb-4" />
        <h3 class="text-lg font-medium">No products found</h3>
        <p class="text-muted-foreground mb-6">Create your first product for this platform.</p>
        <UButton
          label="Add Product"
          icon="i-heroicons-plus"
          @click="showCreateModal = true"
        />
      </div>
    </UCard>

    <UModal v-model:open="showCreateModal" title="Add Product" description="Create a new product for this platform.">
      <template #body>
        <div class="space-y-4 py-4">
          <UFormField label="Name" required>
            <UInput v-model="createForm.name" placeholder="e.g. Checkout Product" autofocus />
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
