import type { Context } from 'koa'
import { isOemHermesAgentId } from '../public/oem'
import {
  getAgentAvailabilitySnapshot,
  getAgentStatusSnapshot,
} from '../public/agent-status-registry'

export function availability(ctx: Context) {
  const snapshot = getAgentAvailabilitySnapshot()
  ctx.body = { ...snapshot, agents: snapshot.agents.filter(agent => isOemHermesAgentId(agent.id)) }
}

export function status(ctx: Context) {
  const snapshot = getAgentStatusSnapshot()
  ctx.body = { ...snapshot, agents: snapshot.agents.filter(agent => isOemHermesAgentId(agent.id)) }
}
