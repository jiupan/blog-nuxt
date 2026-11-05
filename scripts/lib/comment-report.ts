import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import type { CommentStatusPayload } from '../../types/dto/comment'
import type { ImportIssue, PlanResult } from './comment-plan'
import type { MediaConversion } from './comment-source'

export type ImportPostStat = {
  postId: number
  slug: string
  title: string
  sourceRecords: number
  importable: number
  inserted: number
  skipped: number
  mismatched: number
  rootCount: number
  replyCount: number
  unassignable: number
  mediaConversions: number
  parentChildAnomalies: number
  statusDistribution: Record<CommentStatusPayload, number>
}

export type ImportReport = {
  generatedAt: string
  mode: 'dry-run' | 'apply'
  source: {
    file: string
    format: string
    records: number
    unparsed: number
  }
  database: {
    /** 目标库名。离线模式为 null。 */
    target: string | null
    applied: boolean
  }
  totals: {
    sourceRecords: number
    importable: number
    inserted: number
    skipped: number
    mismatched: number
    unresolved: number
    rootCount: number
    replyCount: number
    unassignable: number
    unresolvedPost: number
    rejected: number
    mediaConversions: number
    parentChildAnomalies: number
    unknownStatus: number
    derivedSourceIds: number
    statusDistribution: Record<CommentStatusPayload, number>
  }
  posts: ImportPostStat[]
  issues: ImportIssue[]
  /** 媒体转换记账。只记域名与路径，不记查询串与正文。 */
  media: { kind: string, source: string, count: number }[]
  notes: string[]
}

/**
 * 组装导入报告。
 *
 * 报告只写稳定 ID、问题类型和数量。正文、邮箱、IP、Cookie 一律不进来，
 * 需要核对内容时用正文摘要。
 */
export function buildReport(options: {
  mode: 'dry-run' | 'apply'
  source: { file: string, format: string, records: number, unparsed: number }
  database: { target: string | null, applied: boolean }
  plan: PlanResult
  apply?: { inserted: number, skipped: number, mismatched: number, unresolved: number, issues: ImportIssue[] }
  media: MediaConversion[]
  notes: string[]
}): ImportReport {
  const { plan } = options
  const apply = options.apply

  const posts: ImportPostStat[] = plan.posts.map((post) => {
    const stats: ImportPostStat = {
      postId: post.post.id,
      slug: post.post.slug,
      title: post.post.title,
      sourceRecords: post.sourceRecords,
      importable: post.importable,
      inserted: 0,
      skipped: 0,
      mismatched: 0,
      rootCount: post.rootCount,
      replyCount: post.replyCount,
      unassignable: post.unassignable,
      mediaConversions: post.mediaConversions,
      parentChildAnomalies: post.parentChildAnomalies,
      statusDistribution: post.statusDistribution
    }

    if (apply) {
      for (const issue of apply.issues) {
        if (issue.postId !== post.post.id) continue
        if (issue.kind === 'CONTENT_MISMATCH') stats.mismatched += 1
      }
    }

    return stats
  })

  const mediaLedger = new Map<string, { kind: string, source: string, count: number }>()
  for (const conversion of options.media) {
    const key = `${conversion.kind}|${conversion.source}`
    const entry = mediaLedger.get(key)
    if (entry) entry.count += 1
    else mediaLedger.set(key, { kind: conversion.kind, source: conversion.source, count: 1 })
  }

  return {
    generatedAt: new Date().toISOString(),
    mode: options.mode,
    source: options.source,
    database: options.database,
    totals: {
      sourceRecords: plan.totals.sourceRecords,
      importable: plan.totals.importable,
      inserted: apply?.inserted ?? 0,
      skipped: apply?.skipped ?? 0,
      mismatched: apply?.mismatched ?? 0,
      unresolved: apply?.unresolved ?? 0,
      rootCount: plan.totals.rootCount,
      replyCount: plan.totals.replyCount,
      unassignable: plan.totals.unassignable,
      unresolvedPost: plan.totals.unresolvedPost,
      rejected: plan.totals.rejected,
      mediaConversions: plan.totals.mediaConversions,
      parentChildAnomalies: plan.totals.parentChildAnomalies,
      unknownStatus: plan.totals.unknownStatus,
      derivedSourceIds: plan.totals.derivedSourceIds,
      statusDistribution: plan.totals.statusDistribution
    },
    posts,
    issues: [...plan.issues, ...(apply?.issues ?? [])],
    media: [...mediaLedger.values()].sort((a, b) => b.count - a.count),
    notes: options.notes
  }
}

export async function writeReport(report: ImportReport, filePath: string) {
  await mkdir(dirname(filePath), { recursive: true })
  await writeFile(filePath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
}

/** 控制台摘要。逐条明细在报告文件里。 */
export function summarize(report: ImportReport): string {
  const lines: string[] = []
  const { totals } = report

  lines.push(`模式：${report.mode === 'apply' ? '写入' : '试算'}（数据库：${report.database.target ?? '离线'}）`)
  lines.push(`输入：${report.source.file}（${report.source.format}，${report.source.records} 条，未解析 ${report.source.unparsed} 行）`)
  lines.push(`原始记录 ${totals.sourceRecords}，可导入 ${totals.importable}，无法归属 ${totals.unassignable}`)
  lines.push(`主评论 ${totals.rootCount}，回复 ${totals.replyCount}`)

  if (report.mode === 'apply') {
    lines.push(`新增 ${totals.inserted}，跳过 ${totals.skipped}，不一致 ${totals.mismatched}，未写入 ${totals.unresolved}`)
  }

  const status = totals.statusDistribution
  lines.push(`状态分布：可见 ${status.VISIBLE}，待审 ${status.PENDING}，隐藏 ${status.HIDDEN}，已删除 ${status.DELETED}`)
  lines.push(`媒体转换 ${totals.mediaConversions}，父子异常 ${totals.parentChildAnomalies}，状态未识别 ${totals.unknownStatus}`)

  const byKind = new Map<string, number>()
  for (const issue of report.issues) {
    byKind.set(issue.kind, (byKind.get(issue.kind) ?? 0) + 1)
  }
  if (byKind.size > 0) {
    lines.push('问题分布：')
    for (const [kind, count] of [...byKind.entries()].sort((a, b) => b[1] - a[1])) {
      lines.push(`  ${kind}: ${count}`)
    }
  }

  for (const note of report.notes) lines.push(`提示：${note}`)

  return lines.join('\n')
}
