# Studio Desktop

Windows Electron desktop distribution for Studio. The shell starts the local Web UI and uses an already-installed Hermes runtime when available.

## Build

Run `npm run dist:win` from this package. The builder accepts `--x64` or `--arm64`; Windows installers are written to `release/` with the existing `Ekko.Studio-<version>-<arch>.exe` artifact identity.

The application id, executable identity, CLI names, IPC channels, and data directories remain compatible with existing installations. Update feeds and remote server mode are disabled. Runtime downloads are disabled; install or provision the local runtime separately.

## Command shims

The packaged app can install the existing compatibility commands:

| Command | Description |
| --- | --- |
| `ekko-studio` | Open the Studio desktop app |
| `ekko-studio cli ...` | Run the local Hermes Agent CLI |
| `ekko-studio web ...` | Run the local Web UI command |
| `ekko-studio-mcp` | Run the local Web UI MCP bridge |

## Data directories

The desktop wrapper keeps Web UI state under `~/.hermes-web-ui` unless `HERMES_WEB_UI_HOME` is set. Hermes Agent data remains in its existing profile directory.

Existing Windows startup entries and executable paths are migrated for compatibility when the app is first launched.
