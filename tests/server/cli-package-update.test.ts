import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.doUnmock('child_process')
  vi.restoreAllMocks()
})

describe('Studio CLI update policy', () => {
  it('rejects package updates before running a package manager or restarting', async () => {
    vi.resetModules()
    const spawn = vi.fn()
    const execFileSync = vi.fn()
    vi.doMock('child_process', () => ({ spawn, execFileSync, execSync: vi.fn() }))
    const { doUpdate } = await import('../../bin/hermes-web-ui.mjs')
    expect(() => doUpdate()).toThrow('Updates and downloads are not available in Studio')
    expect(spawn).not.toHaveBeenCalled()
    expect(execFileSync).not.toHaveBeenCalled()
  })
})
