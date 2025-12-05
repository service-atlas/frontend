<template>
  <UDropdownMenu
    v-slot="{ open }"
    :modal="false"
    :items="[
      { label: 'Reports', icon: 'i-lucide-bar-chart-3', to: '/reports' },
      { label: 'Teams', icon: 'i-lucide-users', to: '/teams' },
      { label: 'Services', icon: 'i-lucide-box', to: '/services' }
    ]"
    :content="{ align: 'start' }"
    :ui="{ content: 'min-w-fit' }"
    size="xs"
  >
    <UButton
      label="Pages"
      variant="subtle"
      trailing-icon="i-lucide-chevron-down"
      size="xs"
      class="-mb-[6px] font-semibold rounded-full truncate"
      :class="[open && 'bg-primary/15']"
      :ui="{
        trailingIcon: ['transition-transform duration-200', open ? 'rotate-180' : undefined].filter(Boolean).join(' ')
      }"
    />
  </UDropdownMenu>
</template>
