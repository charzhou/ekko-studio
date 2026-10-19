# AFY Studio OEM implementation

The `oem` branch changes the visible product to **AFY Studio** and ships the Windows desktop installer plus the local web application.

## Product behavior

- Application names, browser metadata, all twelve locales, notifications, default assistant identity and model-facing product descriptions use AFY Studio.
- A new editable AFY mark lives in `packages/client/public/afy-mark.svg`. `node scripts/generate-afy-icons.mjs` generates the web logo, assistant avatar, Windows installer/application/tray icons and favicon. Hermes avatars use the App icon throughout chat, group chat, notifications, settings previews and Agent management. The legacy Hermes image URL serves the same App icon for stored avatar references. Legacy promotional screenshots and GIFs are removed.
- Hermes is the only Agent execution backend exposed by the OEM product. Chat, Profile selection, approvals, tool calls and streamed turns continue to use the existing Hermes Bridge and local Hermes installation. Ekko Agent and Coding Agent entries are disabled at the product registration and routing boundaries; their source packages and compatibility identifiers remain in the repository so the surrounding architecture does not need to be rewritten.
- Application update checks, downloads, package-manager self-updates and runtime/model download flows are unavailable. The OEM build uses an already-installed local Hermes CLI/runtime and its existing Hermes profiles.
- Official announcements, original website/repository links, mobile/App services and cloud relays, remote device/hardware features, partner marketing and partner provider presets are excluded.
- APIKEY partner-specific media helpers and the old product installation skill are removed from the distributed skills.
- Firmware, NAS/TOS, Docker distribution, macOS/Linux desktop release jobs and update/publication jobs are removed. Windows CI only uploads installers as run artifacts.
- User files and generated artifacts can still be uploaded and downloaded locally. Configured model providers, third-party OAuth, browser tools, local chat, group chat and workflows remain supported; these Studio features orchestrate Hermes runs and do not add another Agent backend. This edition is not an offline network sandbox.

## Hermes-only execution boundary

The OEM edition keeps the existing Studio architecture and narrows only the
execution choice:

```text
AFY Studio Chat / Group Chat / Workflow
  -> existing Socket.IO and service layer
  -> Hermes-only agent registry and routing
  -> AgentBridgeClient
  -> local hermes_bridge.py and selected Hermes Profile
  -> Hermes model provider and tools
```

The Studio SQLite database remains the source of truth for users, sessions,
messages, queues, approvals, clarifications, workflow state and group-chat
state. Hermes owns its Profile configuration, credentials, model provider
settings and Agent execution context. `HERMES_WEB_UI_HOME`/`HERMES_WEBUI_STATE_DIR`
and the Hermes home/profile directories remain separate as before.

The `modules/ekko` and `modules/coding-agents` boundaries remain in the source
tree for compatibility, migrations and shared contracts. OEM registration and
user-facing routing must keep them unavailable, rather than moving Studio
persistence or rewriting the Chat/Bridge/Workflow/Group Chat architecture.

## Compatibility retained

Package names, `com.hermeswebui.studio`, installer artifact/executable identities, CLI aliases, environment variable names, filesystem/database names, API paths, MCP tool names, IPC and existing data formats are preserved. They are compatibility identifiers and may still be visible in system paths or commands. Previously configured removed cloud/partner services are not activated automatically.

Source licenses and third-party notices remain unmodified. The prior branding inventory is retained as historical discovery evidence; its line references and counts describe the original revision, not the current implementation.

## Windows builds

Run `.github/workflows/desktop-manual-build.yml` with x64 or ARM64. It builds and verifies local application assets and attaches installers to the workflow run. It does not publish a GitHub Release or an update feed. ARM64 speech bindings are built on native Windows ARM64.

Validation results are recorded in the task delivery. Windows installation/runtime acceptance still requires Windows hardware; a successful source build on macOS does not establish it.
