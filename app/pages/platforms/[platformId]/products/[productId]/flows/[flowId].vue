<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { usePlatforms, type PlatformDto } from '~/composables/usePlatforms'
import { useProducts, type ProductDto } from '~/composables/useProducts'
import { useFlows, type FlowDto } from '~/composables/useFlows'
import { useAuth } from '~/composables/useAuth'

const route = useRoute()
const platformId = computed(() => route.params.platformId as string)
const productId = computed(() => route.params.productId as string)
const flowId = computed(() => route.params.flowId as string)

const { getPlatform } = usePlatforms()
const { getProduct } = useProducts()
const { getFlow } = useFlows()
const { isAuthenticated } = useAuth()

const platform = ref<PlatformDto | null>(null)
const product = ref<ProductDto | null>(null)
const flow = ref<FlowDto | null>(null)

async function loadData() {
  if (!isAuthenticated.value) return
  try {
    const [plat, prod, fl] = await Promise.all([
      getPlatform(platformId.value),
      getProduct(productId.value),
      getFlow(flowId.value)
    ])
    platform.value = plat
    product.value = prod
    flow.value = fl
  } catch (e) {
    console.error('Failed to load flow data', e)
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

watch([platformId, productId, flowId], () => {
  loadData()
})

const breadcrumbs = computed(() => [
  { label: 'Platforms', to: '/platforms' },
  { label: platform.value?.name || '...', to: `/platforms/${platformId.value}` },
  { label: product.value?.name || '...', to: `/platforms/${platformId.value}/products/${productId.value}` },
  { label: flow.value?.name || 'Loading...' }
])
</script>

<template>
  <div class="space-y-6 mx-[2%]">
    <UBreadcrumb :links="breadcrumbs" />

    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold tracking-tight">
          {{ flow?.name || 'Flow' }}
        </h1>
        <p v-if="flow?.description" class="text-muted-foreground mt-1">
          {{ flow.description }}
        </p>
      </div>
    </div>

    <UCard>
      <div class="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-lg">
        <UIcon name="i-heroicons-wrench-screwdriver" class="h-12 w-12 text-muted-foreground mb-4" />
        <h3 class="text-xl font-semibold">
          Flow Step Builder
        </h3>
        <p class="text-muted-foreground max-w-sm mt-2">
          This is a placeholder for the Flow Step Builder. You will be able to define steps and transitions for "{{ flow?.name }}" here in the future.
        </p>
      </div>
    </UCard>
  </div>
</template>
