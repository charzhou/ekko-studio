import { readPresetStyleSource as readFileSync } from './preset-style-source'
import { describe, expect, it } from 'vitest'
import { OEM_GROUP_AGENT_OPTIONS } from '../../packages/client/src/utils/agent-options'

describe('GroupChatPanel OEM surface', () => {
  it('keeps local workspace and agent controls while disabling cloud room UI', () => {
    const panel = readFileSync('packages/client/src/components/hermes/group-chat/GroupChatPanel.vue', 'utf8')

    expect(panel).toContain('const OEM_CLOUD_FEATURES_ENABLED = false')
    expect(panel).toContain('v-for="room in store.rooms"')
    expect(panel).toContain('<FolderPicker v-model="workspaceValue" />')
    expect(panel).toContain('const currentRoomCanManage = computed(')
    expect(panel).toContain('v-if="OEM_CLOUD_FEATURES_ENABLED && remoteRooms.length"')
    expect(panel).toContain('v-if="OEM_CLOUD_FEATURES_ENABLED && pendingAgentPairings.length"')
    expect(panel).toContain('const submittedRoomId = store.currentRoomId')
    expect(panel).toContain('clearGroupChatRoomDraft(submittedRoomId)')
  })

  it('retains supported local agent choices and coding-agent mode mapping', () => {
    const panel = readFileSync('packages/client/src/components/hermes/group-chat/GroupChatPanel.vue', 'utf8')
    const selection = readFileSync('packages/client/src/utils/coding-agent-mode.ts', 'utf8')

    expect(OEM_GROUP_AGENT_OPTIONS).toEqual([{ label: 'AFY Studio', value: 'hermes' }])
    expect(panel).toContain('const groupAgentTypeDefinitions = OEM_GROUP_AGENT_OPTIONS')
    expect(panel).toContain('submittedCodingAgentSelection({')
    expect(panel).toContain('priorAgentMode: priorAgentMode.value,')
    expect(selection).toContain("priorAgentMode: input.priorAgentMode || ''")
  })

  it('does not register retired remote group-chat views', () => {
    const router = readFileSync('packages/client/src/router/index.ts', 'utf8')
    const packageFiles = [
      'packages/client/src/views/hermes/GroupChatLinkView.vue',
      'packages/client/src/views/hermes/SharedGroupChatView.vue',
    ]

    expect(router).not.toContain('GroupChatLinkView.vue')
    expect(router).not.toContain('SharedGroupChatView.vue')
    for (const file of packageFiles) {
      expect(() => readFileSync(file, 'utf8')).toThrow()
    }
  })
})
