# Windows ARM64 packaging

Build the Windows ARM64 installer on a native `windows-11-arm` runner. Select `target_os=win32` and `target_arch=arm64` in the manual desktop workflow, or run `npm run dist:win -- --arm64` from `packages/desktop`.

The expected artifact is `Ekko.Studio-<version>-arm64.exe` and its blockmap. Windows x64 uses the corresponding `x64` artifact. The builder rejects macOS and Linux targets.

AFY Studio does not download desktop updates, runtime archives, or proxy assets. The packaged app uses local Hermes runtime files when they are already installed.

Native speech dependencies must be staged by the Windows ARM64 build before packaging. Validate the resulting installer on Windows 11 ARM64 with the local Web UI, browser, screenshots, and CLI compatibility flows.
