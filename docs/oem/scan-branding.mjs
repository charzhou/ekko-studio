#!/usr/bin/env node
// Read repository files and write an OEM discovery index; never rewrite source.
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const git = args => execFileSync('git', args, { cwd: root, maxBuffer: 32 * 1024 * 1024 }).toString('utf8')
const paths = [...new Set(git(['ls-files', '--cached', '--others', '--exclude-standard', '-z'])
  .split('\0').filter(path => path && !path.startsWith('docs/oem/')))].sort()
const rules = [
  ['product', /ekko[\s._-]*studio|hermes[\s._-]*(?:studio|web[\s._-]*ui)|hermeswebui/ig],
  ['owner', /ekkolearnai|ekkoye8888|charzhou|nous\s?research|openclaw foundation/ig],
  ['agentOrInternal', /ekko|hermes/ig],
  ['partner', /apikey\.(?:fan|fun)|libapi/ig],
  ['wireFormat', /\b(?:HSC1|HGC1|HSTUDIO|hstudio_[a-z0-9_]*|sk-ekko-|ekko_r1\.)/g],
]
const stats = Object.fromEntries(rules.map(([id]) => [id, { files: 0, lines: 0, occurrences: 0 }]))
const files = []
const skippedBinaryFiles = []
const legalFiles = []
const assetCandidates = []
const environmentLikeIdentifiers = new Set()
const brandedUrls = new Map()
const environmentPattern = /\b(?:HERMES|EKKO|STUDIO)_[A-Z][A-Z0-9_]*\b/g
const urlPattern = /https?:\/\/[^\s"'`<>\\)\]}]+/g
const brandedHost = /(?:ekko(?:studio|learnai)\.|apikey\.(?:fan|fun)|github\.com\/(?:EKKOLearnAI|charzhou|NousResearch)\/|noreply@hermes)/i
const assetPattern = /\.(?:png|svg|ico|icns|jpg|jpeg|webp|gif)$/i
for (const path of paths) {
  if (/(?:^|\/)(?:[^/]*LICENSE[^/]*|[^/]*NOTICE[^/]*|COPYING)$/i.test(path)) legalFiles.push(path)
  if (assetPattern.test(path) && (/(?:logo|favicon|icon|tray|splash|ekko|hermes|relay)/i.test(path) || path.startsWith('docs/screenshots/') || path.startsWith('packages/client/src/assets/'))) assetCandidates.push(path)
  const buffer = readFileSync(resolve(root, path))
  if (buffer.includes(0)) { skippedBinaryFiles.push(path); continue }
  const content = buffer.toString('utf8')
  const fileCategories = new Set()
  const hits = []
  const pathCategories = rules.filter(([, pattern]) => { pattern.lastIndex = 0; return pattern.test(path) }).map(([id]) => id)
  for (const [offset, line] of content.split(/\r?\n/).entries()) {
    const matches = {}
    for (const [id, pattern] of rules) {
      const values = line.match(pattern)
      if (!values) continue
      matches[id] = [...new Set(values)]
      stats[id].lines++
      stats[id].occurrences += values.length
      fileCategories.add(id)
    }
    if (Object.keys(matches).length) hits.push([offset + 1, matches])
    for (const name of line.match(environmentPattern) || []) environmentLikeIdentifiers.add(name)
    for (const url of line.match(urlPattern) || []) {
      if (!brandedHost.test(url)) continue
      if (!brandedUrls.has(url)) brandedUrls.set(url, [])
      brandedUrls.get(url).push(`${path}:${offset + 1}`)
    }
  }
  for (const id of fileCategories) stats[id].files++
  if (hits.length || pathCategories.length) files.push({ path, pathCategories, hits })
}
const area = path => path.startsWith('packages/') ? path.split('/').slice(0, 2).join('/')
  : path.startsWith('tests/') ? path.split('/').slice(0, 2).join('/')
    : path.startsWith('.github/') ? '.github' : path.startsWith('docs/') ? 'docs' : path.split('/')[0]
const areas = {}
for (const file of files) {
  const entry = areas[area(file.path)] ||= { files: 0, matchingLines: 0, productFiles: 0 }
  entry.files++
  entry.matchingLines += file.hits.length
  if (file.hits.some(([, match]) => match.product)) entry.productFiles++
}
const report = {
  schemaVersion: 1,
  sourceCommit: git(['rev-parse', 'HEAD']).trim(),
  sourceBranch: git(['branch', '--show-current']).trim(),
  sourceVersion: JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')).version,
  scope: 'Tracked and nonignored untracked repository files, excluding docs/oem itself; binary content is skipped. No OCR or runtime/network tracing. Categories overlap; a match is a review candidate, not a replacement instruction.',
  scannedFiles: paths.length,
  matchingFiles: files.length,
  matchingLines: files.reduce((total, file) => total + file.hits.length, 0),
  rules: rules.map(([id, pattern]) => ({ id, pattern: pattern.source, flags: pattern.flags })),
  stats,
  areas,
  environmentLikeIdentifiers: [...environmentLikeIdentifiers].sort(),
  brandedUrls: [...brandedUrls].sort(([a], [b]) => a.localeCompare(b)).map(([url, locations]) => ({ url, locations })),
  legalFiles,
  assetCandidates,
  skippedBinaryFiles,
  // Each hit is [one-based source line, { category: unique literal matches }].
  files,
}
const output = resolve(root, 'docs/oem/branding-inventory.json')
writeFileSync(output, JSON.stringify(report) + '\n')
const indexLines = [
  '# OEM 逐文件索引', '',
  '由 scan-branding.mjs 自动生成。判读范围和统计说明见 [主清单](README.md)。', '',
  '表中列出产品名称、所属方/第三方署名或合作服务命中的全部文件。行号只展示前 12 个；完整逐行命中见 [JSON](branding-inventory.json)。原始 Agent/内部路径候选另见 JSON 的 files，不能据此全部替换。', '',
]
for (const [id, title] of [['product', '产品名称及历史标识'], ['owner', '所属方、历史账号及第三方署名'], ['partner', '预置商业服务及推广关联']]) {
  indexLines.push('## ' + title, '', '| 文件 | 命中行数 | 代表行号 |', '| --- | ---: | --- |')
  for (const file of files) {
    const lines = file.hits.filter(([, matches]) => matches[id]).map(([line]) => line)
    if (!lines.length) continue
    indexLines.push('| [' + file.path + '](../../' + file.path + ') | ' + lines.length + ' | ' + lines.slice(0, 12).join(', ') + (lines.length > 12 ? ' …' : '') + ' |')
  }
  indexLines.push('')
}
for (const [title, list] of [['图像候选（需语义和视觉复核）', assetCandidates], ['许可与署名文件（不作自动替换）', legalFiles]]) {
  indexLines.push('## ' + title, '')
  for (const path of list) indexLines.push('- [' + path + '](../../' + path + ')')
  indexLines.push('')
}
writeFileSync(resolve(root, 'docs/oem/FILE_INDEX.md'), indexLines.join('\n') + '\n')
console.log(JSON.stringify({ output: 'docs/oem/branding-inventory.json', scannedFiles: report.scannedFiles,
  matchingFiles: report.matchingFiles, matchingLines: report.matchingLines, stats,
  areas, environmentLikeIdentifiers: report.environmentLikeIdentifiers.length, brandedUrls: report.brandedUrls.length,
  assets: assetCandidates.length, legalFiles: legalFiles.length,
  bytes: Buffer.byteLength(JSON.stringify(report) + '\n') }, null, 2))
