<script setup lang="ts">
definePageMeta({
  title: 'Reports'
})

const cards = [
  { title: 'Service Health', icon: 'lucide:heart-pulse', description: 'Overview of the current health across all services.' },
  { title: 'Upcoming Releases', icon: 'lucide:rocket', description: 'Releases scheduled in the next 30 days.' },
  { title: 'Outstanding Debt', icon: 'lucide:alert-triangle', description: 'Open tech debt items grouped by service.' }
]
</script>

<template>
  <div>
    <UPageHero
      title="Reports"
      description="A high-level view across services: health, releases, and technical debt."
      :links="[{ label: 'Refresh', icon: 'lucide:rotate-cw', color: 'neutral', variant: 'subtle' }]"
    />

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
              color="neutral"
              variant="ghost"
              icon="lucide:arrow-right"
              label="View details"
            />
          </template>
        </UCard>
      </div>
    </UPageSection>
  </div>
</template>
