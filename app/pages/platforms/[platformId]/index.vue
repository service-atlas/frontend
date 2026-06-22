<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
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

    await Promise.all(products.value.map(async (product) => {
      try {
        const { apiFetch } = useProductsApi()
        const flowsData = await apiFetch<unknown[]>(`/products/${product.id}/flows`, { method: 'GET' })
        product.flow_count = flowsData.length
      } catch (e) {
        console.error(`Failed to fetch flows for product ${product.id}`, e)
      }
    }))
  } catch (e) {
    console.error('Failed to load platform data', e)
  }
}

onMounted(() => {
  loadData()
})

watch(isAuthenticated, (val) => {
  if (val) {
    loadData()
  }
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
      platform_id: Number.parseInt(platformId, 10)
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

const breadcrumbs = computed(() => [
  { label: 'Platforms', to: '/platforms' },
  { label: platform.value?.name || 'Loading...' }
])
</script>

<template>
  <div class="space-y-6">
    <UBreadcrumb :links="breadcrumbs" />

    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold tracking-tight">
          {{ platform?.name || 'Platform' }}
        </h1>
        <p v-if="platform?.description" class="text-muted-foreground mt-1">
          {{ platform.description }}
        </p>
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
        color="error"
        variant="soft"
        title="Error loading products"
        :description="error"
      />
    </template>

    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-medium">Products</span>
          <span v-if="loading" class="text-sm text-muted-foreground">Loading...</span>
        </div>
      </template>

      <div v-if="!loading && products.length === 0" class="flex flex-col items-center justify-center py-12 text-center">
        <UIcon name="i-heroicons-beaker" class="h-12 w-12 text-muted-foreground mb-4" />
        <h3 class="text-lg font-medium">
          No products found
        </h3>
        <p class="text-muted-foreground mb-6">
          Create your first product for this platform.
        </p>
        <UButton
          label="Add Product"
          icon="i-heroicons-plus"
          @click="showCreateModal = true"
        />
      </div>

      <div v-else class="flex flex-col divide-y divide-gray-100 dark:divide-gray-800">
        <div v-for="product in products" :key="product.id" class="py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors px-4 -mx-4 cursor-pointer" @click="navigateTo(`/platforms/${platformId}/products/${product.id}`)">
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <NuxtLink :to="`/platforms/${platformId}/products/${product.id}`" class="text-primary font-medium hover:underline truncate" @click.stop>
                {{ product.name }}
              </NuxtLink>
              <UBadge color="neutral" variant="soft" size="sm">
                {{ product.flow_count || 0 }} flows
              </UBadge>
            </div>
            <p v-if="product.description" class="text-sm text-muted-foreground truncate mt-1">
              {{ product.description }}
            </p>
          </div>
          <div class="flex items-center gap-4 ml-4">
            <UIcon name="i-heroicons-chevron-right" class="h-5 w-5 text-muted-foreground" />
          </div>
        </div>
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
