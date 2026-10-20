# Studio

A local AI workspace for chat, coding, and visual workflows, available as a Windows desktop application and a web interface.

## Development

Requires Node.js 24 or later.

```sh
npm ci --ignore-scripts
npm rebuild node-pty
npm run dev
```

Open `http://localhost:8649`. The local API listens on port 8647 in development.

```sh
npm run harness:check
npm test
npm run test:e2e
npm run build
```

## Windows installer

Run **Studio Windows Build** in GitHub Actions and select x64. Installers are available as workflow artifacts. The workflow does not publish releases or update feeds.

The built-in local agent works without downloading a separate agent runtime. Hermes and coding integrations use installations already available on the server machine. Application updates, managed runtime/model downloads, cloud/mobile relays, hardware features and partner service integrations are excluded from this edition.

Existing package IDs, command names, API formats and data paths remain for compatibility. See [OEM implementation notes](docs/oem/IMPLEMENTATION.md). Source licensing and third-party notices remain in their original files.
