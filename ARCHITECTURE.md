# Architecture

AFY Studio is a TypeScript monorepo that ships a local-first AI workspace
through a web console, a Koa backend, and an Electron desktop app. It integrates
Hermes Agent for chat, coding, and workflows. The OEM product keeps the original
module boundaries and Studio orchestration surfaces, while Hermes is the only
Agent execution backend exposed to users.

## Package Boundaries

| Area | Path | Responsibility |
| --- | --- | --- |
| Client | `packages/client/src` | Vue UI, routing, Pinia stores, API wrappers, i18n, browser-visible state. |
| Server | `packages/server/src` | HTTP API, auth, Socket.IO, SQLite stores, file access, Hermes runtime integration. |
| Hermes integration | `packages/server/src/modules/hermes` and bridge runtime | Hermes Profiles, local Agent bridge, model providers, tools, approvals, streaming and execution lifecycle. |
| Compatibility runtimes | `packages/ekko-agent`, `packages/server/src/modules/ekko`, `packages/server/src/modules/coding-agents` | Retained source boundaries and contracts; their Agent product entries are disabled in the OEM registry and routing policy. |
| Desktop | `packages/desktop` | Electron shell, local Web UI server bootstrap, updater, bundled Python/Hermes runtime. |
| Tests | `tests` | Vitest unit/integration tests and Playwright browser tests. |
| CI | `.github/workflows` | Build, e2e, lockfile, Docker, and desktop release automation. |

## Request Flow

1. The browser loads the Vite-built client from the Koa server.
2. Client modules call API helpers from `packages/client/src/api`.
3. Server routes in `packages/server/src/modules/*/routes` wire HTTP paths to controllers.
4. Controllers validate request concerns and delegate reusable behavior to services.
5. Services own side effects: files, SQLite, Hermes profiles, subprocesses, bridges, and credentials.
6. Long-running chat and group-chat flows use Socket.IO namespaces managed by server services.

Keep each layer narrow. Routes should not grow business logic, and client code
should not duplicate server persistence rules.

## State And Data Ownership

- Web UI state defaults to `~/.hermes-web-ui` through `config.appHome`.
- `HERMES_WEB_UI_HOME` and `HERMES_WEBUI_STATE_DIR` override Web UI state location.
- Hermes Agent state lives under Hermes profile directories and must stay distinct from Web UI state.
- Uploads default to `config.uploadDir`, which is derived from the Web UI home unless `UPLOAD_DIR` is set.
- Runtime data directories must also live under the Web UI home, not beside built `dist` assets.
- Profile-scoped Hermes data should use existing profile helpers instead of manually joining paths.

## Server Structure

Server code is separated by business ownership under `modules/studio`,
`modules/hermes`, `modules/ekko`, and `modules/coding-agents`; concrete module
composition belongs in `bootstrap`. The OEM policy selects only
`modules/hermes` for Agent execution. The other module boundaries remain in
place for compatibility and shared contracts, but their Agent registrations and
user-facing routes are disabled by policy.
See `docs/harness/server-module-boundaries.md` for the complete target tree,
ownership decisions, allowed dependency matrix, and migration rules.

- Module `routes/` register HTTP entry points; `sockets/` own Socket.IO transports.
- Module `controllers/` handle request-level behavior.
- Module `services/` own reusable IO, domain behavior, processes, and integrations.
- Studio `repositories/` and `infrastructure/` own application persistence.
- Studio `middleware/legacy-app-api.ts` is the only released App and MCU firmware URL compatibility map.

Architecture rules:

- Register local API routes before proxy catch-all routes.
- Keep auth behavior under `packages/server/src/modules/studio/services/auth`.
- Prefer `execFile` or `spawn` with argument arrays over shell command strings.
- Use structured file and YAML/JSON parsers when editing structured data.

## Client Structure

- `views/` contains route-level screens.
- `components/` contains reusable UI.
- `stores/` contains Pinia state.
- `api/` contains HTTP clients and should use `packages/client/src/api/client.ts`.
- `i18n/` contains locale messages for user-facing strings.
- `styles/` contains global styling and theme primitives.

Frontend rules:

- Use Vue 3 Composition API with `<script setup lang="ts">`.
- Use existing Naive UI patterns before adding new UI conventions.
- Add visible text to all locale files.
- Keep component styles scoped unless the style is intentionally global.

## OEM desktop distribution

The Windows desktop shell runs the local Koa server and built client. It uses
an existing local Hermes installation; Hermes is the only Agent backend exposed
by the OEM product. The Studio client, Socket.IO services, SQLite persistence,
Hermes Profiles, workflows and group-chat orchestration remain the same
architectural layers. Ekko and Coding Agent packages remain source-compatible
but are not selectable product runtimes.
Managed runtime/model downloads, automatic updates, remote/cloud/mobile services,
partner integrations and hardware features are excluded by fixed OEM policy.

The manual desktop workflow uses native Windows x64 or ARM64 runners, verifies
production dependencies and uploads installer artifacts. There are no update feeds,
release publication jobs, Docker/NAS packages or macOS/Linux installer targets.

Existing package IDs, CLI names, application data and API/MCP/IPC formats are kept
for compatibility. See [OEM implementation](docs/oem/IMPLEMENTATION.md).

Release artifact lists use `fail_on_unmatched_files: true` where publishing is enabled in upstream workflows.

## Validation Surface

The minimum mechanical harness is:

- `npm run harness:check` for repository docs, workflow, and package-script invariants.
- `npm run test` or focused Vitest tests for local logic.
- `npm run test:e2e` for browser-visible routing/auth/chat regressions.
- `npm run build` for type checking and production bundles.

See `docs/harness/validation.md` for change-specific commands.
