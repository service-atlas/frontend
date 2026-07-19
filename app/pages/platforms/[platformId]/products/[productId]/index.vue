<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { usePlatforms, type PlatformDto } from '~/composables/usePlatforms'
import { useProducts, type ProductDto } from '~/composables/useProducts'
import { useFlows } from '~/composables/useFlows'
import { useCapabilities } from '~/composables/useCapabilities'
import { useAuth } from '~/composables/useAuth'

const route = useRoute()
const platformId = computed(() => route.params.platformId as string)
const productId = computed(() => route.params.productId as string)

const { getPlatform } = usePlatforms()
const { getProduct } = useProducts()
const { flows, loading: flowsLoading, error: flowsError, fetchFlowsByProduct, createFlow } = useFlows()
const { capabilities, loading: capabilitiesLoading, error: capabilitiesError, fetchCapabilitiesByProduct, createCapability, deleteCapability } = useCapabilities()
const { isAuthenticated } = useAuth()

const platform = ref<PlatformDto | null>(null)
const product = ref<ProductDto | null>(null)

async function loadData() {
  if (!isAuthenticated.value) return
  try {
    const [plat, prod] = await Promise.all([
      getPlatform(platformId.value),
      getProduct(productId.value),
      fetchFlowsByProduct(productId.value),
      fetchCapabilitiesByProduct(productId.value)
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

watch([platformId, productId], () => {
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

// Capability modal state
const showCreateCapabilityModal = ref(false)
const createCapabilityForm = ref({
  name: '',
  description: ''
})
const isCreatingCapability = ref(false)
const canCreateCapability = computed(() => createCapabilityForm.value.name.trim().length > 0)

const tabs = computed(() => [
  {
    label: 'Flows',
    icon: 'i-heroicons-arrow-path-rounded-square',
    slot: 'flows'
  },
  {
    label: 'Capabilities',
    icon: 'i-heroicons-sparkles',
    slot: 'capabilities'
  }
])

async function handleCreate() {
  if (!canCreate.value) return
  isCreating.value = true
  try {
    const newFlow = await createFlow(Number.parseInt(productId.value, 10), {
      name: createForm.value.name.trim(),
      description: createForm.value.description.trim()
    })
    showCreateModal.value = false
    createForm.value = { name: '', description: '' }
    navigateTo(`/platforms/${platformId.value}/products/${productId.value}/flows/${newFlow.id}`)
  } catch (e) {
    console.error('Failed to create flow', e)
  } finally {
    isCreating.value = false
  }
}

async function handleCreateCapability() {
  if (!canCreateCapability.value) return
  isCreatingCapability.value = true
  try {
    await createCapability({
      product_id: Number.parseInt(productId.value, 10),
      name: createCapabilityForm.value.name.trim(),
      description: createCapabilityForm.value.description.trim()
    })
    showCreateCapabilityModal.value = false
    createCapabilityForm.value = { name: '', description: '' }
    await fetchCapabilitiesByProduct(productId.value)
  } catch (e) {
    console.error('Failed to create capability', e)
  } finally {
    isCreatingCapability.value = false
  }
}

async function handleDeleteCapability(id: string | number) {
  if (!confirm('Are you sure you want to delete this capability?')) return
  try {
    await deleteCapability(id)
    await fetchCapabilitiesByProduct(productId.value)
  } catch (e) {
    console.error('Failed to delete capability', e)
  }
}

const breadcrumbs = computed(() => [
  { label: 'Platforms', to: '/platforms' },
  { label: platform.value?.name || '...', to: `/platforms/${platformId.value}` },
  { label: product.value?.name || 'Loading...' }
])
</script>

<template>
  <div class="space-y-6 mx-[2%]">
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
    </div>

    <template v-if="flowsError">
      <UAlert
        icon="i-heroicons-exclamation-triangle"
        color="error"
        variant="soft"
        title="Error loading flows"
        :description="flowsError"
      />
    </template>

    <template v-if="capabilitiesError">
      <UAlert
        icon="i-heroicons-exclamation-triangle"
        color="error"
        variant="soft"
        title="Error loading capabilities"
        :description="capabilitiesError"
      />
    </template>

    <UTabs :items="tabs" class="w-full">
      <template #flows>
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <span class="font-medium">Flows</span>
              <div class="flex items-center gap-2">
                <span v-if="flowsLoading" class="text-sm text-muted-foreground">Loading...</span>
                <UButton
                  icon="i-heroicons-plus"
                  size="xs"
                  variant="ghost"
                  label="Add Flow"
                  @click="showCreateModal = true"
                />
              </div>
            </div>
          </template>

          <div v-if="!flowsLoading && flows.length === 0" class="flex flex-col items-center justify-center py-12 text-center">
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

          <div v-else class="flex flex-col divide-y divide-gray-100 dark:divide-gray-800 max-h-[600px] overflow-y-auto overflow-x-hidden">
            <div v-for="flow in flows" :key="flow.id" class="py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors px-4 cursor-pointer" @click="navigateTo(`/platforms/${platformId}/products/${productId}/flows/${flow.id}`)">
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                  <NuxtLink :to="`/platforms/${platformId}/products/${productId}/flows/${flow.id}`" class="text-primary font-medium hover:underline truncate" @click.stop>
                    {{ flow.name }}
                  </NuxtLink>
                  <UBadge color="neutral" variant="soft" size="sm">
                    {{ flow.step_count || 0 }} steps
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
      </template>

      <template #capabilities>
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <span class="font-medium">Capabilities</span>
              <div class="flex items-center gap-2">
                <span v-if="capabilitiesLoading" class="text-sm text-muted-foreground">Loading...</span>
                <UButton
                  icon="i-heroicons-plus"
                  size="xs"
                  variant="ghost"
                  label="Add Capability"
                  @click="showCreateCapabilityModal = true"
                />
              </div>
            </div>
          </template>

          <div v-if="!capabilitiesLoading && capabilities.length === 0" class="flex flex-col items-center justify-center py-12 text-center">
            <UIcon name="i-heroicons-sparkles" class="h-12 w-12 text-muted-foreground mb-4" />
            <h3 class="text-lg font-medium">
              No capabilities found
            </h3>
            <p class="text-muted-foreground mb-6">
              Define the product functions that this product supports.
            </p>
            <UButton
              label="Add Capability"
              icon="i-heroicons-plus"
              @click="showCreateCapabilityModal = true"
            />
          </div>

          <div v-else class="flex flex-col divide-y divide-gray-100 dark:divide-gray-800 max-h-[600px] overflow-y-auto overflow-x-hidden">
            <div v-for="cap in capabilities" :key="cap.id" class="py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors px-4 group">
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                  <span class="text-primary font-medium truncate">
                    {{ cap.name }}
                  </span>
                </div>
                <p v-if="cap.description" class="text-sm text-muted-foreground truncate mt-1">
                  {{ cap.description }}
                </p>
              </div>
              <div class="flex items-center gap-4 ml-4">
                <UButton
                  icon="i-heroicons-trash"
                  color="error"
                  variant="ghost"
                  size="xs"
                  class="opacity-0 group-hover:opacity-100 transition-opacity"
                  @click.stop="handleDeleteCapability(cap.id)"
                />
              </div>
            </div>
          </div>
        </UCard>
      </template>
    </UTabs>

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
    <UModal v-model:open="showCreateCapabilityModal" title="Add Capability" description="Define a new function this product supports.">
      <template #body>
        <div class="space-y-4 py-4">
          <UFormField label="Name" required>
            <UInput v-model="createCapabilityForm.name" placeholder="e.g. Account Registration" autofocus />
          </UFormField>
          <UFormField label="Description">
            <UTextarea v-model="createCapabilityForm.description" placeholder="Optional description..." />
          </UFormField>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-x-3">
          <UButton color="neutral" variant="ghost" label="Cancel" @click="showCreateCapabilityModal = false" />
          <UButton color="primary" label="Create" :loading="isCreatingCapability" :disabled="!canCreateCapability" @click="handleCreateCapability" />
        </div>
      </template>
    </UModal>
  </div>
</template>
