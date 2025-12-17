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

// API payload is used as-is. "result" will hold `{ data: [...], pagination: {...} }`.
const result = ref<unknown | null>(null)

const hasResult = computed(() => !!result.value)

function validate(): string | null {
  if (!startDate.value || !endDate.value) return 'Please select both a start date and an end date.'
  if (startDate.value > endDate.value) return 'Start date must be before or equal to end date.'
  return null
}

async function runReport(page = 1) {
  error.value = null
  result.value = null
  const v = validate()
  if (v) {
    error.value = v
    return
  }
  try {
    const data = await getReleasesInRange(startDate.value, endDate.value, page)
    result.value = data
  } catch (e) {
    error.value = reportError.value || (e instanceof Error ? e.message : 'Failed to load releases.')
  }
}

interface Pagination {
  currentPage: number
  totalPages: number
  pageSize: number
}
const pageInfo = computed<Pagination>(() => {
  const r = result.value as { pagination?: Pagination } | null
  return r?.pagination ?? { currentPage: 1, totalPages: 1, pageSize: 50 }
})

function goPrev() {
  const { currentPage } = pageInfo.value
  if (currentPage > 1) runReport(currentPage - 1)
}

function goNext() {
  const { currentPage, totalPages } = pageInfo.value
  if (currentPage < totalPages) runReport(currentPage + 1)
}
</script>

<template>
  <div>
    <UPageHero
      title="Releases in Date Range"
      description="Fetch releases between two dates and browse with pagination."
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
            @click="runReport(1)"
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
            <div class="text-sm text-(--ui-text-muted)">
              Page {{ pageInfo.currentPage }} of {{ pageInfo.totalPages }}
            </div>
          </div>
        </template>

        <div v-if="Array.isArray((result as any)?.data) && (result as any).data.length > 0">
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
              <tr v-for="r in (result as any).data" :key="`${r.serviceId}-${r.version}-${r.releaseDate}`">
                <td class="py-2 px-3 border-b border-(--ui-border)">
                  {{ r.releaseDate }}
                </td>
                <td class="py-2 px-3 border-b border-(--ui-border)">
                  <NuxtLink :to="`/service/${r.serviceId}`" class="text-(--ui-primary) hover:underline">
                    {{ r.serviceName || r.serviceId }}
                  </NuxtLink>
                  <div v-if="r.serviceType" class="text-(--ui-text-muted) text-xs mt-0.5">
                    {{ r.serviceType }}
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

          <div class="flex items-center justify-between mt-3">
            <div class="text-sm text-(--ui-text-muted)">
              Showing up to {{ pageInfo.pageSize }} per page
            </div>
            <div class="flex gap-2">
              <UButton
                color="neutral"
                variant="ghost"
                icon="lucide:chevron-left"
                label="Previous"
                :disabled="loading || pageInfo.currentPage <= 1"
                @click="goPrev"
              />
              <UButton
                color="neutral"
                variant="ghost"
                icon="lucide:chevron-right"
                trailing
                label="Next"
                :disabled="loading || pageInfo.currentPage >= pageInfo.totalPages"
                @click="goNext"
              />
            </div>
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
