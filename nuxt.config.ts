export default defineNuxtConfig({
  compatibilityDate: '2026-06-28',
  srcDir: 'app',
  devtools: { enabled: true },
  css: ['~/assets/css/main.css', '~/assets/css/site-layout.css', '~/assets/css/lab.css', 'md-editor-v3/lib/style.css'],
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@nuxt/image',
    '@nuxtjs/sitemap',
    'nuxt-auth-utils',
    'nuxt-security'
  ],
  security: {
    headers: {
      contentSecurityPolicy: {
        'img-src': ["'self'", 'data:', 'https://owo.imaegoo.com'],
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
    '/api/admin/**': { cors: false },
    '/api/admin/upload': {
      cors: false,
      security: {
        requestSizeLimiter: {
          maxRequestSizeInBytes: 51 * 1024 * 1024,
          maxUploadFileRequestInBytes: 51 * 1024 * 1024
        }
      }
    },
    '/api/admin/ai/**': {
      cors: false,
      security: {
        xssValidator: false
      }
    },
    '/api/admin/posts/**': {
      cors: false,
      security: {
        xssValidator: false
      }
    },
    '/api/admin/knowledge/files/**': {
      cors: false,
      security: {
        requestSizeLimiter: {
          maxRequestSizeInBytes: 11 * 1024 * 1024,
          maxUploadFileRequestInBytes: 11 * 1024 * 1024
        }
      }
    }
  },
  runtimeConfig: {
    session: {
      password: process.env.NUXT_SESSION_PASSWORD || '',
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
    knowledgeFileDir: process.env.KNOWLEDGE_FILE_DIR || './data/knowledge-files',
    knowledgeWorkerEnabled: process.env.KNOWLEDGE_WORKER_ENABLED !== 'false',
    knowledgeWorkerPollIntervalMs: Number(process.env.KNOWLEDGE_WORKER_POLL_INTERVAL_MS || 2000),
    knowledgeWorkerHeartbeatIntervalMs: Number(process.env.KNOWLEDGE_WORKER_HEARTBEAT_INTERVAL_MS || 15000),
    knowledgeWorkerLeaseTimeoutMs: Number(process.env.KNOWLEDGE_WORKER_LEASE_TIMEOUT_MS || 60000),
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
      siteName: process.env.SITE_NAME || 'Jiupan Blog',
      twikooEnvId: process.env.NUXT_PUBLIC_TWIKOO_ENV_ID || '',
      twikooRegion: process.env.NUXT_PUBLIC_TWIKOO_REGION || ''
    }
  },
  sitemap: {
    sources: ['/api/__sitemap__/urls']
  }
})
