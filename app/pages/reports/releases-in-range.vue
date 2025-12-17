<script setup lang="ts">
import { ref, computed } from 'vue'
import { useReports } from '~/composables/useReports'

definePageMeta({
  title: 'Releases in Date Range'
})

const { getReleasesInRange, loading, error: reportError } = useReports()

const startDate = ref<string>('')
const endDate = ref<string>('')
const error = ref<string | null>(null)

// API returns a flat array with snake_case fields
const result = ref<unknown[] | null>(null)

const hasResult = computed(() => Array.isArray(result.value))

function validate(): string | null {
  if (!startDate.value || !endDate.value) return 'Please select both a start date and an end date.'
  if (startDate.value > endDate.value) return 'Start date must be before or equal to end date.'
  return null
}

async function runReport() {
  error.value = null
  result.value = null
  const v = validate()
  if (v) {
    error.value = v
    return
  }
  try {
    const data = await getReleasesInRange(startDate.value, endDate.value)
    // Expecting an array
    result.value = Array.isArray(data) ? data : []
  } catch (e) {
    error.value = reportError.value || (e instanceof Error ? e.message : 'Failed to load releases.')
  }
}
</script>

<template>
  <div>
    <UPageHero
      title="Releases in Date Range"
      description="Fetch releases between two dates."
      :links="[{ label: 'Back to Reports', to: '/reports', color: 'neutral', variant: 'subtle', icon: 'lucide:arrow-left' }]"
    />

    <UPageSection title="Criteria" description="Pick a start and end date, then run the report.">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
        <div>
          <div class="mb-1 text-sm font-medium">
            Start Date
          </div>
          <UInput v-model="startDate" type="date" class="w-full" />
        </div>
        <div>
          <div class="mb-1 text-sm font-medium">
            End Date
          </div>
          <UInput v-model="endDate" type="date" class="w-full" />
        </div>
        <div>
          <UButton
            icon="lucide:play"
            label="Run report"
            :disabled="loading || !startDate || !endDate"
            :loading="loading"
            @click="runReport()"
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

    <UPageSection v-if="hasResult" title="Result">
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <div class="font-medium">
              Releases
            </div>
          </div>
        </template>

        <div v-if="Array.isArray(result) && result.length > 0">
          <table class="w-full text-sm border-collapse">
            <thead>
              <tr class="text-left">
                <th class="py-2 px-3 border-b border-(--ui-border)">
                  Release Date
                </th>
                <th class="py-2 px-3 border-b border-(--ui-border)">
                  Service
                </th>
                <th class="py-2 px-3 border-b border-(--ui-border)">
                  Version
                </th>
                <th class="py-2 px-3 border-b border-(--ui-border)">
                  Link
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in result as any[]" :key="`${r.service_id}-${r.version}-${r.release_date}`">
                <td class="py-2 px-3 border-b border-(--ui-border)">
                  {{ r.release_date }}
                </td>
                <td class="py-2 px-3 border-b border-(--ui-border)">
                  <NuxtLink :to="`/service/${r.service_id}`" class="text-(--ui-primary) hover:underline">
                    {{ r.service_name || r.service_id }}
                  </NuxtLink>
                  <div v-if="r.service_type" class="text-(--ui-text-muted) text-xs mt-0.5">
                    {{ r.service_type }}
                  </div>
                </td>
                <td class="py-2 px-3 border-b border-(--ui-border)">
                  {{ r.version }}
                </td>
                <td class="py-2 px-3 border-b border-(--ui-border)">
                  <a v-if="r.url" :href="r.url" target="_blank" rel="noopener" class="text-(--ui-primary) hover:underline">Open</a>
                  <span v-else class="text-(--ui-text-muted)">—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="text-(--ui-text-muted) text-sm">
          No releases found for the selected range.
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
