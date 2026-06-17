// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    // Provide runtime icon rendering for Nuxt UI (e.g., lucide icons)
    '@nuxt/icon'
  ],
  devtools: {
    enabled: true
  },

  // Ensure global styles (Tailwind + Nuxt UI) are loaded from the conventional Nuxt assets directory
  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    // Private keys are only available on the server
    apiUrl: process.env.API_URL || 'http://localhost:8080',
    productsApiUrl: process.env.PRODUCTS_API_URL || 'http://localhost:8081',
    public: {
      // Base URL for backend API
      apiUrl: process.env.NUXT_PUBLIC_API_URL || process.env.API_URL || 'http://localhost:8080',
      productsApiUrl: process.env.NUXT_PUBLIC_PRODUCTS_API_URL || process.env.PRODUCTS_API_URL || '',
      enableProducts: process.env.NUXT_PUBLIC_ENABLE_PRODUCTS === 'true' || process.env.ENABLE_PRODUCTS === 'true',
      oidc: {
        issuer: process.env.NUXT_PUBLIC_OIDC_ISSUER || '',
        clientId: process.env.NUXT_PUBLIC_OIDC_CLIENT_ID || '',
        redirectUri: process.env.NUXT_PUBLIC_OIDC_REDIRECT_URI || '',
        silentRedirectUri: process.env.NUXT_PUBLIC_OIDC_SILENT_REDIRECT_URI || '',
        scopes: process.env.NUXT_PUBLIC_OIDC_SCOPES || 'openid profile email',
        audience: process.env.NUXT_PUBLIC_OIDC_AUDIENCE || '',
        authEnabled: !!(process.env.NUXT_PUBLIC_OIDC_ISSUER && process.env.NUXT_PUBLIC_OIDC_CLIENT_ID)
      }
    }
  },

  // Add debugging for runtime config
  hooks: {
    'ready': (nuxt) => {
      console.log('Nuxt config ready. OIDC enabled:', nuxt.options.runtimeConfig.public.oidc.authEnabled)
    }
  },

  routeRules: {},

  compatibilityDate: '2025-01-15',

  // In development, proxy API requests to avoid CORS issues.
  // Requests made to "/api/*" from the browser will be proxied to API_URL.
  nitro: {
    devProxy: {
      '/api/': {
        target: process.env.API_URL ?? 'http://localhost:8080',
        changeOrigin: true
      },
      '/api/products/': {
        target: process.env.PRODUCTS_API_URL ?? 'http://localhost:8081',
        changeOrigin: true,
        pathRewrite: { '^/api/products/': '/' }
      }
    }
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})
