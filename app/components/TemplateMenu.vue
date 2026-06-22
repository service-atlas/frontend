<script setup lang="ts">
const config = useRuntimeConfig()
const enableProducts = computed(() => config.public.enableProducts)

const menuItems = computed(() => {
  const items = [
    { label: 'Reports', icon: 'lucide:bar-chart-3', to: '/reports' },
    { label: 'Teams', icon: 'lucide:users', to: '/teams' },
    { label: 'Services', icon: 'lucide:box', to: '/services' }
  ]

  if (enableProducts.value) {
    items.unshift({ label: 'Platforms', icon: 'lucide:layout-grid', to: '/platforms' })
  }

  return items
})
</script>

<template>
  <UDropdownMenu
    v-slot="{ open }"
    :modal="false"
    :items="menuItems"
    :content="{ align: 'start' }"
    :ui="{ content: 'min-w-fit' }"
    size="xs"
  >
    <UButton
      label="Pages"
      variant="subtle"
      trailing-icon="lucide:chevron-down"
      size="xs"
      class="-mb-[6px] font-semibold rounded-full truncate"
      :class="[open && 'bg-primary/15']"
      :ui="{
        trailingIcon: ['transition-transform duration-200', open ? 'rotate-180' : undefined].filter(Boolean).join(' ')
      }"
    />
  </UDropdownMenu>
</template>
