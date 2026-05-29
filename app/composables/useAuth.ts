import { UserManager, type UserManagerSettings } from 'oidc-client-ts'

export interface AuthUser {
  sub: string
  name?: string
  email?: string
}

export interface AuthClient {
  enabled: boolean
  isAuthenticated: Ref<boolean>
  user: Ref<AuthUser | null>
  login: () => Promise<void>
  logout: () => Promise<void>
  handleCallback: () => Promise<void>
  getAccessToken: () => Promise<string | null>
}

export const useAuth = (): AuthClient => {
  const config = useRuntimeConfig()
  const oidcConfig = config.public.oidc

  const enabled = !!oidcConfig.authEnabled
  const isAuthenticated = useState<boolean>('auth_is_authenticated', () => !enabled)
  const user = useState<AuthUser | null>('auth_user', () => {
    if (!enabled) {
      return {
        sub: 'local-user',
        name: 'Local User',
        email: 'local@example.com'
      }
    }
    return null
  })

  let userManager: UserManager | null = null

  if (enabled && import.meta.client) {
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

    userManager = new UserManager(settings)

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
  }

  const login = async () => {
    if (!enabled || !userManager) return
    await userManager.signinRedirect()
  }

  const logout = async () => {
    if (!enabled || !userManager) return
    await userManager.signoutRedirect()
  }

  const handleCallback = async () => {
    if (!enabled || !userManager) return
    try {
      const oidcUser = await userManager.signinRedirectCallback()
      isAuthenticated.value = true
      user.value = {
        sub: oidcUser.profile.sub,
        name: oidcUser.profile.name,
        email: oidcUser.profile.email
      }
    } catch (error) {
      console.error('OIDC callback error:', error)
      throw error
    }
  }

  const getAccessToken = async (): Promise<string | null> => {
    if (!enabled) return null
    if (!userManager) return null

    const oidcUser = await userManager.getUser()
    return oidcUser?.access_token || null
  }

  return {
    enabled,
    isAuthenticated,
    user,
    login,
    logout,
    handleCallback,
    getAccessToken
  }
}
