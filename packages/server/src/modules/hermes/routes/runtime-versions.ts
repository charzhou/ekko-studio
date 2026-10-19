import Router from '@koa/router'
import * as ctrl from '../controllers/runtime-versions'
import { requireSuperAdmin } from '../../studio/public/auth'

export const runtimeVersionRoutes = new Router()

runtimeVersionRoutes.get('/api/hermes/runtime-versions', requireSuperAdmin, ctrl.status)
runtimeVersionRoutes.get('/api/hermes/runtime-versions/jobs', requireSuperAdmin, ctrl.jobs)
runtimeVersionRoutes.get('/api/hermes/runtime-versions/jobs/:id', requireSuperAdmin, ctrl.job)
runtimeVersionRoutes.post('/api/hermes/runtime-versions/active-runtime', requireSuperAdmin, ctrl.activateRuntime)
runtimeVersionRoutes.post('/api/hermes/runtime-versions/runtime-root', requireSuperAdmin, ctrl.selectRuntimeRoot)
runtimeVersionRoutes.delete('/api/hermes/runtime-versions/runtime/:version', requireSuperAdmin, ctrl.deleteRuntime)
