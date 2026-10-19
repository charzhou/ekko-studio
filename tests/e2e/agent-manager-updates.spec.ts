import { expect, test } from '@playwright/test'
import { authenticate, mockHermesApi } from './fixtures'

for (const width of [1280, 390]) test(`AFY Studio is the only Agent card and its local CLI details fit at ${width}px`, async ({ page }, testInfo) => {
  await authenticate(page)
  const api = await mockHermesApi(page)
  await page.route('**/api/agents/status', route => route.fulfill({ json: {
    revision: 1, updatedAt: '2026-10-01T00:00:00.000Z',
    agents: ['hermes', 'codex', 'cursor', 'ekko-agent'].map(id => ({ id, installed: true, source: 'user-cli', version: '0.21.0', path: `/local/${id}` })),
  } }))
  const directory = '/Users/studio/.hermes'
  await page.route(url => url.pathname === '/api/hermes/runtime-versions', route => route.fulfill({ json: {
    active: null, platform: 'darwin-arm64', activeVersionPath: '', remoteManifestUrl: '', remoteError: '',
    hermes: {
      source: 'user-cli', activeVersion: '0.21.0', agentVersion: '0.21.0', activeDirectory: directory,
      pythonPath: '/local/bin/python', agentRoot: '/local/hermes-agent', dataDirectory: directory,
      storageDirectory: directory, defaultStorageDirectory: directory, pendingStorageDirectory: '',
      migrationError: '', activationError: '', cliInstallations: [], installed: [], remoteVersions: [],
    },
    webui: { currentVersion: '0.7.0', activeVersion: '0.7.0', activeDirectory: '', installed: [], remoteVersions: [] },
  } }))
  await page.setViewportSize({ width, height: 900 })
  await page.goto('/#/studio/agents')
  const manager = page.locator('.agent-manager-panel')
  await expect(manager.locator('.agent-card')).toHaveCount(1)
  const card = page.getByTestId('agent-card-hermes')
  await expect(card.locator('img')).toHaveAttribute('src', '/logo.png')
  await expect(card).toContainText('0.21.0')
  await expect(card).toContainText('CLI')
  await expect(manager.getByRole('button', { name: /Install|Update|Manage Runtime/i })).toHaveCount(0)
  await card.getByTestId('view-hermes-cli-details').click()
  const details = page.getByTestId('hermes-cli-details')
  await expect(details).toContainText('/local/bin/python')
  await expect(details).toContainText('/local/hermes-agent')
  await expect(details).toContainText(directory)
  const drawer = page.locator('.n-drawer:visible')
  await expect.poll(() => drawer.locator('.n-drawer-body-content-wrapper').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
  await drawer.screenshot({ path: testInfo.outputPath(`hermes-details-${width}.png`), animations: 'disabled' })
  expect(api.requests.filter(request => request.pathname.startsWith('/api/coding-agents'))).toHaveLength(0)
})

test('missing AFY Studio reports status without offering runtime downloads', async ({ page }) => {
  await authenticate(page)
  await mockHermesApi(page)
  await page.route('**/api/agents/status', route => route.fulfill({ json: {
    revision: 1, updatedAt: '2026-10-01T00:00:00.000Z', agents: [{ id: 'hermes', installed: false, source: 'not-installed' }],
  } }))
  await page.goto('/#/studio/agents')
  const card = page.getByTestId('agent-card-hermes')
  await expect(card).toContainText('Not installed')
  await expect(card.getByRole('button')).toHaveCount(0)
})
