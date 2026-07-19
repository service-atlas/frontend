<script setup lang="ts">
interface FlowStepData {
  stepId: number
  flowId: number
  protocol: string | null
  endpointTarget: string | null
  source: string
  targetNode: string
}

const props = defineProps<{
  step: FlowStepData | null
  getServiceLabel?: (id: string) => string
}>()

// const emit = defineEmits(['delete', 'save'])

// const isDeleting = ref(false)
// const isSaving = ref(false)

// const protocols = ['HTTP', 'gRPC', 'SQL', 'Kafka', 'GraphQL', 'AMQP', 'TCP', 'UDP']
const protocol = ref<string | null>(null)
const target = ref<string | null>(null)

watch(() => props.step, (newStep) => {
  if (newStep) {
    protocol.value = newStep.protocol
    target.value = newStep.endpointTarget
  }
}, { immediate: true })

/* async function handleDelete() {
  isDeleting.value = true
  try {
    emit('delete', props.step?.stepId)
  } finally {
    isDeleting.value = false
  }
} */

/* async function handleSave() {
  if (!props.step) return
  isSaving.value = true
  try {
    emit('save', {
      stepId: props.step.stepId,
      protocol: protocol.value,
      target: target.value
    })
  } finally {
    isSaving.value = false
  }
} */

/* const targetExamples = {
  HTTP: 'GET /api/item/:id/stock',
  SQL: 'CALL get_inventory()',
  Kafka: 'inventory.stock.updated',
  gRPC: 'InventoryService.GetStock',
  GraphQL: 'query GetCart'
} */
</script>

<template>
  <div v-if="step" class="p-4 space-y-6">
    <div class="flex items-center justify-between">
      <div class="space-y-1">
        <h4 class="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
          Step Details
        </h4>
        <p class="text-xs text-muted-foreground">
          ID: {{ step.stepId }}
        </p>
      </div>
      <!-- <UButton
        color="error"
        variant="subtle"
        icon="i-heroicons-trash"
        size="sm"
        :loading="isDeleting"
        @click="handleDelete"
      >
        Delete Step
      </UButton> -->
    </div>

    <div class="grid grid-cols-2 gap-4">
      <div class="space-y-1">
        <label class="text-xs font-medium text-muted-foreground">Source</label>
        <div class="text-sm font-semibold truncate bg-gray-50 dark:bg-gray-800 p-2 rounded border border-gray-100 dark:border-gray-700">
          {{ getServiceLabel ? getServiceLabel(step.source) : step.source }}
        </div>
        <div class="text-[10px] font-mono text-muted-foreground truncate" :title="step.source">
          {{ step.source }}
        </div>
      </div>
      <div class="space-y-1">
        <label class="text-xs font-medium text-muted-foreground">Target</label>
        <div class="text-sm font-semibold truncate bg-gray-50 dark:bg-gray-800 p-2 rounded border border-gray-100 dark:border-gray-700">
          {{ getServiceLabel ? getServiceLabel(step.targetNode) : step.targetNode }}
        </div>
        <div class="text-[10px] font-mono text-muted-foreground truncate" :title="step.targetNode">
          {{ step.targetNode }}
        </div>
      </div>
    </div>

    <!-- <div class="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
      <div class="space-y-1">
        <label class="text-xs font-medium text-muted-foreground">Protocol</label>
        <USelect
          v-model="protocol"
          :items="protocols"
          placeholder="Select Protocol"
        />
      </div>

      <div class="space-y-1">
        <label class="text-xs font-medium text-muted-foreground">Endpoint / Target</label>
        <UInput
          v-model="target"
        />
        <p v-if="protocol && targetExamples[protocol as keyof typeof targetExamples]" class="text-[10px] text-muted-foreground mt-1">
          Example: <span class="font-mono">{{ targetExamples[protocol as keyof typeof targetExamples] }}</span>
        </p>
      </div>

      <div class="pt-2">
        <UButton
          color="primary"
          icon="i-heroicons-check"
          :loading="isSaving"
          @click="handleSave"
        >
          Save Changes
        </UButton>
      </div>
    </div> -->
  </div>
</template>
