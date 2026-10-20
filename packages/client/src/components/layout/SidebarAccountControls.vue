<script setup lang="ts">
import { type GlobalThemeOverrides } from 'naive-ui'
import { useI18n } from 'vue-i18n'
import { useAppStore } from '@/stores/hermes/app'
import ModelSelector from '@/components/layout/ModelSelector.vue'
import ProfileSelector from '@/components/layout/ProfileSelector.vue'
import LanguageSwitch from '@/components/layout/LanguageSwitch.vue'
import ThemeSwitch from '@/components/layout/ThemeSwitch.vue'
import { getStoredUserId } from '@/api/client'
import { clearThemeBackgroundCache } from '@/api/studio/theme'

const emit = defineEmits<{ 'open-modal': [] }>()
const { t } = useI18n()
const appStore = useAppStore()
const languageThemeOverrides: GlobalThemeOverrides['Select'] = {
  peers: {
    InternalSelection: {
      heightSmall: 'var(--account-selector-height)',
      fontSizeSmall: 'calc(var(--font-size-base, 14px) * 13 / 14)',
      borderRadius: 'var(--account-selector-radius)',
      paddingSingle: '0 9px',
      arrowSize: '12px',
      arrowColor: 'var(--text-muted)',
      color: 'var(--bg-input)',
      colorActive: 'var(--bg-input)',
      textColor: 'var(--text-primary)',
      border: '1px solid var(--border-color)',
      borderHover: '1px solid var(--accent-muted)',
    },
  },
}

function handleModalShow(show: boolean) {
  if (show) emit('open-modal')
}

async function handleLogout() {
  const userId = getStoredUserId();
  if (userId) await clearThemeBackgroundCache(userId);
  localStorage.clear();
  window.location.reload();
}

</script>

<template>
  <div class="sidebar-account-controls">
    <ProfileSelector @modal-show-change="handleModalShow" />
    <ModelSelector @modal-show-change="handleModalShow" />
    <div class="language-row">
      <span class="language-label">{{ t("language.label") }}</span>
      <LanguageSwitch size="small" :theme-overrides="languageThemeOverrides" />
    </div>

    <div class="sidebar-footer">
      <div class="logout-row">
        <button class="nav-item logout-item" @click="handleLogout">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          <span>{{ t("sidebar.logout") }}</span>
        </button>
        <div
          class="status-indicator"
          :class="{
            connected: appStore.connected,
            disconnected: !appStore.connected,
          }"
        >
          <span class="status-dot"></span>
          <span class="status-text">{{
            appStore.connected
              ? t("sidebar.connected")
              : t("sidebar.disconnected")
          }}</span>
        </div>
      </div>
      <div class="version-info">

        <span class="version-text">Studio v{{ appStore.serverVersion || "—" }}</span>
        <ThemeSwitch />
      </div>


    </div>

  </div>
</template>

<style scoped lang="scss">
@use "@/styles/variables" as *;

.sidebar-account-controls {
  --account-selector-height: 30px;
  --account-selector-radius: #{$radius-sm};
  min-width: 0;
}

.sidebar-account-controls :deep(.profile-selector),
.sidebar-account-controls :deep(.model-selector) {
  padding-inline: 0;
}

.language-row {
  display: flex;
  flex-direction: column;
  gap: calc(6px * var(--spacing-scale, 1));
  margin-bottom: 8px;
}

