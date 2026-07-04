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
  security: {
    headers: {
      contentSecurityPolicy: {
        'upgrade-insecure-requests': true
      }
    },
    rateLimiter: false
  },
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
    session: {
      name: '__Host-nuxt-session',
      maxAge: 60 * 60 * 24 * 7,
      cookie: {
        sameSite: 'lax',
        secure: true,
        httpOnly: true,
        path: '/'
      }
    },
    uploadDir: process.env.UPLOAD_DIR || './uploads',
    aiApiKey: process.env.AI_API_KEY || process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY || '',
    aiBaseUrl: process.env.AI_BASE_URL || 'https://api.deepseek.com',
    aiModel: process.env.AI_MODEL || 'deepseek-v4-flash',
    aiEmbeddingApiKey: process.env.AI_EMBEDDING_API_KEY || process.env.DASHSCOPE_API_KEY || process.env.OPENAI_API_KEY || '',
    aiEmbeddingBaseUrl: process.env.AI_EMBEDDING_BASE_URL || 'https://api.openai.com/v1',
    aiEmbeddingModel: process.env.AI_EMBEDDING_MODEL || 'text-embedding-3-small',
    aiEmbeddingDimensions: process.env.AI_EMBEDDING_DIMENSIONS || '1536',
    aiRerankEnabled: process.env.AI_RERANK_ENABLED || 'false',
    aiRerankApiKey: process.env.AI_RERANK_API_KEY || process.env.DASHSCOPE_API_KEY || '',
    aiRerankBaseUrl: process.env.AI_RERANK_BASE_URL || 'https://api.cohere.com/v2',
    aiRerankModel: process.env.AI_RERANK_MODEL || 'rerank-v3.5',
    aiRerankTopN: process.env.AI_RERANK_TOP_N || '8',
    public: {
      siteUrl: process.env.SITE_URL || 'http://localhost:3000',
      siteName: process.env.SITE_NAME || 'Jiupan Blog'
    }
  },
  sitemap: {
    sources: ['/api/__sitemap__/urls']
  }
})
