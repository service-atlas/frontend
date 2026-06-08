<script setup lang="ts">
import { UserManager } from 'oidc-client-ts'

onMounted(async () => {
  try {
    const userManager = useNuxtApp().$userManager as UserManager | undefined
    if (userManager) {
      await userManager.signinSilentCallback()
    } else {
      console.error('Silent callback: UserManager not available')
    }
  } catch (err) {
    console.error('Silent callback error:', err)
  }
})
</script>

<template>
  <div>Completing silent renew...</div>
</template>
