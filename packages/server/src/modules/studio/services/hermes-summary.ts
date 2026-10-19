import { randomUUID } from 'node:crypto'

type SummaryBridge = {
  request(payload: Record<string, unknown>, options?: { timeoutMs?: number }): Promise<any>
}

/** A temporary, tool-free Hermes worker. Its policy never affects chat workers. */
export async function runHermesSummary(bridge: SummaryBridge, input: {
  profile: string
  model?: string | null
  provider?: string | null
  message: string
  instructions: string
  conversationHistory?: Array<{ role: string; content: string }>
  timeoutMs: number
  signal?: AbortSignal
  sessionId?: string
}): Promise<string> {
  input.signal?.throwIfAborted()
  const sessionId = input.sessionId || `summary_${randomUUID()}`
  const workerKey = `${input.profile}:summary:${sessionId}`
  const route = { session_id: sessionId, profile: input.profile, worker_key: workerKey }
  let interruption: Promise<unknown> | undefined
  const interrupt = () => interruption ||= bridge.request({
    action: 'interrupt', ...route, message: 'Summary generation canceled',
  }, { timeoutMs: 5_000 }).catch(() => undefined)
  let rejectAbort: ((reason: unknown) => void) | undefined
  const aborted = new Promise<never>((_resolve, reject) => { rejectAbort = reject })
  let rejectTimeout: ((reason: unknown) => void) | undefined
  const timedOut = new Promise<never>((_resolve, reject) => { rejectTimeout = reject })
  const timer = setTimeout(() => rejectTimeout?.(new Error(`Summary bridge run timed out after ${input.timeoutMs}ms`)), input.timeoutMs)
  const onAbort = () => {
    void interrupt()
    rejectAbort?.(input.signal?.reason || new Error('Summary generation canceled'))
  }
  input.signal?.addEventListener('abort', onAbort, { once: true })
  try {
    input.signal?.throwIfAborted()
    const response = bridge.request({
      action: 'chat', ...route, summary_only: true,
      message: input.message, instructions: input.instructions,
      conversation_history: input.conversationHistory || [],
      ...(input.model ? { model: input.model } : {}),
      ...(input.provider ? { provider: input.provider } : {}),
      source: 'api_server', background_delegation_enabled: false,
      wait: false,
    }, { timeoutMs: input.timeoutMs + 15_000 })
    let result = await Promise.race([response, aborted, timedOut])
    while (result.ok === true && result.status === 'running' && result.run_id) {
      await Promise.race([new Promise(resolve => setTimeout(resolve, 100)), aborted, timedOut])
      result = await Promise.race([
        bridge.request({ action: 'get_result', run_id: result.run_id }, { timeoutMs: 15_000 }),
        aborted, timedOut,
      ])
    }
    input.signal?.throwIfAborted()
    if (result.ok !== true || result.status !== 'complete'
      || result.error || result.result?.error || result.result?.failed || result.result?.partial || result.result?.interrupted
      || result.result?.completed === false || result.result?.tool_calls?.length
      || result.result?.toolCalls?.length || result.result?.finish_reason === 'tool_calls'
      || result.result?.messages?.some((message: any) => message.role === 'assistant' && message.tool_calls?.length)) {
      throw new Error(result.error || result.result?.error || `Summary bridge run did not complete (${result.status || 'unknown'})`)
    }
    const output = String(result.result?.final_response || result.output || '').trim()
    if (!output) throw new Error('Empty summarization response')
    return output
  } catch (error) {
    await interrupt()
    throw error
  } finally {
    clearTimeout(timer)
    input.signal?.removeEventListener('abort', onAbort)
    // stop_worker retires only this reserved, unique summary worker, including
    // a timed-out provider call that did not honor the cooperative interrupt.
    await bridge.request({ action: 'destroy', ...route, stop_worker: true }, { timeoutMs: 5_000 }).catch(() => undefined)
  }
}
