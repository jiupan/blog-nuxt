export default defineNuxtConfig({
  compatibilityDate: '2026-06-28',
  srcDir: 'app',
  devtools: { enabled: true },
  css: ['~/assets/css/main.css', 'md-editor-v3/lib/style.css'],
  modules: [
    '@nuxt/ui',
    '@nuxt/image',
    '@nuxtjs/sitemap',
    'nuxt-auth-utils',
    'nuxt-security'
  ],
  fonts: {
    providers: {
      google: false,
      googleicons: false,
      bunny: false,
      fontshare: false,
      adobe: false,
      fontsource: false,
    },
  },
  routeRules: {
    '/admin/**': { ssr: false },
    '/api/admin/**': { cors: false }
  },
  runtimeConfig: {
    uploadDir: process.env.UPLOAD_DIR || './uploads',
    public: {
      siteUrl: process.env.SITE_URL || 'http://localhost:3000',
      siteName: process.env.SITE_NAME || 'Jiupan Blog'
    }
  },
  sitemap: {
    sources: ['/api/__sitemap__/urls']
  }
})
