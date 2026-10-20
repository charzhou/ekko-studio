/** Capabilities deliberately excluded from the Studio distribution. */
export const OEM_FEATURES = Object.freeze({
  updates: false,
  cloudServices: false,
  hardware: false,
  partnerServices: false,
})

export const OEM_DISABLED_MESSAGE = 'This feature is disabled in Studio.'

/** One execution backend; retained runtime modules remain protocol-compatible. */
export const OEM_HERMES_ONLY_MESSAGE = 'Only Studio Agent runs are available in Studio.'

type HermesOnlyRunRequest = {
  source?: unknown
  session_source?: unknown
  agent?: unknown
  agent_id?: unknown
  coding_agent_id?: unknown
}

type HermesOnlyStoredSession = {
  source?: unknown
  agent?: unknown
}

function normalizedAgentId(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

/** Hermes' stable wire ids, including the legacy spelling used by old data. */
export function isOemHermesAgentId(value: unknown): boolean {
  return ['hermes', 'hermes-agent', 'hermes_agent'].includes(normalizedAgentId(value))
}

function oemAgentError(): Error & { code: string; status: number } {
  return Object.assign(new Error(OEM_HERMES_ONLY_MESSAGE), {
    code: 'agent_disabled',
    status: 410,
  })
}

export function requireOemHermesAgent(value: unknown): void {
  if (!isOemHermesAgentId(value)) throw oemAgentError()
}

/** Disable native Agent management/proxy APIs before their original handlers. */
export async function oemAgentHttpPolicy(
  ctx: { path: string; query?: Record<string, unknown>; status: number; body: unknown },
  next: () => Promise<unknown>,
): Promise<void> {
  const roots = ['/api/ekko', '/api/coding-agents', '/api/codex-proxy', '/api/claude-code-proxy']
  const path = ctx.path.toLowerCase()
  const skillTarget = ctx.query?.target
  const deniedSkillTarget = (path === '/api/hermes/skills' || path.startsWith('/api/hermes/skills/'))
    && skillTarget !== undefined && !isOemHermesAgentId(skillTarget)
  if (deniedSkillTarget || roots.some(root => path === root || path.startsWith(`${root}/`))) {
    ctx.status = 410
    ctx.body = { error: 'agent_disabled', message: OEM_HERMES_ONLY_MESSAGE }
    return
  }
  await next()
}

/**
 * Admit only Hermes executions at the Studio runtime boundary.
 *
 * A missing agent id means the normal CLI/bridge path and is intentionally
 * accepted.  Workflow and group-chat callers can therefore keep using their
 * existing orchestration APIs while routing to Hermes by omitting the native
 * coding-agent id.  A legacy Hermes id is canonicalized to that same bridge
 * path.  External coding agents and the former built-in Ekko path fail closed.
 */
export function normalizeOemHermesOnlyRun<T extends HermesOnlyRunRequest>(
  data: T,
  stored?: HermesOnlyStoredSession | null,
): void {
  const source = normalizedAgentId(data.source)
  const requestedIds = [data.agent, data.agent_id, data.coding_agent_id]
    .filter(value => value !== undefined && value !== null && value !== '')
  // Check every supplied identity.  Selecting one preferred field would let a
  // conflicting legacy field survive into a different dispatcher.
  requestedIds.forEach(requireOemHermesAgent)
  const requestedId = requestedIds.map(normalizedAgentId).find(Boolean) || ''
  const storedId = normalizedAgentId(stored?.agent)
  const effectiveId = requestedId || storedId

  if (source === 'builtin_agent' || normalizedAgentId(data.session_source) === 'builtin_agent') {
    throw oemAgentError()
  }
  if (source === 'coding_agent' && !isOemHermesAgentId(effectiveId)) {
    throw oemAgentError()
  }
  const storedSource = normalizedAgentId(stored?.source)
  // A source is an orchestration surface, not permission to replace a stored
  // session's engine.  Old non-Hermes sessions remain readable but cannot run.
  if (storedId && !isOemHermesAgentId(storedId)) throw oemAgentError()
  if (storedSource === 'builtin_agent') {
    throw oemAgentError()
  }
  if (storedSource === 'coding_agent' && !isOemHermesAgentId(storedId)) {
    throw oemAgentError()
  }

  // Canonicalize every accepted request so source inference cannot return to a
  // native coding-agent path after the Hermes identity fields are removed.
  delete data.agent
  delete data.agent_id
  delete data.coding_agent_id
  const surface = source || storedSource
  data.source = ['workflow', 'group_chat', 'global_agent'].includes(surface) ? surface : 'cli'
}

export function requireOemFeature(feature: keyof typeof OEM_FEATURES): void {
  if (!OEM_FEATURES[feature]) {
    throw Object.assign(new Error(OEM_DISABLED_MESSAGE), { code: 'feature_disabled', status: 410 })
  }
}

export function isRemovedPartnerProvider(provider: string, baseUrl = ''): boolean {
  const name = provider.trim().toLowerCase().replace(/^custom:/, '')
  if (name === 'fun-codex' || name === 'fun-claude') return true
  try {
    const host = new URL(baseUrl).hostname.toLowerCase()
    return host === 'apikey.fan' || host.endsWith('.apikey.fan')
      || host === 'apikey.fun' || host.endsWith('.apikey.fun')
  } catch {
    return false
  }
}
