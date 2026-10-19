import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  checkUpdateAgent,
  deleteCodingAgent,
  getCodingAgentNpmInvocationCount,
  installCodingAgent,
  resetCodingAgentNpmInvocationCount,
} from '../../../../packages/server/src/modules/coding-agents/services'
import { codingAgentRunManager } from '../../../../packages/server/src/modules/coding-agents/services/runtime/run-manager'
import { getAgentUpdateManager } from '../../../../packages/server/src/modules/coding-agents/services/update-manager'
import { AgentUpdatePolicy } from '../../../../packages/server/src/modules/coding-agents/services/update-policy'
import { OEM_DISABLED_MESSAGE } from '../../../../packages/server/src/modules/studio/public/oem'

describe('Cursor CLI install policy', () => {
  afterEach(() => {
    resetCodingAgentNpmInvocationCount()
  })

  it('does not call npm when installing cursor', async () => {
    resetCodingAgentNpmInvocationCount()
    await expect(installCodingAgent('cursor')).rejects.toThrow(OEM_DISABLED_MESSAGE)
    expect(getCodingAgentNpmInvocationCount()).toBe(0)
  })

  it('reports Cursor update checks as unsupported instead of current', async () => {
    await expect(checkUpdateAgent('cursor')).rejects.toThrow(OEM_DISABLED_MESSAGE)
    // Inspect the policy without starting background npm checks for other agents.
    const start = vi.spyOn(AgentUpdatePolicy.prototype, 'start').mockImplementation(() => {})
    try {
      await expect(getAgentUpdateManager()).rejects.toThrow(OEM_DISABLED_MESSAGE)
    } finally {
      start.mockRestore()
    }
  })

  it('does not stop Cursor sessions when removal is unsupported', async () => {
    const stopMatching = vi.spyOn(codingAgentRunManager, 'stopMatching')
    try {
      const result = await deleteCodingAgent('cursor')
      expect(result.success).toBe(false)
      expect(result.code).toBe('UNSUPPORTED')
      expect(getCodingAgentNpmInvocationCount()).toBe(0)
      expect(stopMatching).not.toHaveBeenCalled()
    } finally {
      stopMatching.mockRestore()
    }
  })
})
