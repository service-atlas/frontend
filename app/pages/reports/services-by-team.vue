<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useTeams, type TeamDto } from '~/composables/useTeams'
import { useReports } from '~/composables/useReports'

definePageMeta({
  title: 'Services by Team'
})

const { teams, fetchTeams, loading: loadingTeams, error: teamsError } = useTeams()
const { getServicesByTeam, loading: loadingReport, error: reportError } = useReports()

const selectedTeamId = ref<string | null>(null)
const result = ref<unknown[] | null>(null)
const error = ref<string | null>(null)

onMounted(async () => {
  try {
    await fetchTeams()
  } catch {
    // error refs already set
  }
})

const teamItems = computed(() => teams.value.map((t: TeamDto) => ({ label: t.name, value: t.id })))

async function runReport() {
  error.value = null
  result.value = null
  if (!selectedTeamId.value) {
    error.value = 'Please select a team.'
    return
  }
  try {
    const data = await getServicesByTeam(selectedTeamId.value)
    // data is expected to be an array returned by the API
    result.value = Array.isArray(data) ? data : []
  } catch (e) {
    error.value = reportError.value || (e instanceof Error ? e.message : 'Failed to load services for team.')
  }
}

const isLoading = computed(() => loadingTeams.value || loadingReport.value)
</script>

<template>
  <div>
    <UPageHero
      title="Services by Team"
      description="Select a team to list all services owned by that team."
      :links="[{ label: 'Back to Reports', to: '/reports', color: 'neutral', variant: 'subtle', icon: 'lucide:arrow-left' }]"
    />

    <UPageSection title="Criteria" description="Pick a team and run the report.">
      <div class="flex flex-col md:flex-row gap-3 items-stretch md:items-end">
        <div class="flex-1 min-w-[240px]">
          <div class="mb-1 text-sm font-medium">
            Team
          </div>
          <USelect
            v-model="selectedTeamId"
            :items="teamItems"
            placeholder="Select a team…"
            :loading="loadingTeams"
            class="w-full"
          />
        </div>
        <div>
          <UButton
            icon="lucide:play"
            label="Run report"
            :disabled="!selectedTeamId || isLoading"
            :loading="isLoading"
            @click="runReport"
          />
        </div>
      </div>

      <UAlert
        v-if="teamsError"
        color="error"
        variant="subtle"
        class="mt-3"
      >
        {{ teamsError }}
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
      <UCard>
        <template #header>
          <div class="font-medium">
            Services
          </div>
        </template>
        <div v-if="Array.isArray(result) && result.length > 0">
          <ul class="divide-y divide-(--ui-border)">
            <li v-for="svc in result" :key="svc.id" class="py-2">
              <NuxtLink :to="`/service/${svc.id}`" class="text-(--ui-primary) hover:underline">
                {{ svc.name || svc.id }}
              </NuxtLink>
              <div v-if="svc.type" class="text-(--ui-text-muted) text-xs mt-0.5">
                {{ svc.type }}
              </div>
            </li>
          </ul>
        </div>
        <div v-else class="text-(--ui-text-muted) text-sm">
          No services found for this team.
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
