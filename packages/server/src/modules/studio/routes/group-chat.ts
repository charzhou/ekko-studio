import Router from '@koa/router'
import * as ctrl from '../controllers/group-chat'
import * as workspaceCtrl from '../controllers/group-chat-workspace'

export { getGroupChatServer, setGroupChatServer } from '../controllers/group-chat'

// Kept as an empty compatibility export for integrations that import the old
// router. Invite/share and remote-agent routes are intentionally not registered.
export const groupChatPublicRoutes = new Router()
export const groupChatRoutes = new Router()

groupChatRoutes.post('/api/studio/group-chat/rooms/:roomId/attachments', ctrl.uploadRoomAttachment)
groupChatRoutes.post('/api/studio/group-chat/rooms/:roomId/attachment-uploads', ctrl.openRoomAttachmentUpload)
groupChatRoutes.put('/api/studio/group-chat/rooms/:roomId/attachment-uploads/:id/chunks', ctrl.appendRoomAttachmentUploadChunk)
groupChatRoutes.post('/api/studio/group-chat/rooms/:roomId/attachment-uploads/:id/complete', ctrl.completeRoomAttachmentUpload)
groupChatRoutes.delete('/api/studio/group-chat/rooms/:roomId/attachment-uploads/:id', ctrl.abortRoomAttachmentUpload)
groupChatRoutes.get('/api/studio/group-chat/rooms/:roomId/attachments/:file', ctrl.readRoomAttachment)
groupChatRoutes.post('/api/studio/group-chat/rooms', ctrl.createRoom)
groupChatRoutes.post('/api/studio/group-chat/rooms/:roomId/clone', ctrl.cloneRoom)
groupChatRoutes.get('/api/studio/group-chat/rooms/:roomId', ctrl.getRoom)
groupChatRoutes.get('/api/studio/group-chat/rooms/:roomId/workspace-files/list', workspaceCtrl.listWorkspaceFiles)
groupChatRoutes.get('/api/studio/group-chat/rooms/:roomId/workspace-file/diff', workspaceCtrl.diffWorkspaceFile)
groupChatRoutes.get('/api/studio/group-chat/rooms/:roomId/workspace-file/read', workspaceCtrl.readWorkspaceFile)
groupChatRoutes.get('/api/studio/group-chat/rooms/:roomId/workspace-file/content', workspaceCtrl.readWorkspaceFileContent)
groupChatRoutes.put('/api/studio/group-chat/rooms/:roomId/workspace-file/write', workspaceCtrl.writeWorkspaceFile)
groupChatRoutes.post('/api/studio/group-chat/rooms/:roomId/workspace-file/mkdir', workspaceCtrl.mkdirWorkspaceFile)
groupChatRoutes.delete('/api/studio/group-chat/rooms/:roomId/workspace-file/delete', workspaceCtrl.deleteWorkspaceFile)
groupChatRoutes.post('/api/studio/group-chat/rooms/:roomId/workspace-file/rename', workspaceCtrl.renameWorkspaceFile)
groupChatRoutes.post('/api/studio/group-chat/rooms/:roomId/workspace-file/copy', workspaceCtrl.copyWorkspaceFile)
groupChatRoutes.get('/api/studio/group-chat/rooms', ctrl.listRooms)
groupChatRoutes.post('/api/studio/group-chat/rooms/:roomId/agents', ctrl.addRoomAgent)
groupChatRoutes.put('/api/studio/group-chat/rooms/:roomId/agents/:agentId', ctrl.updateRoomAgent)
groupChatRoutes.get('/api/studio/group-chat/rooms/:roomId/agents', ctrl.listRoomAgents)
groupChatRoutes.delete('/api/studio/group-chat/rooms/:roomId/members/:userId', ctrl.removeRoomMember)
groupChatRoutes.delete('/api/studio/group-chat/rooms/:roomId/agents/:agentId', ctrl.removeRoomAgent)
groupChatRoutes.delete('/api/studio/group-chat/rooms/:roomId', ctrl.removeRoom)
groupChatRoutes.post('/api/studio/group-chat/rooms/:roomId/clear-context', ctrl.clearRoomContext)
groupChatRoutes.put('/api/studio/group-chat/rooms/:roomId/config', ctrl.updateRoomConfig)
groupChatRoutes.post('/api/studio/group-chat/rooms/:roomId/handoffs/:chainId/continue', ctrl.continueRoomHandoff)
groupChatRoutes.get('/api/studio/group-chat/rooms/:roomId/handoffs', ctrl.listRoomHandoffs)
groupChatRoutes.put('/api/studio/group-chat/rooms/:roomId/workspace', ctrl.updateRoomWorkspace)
groupChatRoutes.get('/api/studio/group-chat/rooms/:roomId/summary', ctrl.getRoomSummary)
groupChatRoutes.put('/api/studio/group-chat/rooms/:roomId/summary', ctrl.updateRoomSummary)

groupChatRoutes.get('/api/studio/group-chat/rooms/:roomId/message-selection', ctrl.getRoomMessageSelection)
groupChatRoutes.post('/api/studio/group-chat/rooms/:roomId/messages/delete', ctrl.deleteRoomMessages)
