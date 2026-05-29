<script setup lang="ts">
const { handleCallback } = useAuth()
const router = useRouter()

onMounted(async () => {
  try {
    await handleCallback()
    router.push('/')
  } catch (error) {
    console.error('Failed to handle auth callback', error)
    // In a real app, you might want to redirect to an error page or back to login
    router.push('/')
  }
})
</script>

<template>
  <div class="flex items-center justify-center min-h-screen">
    <div class="text-center">
      <p class="text-lg font-medium">
        Completing login...
      </p>
      <USpinningIcon v-if="false" /> <!-- Placeholder for a loader if available -->
    </div>
  </div>
</template>
