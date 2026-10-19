import { describe, expect, it, vi } from 'vitest'
import Koa from 'koa'
import bodyParser from '@koa/bodyparser'
import { once } from 'node:events'
import type { AddressInfo } from 'node:net'
import {
  OEM_FEATURES,
  OEM_DISABLED_MESSAGE,
  OEM_HERMES_ONLY_MESSAGE,
  isOemHermesAgentId,
  normalizeOemHermesOnlyRun,
  requireOemFeature,
  isRemovedPartnerProvider,
} from '../../packages/server/src/modules/studio/public/oem'
import { StudioHealthService } from '../../packages/server/src/modules/studio/services/health'
import { getRuntimeVersionStatus, startRuntimeVersionDownload } from '../../packages/server/src/modules/hermes/services/runtime/version-manager'
import { checkAgentUpdateAndPublish, getAgentUpdateManager, installAgentAndPublish } from '../../packages/server/src/modules/coding-agents/services/update-manager'
import { checkUpdateAgent, installCodingAgent } from '../../packages/server/src/modules/coding-agents/services'

describe('AFY Studio OEM policy', () => {
  it('keeps removed hosted capabilities disabled as a code policy', () => {
    expect(OEM_FEATURES).toEqual({ updates: false, cloudServices: false, hardware: false, partnerServices: false })
    expect(() => requireOemFeature('updates')).toThrow(OEM_DISABLED_MESSAGE)
    expect(() => requireOemFeature('cloudServices')).toThrow(OEM_DISABLED_MESSAGE)
    expect(isRemovedPartnerProvider('fun-codex')).toBe(true)
    expect(isRemovedPartnerProvider('custom', 'https://api.apikey.fan/v1')).toBe(true)
    expect(isRemovedPartnerProvider('openai', 'https://api.openai.com/v1')).toBe(false)
  })

  it('does not perform a hosted update check or remote runtime request', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const health = new StudioHealthService({
      platform: 'hermes-agent',
      getPrimaryAgentVersion: async () => 'Hermes Agent local',
      getPrimaryAgentBridgeHealth: async () => ({ status: 'unknown', reachable: false }),
      isDockerContainer: () => false,
    })
    await health.checkLatestVersion()
    await getRuntimeVersionStatus({ includeRemote: true, probeRuntime: false })
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(() => startRuntimeVersionDownload('1.0.0', 'cf')).toThrow(OEM_DISABLED_MESSAGE)
    await expect(checkAgentUpdateAndPublish('codex')).rejects.toThrow(OEM_DISABLED_MESSAGE)
    await expect(getAgentUpdateManager()).rejects.toThrow(OEM_DISABLED_MESSAGE)
    await expect(installAgentAndPublish('codex')).rejects.toThrow(OEM_DISABLED_MESSAGE)
    await expect(checkUpdateAgent('codex')).rejects.toThrow(OEM_DISABLED_MESSAGE)
    await expect(installCodingAgent('codex')).rejects.toThrow(OEM_DISABLED_MESSAGE)
    fetchSpy.mockRestore()
  })

  it('routes legacy Hermes ids through the bridge and rejects other execution backends', () => {
    const legacyHermes = {
      source: 'coding_agent',
      coding_agent_id: 'hermes',
    }
    normalizeOemHermesOnlyRun(legacyHermes)
    expect(legacyHermes).toEqual({ source: 'cli' })
    expect(isOemHermesAgentId('hermes-agent')).toBe(true)
    expect(isOemHermesAgentId('codex')).toBe(false)

    expect(() => normalizeOemHermesOnlyRun({ source: 'coding_agent', coding_agent_id: 'codex' }))
      .toThrow(OEM_HERMES_ONLY_MESSAGE)
    expect(() => normalizeOemHermesOnlyRun({ source: 'builtin_agent' }))
      .toThrow(OEM_HERMES_ONLY_MESSAGE)
    expect(() => normalizeOemHermesOnlyRun({ input: 'legacy' } as any, { source: 'coding_agent', agent: 'codex' }))
      .toThrow(OEM_HERMES_ONLY_MESSAGE)
    const storedHermes = { input: 'legacy', source: undefined } as any
    normalizeOemHermesOnlyRun(storedHermes, { source: 'coding_agent', agent: 'hermes' })
    expect(storedHermes.source).toBe('cli')
  })

  it.each([
    { agent_id: 'hermes', coding_agent_id: 'codex' },
    { agent_id: 'codex', coding_agent_id: 'hermes' },
    { agent: 'ekko', agent_id: 'hermes' },
    { coding_agent_id: ['hermes'] },
    { coding_agent_id: true },
    { source: 'builtin_agent', agent_id: 'hermes' },
    { session_source: 'builtin_agent', agent_id: 'hermes' },
    { source: 'coding_agent' },
  ])('rejects conflicting or invalid runtime identities: %j', request => {
    expect(() => normalizeOemHermesOnlyRun(request)).toThrow(OEM_HERMES_ONLY_MESSAGE)
  })

  it.each(['cli', 'api_server', 'global_agent', 'workflow', 'group_chat', undefined])(
    'does not reinterpret non-Hermes stored histories as new Hermes runs (source=%s)', source => {
      for (const agent of ['ekko', 'ekko-agent', 'ekko_agent', 'codex', 'claude', 'future-runtime']) {
        expect(() => normalizeOemHermesOnlyRun({ source: 'cli', agent_id: 'hermes' }, { source, agent }))
          .toThrow(OEM_HERMES_ONLY_MESSAGE)
      }
    },
  )

  it.each(['', 'api_server', 'coding_agent', 'future_source'])('normalizes Hermes legacy sources into the bridge path (%s)', source => {
    const request = { source, agent_id: 'hermes' }
    normalizeOemHermesOnlyRun(request, { source: 'coding_agent', agent: 'hermes' })
    expect(request).toEqual({ source: 'cli' })
  })

  it.each(['workflow', 'group_chat', 'global_agent'])('keeps the %s surface for Hermes orchestration', source => {
    const request = { source, agent_id: 'hermes', coding_agent_id: 'hermes' }
    normalizeOemHermesOnlyRun(request)
    expect(request).toEqual({ source })
  })

  it('blocks retired Agent HTTP routes before their real configuration and launch handlers', async () => {
    const { registerRoutes } = await import('../../packages/server/src/bootstrap/routes')
    const { setGroupChatServer } = await import('../../packages/server/src/modules/studio/controllers/group-chat')
    const createAgent = vi.fn()
    const addRoomAgent = vi.fn()
    setGroupChatServer({
      getStorage: () => ({ getRoom: () => ({ id: 'room' }), assertParticipantNameAvailable: vi.fn(), addRoomAgent }),
      agentClients: { createAgent },
    } as any)
    const app = new Koa()
    app.use(bodyParser())
    registerRoutes(app, [])
    app.use(ctx => { ctx.body = { allowed: true } })
    const server = app.listen(0, '127.0.0.1')
    await once(server, 'listening')
    const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
    try {
      for (const [method, path] of [
        ['GET', '/api/ekko/config'], ['PUT', '/api/ekko/config'],
        ['POST', '/api/ekko/mcp/servers'], ['GET', '/API/EKKO/skills'],
        ['GET', '/api/coding-agents'], ['GET', '/api/coding-agents/models'],
        ['PUT', '/api/coding-agents/codex/config-files/config'],
        ['POST', '/api/coding-agents/codex/launch/prepare'],
        ['POST', '/api/coding-agents/codex/launch/native'],
        ['POST', '/api/coding-agents/codex/runs'],
        ['POST', '/api/coding-agents/runs/old-session/input'],
        ['POST', '/api/coding-agents/dsh/ui-session'],
        ['POST', '/api/codex-proxy/test/v1/responses'],
        ['POST', '/api/claude-code-proxy/test/v1/messages'],
        ['GET', '/api/hermes/skills?target=codex'],
        ['GET', '/api/hermes/skills/test/files?target=claude-code'],
        ['POST', '/api/hermes/skills?target=pi'],
      ]) {
        const response = await fetch(`${url}${path}`, { method })
        expect(response.status, `${method} ${path}`).toBe(410)
        expect(await response.json()).toEqual({ error: 'agent_disabled', message: OEM_HERMES_ONLY_MESSAGE })
      }
      const compatibility = await fetch(`${url}/api/ekko-studio/oem-policy-probe`)
      expect(await compatibility.json()).toEqual({ allowed: true })
      for (const agent of ['ekko', 'codex', 'claude']) {
        const response = await fetch(`${url}/api/studio/group-chat/rooms/room/agents`, {
          method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ agent, profile: 'default', provider: 'openai', model: 'test', apiMode: 'chat_completions' }),
        })
        expect(response.status, `group agent ${agent}`).toBe(410)
        expect(await response.json()).toMatchObject({ code: 'agent_disabled' })
      }
      expect(createAgent).not.toHaveBeenCalled()
      expect(addRoomAgent).not.toHaveBeenCalled()
    } finally {
      setGroupChatServer(null)
      await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
    }
  })

  it('restores only Hermes room agents while keeping old stored records intact', async () => {
    const { GroupChatServer } = await import('../../packages/server/src/modules/studio/sockets/group-chat')
    const storedAgents = ['hermes', 'ekko', 'codex', 'claude'].map(agent => ({ agent, agentId: agent, profile: 'default', name: agent }))
    const createAgent = vi.fn(async input => input)
    const addAgentToRoom = vi.fn()
    const server = Object.assign(Object.create(GroupChatServer.prototype), {
      storage: { getAllRooms: () => [{ id: 'room' }], getRoomAgents: () => storedAgents },
      agentClients: { createAgent, addAgentToRoom },
    })
    await server.restoreAgents()
    expect(createAgent).toHaveBeenCalledTimes(1)
    expect(createAgent).toHaveBeenCalledWith(expect.objectContaining({ agent: 'hermes' }))
    expect(addAgentToRoom).toHaveBeenCalledTimes(1)
    expect(storedAgents.map(agent => agent.agent)).toEqual(['hermes', 'ekko', 'codex', 'claude'])
  })
})
