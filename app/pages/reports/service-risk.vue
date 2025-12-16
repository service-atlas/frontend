<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useServices, type ServiceDto } from '~/composables/useServices'
import { useReports, type ServiceRiskReportDto } from '~/composables/useReports'

definePageMeta({
  title: 'Service Risk Report'
})

const { services, fetchServices, loading: loadingServices, error: servicesError } = useServices()
const { getServiceRisk, loading: loadingReport, error: reportError } = useReports()

const selectedServiceId = ref<string | null>(null)
const result = ref<ServiceRiskReportDto | null>(null)
const error = ref<string | null>(null)

onMounted(async () => {
  try {
    await fetchServices()
  } catch {
    // error refs already set
  }
})

const serviceItems = computed(() => services.value.map((s: ServiceDto) => ({ label: s.name, value: s.id })))

async function runReport() {
  error.value = null
  result.value = null
  if (!selectedServiceId.value) {
    error.value = 'Please select a service.'
    return
  }
  try {
    const data = await getServiceRisk(selectedServiceId.value)
    result.value = data
  } catch (e) {
    // prefer specific composable error if present
    error.value = reportError.value || (e instanceof Error ? e.message : 'Failed to run report.')
  }
}

const isLoading = computed(() => loadingServices.value || loadingReport.value)
</script>

<template>
  <div>
    <UPageHero
      title="Service Risk Report"
      description="Quantifies service risk based on amount of technical debt and number of dependent services."
      :links="[{ label: 'Back to Reports', to: '/reports', color: 'neutral', variant: 'subtle', icon: 'lucide:arrow-left' }]"
    />

    <UPageSection title="Criteria" description="Pick a service and run the report.">
      <div class="flex flex-col md:flex-row gap-3 items-stretch md:items-end">
        <div class="flex-1 min-w-[240px]">
          <div class="mb-1 text-sm font-medium">
            Service
          </div>
          <USelect
            v-model="selectedServiceId"
            :items="serviceItems"
            placeholder="Select a service…"
            :loading="loadingServices"
            class="w-full"
          />
        </div>
        <div>
          <UButton
            icon="lucide:play"
            label="Run report"
            :disabled="!selectedServiceId || isLoading"
            :loading="isLoading"
            @click="runReport"
          />
        </div>
      </div>

      <UAlert
        v-if="servicesError"
        color="error"
        variant="subtle"
        class="mt-3"
      >
        {{ servicesError }}
      </UAlert>
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
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <UCard>
          <template #header>
            <div class="font-medium">
              Dependent Services
            </div>
          </template>
          <div class="text-3xl font-semibold">
            {{ result?.DependentCount ?? 0 }}
          </div>
          <p class="text-(--ui-text-muted) text-sm mt-1">
            Number of services depending on the selected service.
          </p>
        </UCard>
        <UCard class="md:col-span-2">
          <template #header>
            <div class="font-medium">
              Debt Breakdown
            </div>
          </template>
          <div
            v-if="result?.DebtCount && Object.keys(result.DebtCount).length > 0"
            class="flex flex-wrap gap-2"
          >
            <span
              v-for="(count, key) in result.DebtCount"
              :key="key"
              class="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-(--ui-bg-elevated) border border-(--ui-border)"
            >
              <span class="capitalize text-sm">{{ key }}</span>
              <UBadge color="primary" variant="subtle">{{ count }}</UBadge>
            </span>
          </div>
          <div v-else class="text-(--ui-text-muted) text-sm">
            No technical debt recorded for this service.
          </div>
        </UCard>
      </div>
    </UPageSection>

    <UPageSection v-else>
      <div class="text-(--ui-text-muted) text-sm">
        Run the report to see results here.
      </div>
    </UPageSection>
  </div>
</template>
