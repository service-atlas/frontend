import * as oidc from 'oidc-client-ts'
import type { AuthUser } from '~/composables/useAuth'

export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig()
  const oidcConfig = config.public.oidc

  console.log('OIDC Plugin: Running setup', {
    authEnabled: oidcConfig.authEnabled,
    isClient: import.meta.client
  })

  let userManager: oidc.UserManager | null = null

  // Only initialize if auth is enabled and we are on the client
  if (oidcConfig.authEnabled && import.meta.client) {
    const settings: oidc.UserManagerSettings = {
      authority: oidcConfig.issuer,
      client_id: oidcConfig.clientId,
      redirect_uri: oidcConfig.redirectUri,
      response_type: 'code',
      scope: oidcConfig.scopes,
      loadUserInfo: true,
      automaticSilentRenew: true
    }

    console.info('Initializing OIDC UserManager with:', {
      authority: settings.authority,
      client_id: settings.client_id,
      redirect_uri: settings.redirect_uri
    })

    userManager = new (oidc as any).UserManager(settings) as oidc.UserManager

    // Attach to window for extreme debugging if needed
    (window as any).$userManager = userManager

    // We use the same state keys as useAuth.ts to keep them in sync
    const isAuthenticated = useState<boolean>('auth_is_authenticated')
    const user = useState<AuthUser | null>('auth_user')

    // Sync state with user manager
    if (userManager) {
      userManager.getUser().then((oidcUser: any) => {
        console.log('OIDC Plugin: Initial getUser result', !!oidcUser)
        if (oidcUser && !oidcUser.expired) {
          console.log('OIDC Plugin: User is authenticated', oidcUser.profile.sub)
          isAuthenticated.value = true
          user.value = {
            sub: oidcUser.profile.sub,
            name: oidcUser.profile.name,
            email: oidcUser.profile.email
          }
        } else {
          console.log('OIDC Plugin: User is not authenticated or expired')
          isAuthenticated.value = false
          user.value = null
        }
      }).catch((err: any) => {
        console.error('OIDC Plugin: getUser error', err)
      })

      userManager.events.addUserLoaded((oidcUser: any) => {
        console.log('OIDC Plugin: User loaded', oidcUser.profile.sub)
        isAuthenticated.value = true
        user.value = {
          sub: oidcUser.profile.sub,
          name: oidcUser.profile.name,
          email: oidcUser.profile.email
        }
      })

      userManager.events.addUserUnloaded(() => {
        console.log('OIDC Plugin: User unloaded')
        isAuthenticated.value = false
        user.value = null
      })
    }
  } else {
    console.info('OIDC auth disabled or server-side, skipping UserManager initialization', {
      authEnabled: oidcConfig.authEnabled,
      isClient: import.meta.client
    })
  }

  console.log('OIDC Plugin: Providing userManager to nuxtApp', !!userManager)

  return {
    provide: {
      userManager: userManager as any
    }
  }
})
