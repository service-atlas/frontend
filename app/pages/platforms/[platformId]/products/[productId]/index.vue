<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
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

    await Promise.all(flows.value.map(async (flow) => {
      try {
        const { apiFetch } = useProductsApi()
        const stepsData = await apiFetch<unknown[]>(`/flows/${flow.id}/steps`, { method: 'GET' })
        flow.step_count = stepsData.length
      } catch (e) {
        console.error(`Failed to fetch steps for flow ${flow.id}`, e)
      }
    }))
  } catch (e) {
    console.error('Failed to load product data', e)
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

const breadcrumbs = computed(() => [
  { label: 'Platforms', to: '/platforms' },
  { label: platform.value?.name || '...', to: `/platforms/${platformId}` },
  { label: product.value?.name || 'Loading...' }
])
</script>

<template>
  <div class="space-y-6">
    <UBreadcrumb :links="breadcrumbs" />

    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold tracking-tight">
          {{ product?.name || 'Product' }}
        </h1>
        <p v-if="product?.description" class="text-muted-foreground mt-1">
          {{ product.description }}
        </p>
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

    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-medium">Flows</span>
          <span v-if="loading" class="text-sm text-muted-foreground">Loading...</span>
        </div>
      </template>

      <div v-if="!loading && flows.length === 0" class="flex flex-col items-center justify-center py-12 text-center">
        <UIcon name="i-heroicons-arrow-path" class="h-12 w-12 text-muted-foreground mb-4" />
        <h3 class="text-lg font-medium">
          No flows found
        </h3>
        <p class="text-muted-foreground mb-6">
          Create your first flow for this product.
        </p>
        <UButton
          label="Add Flow"
          icon="i-heroicons-plus"
          @click="showCreateModal = true"
        />
      </div>

      <div v-else class="flex flex-col divide-y divide-gray-100 dark:divide-gray-800">
        <div v-for="flow in flows" :key="flow.id" class="py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors px-4 -mx-4 cursor-pointer" @click="navigateTo(`/platforms/${platformId}/products/${productId}/flows/${flow.id}`)">
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <NuxtLink :to="`/platforms/${platformId}/products/${productId}/flows/${flow.id}`" class="text-primary font-medium hover:underline truncate" @click.stop>
                {{ flow.name }}
              </NuxtLink>
              <UBadge color="neutral" variant="soft" size="sm">
                {{ flow.step_count || 0 }} steps
              </UBadge>
              <UBadge :color="flow.status === 'active' ? 'green' : 'gray'" variant="subtle" size="sm" class="capitalize">
                {{ flow.status || 'draft' }}
              </UBadge>
            </div>
            <p v-if="flow.description" class="text-sm text-muted-foreground truncate mt-1">
              {{ flow.description }}
            </p>
          </div>
          <div class="flex items-center gap-4 ml-4">
            <UIcon name="i-heroicons-chevron-right" class="h-5 w-5 text-muted-foreground" />
          </div>
        </div>
      </div>
    </UCard>

    <UModal v-model:open="showCreateModal" title="Add Flow" description="Create a new flow for this product.">
      <template #body>
        <div class="space-y-4 py-4">
          <UFormField label="Name" required>
            <UInput v-model="createForm.name" placeholder="e.g. User Signup Flow" autofocus />
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
