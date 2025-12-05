// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui'
  ],

  // Ensure global styles (Tailwind + Nuxt UI) are loaded from the conventional Nuxt assets directory
  css: ['~/assets/css/main.css'],

  routeRules: {},

  compatibilityDate: '2025-01-15',

  runtimeConfig: {
    public: {
      // Base URL for backend API
      apiUrl: process.env.API_URL || ''
    }
  },

  // In development, proxy API requests to avoid CORS issues.
  // Requests made to "/api/*" from the browser will be proxied to API_URL.
  nitro: {
    devProxy: {
      '/api/': {
        target: process.env.API_URL ?? 'http://localhost:8080',
        changeOrigin: true
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
  },
  devtools: {
    enabled: true
  }
})
