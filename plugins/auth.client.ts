import { UserManager, type UserManagerSettings } from 'oidc-client-ts'
import type { AuthUser } from '~/composables/useAuth'

export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig()
  const oidcConfig = config.public.oidc

  // Only initialize if auth is enabled and we are on the client
  if (!oidcConfig.authEnabled || !import.meta.client) {
    return {
      provide: {
        userManager: null
      }
    }
  }

  const settings: UserManagerSettings = {
    authority: oidcConfig.issuer,
    client_id: oidcConfig.clientId,
    redirect_uri: oidcConfig.redirectUri,
    response_type: 'code',
    scope: oidcConfig.scopes,
    loadUserInfo: true,
    automaticSilentRenew: true
  }

  if (oidcConfig.audience) {
    settings.extraQueryParams = {
      audience: oidcConfig.audience
    }
  }

  const userManager = new UserManager(settings)

  // We use the same state keys as useAuth.ts to keep them in sync
  const isAuthenticated = useState<boolean>('auth_is_authenticated')
  const user = useState<AuthUser | null>('auth_user')

  // Sync state with user manager
  userManager.getUser().then((oidcUser) => {
    if (oidcUser && !oidcUser.expired) {
      isAuthenticated.value = true
      user.value = {
        sub: oidcUser.profile.sub,
        name: oidcUser.profile.name,
        email: oidcUser.profile.email
      }
    } else {
      isAuthenticated.value = false
      user.value = null
    }
  })

  userManager.events.addUserLoaded((oidcUser) => {
    isAuthenticated.value = true
    user.value = {
      sub: oidcUser.profile.sub,
      name: oidcUser.profile.name,
      email: oidcUser.profile.email
    }
  })

  userManager.events.addUserUnloaded(() => {
    isAuthenticated.value = false
    user.value = null
  })

  return {
    provide: {
      userManager
    }
  }
})
