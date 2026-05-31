<script setup lang="ts">
const { login, isAuthenticated } = useAuth()
const route = useRoute()
const router = useRouter()

// If already authenticated, redirect back to where we came from or home
onMounted(async () => {
  if (isAuthenticated.value) {
    const redirect = route.query.redirect as string
    router.push(redirect || '/')
    return
  }

  // Trigger OIDC login
  const redirect = route.query.redirect as string
  await login(redirect)
})
</script>

<template>
  <UContainer class="flex items-center justify-center min-h-[50vh]">
    <UCard class="w-full max-w-md">
      <template #header>
        <h3 class="text-xl font-semibold text-center">
          Redirecting to Login
        </h3>
      </template>

      <div class="space-y-4 text-center">
        <p class="text-(--ui-text-muted)">
          Please wait while we redirect you to the authentication provider...
        </p>
        <div class="flex justify-center">
          <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-(--ui-primary)" />
        </div>
      </div>
    </UCard>
  </UContainer>
</template>
