<script setup lang="ts">
const route = useRoute()
const showSidebar = computed(() => route.path !== '/')
</script>

<template>
  <div class="min-h-screen flex bg-(--ui-bg)">
    <div
      v-if="showSidebar"
      class="hidden md:block w-64 shrink-0"
    >
      <AppSidebar />
    </div>

    <div class="flex-1 min-w-0">
      <UContainer class="py-6">
        <slot />
      </UContainer>
    </div>
  </div>
</template>

<style scoped>
</style>
