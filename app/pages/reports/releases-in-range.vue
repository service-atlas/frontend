<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useReports } from '~/composables/useReports'

definePageMeta({
  title: 'Releases in Date Range'
})

const { getReleasesInRange, loading, error: reportError } = useReports()

const startDate = ref<string>('')
const endDate = ref<string>('')
const error = ref<string | null>(null)

// Pagination state
const page = ref<number>(1)
const pageSize = 25

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
    const data = await getReleasesInRange(startDate.value, endDate.value, page.value, pageSize)
    // Expecting an array
    result.value = Array.isArray(data) ? data : []
  } catch (e) {
    error.value = reportError.value || (e instanceof Error ? e.message : 'Failed to load releases.')
  }
}

// Reset page when dates change
watch([startDate, endDate], () => {
  page.value = 1
})

function nextPage() {
  page.value += 1
  runReport()
}

function prevPage() {
  if (page.value > 1) {
    page.value -= 1
    runReport()
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
            <div class="flex items-center gap-2" v-if="Array.isArray(result)">
              <UButton
                size="xs"
                variant="subtle"
                color="neutral"
                icon="lucide:chevron-left"
                :disabled="loading || page <= 1"
                @click="prevPage()"
              />
              <span class="text-xs text-(--ui-text-muted)">Page {{ page }}</span>
              <UButton
                size="xs"
                variant="subtle"
                color="neutral"
                icon="lucide:chevron-right"
                :disabled="loading || (Array.isArray(result) && result.length < 25)"
                @click="nextPage()"
              />
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
          <div class="flex items-center justify-end gap-2 mt-3">
            <UButton
              size="sm"
              variant="soft"
              color="neutral"
              icon="lucide:chevron-left"
              :disabled="loading || page <= 1"
              label="Previous"
              @click="prevPage()"
            />
            <div class="text-xs text-(--ui-text-muted)">
              Page {{ page }}
            </div>
            <UButton
              size="sm"
              variant="soft"
              color="neutral"
              trailing-icon="lucide:chevron-right"
              :disabled="loading || (Array.isArray(result) && result.length < 25)"
              label="Next"
              @click="nextPage()"
            />
          </div>
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
