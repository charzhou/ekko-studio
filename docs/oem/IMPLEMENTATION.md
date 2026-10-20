# Studio OEM implementation

The `oem` branch changes the visible product to **Studio** and ships the Windows desktop installer plus the local web application.

## Product behavior

- Application names, browser metadata, all twelve locales, notifications, default assistant identity and model-facing product descriptions use Studio.
- An editable neutral Studio mark lives in `packages/client/public/afy-mark.svg`. `node scripts/generate-afy-icons.mjs` generates the web logo, assistant avatar, Windows installer/application/tray icons and favicon. Hermes avatars use the App icon throughout chat, group chat, notifications, settings previews and Agent management. The legacy Hermes image URL serves the same App icon for stored avatar references. Legacy promotional screenshots and GIFs are removed.
- Hermes is the only Agent execution backend exposed by the OEM product. Chat, Profile selection, approvals, tool calls and streamed turns continue to use the existing Hermes Bridge and local Hermes installation. Ekko Agent and Coding Agent entries are disabled at the product registration and routing boundaries; their source packages and compatibility identifiers remain in the repository so the surrounding architecture does not need to be rewritten.
- Application update checks, downloads, package-manager self-updates and runtime/model download flows are unavailable. The Windows x64 installer carries a pinned local Hermes runtime, prepares it offline on first launch, and continues to use the existing Hermes profiles.
- Official announcements, original website/repository links, mobile/App services and cloud relays, remote device/hardware features, partner marketing and partner provider presets are excluded.
- APIKEY partner-specific media helpers and the old product installation skill are removed from the distributed skills.
- Firmware, NAS/TOS, Docker distribution, macOS/Linux desktop release jobs and update/publication jobs are removed. Windows CI uploads self-contained x64 installers and offline runtime bundles as run artifacts.
- User files and generated artifacts can still be uploaded and downloaded locally. Configured model providers, third-party OAuth, browser tools, local chat, group chat and workflows remain supported; these Studio features orchestrate Hermes runs and do not add another Agent backend. This edition is not an offline network sandbox.

## Hermes-only execution boundary

The OEM edition keeps the existing Studio architecture and narrows only the
execution choice:

```text
Studio Chat / Group Chat / Workflow
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

Run `.github/workflows/desktop-manual-build.yml` for Windows x64. It prepares the runtime first, then downloads that same run artifact into the installer job and packages it with the application. It verifies local application assets and runtime resources, and attaches the installer to the workflow run. It does not publish a GitHub Release or an update feed. ARM64 installer distribution is paused until the same complete runtime is available for ARM64.

Validation results are recorded in the task delivery. Windows installation/runtime acceptance still requires Windows hardware; a successful source build on macOS does not establish it.


### Offline Windows runtime artifacts

The Windows workflow prepares an x64 runtime artifact in the `runtime` job.
The `desktop` job depends on it, downloads it to `packages/desktop/resources/runtime`,
verifies its platform/source/checksum and stages matching release metadata before
packaging. The archive, manifest and checksum are copied into `resources/runtime`
inside the installation directory. ARM64 distribution is paused because several
core Python dependencies lack Windows ARM64 wheels.

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

The artifact named `studio-runtime-windows-x64` contains:

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
upload steps. A runtime build failure prevents creation of an installer that
would be missing its runtime.


### First launch with the embedded runtime

Before starting the local server, packaged Windows builds verify the bundled
archive and prepare a per-user writable runtime under:

```text
%USERPROFILE%\.hermes-web-ui\desktop-runtime\hermes\<version>-<archive-sha-prefix>\win-x64
```

`HERMES_WEB_UI_HOME` and the existing runtime storage override still apply.
The version and archive identity distinguish new distributions without replacing
an existing runtime in place. Extraction uses a temporary sibling directory;
the desktop checks the extracted source identity and required files, repairs
Python/launcher paths, imports the real chat entry point with lazy installs
disabled and an isolated temporary Hermes home, repairs paths to the final
location, then atomically renames the directory and records the active selection.
A receipt and an isolated Python import check let later starts reuse the
validated environment; a damaged dependency causes preparation of a fresh copy. Failed preparation
removes the temporary directory and displays the existing desktop retry screen.
It never starts a half-prepared server or downloads a replacement runtime.

Packaged builds prefer the active managed runtime over an unrelated installed
Hermes CLI. Development retains its user-CLI priority. An explicit
`HERMES_DESKTOP_RUNTIME_DIR` continues to select a preinstalled local environment
and skips bundled extraction. Model configuration, credentials, profiles and
Studio chat history remain in their existing separate data directories; they are
not copied into or overwritten by the bundled runtime.

The packaging check also runs the same first-launch preparation code against the
actual packaged archive on Windows, verifies reuse on the second call and checks
Python imports again from the final renamed location. It uses temporary storage
with spaces and non-ASCII characters. Clean-machine GUI startup and model calls
remain a separate Windows acceptance step.
