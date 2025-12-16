<script setup lang="ts">
definePageMeta({
  title: 'Reports'
})

const cards = [
  { title: 'Service Risk', icon: 'lucide:shield-alert', description: 'Quantifies service risk based on tech debt and dependencies.', to: '/reports/service-risk' },
  { title: 'Services by Team', icon: 'lucide:users', description: 'Select a team to list all services owned by that team.', to: '/reports/services-by-team' },
  { title: 'Service Health', icon: 'lucide:heart-pulse', description: 'Overview of the current health across all services.' },
  { title: 'Upcoming Releases', icon: 'lucide:rocket', description: 'Releases scheduled in the next 30 days.' },
  { title: 'Outstanding Debt', icon: 'lucide:alert-triangle', description: 'Open tech debt items grouped by service.' }
]
</script>

<template>
  <div>
    <UPageSection
      title="Overview"
      description="These are initial placeholders. We will wire data sources later."
    >
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <UCard
          v-for="c in cards"
          :key="c.title"
        >
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon
                :name="c.icon"
                class="text-(--ui-primary)"
              />
              <span class="font-medium">{{ c.title }}</span>
            </div>
          </template>
          <p class="text-(--ui-text-muted)">
            {{ c.description }}
          </p>
          <template #footer>
            <UButton
              v-if="c.to"
              :to="c.to"
              color="neutral"
              variant="ghost"
              icon="lucide:arrow-right"
              label="Open report"
            />
          </template>
        </UCard>
      </div>
    </UPageSection>
  </div>
</template>
