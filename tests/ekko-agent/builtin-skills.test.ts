import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, readdir, realpath, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { EkkoDirectoryManager } from '../../packages/ekko-agent/src/directories'
import { SkillListTool, SkillViewTool } from '../../packages/ekko-agent/src/tools/skills'

const tempDirectories: string[] = []

async function temporaryDirectory(prefix: string): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), prefix))
  tempDirectories.push(directory)
  return directory
}

async function writeSkill(root: string, name: string, content: string): Promise<void> {
  await mkdir(join(root, name), { recursive: true })
  await writeFile(join(root, name, 'SKILL.md'), content, 'utf8')
}

afterEach(async () => {
  vi.unstubAllEnvs()
  await Promise.all(tempDirectories.splice(0).map(directory => (
    rm(directory, { recursive: true, force: true })
  )))
})

describe('Ekko built-in skills', () => {
  it('installs missing skills without overwriting a user-owned name conflict', async () => {
    const root = await temporaryDirectory('ekko-builtin-install-')
    const source = join(root, 'source')
    const ekkoHome = join(root, 'home')
    const target = join(ekkoHome, '.ekko', 'skills', 'default')
    await writeSkill(source, 'github', '# Bundled GitHub\n')
    await writeSkill(source, 'weather', '# Bundled Weather\n')
    await writeSkill(target, 'github', '# User GitHub\n')
    vi.stubEnv('EKKO_BUILTIN_SKILLS_DIR', source)

    const directories = new EkkoDirectoryManager(ekkoHome)
    directories.initialize()
    directories.profileSkillsDirectory('default')

    await expect(readFile(join(target, 'github', 'SKILL.md'), 'utf8')).resolves.toBe('# User GitHub\n')
    await expect(readFile(join(target, 'weather', 'SKILL.md'), 'utf8')).resolves.toBe('# Bundled Weather\n')
  })

  it('updates unchanged managed copies while preserving locally modified copies', async () => {
    const root = await temporaryDirectory('ekko-builtin-update-')
    const source = join(root, 'source')
    const ekkoHome = join(root, 'home')
    await writeSkill(source, 'spike', '# Spike v1\n')
    vi.stubEnv('EKKO_BUILTIN_SKILLS_DIR', source)

    const directories = new EkkoDirectoryManager(ekkoHome)
    directories.initialize()
    const cleanTarget = directories.profileSkillsDirectory('default')
    const modifiedTarget = directories.profileSkillsDirectory('work')
    await writeFile(join(modifiedTarget, 'spike', 'SKILL.md'), '# User-adjusted Spike\n', 'utf8')
    await writeFile(join(source, 'spike', 'SKILL.md'), '# Spike v2\n', 'utf8')

    directories.initialize()
    directories.profileSkillsDirectory('default')
    directories.profileSkillsDirectory('work')

    await expect(readFile(join(cleanTarget, 'spike', 'SKILL.md'), 'utf8')).resolves.toBe('# Spike v2\n')
    await expect(readFile(join(modifiedTarget, 'spike', 'SKILL.md'), 'utf8')).resolves.toBe('# User-adjusted Spike\n')
  })

  it('ships only the selected built-in skill set and installs it into every profile', async () => {
    const bundledDirectory = resolve(process.cwd(), 'packages/ekko-agent/skills')
    const names = (await readdir(bundledDirectory, { withFileTypes: true }))
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name)
      .sort()
    expect(names).toEqual([
      '1password',
      'apple-notes',
      'apple-reminders',
      'document-to-action-items',
      'docx',
      'gh-issues',
      'github',
      'node-inspect-debugger',
      'obsidian',
      'ocr-and-documents',
      'pdf',
      'powerpoint',
      'python-debugpy',
      'skill-creator',
      'spike',
      'tmux',
      'video-frames',
      'weather',
      'xlsx',
    ])

    for (const name of names) {
      const content = await readFile(join(bundledDirectory, name, 'SKILL.md'), 'utf8')
      expect(content.toLowerCase()).not.toContain('openclaw')
      expect(content).toMatch(/^---[\s\S]*?^metadata:\s*\n\s+keywords:\s*\n(?:\s+-\s+.+\n)+---/m)
      const keywordBlock = content.match(/^\s+keywords:\s*\n((?:\s+-\s+.+\n)+)/m)?.[1] || ''
      const keywords = keywordBlock.match(/^\s+-\s+(.+)$/gm)?.map(line => line.replace(/^\s+-\s+/, '')) || []
      expect(keywords.length).toBeGreaterThanOrEqual(1)
      expect(keywords.length).toBeLessThanOrEqual(8)
      expect(keywords.every(keyword => /^[\x20-\x7e]+$/.test(keyword))).toBe(true)
    }

    const ekkoHome = await temporaryDirectory('ekko-builtin-profile-')
    const directories = new EkkoDirectoryManager(ekkoHome)
    directories.initialize()
    const defaultSkills = directories.profileSkillsDirectory('default')
    const workSkills = directories.profileSkillsDirectory('work')

    for (const name of names) {
      expect(existsSync(join(defaultSkills, name, 'SKILL.md'))).toBe(true)
      expect(existsSync(join(workSkills, name, 'SKILL.md'))).toBe(true)
    }

    const creatorList = await new SkillListTool(defaultSkills).execute({ query: 'skill-creator' })
    expect(JSON.parse(creatorList.content).skills).toEqual([
      expect.objectContaining({ name: 'skill-creator' }),
    ])
    await expect(new SkillViewTool(defaultSkills).execute({ name: 'skill-creator' }))
      .resolves.toMatchObject({
        ok: true,
        data: {
          name: 'skill-creator',
          baseDirectory: await realpath(join(defaultSkills, 'skill-creator')),
        },
      })

  })

  it('does not distribute partner media helpers or upstream installation guides', async () => {
    const root = resolve(process.cwd(), 'packages/ekko-agent/skills')
    for (const name of ['grok-image-to-video', 'image-gen', 'hermes-studio-installation']) {
      expect(existsSync(join(root, name))).toBe(false)
    }
  })
})
