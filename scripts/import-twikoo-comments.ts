import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import process from 'node:process'
import { PrismaClient } from '@prisma/client'
import { applyPlan } from './lib/comment-import'
import { resolveMapping, type LegacyMappingFile } from './lib/comment-mapping'
import { buildPlan, type ImportIssue, type PostLookup, type PostRef } from './lib/comment-plan'
import { buildReport, summarize, writeReport } from './lib/comment-report'
import { normalizeRecord, readSourceFile, type LegacyRecord, type MediaConversion } from './lib/comment-source'

const DEFAULT_REPORT_PATH = 'reports/comment-import-report.json'
const DEFAULT_SOURCE = 'twikoo'

type Options = {
  input: string | null
  mapping: string | null
  posts: string | null
  report: string
  apply: boolean
  target: string | null
  offline: boolean
  allowAnyHost: boolean
  allowRemote: boolean
  source: string
  failOnIssues: boolean
  help: boolean
}

const USAGE = `用法：
  npm run comments:import -- --input <备份文件> [选项]

选项：
  --input <path>      上游备份文件（必填）。支持 JSON 数组、LokiJS 导出、Mongo 风格与 JSONL。
  --mapping <path>    字段映射文件。用于校准上游字段名、旧路径别名与状态标记。
  --posts <path>      文章清单 JSON（[{ id, slug, title }]）。不连数据库时用它对齐文章。
  --report <path>     报告输出路径。默认 ${DEFAULT_REPORT_PATH}。
  --dry-run           试算，默认行为。只读数据库，输出结果不写数据。
  --apply             真正写入。需要同时给出 --target <数据库名>。
  --target <name>     目标数据库名，必须与 DATABASE_URL 里的库名一致。
  --offline           不连数据库，只做字段映射与结构体检。
  --allow-any-host    不校验来源域名。离线校准时用。
  --allow-remote      允许写入非本机数据库。确认是独立测试库后再用。
  --source <name>     写入的 legacySource，默认 ${DEFAULT_SOURCE}。
  --fail-on-issues    存在待处理记录时以非零码退出。
  --help              显示本帮助。

例：
  npm run comments:import -- --input backup.json --dry-run --report reports/dry-run.json
  npm run comments:import -- --input backup.json --apply --target nuxt_blog_import_test
`

function parseArgs(argv: string[]): Options {
  const options: Options = {
    input: null,
    mapping: null,
    posts: null,
    report: DEFAULT_REPORT_PATH,
    apply: false,
    target: null,
    offline: false,
    allowAnyHost: false,
    allowRemote: false,
    source: DEFAULT_SOURCE,
    failOnIssues: false,
    help: false
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    const next = () => {
      index += 1
      return argv[index]
    }

    switch (arg) {
      case '--input':
        options.input = next() ?? null
        break
      case '--mapping':
        options.mapping = next() ?? null
        break
      case '--posts':
        options.posts = next() ?? null
        break
      case '--report':
        options.report = next() ?? DEFAULT_REPORT_PATH
        break
      case '--target':
        options.target = next() ?? null
        break
      case '--source':
        options.source = next() ?? DEFAULT_SOURCE
        break
      case '--dry-run':
        options.apply = false
        break
      case '--apply':
        options.apply = true
        break
      case '--offline':
        options.offline = true
        break
      case '--allow-any-host':
        options.allowAnyHost = true
        break
      case '--allow-remote':
        options.allowRemote = true
        break
      case '--fail-on-issues':
        options.failOnIssues = true
        break
      case '--help':
      case '-h':
        options.help = true
        break
      default:
        if (arg.startsWith('--')) {
          throw new Error(`未知参数：${arg}`)
        }
    }
  }

  return options
}

function loadEnv() {
  try {
    process.loadEnvFile()
  } catch {
    // 没有 .env 时用进程环境变量。
  }
}

async function loadMappingFile(filePath: string | null): Promise<LegacyMappingFile | null> {
  if (!filePath) return null

  const text = await readFile(resolve(filePath), 'utf8')
  return JSON.parse(text) as LegacyMappingFile
}

/** 读文章清单。演练时用固定 ID 对齐文章。 */
async function loadPostList(filePath: string): Promise<PostRef[]> {
  const text = await readFile(resolve(filePath), 'utf8')
  const parsed = JSON.parse(text) as PostRef[]
  return parsed.map((post) => ({ id: post.id, slug: post.slug, title: post.title ?? post.slug }))
}

