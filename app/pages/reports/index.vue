<script setup lang="ts">
definePageMeta({
  title: 'Reports'
})

const cards = [
  { title: 'Service Risk', icon: 'lucide:shield-alert', description: 'Quantifies service risk based on tech debt and dependencies.', to: '/reports/service-risk' },
  { title: 'Services by Team', icon: 'lucide:users', description: 'Select a team to list all services owned by that team.', to: '/reports/services-by-team' },
  { title: 'Services by Tier', icon: 'lucide:layers', description: 'List all services belonging to a specific tier.', to: '/reports/services-by-tier' },
  { title: 'Releases in Date Range', icon: 'lucide:calendar-range', description: 'List all releases between two dates with pagination.', to: '/reports/releases-in-range' }
]
</script>

<template>
  <div>
    <UPageSection
      title="Reports"
      description="Run the available reports below."
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
