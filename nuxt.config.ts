// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  ssr: false,
  compatibilityDate: '2025-05-15',
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],

  modules: ['@nuxt/eslint', '@nuxt/fonts', '@nuxt/icon', '@nuxt/scripts', '@nuxt/ui', '@nuxt/test-utils', '@nuxt/image', '@nuxtjs/supabase', '@nuxtjs/tailwindcss', '@vueuse/nuxt'],
  runtimeConfig: {
    public: {
      openrouterApiKey: process.env.NUXT_PUBLIC_OPENROUTER_API_KEY
    }
  },
  supabase: {
    redirectOptions: {
      login: '/login',           // Where to redirect if user is not authenticated
      callback: '/chat',         // Where to redirect after successful OAuth login
      include: ['/chat(/.*)?'],  // Protect all /chat routes (regex pattern)
      exclude: ['/', '/login'],  // Don't protect home and login pages
      saveRedirectToCookie: true // Save the intended destination
    }
  }
})