/** 从 DATABASE_URL 里取出库名，用来核对 --target。 */
function databaseName(databaseUrl: string): string {
  const parsed = new URL(databaseUrl)
  return decodeURIComponent(parsed.pathname.replace(/^\//, ''))
}

function databaseHost(databaseUrl: string): string {
  return new URL(databaseUrl).hostname
}

/**
 * 写入前的环境校验。
 *
 * 必须显式给出目标库名，且与连接串里的库名一致；
 * 连的是非本机数据库还要再加一个 --allow-remote，避免手滑写进正式库。
 */
function assertApplyTarget(databaseUrl: string, target: string | null, allowRemote: boolean) {
  if (!target) {
    throw new Error('写入模式必须给出 --target <数据库名>，确认目标库无误')
  }

  const actual = databaseName(databaseUrl)
  if (actual !== target) {
    throw new Error(`--target 与数据库不符：期望 ${target}，实际 ${actual}`)
  }

  const host = databaseHost(databaseUrl)
  const isLocal = ['localhost', '127.0.0.1', '::1', '0.0.0.0'].includes(host)
  if (!isLocal && !allowRemote) {
    throw new Error(`目标数据库在 ${host}，不是本机。确认是独立测试库后再加 --allow-remote`)
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2))

  if (options.help) {
    process.stdout.write(USAGE)
    return
  }

  if (!options.input) {
    throw new Error('缺少 --input')
  }

  loadEnv()

  const databaseUrl = process.env.DATABASE_URL ?? ''
  const offline = options.offline || !databaseUrl

  if (options.apply) {
    if (offline) throw new Error('写入模式需要 DATABASE_URL')
    assertApplyTarget(databaseUrl, options.target, options.allowRemote)
  }

  const mappingFile = await loadMappingFile(options.mapping)
  const mapping = resolveMapping(mappingFile)

  // 可信域名默认取当前站点，再并上映射文件里补的旧域名。
  const siteUrl = process.env.SITE_URL ?? ''
  const allowedHosts = new Set(mapping.allowedHosts)
  if (siteUrl) {
    try {
      allowedHosts.add(new URL(siteUrl).host.toLowerCase())
    } catch {
      // SITE_URL 不合法就不加。
    }
  }
  mapping.allowedHosts = [...allowedHosts]

  const source = await readSourceFile(resolve(options.input))

  const records: LegacyRecord[] = []
  const media: MediaConversion[] = []
  for (const raw of source.records) {
    const normalized = normalizeRecord(raw, mapping)
    records.push(normalized.record)
    media.push(...normalized.record.mediaConversions)
  }

  const prisma = offline ? null : new PrismaClient()

  // 文章清单优先。不连数据库时用清单对齐文章，演练整条链路。
  const postList = options.posts ? await loadPostList(options.posts) : null
  const lookup: PostLookup = {
    async find(slug: string): Promise<PostRef | null> {
      if (postList) {
        return postList.find((post) => post.slug === slug) ?? null
      }
      if (!prisma) return null
      const post = await prisma.post.findUnique({
        where: { slug },
        select: { id: true, slug: true, title: true }
      })
      return post
    }
  }

  const plan = await buildPlan({
    records,
    mapping,
    lookup,
    allowAnyHost: options.allowAnyHost
  })

  let applyResult: Awaited<ReturnType<typeof applyPlan>> | undefined
  if (options.apply && prisma) {
    applyResult = await applyPlan(prisma, plan, { source: options.source })
  }

  const notes: string[] = []
  if (mapping.defaultStatus !== 'VISIBLE') {
    notes.push(`无法识别的状态按 ${mapping.defaultStatus} 导入，未识别的记录不会自动变可见。`)
  }
  if (!mapping.statusMapOverridden) {
    notes.push('状态映射用的是默认值。数字状态标记未确认，遇到时按未知处理。')
  }
  if (plan.totals.derivedSourceIds > 0) {
    notes.push(`${plan.totals.derivedSourceIds} 条记录没有稳定来源 ID，ID 由内容派生。`)
  }
  if (plan.totals.unknownStatus > 0) {
    notes.push(`${plan.totals.unknownStatus} 条记录的状态标记无法识别。`)
  }
  if (offline) {
    notes.push('离线模式：没有连接数据库，文章归属与重跑去重都没有核对。')
  }
  if (mapping.allowedHosts.length === 0) {
    notes.push('没有配置可信域名，所有来源域名都放行。确认旧站域名后请在映射文件里补上 allowedHosts。')
  }

  const report = buildReport({
    mode: options.apply ? 'apply' : 'dry-run',
    source: {
      file: options.input,
      format: source.format,
      records: source.records.length,
      unparsed: source.unparsed
    },
    database: {
      target: offline ? null : databaseName(databaseUrl),
      applied: Boolean(options.apply && applyResult)
    },
    plan,
    apply: applyResult
      ? {
          inserted: applyResult.inserted,
          skipped: applyResult.skipped,
          mismatched: applyResult.mismatched,
          unresolved: applyResult.unresolved,
          issues: applyResult.issues
        }
      : undefined,
    media,
    notes
  })

  await writeReport(report, resolve(options.report))
  process.stdout.write(`${summarize(report)}\n报告已写入 ${resolve(options.report)}\n`)

  await prisma?.$disconnect()

  const blocking = report.issues.filter((issue: ImportIssue) => issue.blocking)
  if (options.failOnIssues && blocking.length > 0) {
    process.exitCode = 1
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
  process.exitCode = 1
})
