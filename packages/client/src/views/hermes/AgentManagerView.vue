<script setup lang="ts">
import PageLoading from '@/components/common/PageLoading.vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import { computed, defineAsyncComponent, h, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { NAlert, NButton, NDrawer, NDrawerContent, NTag, useDialog, useMessage } from 'naive-ui'
import { fetchAgentStatusSnapshot, type AgentStatusSnapshot } from '@/api/agent-status'
import {
  decideLegacyWindowsDataMigration,
  fetchLegacyWindowsDataMigrationStatus,
} from '@/api/hermes/legacy-data-migration'
import { fetchRuntimeVersionStatus, type RuntimeVersionStatus } from '@/api/hermes/runtime-versions'
import HermesDataDirectoryHint from '@/components/hermes/HermesDataDirectoryHint.vue'
import { useChatStore } from '@/stores/hermes/chat'
import { desktopBridge } from '@/utils/desktop-bridge'

const AiHelpChatPanel = defineAsyncComponent(async () => (await import('@/components/hermes/chat/ChatPanel.vue')).default)

const { t } = useI18n()
const message = useMessage()
const dialog = useDialog()
const chatStore = useChatStore()
const route = useRoute()
const router = useRouter()

const agentStatusSnapshot = ref<AgentStatusSnapshot | null>(null)
const loading = ref(true)
const loadError = ref('')
const hermesCliDetailsVisible = ref(false)
const hermesCliDetailsLoading = ref(false)
const hermesRuntimeStatus = ref<RuntimeVersionStatus | null>(null)
const aiHelpDrawerVisible = ref(false)
const aiHelpPrompt = ref('')
const legacyDataMigrationChecked = ref(false)

const hermesStatus = computed(() => agentStatusSnapshot.value?.agents.find(agent => agent.id === 'hermes'))
const hermesDetected = computed(() => Boolean(hermesStatus.value?.installed))
const hermesVersion = computed(() => formatHermesVersion(hermesStatus.value?.version))
const hermesType = computed<'CLI' | 'Runtime' | ''>(() => {
  if (hermesStatus.value?.source === 'user-cli') return 'CLI'
  if (hermesStatus.value?.source === 'managed-runtime') return 'Runtime'
  return ''
})


function formatVersion(value?: string): string {
  const version = value?.trim()
  if (!version) return t('agentManager.unknownVersion')
  return /^v(?=\d)/i.test(version) ? version : `v${version}`
}

