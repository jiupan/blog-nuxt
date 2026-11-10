export default defineNuxtConfig({
  compatibilityDate: '2026-06-28',
  srcDir: 'app',
  devtools: { enabled: process.env.NODE_ENV !== 'production' },
  app: {
    pageTransition: {
      name: 'route-page',
      mode: 'out-in',
      duration: {
        enter: 680,
        leave: 0
      }
    }
  },
  css: ['~/assets/css/main.css', '~/assets/css/site-layout.css', 'md-editor-v3/lib/style.css'],
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
        'img-src': ["'self'", 'data:'],
        'upgrade-insecure-requests': true
      }
    },
    rateLimiter: false
  },
  fonts: {
    families: [
      {
        name: 'Noto Sans SC Variable',
        provider: 'none'
      }
    ],
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
    '/api/agent/**': {
      cors: false,
      security: {
        xssValidator: false,
        requestSizeLimiter: { maxRequestSizeInBytes: 1024 * 1024 }
      }
    },
    '/api/agent/images': {
      cors: false,
      security: {
        xssValidator: false,
        requestSizeLimiter: {
          maxRequestSizeInBytes: 51 * 1024 * 1024,
          maxUploadFileRequestInBytes: 51 * 1024 * 1024
        }
      }
    },
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
    '/api/resumes/**': {
      cors: false,
      security: {
        requestSizeLimiter: {
          // A 10MB avatar becomes roughly 13.4MB after Base64 encoding.
          maxRequestSizeInBytes: 15 * 1024 * 1024,
        }
      }
    },
    // 评论写接口必须关掉 xssValidator：它的默认实现会把正文里的 < 和 > 转义，
    // 与原值不一致就直接抛一个裸 400，绕开项目统一的 VALIDATION_ERROR 结构。
    // 评论正文本身由受限 Markdown 加 sanitize-html 白名单处理。
    '/api/comments/**': {
      cors: false,
      security: {
        xssValidator: false,
        requestSizeLimiter: { maxRequestSizeInBytes: 16 * 1024 }
      }
    },
    '/api/posts/:slug/comments': {
      cors: false,
      security: {
        xssValidator: false,
        requestSizeLimiter: { maxRequestSizeInBytes: 16 * 1024 }
      }
    },
    '/api/posts/:slug/comments/:id': {
      cors: false,
      security: {
        xssValidator: false,
        requestSizeLimiter: { maxRequestSizeInBytes: 16 * 1024 }
      }
    },
    '/api/posts/:slug/comments/:id/replies': {
      cors: false,
      security: {
        xssValidator: false,
        requestSizeLimiter: { maxRequestSizeInBytes: 16 * 1024 }
      }
    },
    '/api/admin/comments/**': {
      cors: false,
      security: {
        xssValidator: false,
        requestSizeLimiter: { maxRequestSizeInBytes: 16 * 1024 }
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
    // 允许发起评论写入的站点 origin，逗号分隔。留空时只用 public.siteUrl。
    commentAllowedOrigins: process.env.NUXT_COMMENT_ALLOWED_ORIGINS || '',
    // 限流桶 key 的 HMAC 密钥。没配就退回 session 密码。
    commentRateSecret: process.env.NUXT_COMMENT_RATE_SECRET || '',
    // 可信直连代理的 IP/CIDR，逗号分隔。默认不信任转发头。
    commentTrustedProxies: process.env.NUXT_COMMENT_TRUSTED_PROXIES || '',
    knowledgeFileDir: process.env.KNOWLEDGE_FILE_DIR || './data/knowledge-files',
    knowledgeWorkerEnabled: process.env.KNOWLEDGE_WORKER_ENABLED !== 'false',
    knowledgeWorkerPollIntervalMs: Number(process.env.KNOWLEDGE_WORKER_POLL_INTERVAL_MS || 2000),
    knowledgeWorkerHeartbeatIntervalMs: Number(process.env.KNOWLEDGE_WORKER_HEARTBEAT_INTERVAL_MS || 15000),
    knowledgeWorkerLeaseTimeoutMs: Number(process.env.KNOWLEDGE_WORKER_LEASE_TIMEOUT_MS || 60000),
    public: {
      siteUrl: process.env.SITE_URL || 'https://blog.ittx.cn',
      siteName: process.env.SITE_NAME || 'Jiupan Blog'
    }
  },
  site: { url: process.env.SITE_URL || 'https://blog.ittx.cn', name: process.env.SITE_NAME || 'Jiupan Blog' },
  nitro: { compressPublicAssets: true },
  sitemap: {
    xsl: false,
    excludeAppSources: true,
    cacheMaxAgeSeconds: 300,
    sources: ['/api/__sitemap__/urls']
  }
})
