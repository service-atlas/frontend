<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { usePlatforms, type PlatformDto } from '~/composables/usePlatforms'
import { useProducts, type ProductDto } from '~/composables/useProducts'
import { useFlows } from '~/composables/useFlows'
import { useAuth } from '~/composables/useAuth'

const route = useRoute()
const platformId = route.params.platformId as string
const productId = route.params.productId as string

const { getPlatform } = usePlatforms()
const { getProduct } = useProducts()
const { flows, loading, error, fetchFlowsByProduct, createFlow } = useFlows()
const { isAuthenticated } = useAuth()

const platform = ref<PlatformDto | null>(null)
const product = ref<ProductDto | null>(null)

async function loadData() {
  if (!isAuthenticated.value) return
  try {
    const [plat, prod] = await Promise.all([
      getPlatform(platformId),
      getProduct(productId),
      fetchFlowsByProduct(productId)
    ])
    platform.value = plat
    product.value = prod
  } catch (e) {
    console.error('Failed to load product data', e)
  }
}

onMounted(() => {
  loadData()
})

definePageMeta({
  title: 'Product Details'
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
    const newFlow = await createFlow({
      name: createForm.value.name.trim(),
      description: createForm.value.description.trim(),
      product_id: productId
    })
    showCreateModal.value = false
    createForm.value = { name: '', description: '' }
    navigateTo(`/platforms/${platformId}/products/${productId}/flows/${newFlow.id}`)
  } catch (e) {
    console.error('Failed to create flow', e)
  } finally {
    isCreating.value = false
  }
}

const columns = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'description', label: 'Description' },
  { key: 'step_count', label: 'Steps', sortable: true },
  { key: 'status', label: 'Status' },
  { key: 'updated', label: 'Updated', sortable: true }
]

const breadcrumbs = computed(() => [
  { label: 'Platforms', to: '/platforms' },
  { label: platform.value?.name || '...', to: `/platforms/${platformId}` },
  { label: product.value?.name || 'Loading...' }
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
        <h1 class="text-3xl font-bold tracking-tight">{{ product?.name || 'Product' }}</h1>
        <p v-if="product?.description" class="text-muted-foreground mt-1">{{ product.description }}</p>
      </div>
      <UButton
        icon="i-heroicons-plus"
        label="Add Flow"
        @click="showCreateModal = true"
      />
    </div>

    <template v-if="error">
      <UAlert
        icon="i-heroicons-exclamation-triangle"
        color="red"
        variant="soft"
        title="Error loading flows"
        :description="error"
      />
    </template>

    <UCard :ui="{ body: { padding: 'p-0' } }">
      <UTable
        :rows="flows"
        :columns="columns"
        :loading="loading"
        @select="(row) => navigateTo(`/platforms/${platformId}/products/${productId}/flows/${row.id}`)"
      >
        <template #name-data="{ row }">
          <NuxtLink :to="`/platforms/${platformId}/products/${productId}/flows/${row.id}`" class="text-primary font-medium hover:underline">
            {{ row.name }}
          </NuxtLink>
        </template>
        <template #step_count-data="{ row }">
          <UBadge color="gray" variant="soft">
            {{ row.step_count || 0 }} steps
          </UBadge>
        </template>
        <template #status-data="{ row }">
          <UBadge :color="row.status === 'active' ? 'green' : 'gray'" variant="subtle" class="capitalize">
            {{ row.status || 'draft' }}
          </UBadge>
        </template>
        <template #updated-data="{ row }">
          <span class="text-sm text-muted-foreground">
            {{ formatDate(row.updated) }}
          </span>
        </template>
      </UTable>

      <div v-if="!loading && flows.length === 0" class="flex flex-col items-center justify-center py-12 text-center">
        <UIcon name="i-heroicons-arrow-path" class="h-12 w-12 text-muted-foreground mb-4" />
        <h3 class="text-lg font-medium">No flows found</h3>
        <p class="text-muted-foreground mb-6">Create your first flow for this product.</p>
        <UButton
          label="Add Flow"
          icon="i-heroicons-plus"
          @click="showCreateModal = true"
        />
      </div>
    </UCard>

    <UModal v-model="showCreateModal">
      <UCard :ui="{ ring: '', divide: 'divide-y divide-gray-100 dark:divide-gray-800' }">
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-base font-semibold leading-6 text-gray-900 dark:text-white">
              Add Flow
            </h3>
            <UButton color="gray" variant="ghost" icon="i-heroicons-x-mark-20-solid" class="-my-1" @click="showCreateModal = false" />
          </div>
        </template>

        <div class="space-y-4 py-4">
          <UFormGroup label="Name" required>
            <UInput v-model="createForm.name" placeholder="e.g. User Signup Flow" autofocus />
          </UFormGroup>
          <UFormGroup label="Description">
            <UTextarea v-model="createForm.description" placeholder="Optional description..." />
          </UFormGroup>
        </div>

        <template #footer>
          <div class="flex justify-end gap-x-3">
            <UButton color="gray" variant="ghost" label="Cancel" @click="showCreateModal = false" />
            <UButton color="primary" label="Create" :loading="isCreating" :disabled="!canCreate" @click="handleCreate" />
          </div>
        </template>
      </UCard>
    </UModal>
  </div>
</template>