function formatHermesVersion(value?: string): string {
  return formatVersion(value?.split('·')[0])
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function startAiHelpChat(prompt: string) {
  chatStore.newChat({
    source: 'cli',
    agent: 'hermes',
  })
  aiHelpPrompt.value = prompt
  aiHelpDrawerVisible.value = true
}

function openGeneralAiHelpDrawer() {
  startAiHelpChat(t('agentManager.aiHelpGeneralPrompt'))
}

async function syncAgentStatus() {
  agentStatusSnapshot.value = await fetchAgentStatusSnapshot()
}

async function loadCachedStatus() {
  loading.value = true
  loadError.value = ''
  try {
    await syncAgentStatus()
  } catch (error) {
    loadError.value = errorMessage(error)
  } finally {
    loading.value = false
  }
}

let managerMounted = false

function refreshHermesStatus() {
  if (!managerMounted || document.visibilityState === 'hidden' || loading.value) return
  void loadCachedStatus()
}

async function refreshAll() {
  loading.value = true
  loadError.value = ''
  const results = await Promise.allSettled([
    syncAgentStatus(),
    fetchRuntimeVersionStatus({ includeRemote: false }),
  ])
  const errors = results
    .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
    .map(result => errorMessage(result.reason))
  const runtimeResult = results[1]
  if (runtimeResult?.status === 'fulfilled') hermesRuntimeStatus.value = runtimeResult.value
  if (errors.length) loadError.value = errors.join('\n')
  loading.value = false
}

async function openHermesCliDetails() {
  hermesCliDetailsLoading.value = true
  try {
    hermesRuntimeStatus.value = await fetchRuntimeVersionStatus({ includeRemote: false })
    hermesCliDetailsVisible.value = true
  } catch (error) {
    message.error(errorMessage(error))
  } finally {
    hermesCliDetailsLoading.value = false
  }
}

async function submitLegacyDataMigrationDecision(action: 'migrate' | 'decline'): Promise<boolean> {
  try {
    await decideLegacyWindowsDataMigration(action)
    if (action === 'migrate') {
      const bridge = desktopBridge()
      if (!bridge?.restartApp) throw new Error('Desktop restart is unavailable')
      message.success(t('agentManager.legacyDataMigrationSuccess'))
      await bridge.restartApp()
    }
    return true
  } catch (error) {
    message.error(t('agentManager.legacyDataMigrationFailed', { error: errorMessage(error) }))
    return false
  }
}

async function maybePromptLegacyWindowsDataMigration() {
  const bridge = desktopBridge()
  if (legacyDataMigrationChecked.value || bridge?.isDesktop !== true || bridge.platform !== 'win32') return
  legacyDataMigrationChecked.value = true

  try {
    const status = await fetchLegacyWindowsDataMigrationStatus()
    if (!status.shouldPrompt) return

    dialog.warning({
      title: t('agentManager.legacyDataMigrationTitle'),
      content: () => h('div', { class: 'legacy-data-migration-dialog' }, [
        h('p', t('agentManager.legacyDataMigrationDescription')),
        h('dl', [
          h('dt', t('agentManager.legacyDataMigrationSource')),
          h('dd', [h('code', status.sourceDirectory)]),
          h('dt', t('agentManager.legacyDataMigrationTarget')),
          h('dd', [h('code', status.targetDirectory)]),
        ]),
        h('p', { class: 'legacy-data-migration-warning' }, t('agentManager.legacyDataMigrationWarning')),
      ]),
      positiveText: t('agentManager.legacyDataMigrationPositive'),
      negativeText: t('agentManager.legacyDataMigrationNegative'),
      closable: false,
      maskClosable: false,
      closeOnEsc: false,
      onPositiveClick: () => submitLegacyDataMigrationDecision('migrate'),
      onNegativeClick: () => submitLegacyDataMigrationDecision('decline'),
    })
  } catch (error) {
    console.warn('[agent-manager] failed to check legacy Windows Studio data migration', error)
  }
}



onMounted(() => {
  managerMounted = true
  window.addEventListener('focus', refreshHermesStatus)
  document.addEventListener('visibilitychange', refreshHermesStatus)
  if (route.query.runtime === 'install') {
    const query = { ...route.query }
    delete query.runtime
    void router.replace({ query })
  }
  void loadCachedStatus()
  void maybePromptLegacyWindowsDataMigration()
})

onUnmounted(() => {
  managerMounted = false
  window.removeEventListener('focus', refreshHermesStatus)
  document.removeEventListener('visibilitychange', refreshHermesStatus)
})
</script>

<template>
  <PageLoading :show="loading" class="agent-manager-panel">
      <PageHeader>
      <header class="page-header">
        <div class="agent-manager-header-left">
          <h2 class="header-title">{{ t('agentManager.title') }}</h2>
        </div>
        <div class="agent-manager-header-actions">
          <NButton size="small" secondary :loading="loading" @click="refreshAll()">
            {{ t('agentManager.refresh') }}
          </NButton>
          <NButton size="small" secondary @click="openGeneralAiHelpDrawer">
            {{ t('agentManager.aiHelpDialogPositive') }}
          </NButton>
        </div>
      </header>
      </PageHeader>

      <div class="agent-manager-spin">
        <div class="agent-manager-content">
          <NAlert v-if="loadError" type="error" :bordered="false">
            {{ loadError }}
          </NAlert>

          <div class="coding-agent-grid">
          <section class="agent-card coding-agent-card hermes-card" data-testid="agent-card-hermes">
            <header class="agent-card-header compact">
              <div class="agent-identity">
                <img :src="'/logo.png'" alt="" class="agent-logo" />
                <div>
                  <div class="agent-name-row">
                    <h3>Studio</h3>
                    <NTag
                      v-if="hermesDetected && hermesType"
                      data-testid="hermes-source-type"
                      type="info"
                      size="small"
                      :bordered="false"
                    >
                      {{ hermesType }}
                    </NTag>
                    <NTag :type="hermesDetected ? 'success' : 'warning'" size="small" :bordered="false">
                      {{ hermesDetected ? t('codingAgents.installed') : t('codingAgents.notInstalled') }}
                    </NTag>
                  </div>
                  <p v-if="hermesDetected" class="agent-version">{{ hermesVersion }}</p>
                  <p v-else>{{ t('agentManager.hermesDescription') }}</p>
                </div>
              </div>
            </header>

            <div class="agent-actions">
              <NButton
                v-if="hermesDetected"
                secondary
                size="small"
                @click="router.push({ name: 'hermes.configSettings' })"
              >
                {{ t('sidebar.settings') }}
              </NButton>
              <NButton
                v-if="hermesDetected && hermesType === 'CLI'"
                data-testid="view-hermes-cli-details"
                secondary
                size="small"
                :loading="hermesCliDetailsLoading"
                @click="openHermesCliDetails"
              >
                {{ t('runtimeVersions.viewCliDetails') }}
              </NButton>

            </div>
          </section>

          </div>
        </div>
      </div>

    <NDrawer
      v-model:show="hermesCliDetailsVisible"
      placement="right"
      width="var(--studio-drawer-width)"
    >
      <NDrawerContent :title="t('runtimeVersions.cliDetailsTitle')" closable>
        <div data-testid="hermes-cli-details" class="hermes-cli-details">
          <div class="hermes-cli-detail-row">
            <strong>{{ t('runtimeVersions.activePythonPath') }}</strong>
            <code>{{ hermesRuntimeStatus?.hermes.pythonPath || '-' }}</code>
          </div>
          <div class="hermes-cli-detail-row">
            <strong>{{ t('runtimeVersions.activeAgentRoot') }}</strong>
            <code>{{ hermesRuntimeStatus?.hermes.agentRoot || '-' }}</code>
          </div>
          <div class="hermes-cli-detail-row">
            <strong>{{ t('runtimeVersions.activeDataDirectory') }}</strong>
            <code>{{ hermesRuntimeStatus?.hermes.dataDirectory || '-' }}</code>
          </div>
          <HermesDataDirectoryHint />
        </div>
      </NDrawerContent>
    </NDrawer>

    <NDrawer
      v-model:show="aiHelpDrawerVisible"
      class="agent-ai-help-drawer"
      placement="right"
      width="var(--studio-drawer-width)"
    >
      <NDrawerContent :title="t('agentManager.aiHelpDrawerTitle')" closable body-content-style="padding: 0; overflow: hidden;">
        <AiHelpChatPanel
          v-if="aiHelpDrawerVisible"
          standalone
          :initial-composer-text="aiHelpPrompt"
          :composer-persist-draft="false"
        />
      </NDrawerContent>
    </NDrawer>
  </PageLoading>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.agent-manager-panel {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--theme-content-bg, $bg-main-surface);
}

