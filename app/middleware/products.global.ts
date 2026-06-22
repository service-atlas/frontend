export default defineNuxtRouteMiddleware((to) => {
  const config = useRuntimeConfig()
  const enableProducts = config.public.enableProducts

  if (!enableProducts && to.path.startsWith('/platforms')) {
    return navigateTo('/')
  }
})
