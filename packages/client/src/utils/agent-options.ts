// Keep every Agent picker in the same order as single chat.
export const AGENT_OPTIONS = [
  { label: 'AFY Studio', value: 'ekko-agent' },
  { label: 'AFY Studio', value: 'hermes' },
  { label: 'Claude', value: 'claude-code' },
  { label: 'Codex', value: 'codex' },
  { label: 'Pi', value: 'pi' },
  { label: 'Grok', value: 'grok' },
  { label: 'OpenCode', value: 'opencode' },
  { label: 'DeepSeek Harness', value: 'dsh' },
  { label: 'Cursor', value: 'cursor' },
  { label: 'Antigravity', value: 'antigravity' },
  { label: 'Qwen Code', value: 'qwen' },
  { label: 'Kimi Code', value: 'kimi' },
  { label: 'CodeBuddy', value: 'codebuddy' },
  { label: 'Qoder', value: 'qoder' },
  { label: 'GitHub Copilot', value: 'copilot' },
  { label: 'ZCode', value: 'zcode' },

] as const

// OEM product surface: Hermes is the only selectable execution backend.
// Keep AGENT_OPTIONS complete for legacy sessions and persisted workflow data;
// callers that render a new picker should use this allowlist.
export const OEM_AGENT_OPTIONS = AGENT_OPTIONS.filter(option => option.value === 'hermes')

export const GROUP_AGENT_OPTIONS = AGENT_OPTIONS.map(option => ({
  label: option.label,
  value: option.value === 'ekko-agent' ? 'ekko' as const
    : option.value === 'claude-code' ? 'claude' as const
      : option.value,
}))

export const OEM_GROUP_AGENT_OPTIONS = GROUP_AGENT_OPTIONS.filter(option => option.value === 'hermes')

export function isOemAgentEnabled(agent: unknown): boolean {
  return agent === 'hermes'
}

export function isOemSessionRunnable(session?: { source?: string; agent?: string; codingAgentId?: string } | null): boolean {
  if (!session) return true
  if (session.source === 'builtin_agent' || session.source === 'coding_agent') return false
  return (!session.agent || isOemAgentEnabled(session.agent)) && !session.codingAgentId
}