.hermes-cli-details {
  display: flex;
  flex-direction: column;
  gap: calc(12px * var(--spacing-scale, 1));
}

.hermes-cli-detail-row {
  display: flex;
  flex-direction: column;
  gap: calc(6px * var(--spacing-scale, 1));
  padding: calc(12px * var(--spacing-scale, 1));
  border: var(--border-width, 1px) solid var(--border-color);
  border-radius: var(--radius-component, 6px);

  strong {
    color: var(--text-color-2);
    font-size: calc(var(--font-size-base, 14px) * 12 / 14);
  }

  code {
    overflow-wrap: anywhere;
    color: var(--text-color-1);
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: calc(var(--font-size-base, 14px) * 12 / 14);
  }
}

:global(.agent-ai-help-dialog p) {
  margin: 0 0 12px;
}

:global(.legacy-data-migration-dialog p) {
  margin: 0 0 12px;
}

:global(.legacy-data-migration-dialog dl) {
  display: grid;
  grid-template-columns: max-content minmax(0, 1fr);
  gap: calc(8px * var(--spacing-scale, 1)) calc(12px * var(--spacing-scale, 1));
  margin: 0 0 12px;
}

:global(.legacy-data-migration-dialog dt) {
  color: var(--text-color-2);
}

:global(.legacy-data-migration-dialog dd) {
  min-width: 0;
  margin: 0;
}

:global(.legacy-data-migration-dialog code) {
  overflow-wrap: anywhere;
}

:global(.legacy-data-migration-dialog .legacy-data-migration-warning) {
  margin-bottom: 0;
  color: var(--warning-color);
}

:global(.agent-ai-help-error) {
  max-height: 180px;
  margin: 0;
  padding: calc(10px * var(--spacing-scale, 1)) calc(12px * var(--spacing-scale, 1));
  overflow: auto;
  border-radius: var(--radius-component, 8px);
  background: rgba(127, 127, 127, 0.1);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: calc(var(--font-size-base, 14px) * 12 / 14);
  white-space: pre-wrap;
  word-break: break-word;
}

