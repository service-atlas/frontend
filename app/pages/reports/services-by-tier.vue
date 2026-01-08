<script setup lang="ts">
import { ref } from 'vue'
import { useReports } from '~/composables/useReports'

definePageMeta({
  title: 'Services by Tier'
})

const { getServicesByTier, loading, error: reportError } = useReports()

const selectedTier = ref<number>(1)
const result = ref<unknown[] | null>(null)
const error = ref<string | null>(null)

const tierOptions = [
  { label: 'Tier 1', value: 1 },
  { label: 'Tier 2', value: 2 },
  { label: 'Tier 3', value: 3 },
  { label: 'Tier 4', value: 4 }
]

async function runReport() {
  error.value = null
  result.value = null
  try {
    const data = await getServicesByTier(selectedTier.value)
    result.value = Array.isArray(data) ? data : []
  } catch (e) {
    error.value = reportError.value || (e instanceof Error ? e.message : 'Failed to load services for tier.')
  }
}
</script>

<template>
  <div>
    <UPageHero
      title="Services by Tier"
      description="List all services belonging to a specific tier."
      :links="[{ label: 'Back to Reports', to: '/reports', color: 'neutral', variant: 'subtle', icon: 'lucide:arrow-left' }]"
    />

    <UPageSection title="Criteria" description="Pick a tier and run the report.">
      <div class="flex flex-col md:flex-row gap-3 items-stretch md:items-end">
        <div class="flex-1 min-w-[240px]">
          <div class="mb-1 text-sm font-medium">
            Tier
          </div>
          <USelect
            v-model="selectedTier"
            :items="tierOptions"
            placeholder="Select a tier…"
            class="w-full"
          />
        </div>
        <div>
          <UButton
            icon="lucide:play"
            label="Run report"
            :disabled="loading"
            :loading="loading"
            @click="runReport"
          />
        </div>
      </div>

      <UAlert
        v-if="error"
        color="error"
        variant="subtle"
        class="mt-3"
      >
        {{ error }}
      </UAlert>
    </UPageSection>

    <UPageSection title="Result" v-if="result">
      <UCard>
        <template #header>
          <div class="font-medium">
            Services (Tier {{ selectedTier }})
          </div>
        </template>
        <div v-if="Array.isArray(result) && result.length > 0">
          <ul class="divide-y divide-(--ui-border)">
            <li v-for="svc in (result as any[])" :key="svc.id" class="py-2">
              <NuxtLink :to="`/service/${svc.id}`" class="text-(--ui-primary) hover:underline">
                {{ svc.name || svc.id }}
              </NuxtLink>
              <div v-if="svc.type || svc.description" class="text-(--ui-text-muted) text-xs mt-0.5">
                {{ svc.type }} <span v-if="svc.type && svc.description">-</span> {{ svc.description }}
              </div>
            </li>
          </ul>
        </div>
        <div v-else class="text-(--ui-text-muted) text-sm">
          No services found for this tier.
        </div>
      </UCard>
    </UPageSection>

    <UPageSection v-else>
      <div class="text-(--ui-text-muted) text-sm">
        Run the report to see results here.
      </div>
    </UPageSection>
  </div>
</template>
