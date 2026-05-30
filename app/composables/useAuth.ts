import { type UserManager } from 'oidc-client-ts'

export interface AuthUser {
  sub: string
  name?: string
  email?: string
}

export interface AuthClient {
  enabled: boolean
  isAuthenticated: Ref<boolean>
  user: Ref<AuthUser | null>
  login: (url?: string) => Promise<void>
  logout: () => Promise<void>
  handleCallback: () => Promise<string | undefined>
  getAccessToken: () => Promise<string | null>
}

export const useAuth = (): AuthClient => {
  const { $userManager } = useNuxtApp()
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

  const userManager = $userManager as UserManager | null

  const login = async (url?: string) => {
    if (!enabled || !userManager) return
    await userManager.signinRedirect({
      state: url
    })
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
      return oidcUser.state as string | undefined
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
