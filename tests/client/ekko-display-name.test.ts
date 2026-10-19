import { readFileSync, readdirSync } from 'node:fs'
import { extname, join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { AGENT_OPTIONS, GROUP_AGENT_OPTIONS, OEM_AGENT_OPTIONS, OEM_GROUP_AGENT_OPTIONS } from '../../packages/client/src/utils/agent-options'

function clientSourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return clientSourceFiles(path)
    return ['.ts', '.vue'].includes(extname(entry.name)) ? [path] : []
  })
}

describe('AFY Studio display name', () => {
  it('uses AFY Studio everywhere in the client without changing the internal runtime id', () => {
    const occurrences = clientSourceFiles('packages/client/src')
      .flatMap(path => readFileSync(path, 'utf8').includes('Ekko Agent') ? [path] : [])

    expect(occurrences).toEqual([])
    expect(AGENT_OPTIONS).toContainEqual({ label: 'AFY Studio', value: 'ekko-agent' })
    expect(GROUP_AGENT_OPTIONS).toContainEqual({ label: 'AFY Studio', value: 'ekko' })
  })

  it.each([
    ['single chat', 'packages/client/src/components/hermes/chat/ChatPanel.vue',
      OEM_AGENT_OPTIONS, 'OEM_AGENT_OPTIONS', 'const newChatAgentOptions = computed(() => OEM_AGENT_OPTIONS.filter('],
    ['group chat', 'packages/client/src/components/hermes/group-chat/GroupChatPanel.vue',
      OEM_GROUP_AGENT_OPTIONS, 'OEM_GROUP_AGENT_OPTIONS', 'const groupAgentTypeDefinitions = OEM_GROUP_AGENT_OPTIONS'],
    ['workflow', 'packages/client/src/views/hermes/WorkflowView.vue',
      OEM_AGENT_OPTIONS, 'OEM_AGENT_OPTIONS', 'const workflowAgentDefinitions = OEM_AGENT_OPTIONS'],
  ] as const)('exposes only AFY Studio in the %s Agent dropdown', (_name, path, options, exportName, binding) => {
    const source = readFileSync(path, 'utf8')

    expect(source).toContain(exportName)
    expect(source).toContain(binding)
    expect(options).toEqual([{ label: 'AFY Studio', value: 'hermes' }])
  })

  it('keeps server-managed provider choices available for AFY Studio workflow nodes', () => {
    const view = readFileSync('packages/client/src/views/hermes/WorkflowView.vue', 'utf8')
    const node = readFileSync('packages/client/src/components/hermes/workflow/WorkflowAgentNode.vue', 'utf8')

    expect(view).toContain('canScopedCodingAgentUseProvider(')
    expect(node).toContain('canScopedCodingAgentUseProvider(')
  })

  it('keeps the log API id internal while displaying AFY Studio', () => {
    const logs = readFileSync('packages/client/src/views/hermes/LogsView.vue', 'utf8')

    expect(logs).toContain("name.replace(/^ekko-agent(?=\\/|$)/, 'AFY Studio')")
    expect(logs).toContain('`${displayLogName(f.name)} (${f.size})`')
    expect(logs).toContain('{{ displayLogName(entry.logger) }}')
  })

  it('uses Claude everywhere in the client without changing the internal runtime id', () => {
    const occurrences = clientSourceFiles('packages/client/src')
      .flatMap(path => readFileSync(path, 'utf8').includes('Claude Code') ? [path] : [])

    expect(occurrences).toEqual([])
    expect(AGENT_OPTIONS).toContainEqual({ label: 'Claude', value: 'claude-code' })
    expect(GROUP_AGENT_OPTIONS).toContainEqual({ label: 'Claude', value: 'claude' })
  })
})
