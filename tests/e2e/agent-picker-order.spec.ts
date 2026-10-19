import { expect, test } from '@playwright/test'
import { authenticate, mockChatSocket, mockHermesApi, TEST_ACCESS_KEY } from './fixtures'

for (const mobile of [false, true]) {
  test(`only AFY Studio is selectable even when other Agents are installed (${mobile ? 'mobile' : 'desktop'})`, async ({ page }) => {
    if (mobile) await page.setViewportSize({ width: 390, height: 844 })
    await authenticate(page, TEST_ACCESS_KEY, 'research')
    await page.addInitScript(() => localStorage.setItem('hermes_new_chat_agent_v1', 'codex'))
    await mockHermesApi(page)
    await mockChatSocket(page)
    await page.route('**/api/agents/availability', route => route.fulfill({ json: {
      revision: 1, updatedAt: new Date().toISOString(), agents: ['hermes', 'ekko-agent', 'codex', 'qwen'].map(id => ({ id, installed: true, source: 'user-cli' })),
    } }))
    await page.goto('/#/hermes/chat')
    if (mobile) await page.getByRole('button', { name: 'Menu', exact: true }).click()
    await page.getByRole('button', { name: 'New Chat', exact: true }).click()
    const draft = page.locator('.new-chat-page')
    await expect(draft.locator('.agent-card-name')).toHaveText(['AFY Studio'])
    await expect(draft.locator('.agent-card.active')).toHaveAttribute('data-agent', 'hermes')
    await expect(draft.getByRole('radiogroup', { name: 'Launch mode', exact: true })).toHaveCount(0)
    await draft.locator('textarea').fill('Hello AFY Studio')
    await draft.getByRole('button', { name: 'Send', exact: true }).click()
    await expect.poll(() => page.evaluate(() => (window as any).__PW_CHAT_SOCKET__?.emitted?.find((event: any) => event.event === 'run')?.payload)).toMatchObject({ source: 'cli', input: 'Hello AFY Studio' })
    const payload = await page.evaluate(() => (window as any).__PW_CHAT_SOCKET__.emitted.find((event: any) => event.event === 'run').payload)
    expect(payload).not.toHaveProperty('coding_agent_id')
    expect(payload).not.toHaveProperty('agent_id')
  })
}

test('unknown cached Agent opens a AFY Studio draft', async ({ page }) => {
  await authenticate(page, TEST_ACCESS_KEY, 'research')
  await page.addInitScript(() => localStorage.setItem('hermes_new_chat_agent_v1', 'removed-agent'))
  await mockHermesApi(page)
  await mockChatSocket(page)
  await page.goto('/#/hermes/chat')
  await page.getByRole('button', { name: 'New Chat', exact: true }).click()
  await expect(page.locator('.agent-card.active')).toHaveAttribute('data-agent', 'hermes')
})
