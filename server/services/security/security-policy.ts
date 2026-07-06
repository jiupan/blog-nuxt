export const authPolicy = {
  userRole: 'USER',
  adminRole: 'ADMIN'
} as const

export const loginRateLimitPolicy = {
  windowMs: 15 * 60 * 1000,
  limit: 5
} as const

export const registerRateLimitPolicy = {
  windowMs: 60 * 60 * 1000,
  limit: 5
} as const

export const aiUsagePolicy = {
  dailyUserLimit: 20,
  userWindowMs: 60 * 1000,
  userWindowLimit: 5,
  ipWindowMs: 60 * 60 * 1000,
  ipWindowLimit: 60
} as const
