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


  const login = async (url?: string) => {
    console.log('useAuth: login called', { url, enabled })
    if (!enabled) {
      console.warn('Login attempted but OIDC is disabled')
      return
    }

    if (!import.meta.client) {
      console.warn('Login attempted on server-side, skipping')
      return
    }

    const activeUserManager = useNuxtApp().$userManager as UserManager | undefined
    if (!activeUserManager) {
      console.error('Login attempted but UserManager is not available in nuxtApp')
      console.log('Is client:', import.meta.client)
      return
    }

    try {
      console.log('useAuth: calling signinRedirect')
      await activeUserManager.signinRedirect({
        state: url
      })
    } catch (err) {
      console.error('useAuth: signinRedirect failed', err)
    }
  }

  const logout = async () => {
    if (!enabled || !import.meta.client) return
    const activeUserManager = useNuxtApp().$userManager as UserManager | undefined

    if (!activeUserManager) {
      console.error('Logout attempted but UserManager is not available')
      return
    }
    await activeUserManager.signoutRedirect()
  }

  const handleCallback = async () => {
    console.log('useAuth: handleCallback called')
    if (!enabled || !import.meta.client) return
    const activeUserManager = useNuxtApp().$userManager as UserManager | undefined

    console.log('useAuth: handleCallback activeUserManager', !!activeUserManager)

    if (!activeUserManager) {
      console.error('Callback handled but UserManager is not available')
      return
    }
    try {
      console.log('useAuth: calling signinRedirectCallback')
      const oidcUser = await activeUserManager.signinRedirectCallback()
      console.log('useAuth: signinRedirectCallback success', oidcUser.profile.sub)
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

  return {
    enabled,
    isAuthenticated,
    user,
    login,
    logout,
    handleCallback
  }
}
