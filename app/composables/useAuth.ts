export const useAuth = () => {
  const config = useRuntimeConfig()

  const isAuthEnabled = computed(() => !!config.public.oidc.authEnabled)
  const oidcConfig = computed(() => config.public.oidc)

  return {
    isAuthEnabled,
    oidcConfig
  }
}
