<script setup lang="ts">
const links = [
  {
    label: 'Reports',
    icon: 'lucide:bar-chart-3',
    to: '/reports'
  },
  {
    label: 'Teams',
    icon: 'lucide:users',
    to: '/teams'
  },
  {
    label: 'Services',
    icon: 'lucide:box',
    to: '/services'
  }
]
</script>

<template>
  <aside class="h-full border-r border-(--ui-border)">
    <NuxtLink
      to="/"
      class="p-4 flex items-center gap-2 text-(--ui-text-muted) text-sm font-medium hover:text-(--ui-text)"
    >
      <img
        src="/logo.png"
        alt="Service Atlas"
        class="h-7 w-7 rounded-sm object-contain"
      >
      <span>Service Atlas</span>
    </NuxtLink>
    <UVerticalNavigation
      :links="links"
      class="px-2"
    />
  </aside>
</template>

<style scoped>
</style>
