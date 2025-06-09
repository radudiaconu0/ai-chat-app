// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  ssr: false,
  compatibilityDate: '2025-05-15',
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],

  modules: ['@nuxt/eslint', '@nuxt/fonts', '@nuxt/icon', '@nuxt/scripts', '@nuxt/ui', '@nuxt/test-utils', '@nuxt/image', '@nuxtjs/supabase', '@nuxtjs/tailwindcss', '@vueuse/nuxt'],
  runtimeConfig: {
    public: {
      openAiKey: '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'
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