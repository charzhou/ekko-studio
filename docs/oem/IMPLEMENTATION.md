# AFY Studio OEM implementation

The `oem` branch changes the visible product to **AFY Studio** and ships the Windows desktop installer plus the local web application.

## Product behavior

- Application names, browser metadata, all twelve locales, notifications, default assistant identity and model-facing product descriptions use AFY Studio.
- A new editable AFY mark lives in `packages/client/public/afy-mark.svg`. `node scripts/generate-afy-icons.mjs` generates the web logo, assistant avatar, Windows installer/application/tray icons and favicon. Hermes avatars use the App icon throughout chat, group chat, notifications, settings previews and Agent management. The legacy Hermes image URL serves the same App icon for stored avatar references. Legacy promotional screenshots and GIFs are removed.
- Hermes is the only Agent execution backend exposed by the OEM product. Chat, Profile selection, approvals, tool calls and streamed turns continue to use the existing Hermes Bridge and local Hermes installation. Ekko Agent and Coding Agent entries are disabled at the product registration and routing boundaries; their source packages and compatibility identifiers remain in the repository so the surrounding architecture does not need to be rewritten.
- Application update checks, downloads, package-manager self-updates and runtime/model download flows are unavailable. The OEM build uses an already-installed local Hermes CLI/runtime and its existing Hermes profiles.
- Official announcements, original website/repository links, mobile/App services and cloud relays, remote device/hardware features, partner marketing and partner provider presets are excluded.
- APIKEY partner-specific media helpers and the old product installation skill are removed from the distributed skills.
- Firmware, NAS/TOS, Docker distribution, macOS/Linux desktop release jobs and update/publication jobs are removed. Windows CI uploads installers and separate offline runtime bundles as run artifacts.
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


### Offline Windows runtime artifacts

The same Windows workflow prepares a separate x64 runtime artifact in a parallel
`runtime` job. ARM64 runtime preparation is skipped while several core Python
dependencies lack Windows ARM64 wheels; the existing ARM64 installer job remains
available. It does not yet embed the runtime into the installer or change
first-launch behavior. The desktop installer still needs an available local
runtime until the packaging/bootstrap integration is added.

The build pins Hermes Agent `0.22.0`, release ref `v0.22.0`, and peeled source
commit `e06df9c2eae6901f4c88f464e0ae6e753c0428b8` from NousResearch/hermes-agent,
matching the release used by the local integration. It includes portable Python
`3.14.7` from python-build-standalone `20260901`, Node `22.22.0`, and MinGit
`2.56.0.2`, all matching the selected Windows architecture. This Hermes release
requires Python 3.14 for its locked dependency set; the legacy Python 3.12 builder
default must not be used. Version/ref/commit overrides must remain atomic.

Dependencies are exported from the source `uv.lock` with `--locked` and installed
with hash verification. The configured extras are `all,anthropic`: core desktop
tools and Anthropic support. Optional messaging adapters, browser binaries,
Hermes TUI/dashboard builds and other optional provider/tool packages are not
bundled. Tools with omitted optional packages may still need online setup.
The install stamp declares external runtime management so Hermes does not
bootstrap its self-managed package environment on first use. Only build-time
dependency retrieval is enabled; application download/update
services remain disabled. No user profiles, credentials or chat history are
copied from the developer machine.

The artifact named `afy-studio-runtime-windows-x64` contains:

- `hermes-runtime-hermes-agent-0.22.0-win-<arch>.tar.gz`
- the archive's `.sha256` checksum
- `hermes-runtime-win-<arch>.json` with platform, source SHA, size and checksum

Before upload, packaging moves the prepared environment to a temporary directory,
rebases Windows Python configuration, imports the real chat execution entry with
lazy package installation disabled in an isolated home, checks the version, and
verifies the clean Git checkout and required Python/Node/Git executables. This is
a build-time portability check, not clean-machine Windows installation acceptance.

To build locally on Windows with the same environment variables as the workflow:

```powershell
npm ci --prefix packages/desktop --ignore-scripts
npm --prefix packages/desktop run prepare:runtime
npm --prefix packages/desktop run package:runtime
```

`uv`, Git, curl and tar must be on the build machine's PATH. The selected target
architecture must match the runner. Runtime bundles and installers have separate
upload steps, so one job's failure does not suppress the other job's artifacts.
