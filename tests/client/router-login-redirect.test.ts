// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockHasApiKey = vi.hoisted(() => vi.fn())
const mockIsStoredSuperAdmin = vi.hoisted(() => vi.fn())

vi.mock('@/api/client', () => ({
  hasApiKey: mockHasApiKey,
  isStoredSuperAdmin: mockIsStoredSuperAdmin,
}))

async function loadRouter() {
  vi.resetModules()
  return (await import('@/router')).default
}

describe('router login redirect', () => {
  beforeEach(() => {
    mockHasApiKey.mockReturnValue(false)
    mockIsStoredSuperAdmin.mockReturnValue(true)
    if (!document.queryCommandSupported) {
      document.queryCommandSupported = vi.fn(() => false)
    }
    delete (window as any).hermesDesktop
    window.location.hash = ''
  })

  afterEach(() => {
    delete (window as any).hermesDesktop
  })

  it('keeps the web login redirect when a token exists', async () => {
    mockHasApiKey.mockReturnValue(true)
    const router = await loadRouter()

    await router.push('/')
    await router.isReady()

    expect(router.currentRoute.value.name).toBe('hermes.chat')
  }, 60_000)


  it.each(['/ekko/settings', '/ekko/skills', '/studio/agents/codex/settings'])('redirects retired configuration %s to AFY Studio chat', async (path) => {
    mockHasApiKey.mockReturnValue(true)
    const router = await loadRouter()
    await router.push(path)
    await router.isReady()
    expect(router.currentRoute.value.name).toBe('hermes.chat')
  })

  it('does not redirect desktop login when a stale token exists', async () => {
    mockHasApiKey.mockReturnValue(true)
    ;(window as any).hermesDesktop = { isDesktop: true }
    const router = await loadRouter()

    await router.push('/')
    await router.isReady()

    expect(router.currentRoute.value.name).toBe('login')
  })
})
