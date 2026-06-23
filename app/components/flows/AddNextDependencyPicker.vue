<script setup lang="ts">
import { ref, watch } from 'vue'
import { useServices, type ServiceDto } from '~/composables/useServices'

interface ServiceDependency {
  id: string
  name: string
  type: string
  interaction_type: string
}

const props = defineProps<{
  sourceNodeId?: string | null
  excludeIds?: string[]
}>()

const emit = defineEmits(['selected'])

const { searchServices } = useServices()
const apiFetch = useApi()

const query = ref('')
const results = ref<any[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

async function fetchResults() {
  if (!query.value && !props.sourceNodeId) {
    results.value = []
    return
  }

  loading.value = true
  error.value = null

  try {
    if (props.sourceNodeId) {
      // Fetch dependencies for existing node
      const data = await apiFetch<ServiceDependency[]>(`/services/${props.sourceNodeId}/dependencies`)
      results.value = data
        .filter(d => d.interaction_type === 'data')
        .filter(d => !props.excludeIds?.includes(d.id))
        .map(d => ({
          id: d.id,
          name: d.name,
          type: d.type
        }))
    } else {
      // Initial node search
      const data = await searchServices(query.value)
      results.value = data.map(s => ({
        id: s.id,
        name: s.name,
        type: s.type
      }))
    }
  } catch (e: any) {
    error.value = 'Failed to load options'
  } finally {
    loading.value = false
  }
}

watch([query, () => props.sourceNodeId], () => {
  fetchResults()
}, { immediate: true })

function handleSelect(item: any) {
  emit('selected', item)
}
</script>

<template>
  <div class="p-4 space-y-4">
    <div v-if="!sourceNodeId">
      <UInput
        v-model="query"
        icon="i-heroicons-magnifying-glass"
        placeholder="Search services..."
        autofocus
      />
    </div>

    <div v-if="loading" class="flex justify-center py-4">
      <UIcon name="i-heroicons-arrow-path" class="animate-spin h-6 w-6 text-muted-foreground" />
    </div>

    <div v-else-if="error" class="text-sm text-red-500 py-2">
      {{ error }}
    </div>

    <div v-else-if="results.length === 0" class="text-sm text-muted-foreground py-2 text-center">
      No valid options found.
    </div>

    <div v-else class="max-h-60 overflow-y-auto border border-gray-200 dark:border-gray-800 rounded-md">
      <div
        v-for="item in results"
        :key="item.id"
        class="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer border-b last:border-0 border-gray-100 dark:border-gray-800 flex items-center justify-between"
        @click="handleSelect(item)"
      >
        <div>
          <div class="font-medium">{{ item.name }}</div>
          <div class="text-xs text-muted-foreground uppercase tracking-wider">{{ item.type }}</div>
        </div>
        <UIcon name="i-heroicons-plus" class="h-4 w-4 text-muted-foreground" />
      </div>
    </div>
  </div>
</template>
