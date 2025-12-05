<script setup lang="ts">
definePageMeta({
  title: 'Teams'
})
</script>

<template>
  <div>
    <UPageHero
      title="Teams"
      description="Manage teams and ownership. Placeholders for now — data wiring comes next."
      :links="[
        { label: 'New Team', icon: 'i-lucide-plus', color: 'primary' }
      ]"
    />

    <UPageSection
      title="Teams List"
      description="This will display the list of teams."
    >
      <UCard>
        <p class="text-(--ui-text-muted)">
          No teams yet. Create your first team to get started.
        </p>
      </UCard>
    </UPageSection>
  </div>
</template>
