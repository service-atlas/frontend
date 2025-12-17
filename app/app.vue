<script setup lang="ts">
useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' }
  ],
  link: [
    { rel: 'icon', href: '/favicon.ico' }
  ],
  htmlAttrs: {
    lang: 'en'
  }
})

const title = 'Service Atlas'
const description = 'Service Atlas - Manage your services, teams, and reports in one centralized platform.'

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description
})

const route = useRoute()

const navItems = [
  { label: 'Reports', to: '/reports' },
  { label: 'Teams', to: '/teams' },
  { label: 'Services', to: '/services' }
]

const isActive = (to: string) => {
  // consider the route active if it starts with the target path
  return route.path === to || route.path.startsWith(to + '/')
}
</script>

<template>
  <UApp>
    <UHeader>
      <template #left>
        <NuxtLink to="/">
          <AppLogo class="w-auto h-6 shrink-0" />
        </NuxtLink>

        <!-- Top-level navigation as tabs -->
        <nav aria-label="Primary" class="ml-4 self-stretch hidden sm:flex items-center gap-2">
          <NuxtLink
            v-for="item in navItems"
            :key="item.to"
            :to="item.to"
            class="px-3 py-2 -mb-px text-sm font-medium border-b-2 border-transparent rounded-t-md transition-colors"
            :aria-current="isActive(item.to) ? 'page' : undefined"
            :class="[
              isActive(item.to)
                ? 'text-(--ui-primary) border-(--ui-primary)'
                : 'text-(--ui-text-muted) hover:text-(--ui-text)'
            ]"
          >
            {{ item.label }}
          </NuxtLink>
        </nav>

        <!-- Mobile menu fallback -->
        <div class="ml-2 sm:hidden">
          <TemplateMenu />
        </div>
      </template>

      <template #right>
        <UColorModeButton />

        <UButton
          to="https://github.com/service-atlas"
          target="_blank"
          icon="simple-icons:github"
          aria-label="GitHub"
          color="neutral"
          variant="ghost"
        />
      </template>
    </UHeader>

    <UMain>
      <NuxtPage />
    </UMain>

    <USeparator icon="simple-icons:nuxtdotjs" />

    <UFooter>
      <template #left>
        <p class="text-sm text-muted">
          Built with Nuxt UI • © {{ new Date().getFullYear() }}
        </p>
      </template>

      <template #right>
        <UButton
          to="https://github.com/service-atlas"
          target="_blank"
          icon="simple-icons:github"
          aria-label="GitHub"
          color="neutral"
          variant="ghost"
        />
      </template>
    </UFooter>

    <!-- Nuxt UI v4 no longer requires a global <UModals /> provider -->
  </UApp>
</template>