:global(.agent-ai-help-drawer .n-drawer-body-content-wrapper) {
  height: 100%;
}

.agent-manager-header-left,
.agent-manager-header-actions,
.agent-identity,
.agent-name-row,
.agent-actions {
  display: flex;
  align-items: center;
}

.agent-manager-header-left {
  min-width: 0;
  gap: calc(8px * var(--spacing-scale, 1));
}

.agent-manager-header-actions {
  flex: 0 0 auto;
  gap: calc(8px * var(--spacing-scale, 1));
}

.header-title {
  margin: 0;
}

.agent-manager-spin {
  min-height: 0;
  flex: 1 1 auto;
  overflow-y: auto;

}

.agent-manager-content {
  container: agent-manager / inline-size;
  min-height: 100%;
  display: flex;
  flex-direction: column;
  gap: calc(16px * var(--spacing-scale, 1));
  margin: 0 auto;
  padding: calc(24px * var(--spacing-scale, 1));
}

.agent-card {
  padding: calc(18px * var(--spacing-scale, 1));
  border: var(--border-width, 1px) solid $border-color;
  border-radius: var(--radius-component, 14px);
  background: var(--theme-card-bg, $bg-card);
  box-shadow: 0 5px 18px rgba(0, 0, 0, 0.05);
}

.agent-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: calc(18px * var(--spacing-scale, 1));

  &.compact {
    align-items: center;
  }
}

.agent-identity {
  min-width: 0;
  align-items: flex-start;
  gap: calc(12px * var(--spacing-scale, 1));

  h3 {
    margin: 0;
    font-size: calc(var(--font-size-base, 14px) * 17 / 14);
  }

  p {
    max-width: 720px;
    margin: 5px 0 0;
    color: $text-secondary;
    font-size: calc(var(--font-size-base, 14px) * 12 / 14);
    line-height: var(--line-height, 1.55);

    &.agent-version {
      color: $text-primary;
      font-size: calc(var(--font-size-base, 14px) * 13 / 14);
      font-weight: 650;
      letter-spacing: 0.01em;
    }
  }
}

.agent-name-row {
  flex-wrap: wrap;
  gap: calc(8px * var(--spacing-scale, 1));
}

.agent-logo {
  width: 42px;
  height: 42px;
  flex: 0 0 auto;
  padding: calc(4px * var(--spacing-scale, 1));
  border: var(--border-width, 1px) solid $border-color;
  border-radius: var(--radius-component, 11px);
  background: rgba(255, 255, 255, 0.92);
  object-fit: contain;
}

.coding-agent-grid {
  display: grid;
  grid-template-columns: 1fr;
  align-items: stretch;
  gap: calc(16px * var(--spacing-scale, 1));
}

// Keep cards at least 340px wide when showing multiple columns, including 16px gaps.
@container agent-manager (min-width: 696px) {
  .coding-agent-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@container agent-manager (min-width: 1052px) {
  .coding-agent-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.coding-agent-card {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: calc(15px * var(--spacing-scale, 1));
}

.agent-actions {
  flex-wrap: wrap;
  gap: calc(8px * var(--spacing-scale, 1));
  margin-top: auto;
}

@media (max-width: $breakpoint-mobile) {
  .agent-manager-content {
    padding: calc(16px * var(--spacing-scale, 1));
  }

  .coding-agent-grid {
    grid-template-columns: 1fr;
  }

  .agent-card-header,
  .agent-card-header.compact {
    align-items: stretch;
  }

  .agent-card-header,
  .agent-card-header.compact {
    flex-direction: column;
  }

}
</style>

<style scoped>
.agent-update-policy { min-width: 0; width: 100%; box-sizing: border-box; padding-top: calc(10px * var(--spacing-scale, 1)); border-top: var(--border-width, 1px) solid var(--border-color, #eee); }
.agent-update-policy-row { display: flex; justify-content: space-between; align-items: center; gap: calc(12px * var(--spacing-scale, 1)); font-size: calc(var(--font-size-base, 14px) * 12 / 14); }
.agent-update-policy small { display: block; margin-top: 6px; overflow-wrap: anywhere; }
.agent-update-error { color: #c44; }
</style>