.language-label {
  display: flex;
  align-items: center;
  min-height: 20px;
  font-size: calc(var(--font-size-base, 14px) * 11 / 14);
  font-weight: 600;
  color: $text-muted;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.language-row :deep(.language-switch) { width: 100%; }
.sidebar-account-controls :deep(.model-trigger) { height: var(--account-selector-height); }

.nav-item {
  display: flex;
  align-items: center;
  gap: calc(10px * var(--spacing-scale, 1));
  padding: calc(12px * var(--spacing-scale, 1));
  border: none;
  background: none;
  appearance: none;
  text-decoration: none;
  color: $text-secondary;
  font-size: calc(var(--font-size-base, 14px) * 14 / 14);
  border-radius: $radius-sm;
  cursor: pointer;
  transition: all $transition-fast;
  width: 100%;
  text-align: start;

  &:hover {
    background-color: rgba(var(--accent-primary-rgb), 0.06);
    color: $text-primary;
  }

  &.active {
    background-color: rgba(var(--accent-primary-rgb), 0.12);
    color: $accent-primary;
  }

  .beta-tag {
    font-size: calc(var(--font-size-base, 14px) * 10 / 14);
    color: $text-muted;
    margin-inline-start: 2px;
  }
}

.sidebar-footer {
  padding-top: calc(10px * var(--spacing-scale, 1));
  border-top: var(--border-width, 1px) solid $border-color;
  display: flex;
  flex-direction: column;
  gap: calc(4px * var(--spacing-scale, 1));
}

.logout-item {
  width: auto;
  min-width: 0;
  color: $text-secondary;

  &:hover {
    color: $error;
  }

  > svg { flex-shrink: 0; }

  > span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.logout-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: calc(8px * var(--spacing-scale, 1));
  padding-inline-end: calc(12px * var(--spacing-scale, 1));
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: calc(8px * var(--spacing-scale, 1));
  min-width: 0;
  margin-inline-start: auto;
  font-size: calc(var(--font-size-base, 14px) * 12 / 14);
  color: $text-secondary;

  &.connected .status-dot {
    background-color: $success;
    box-shadow: 0 0 6px rgba(var(--success-rgb), 0.5);
  }

  &.disconnected .status-dot {
    background-color: $error;
  }
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.version-info {
  padding: calc(8px * var(--spacing-scale, 1)) calc(12px * var(--spacing-scale, 1));
  font-size: calc(var(--font-size-base, 14px) * 11 / 14);
  color: $text-muted;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: calc(6px * var(--spacing-scale, 1));
  overflow: hidden;
}

.version-links {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  gap: calc(6px * var(--spacing-scale, 1));
}

.sidebar-footer-link {
  color: $text-muted;
  display: flex;
  align-items: center;
  transition: color $transition-fast;

  &:hover {
    color: $text-primary;
  }
}

.version-text {
  border: 0;
  background: transparent;
  padding: 0;
  font: inherit;
  color: inherit;
  flex: 0 0 auto;
  overflow: visible;
  white-space: nowrap;
  cursor: pointer;
  transition: color $transition-fast;

  &:hover {
    color: $accent-primary;
  }
}

.version-info :deep(.theme-switch-container) {
  flex-shrink: 0;
}

.update-btn {
  margin: 4px 0 0;
  border-radius: $radius-sm;
}

.changelog-list {
  max-height: min(70vh, 640px);
  overflow-y: auto;
}

.changelog-version-block {
  margin-bottom: 20px;

  &:last-child {
    margin-bottom: 0;
  }
}

.changelog-version-header {
  display: flex;
  align-items: center;
  gap: calc(10px * var(--spacing-scale, 1));
  margin-bottom: 8px;
}

.changelog-version-tag {
  font-weight: 600;
  font-size: calc(var(--font-size-base, 14px) * 14 / 14);
  color: $text-primary;
  font-family: var(--font-code, $font-code);
}

.changelog-date {
  font-size: calc(var(--font-size-base, 14px) * 12 / 14);
  color: $text-muted;
}

.changelog-changes {
  list-style: none;
  padding: 0;
  margin: 0;

  li {
    font-size: calc(var(--font-size-base, 14px) * 13 / 14);
    color: $text-secondary;
    padding: calc(4px * var(--spacing-scale, 1)) 0 calc(4px * var(--spacing-scale, 1)) calc(16px * var(--spacing-scale, 1));
    position: relative;

    &::before {
      content: "";
      position: absolute;
      left: 0;
      top: 12px;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: $text-muted;
    }
  }
}

.docker-update-modal {
  p {
    margin: 12px 0;
    font-size: calc(var(--font-size-base, 14px) * 14 / 14);
    line-height: var(--line-height, 1.6);
    color: $text-secondary;
  }

  .docker-update-commands {
    display: flex;
    flex-direction: column;
    gap: calc(8px * var(--spacing-scale, 1));
    margin: 16px 0;
  }

  .docker-command {
    display: block;
    padding: calc(10px * var(--spacing-scale, 1)) calc(14px * var(--spacing-scale, 1));
    background: $code-bg;
    border-radius: $radius-sm;
    font-family: var(--font-code, $font-code);
    font-size: calc(var(--font-size-base, 14px) * 13 / 14);
    color: $text-primary;
    user-select: all;
    cursor: text;
    border: var(--border-width, 1px) solid $border-color;
  }

  .docker-update-note {
    margin-top: 16px;
  }
}
</style>
