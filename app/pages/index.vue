<script setup lang="ts">
definePageMeta({
  title: 'Home'
})
</script>

<template>
  <div class="py-10">
    <div class="mx-auto max-w-3xl">
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <UButton
          to="/reports"
          size="xl"
          icon="i-lucide-bar-chart-3"
          label="Reports"
          block
        />
        <UButton
          to="/teams"
          size="xl"
          icon="i-lucide-users"
          label="Teams"
          block
        />
        <UButton
          to="/services"
          size="xl"
          icon="i-lucide-box"
          label="Services"
          block
        />
      </div>
    </div>
  </div>
</template>
