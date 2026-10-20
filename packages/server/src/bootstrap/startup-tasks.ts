import { runStartupTasks, type StartupTask } from '../modules/studio/services/startup-tasks'

/** Studio does not migrate credentials to a partner service. */
export function getStartupTasks(): StartupTask[] {
  return []
}

export function runRegisteredStartupTasks() {
  return runStartupTasks(getStartupTasks())
}
