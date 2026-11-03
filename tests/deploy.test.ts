import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const bash = process.platform === 'win32'
  ? join(process.env.ProgramFiles || 'C:\\Program Files', 'Git', 'bin', 'bash.exe')
  : 'bash'
const script = readFileSync(new URL('../deploy.sh', import.meta.url), 'utf8').replace(/\r\n/g, '\n')
const mockCommands = `
docker() {
  printf '%s\\n' "$*" >> "$DEPLOY_TEST_LOG"
  case "$*" in
    *"pull app") [ "$FAIL_PULL" != 1 ]; return ;;
    *"ps -a -q app")
      if [ "$FIRST_DEPLOY" != 1 ]; then echo app-container; fi
      return 0 ;;
    "image tag "*) [ "$FAIL_TAG" != 1 ]; return ;;
    "image inspect "*) echo "\${NEW_IMAGE:-sha256:new}"; return 0 ;;
    "inspect "*)
      if [ "$3" = '{{.Image}}' ]; then echo sha256:old
      else echo "\${CURRENT_STATE:-healthy}"; fi
      return 0 ;;
    *"prisma migrate deploy") [ "$FAIL_MIGRATION" != 1 ]; return ;;
    *"--wait --wait-timeout 120 app") [ "$FAIL_HEALTH" != 1 ]; return ;;
    "image prune "*) [ "$FAIL_PRUNE" != 1 ]; return ;;
  esac
  return 0
}
sleep() { :; }
timeout() { shift 2; "$@"; }
source ./deploy.sh
`

function deploy(variables: Record<string, string> = {}) {
  const directory = mkdtempSync(join(tmpdir(), 'blog-deploy-test-'))
  if (!directory.startsWith(join(tmpdir(), 'blog-deploy-test-'))) throw new Error('Unexpected test directory')
  const log = join(directory, 'commands.log')
  writeFileSync(join(directory, 'deploy.sh'), script)
  writeFileSync(join(directory, '.env'), [
    'APP_IMAGE=registry.example:5000/team/blog:latest',
    'POSTGRES_DB=blog', 'POSTGRES_USER=blog', 'POSTGRES_PASSWORD=test-only',
    'DATABASE_URL=postgresql://blog:test-only@postgres:5432/blog',
    'NUXT_SESSION_PASSWORD=test-only', 'ADMIN_USERNAME=admin', 'ADMIN_PASSWORD=test-only',
    'SITE_URL=https://example.com', 'SITE_NAME=Blog', 'NUXT_PUBLIC_TWIKOO_ENV_ID=https://example.com/comments'
  ].join('\n'))
  try {
    const result = spawnSync(bash, ['-c', mockCommands, 'deploy.sh'], {
      cwd: directory,
      env: { ...process.env, ...variables, DEPLOY_TEST_LOG: log },
      encoding: 'utf8',
      timeout: 10000,
      windowsHide: true
    })
    if (result.error) throw result.error
    return { ...result, commands: existsSync(log) ? readFileSync(log, 'utf8') : '' }
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
}

describe('deployment and image retention', () => {
  it('preserves the previous image and cleans only blog images after health succeeds', () => {
    const result = deploy()
    expect(result.status).toBe(0)
    expect(result.commands).toContain('image tag sha256:old registry.example:5000/team/blog:rollback')
    expect(result.commands.indexOf('image tag')).toBeLessThan(result.commands.indexOf('prisma migrate deploy'))
    expect(result.commands.indexOf('--wait --wait-timeout 120 app')).toBeLessThan(result.commands.indexOf('image prune'))
    expect(result.commands).toContain('image prune -f --filter label=cn.ittx.blog.project=blog-nuxt')
    expect(result.commands).not.toMatch(/image prune.*(?:--all| -a\b)/)
  })

  it.each([
    ['pull failure', { FAIL_PULL: '1' }],
    ['migration failure', { FAIL_MIGRATION: '1' }],
    ['health failure', { FAIL_HEALTH: '1' }],
    ['backup failure', { FAIL_TAG: '1' }]
  ])('skips cleanup on %s', (_, variables) => {
    const result = deploy(variables)
    expect(result.status).not.toBe(0)
    expect(result.commands).not.toContain('image prune')
    expect(result.stdout).not.toContain('=== 部署完成 ===')
  })

  it('does not mark a healthy deployment failed when cleanup fails', () => {
    const result = deploy({ FAIL_PRUNE: '1' })
    expect(result.status).toBe(0)
    expect(result.stderr).toContain('WARNING')
    expect(result.stdout).toContain('=== 部署完成 ===')
  })

  it.each([{ NEW_IMAGE: 'sha256:old' }, { CURRENT_STATE: 'unhealthy' }])('preserves the existing rollback tag on reruns or unhealthy installations: %j', (variables) => {
    const result = deploy(variables)
    expect(result.status).toBe(0)
    expect(result.commands).not.toContain('image tag')
  })

  it('supports first deployment without an existing app container', () => {
    const result = deploy({ FIRST_DEPLOY: '1' })
    expect(result.status).toBe(0)
    expect(result.commands).not.toContain('image tag')
    expect(result.commands).toContain('image prune')
  })
})
