<script setup lang="ts">
const { handleCallback } = useAuth()
const router = useRouter()

const error = ref<string | null>(null)

onMounted(async () => {
  try {
    const targetPath = await handleCallback()
    router.push(targetPath || '/')
  } catch (err: unknown) {
    console.error('Failed to handle auth callback', err)
    error.value = err instanceof Error ? err.message : 'An error occurred during authentication.'
  }
})
</script>

<template>
  <UContainer class="flex items-center justify-center min-h-[50vh]">
    <UCard class="w-full max-w-md">
      <template #header>
        <h3 class="text-xl font-semibold text-center">
          {{ error ? 'Authentication Error' : 'Authenticating' }}
        </h3>
      </template>

      <div class="space-y-4 text-center">
        <template v-if="!error">
          <p class="text-(--ui-text-muted)">
            Completing login, please wait...
          </p>
          <div class="flex justify-center">
            <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-(--ui-primary)" />
          </div>
        </template>

        <template v-else>
          <UAlert
            color="error"
            variant="soft"
            icon="i-lucide-circle-alert"
            :title="error"
            class="mb-4"
          />
          <UButton
            to="/"
            label="Back to Home"
            color="neutral"
            variant="outline"
          />
        </template>
      </div>
    </UCard>
  </UContainer>
</template>
