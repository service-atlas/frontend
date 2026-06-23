<script setup lang="ts">
interface FlowStepData {
  stepId: number
  flowId: number
  protocol: string | null
  target: string | null
  source: string
  targetNode: string
}

defineProps<{
  step: FlowStepData | null
}>()
</script>

<template>
  <div v-if="step" class="p-4 space-y-6">
    <div class="space-y-1">
      <h4 class="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
        Step Details
      </h4>
      <p class="text-xs text-muted-foreground">
        ID: {{ step.stepId }}
      </p>
    </div>

    <div class="grid grid-cols-2 gap-4">
      <div class="space-y-1">
        <label class="text-xs font-medium text-muted-foreground">Source Node</label>
        <div class="text-sm font-mono truncate bg-gray-50 dark:bg-gray-800 p-2 rounded border border-gray-100 dark:border-gray-700">
          {{ step.source }}
        </div>
      </div>
      <div class="space-y-1">
        <label class="text-xs font-medium text-muted-foreground">Target Node</label>
        <div class="text-sm font-mono truncate bg-gray-50 dark:bg-gray-800 p-2 rounded border border-gray-100 dark:border-gray-700">
          {{ step.targetNode }}
        </div>
      </div>
    </div>

    <div class="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
      <div class="space-y-1">
        <label class="text-xs font-medium text-muted-foreground">Protocol</label>
        <div class="flex items-center gap-2">
          <UBadge color="neutral" variant="soft">
            {{ step.protocol || 'Coming Soon' }}
          </UBadge>
        </div>
      </div>

      <div class="space-y-1">
        <label class="text-xs font-medium text-muted-foreground">Endpoint / Target</label>
        <div class="text-sm text-muted-foreground italic bg-gray-50 dark:bg-gray-800 p-2 rounded border border-gray-100 dark:border-gray-700">
          {{ step.target || 'Coming Soon' }}
        </div>
      </div>
    </div>
  </div>
</template>
