import { expect, test } from '@playwright/test'
import { authenticate, mockHermesApi, TEST_ACCESS_KEY } from './fixtures'

for (const agent of ['codex', 'ekko-agent', 'cursor']) {
  test(`legacy ${agent} workflow is visible but cannot run or rewrite its backend`, async ({ page }) => {
    await authenticate(page, TEST_ACCESS_KEY, 'research')
    const api = await mockHermesApi(page, {
      workflows: [{
        id: 'wf-legacy', name: 'Legacy workflow', profile: 'research', workspace: null,
        nodes: [{ id: 'agent', type: 'agent', position: { x: 80, y: 80 }, data: {
          title: 'Legacy Agent', agent, agentMode: 'global', provider: '', model: 'legacy-model', input: 'Saved instruction', skills: [], images: [], approvalRequired: false,
        } }],
        edges: [], viewport: { x: 80, y: 80, zoom: .75 }, created_at: 1, updated_at: 1,
      }], workflowRuns: [],
    })
    await page.goto('/#/hermes/workflow')
    const node = page.locator('.vue-flow__node[data-id="agent"]')
    await expect(node.locator('.n-input input').first()).toHaveValue('Legacy Agent')
    await expect(node.locator('.n-select').first().locator('.n-base-selection')).toHaveClass(/n-base-selection--disabled/)
    await page.locator('.header-actions').getByRole('button', { name: 'Save', exact: true }).click()
    await expect(page.getByText('Only AFY Studio is available in this version. Previous conversations remain available to view.', { exact: true })).toBeVisible()
    expect(api.requests.filter(request => request.method === 'PATCH' && request.pathname === '/api/studio/workflows/wf-legacy')).toHaveLength(0)
    expect(api.requests.filter(request => request.method === 'POST' && request.pathname.endsWith('/run'))).toHaveLength(0)
  })
}

test('new workflow nodes offer only AFY Studio and save that backend', async ({ page }) => {
  await authenticate(page, TEST_ACCESS_KEY, 'research')
  const api = await mockHermesApi(page, { workflows: [{ id: 'wf-hermes', name: 'AFY Studio workflow', profile: 'research', workspace: null,
    nodes: [{ id: 'agent', type: 'agent', position: { x: 80, y: 80 }, data: { title: 'AFY Studio Agent', agent: 'hermes', input: 'Run', skills: [], images: [], approvalRequired: false } }],
    edges: [], viewport: { x: 80, y: 80, zoom: .75 }, created_at: 1, updated_at: 1,
  }], workflowRuns: [] })
  await page.goto('/#/hermes/workflow')
  const node = page.locator('.vue-flow__node[data-id="agent"]')
  await node.locator('.n-select').first().click()
  await expect(page.locator('.n-base-select-option__content:visible')).toHaveText(['AFY Studio'])
  await page.keyboard.press('Escape')
  await page.locator('.header-actions').getByRole('button', { name: 'Save', exact: true }).click()
  await expect.poll(() => api.requests.filter(request => request.method === 'PATCH' && request.pathname === '/api/studio/workflows/wf-hermes').length).toBe(1)
  const request = api.requests.find(request => request.method === 'PATCH' && request.pathname === '/api/studio/workflows/wf-hermes')!
  expect(JSON.parse(request.postData || '{}').nodes[0].data).toMatchObject({ agent: 'hermes', agentMode: 'scoped' })
})
