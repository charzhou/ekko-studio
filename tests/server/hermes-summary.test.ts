import { afterEach, describe, expect, it, vi } from 'vitest'
import { runHermesSummary } from '../../packages/server/src/modules/studio/services/hermes-summary'

const input = { profile: 'work', model: 'summary-model', provider: 'openai', message: 'history', instructions: 'Summarize', timeoutMs: 10_000 }
afterEach(() => vi.useRealTimers())

describe('Hermes summary execution boundary', () => {
  it('polls a single isolated worker and retires it after a completed summary', async () => {
    vi.useFakeTimers()
    const request = vi.fn(async (payload: any) => payload.action === 'chat'
      ? { ok: true, status: 'running', run_id: 'run' }
      : payload.action === 'get_result'
        ? { ok: true, status: 'complete', result: { final_response: 'summary' } }
        : { ok: true })
    const running = runHermesSummary({ request }, input)
    await vi.advanceTimersByTimeAsync(100)
    await expect(running).resolves.toBe('summary')
    const start = request.mock.calls[0][0]
    expect(start).toMatchObject({ action: 'chat', summary_only: true, wait: false, background_delegation_enabled: false })
    expect(start.worker_key).toBe(`work:summary:${start.session_id}`)
    expect(request).toHaveBeenLastCalledWith({ action: 'destroy', profile: 'work', session_id: start.session_id, worker_key: start.worker_key, stop_worker: true }, { timeoutMs: 5_000 })
  })

  it.each([
    { ok: false, status: 'complete', output: 'partial' },
    { ok: true, status: 'running', output: 'partial' },
    { ok: true, status: 'complete', result: { partial: true, final_response: 'partial' } },
    { ok: true, status: 'complete', result: { failed: true, final_response: 'failure message' } },
    { ok: true, status: 'complete', result: { completed: false, final_response: 'unfinished' } },
    { ok: true, status: 'complete', result: { tool_calls: [{ name: 'terminal' }], final_response: 'calling tool' } },
    { ok: true, status: 'complete', result: { error: 'provider failed', final_response: 'partial' } },
  ])('rejects incomplete results and interrupts the same worker: %j', async result => {
    const request = vi.fn(async (payload: any) => payload.action === 'chat' ? result : { ok: true })
    await expect(runHermesSummary({ request }, input)).rejects.toThrow()
    const start = request.mock.calls[0][0]
    expect(request.mock.calls[1][0]).toMatchObject({ action: 'interrupt', worker_key: start.worker_key, session_id: start.session_id })
    expect(request.mock.calls[2][0]).toMatchObject({ action: 'destroy', stop_worker: true, worker_key: start.worker_key })
  })

  it('times out a stalled provider and interrupts and retires the worker', async () => {
    vi.useFakeTimers()
    const request = vi.fn((payload: any) => payload.action === 'chat' ? new Promise(() => {}) : Promise.resolve({ ok: true }))
    const running = runHermesSummary({ request }, { ...input, timeoutMs: 10 })
    const rejected = expect(running).rejects.toThrow('timed out after 10ms')
    await vi.advanceTimersByTimeAsync(10)
    await rejected
    expect(request.mock.calls.map(call => call[0].action)).toEqual(['chat', 'interrupt', 'destroy'])
  })

  it('cancels immediately while a provider call is pending', async () => {
    const abort = new AbortController()
    const request = vi.fn((payload: any) => payload.action === 'chat' ? new Promise(() => {}) : Promise.resolve({ ok: true }))
    const running = runHermesSummary({ request }, { ...input, signal: abort.signal })
    abort.abort(new Error('authority changed'))
    await expect(running).rejects.toThrow('authority changed')
    expect(request.mock.calls.map(call => call[0].action)).toEqual(['chat', 'interrupt', 'destroy'])
  })
})
