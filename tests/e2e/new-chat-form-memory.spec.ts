import { expect, test, type Page } from '@playwright/test'
import { authenticate, mockChatSocket, mockHermesApi, TEST_ACCESS_KEY, TEST_MODEL_GROUP } from './fixtures'

const storageKey = 'hermes_new_chat_form_v1:1'

async function openDraft(page: Page, mobile = false) {
  if (mobile) await page.getByRole('button', { name: 'Menu', exact: true }).click()
  await page.getByRole('button', { name: 'New Chat', exact: true }).click()
  await expect(page.locator('.new-chat-page')).toBeVisible()
  return page.locator('.new-chat-page')
}

for (const mobile of [false, true]) test(`legacy form preferences open and send as AFY Studio (${mobile ? 'mobile' : 'desktop'})`, async ({ page }) => {
  if (mobile) await page.setViewportSize({ width: 390, height: 844 })
  await authenticate(page, TEST_ACCESS_KEY, 'research')
  await page.addInitScript(key => localStorage.setItem(key, JSON.stringify({
    agent: 'dsh', mode: 'global', profile: 'research', provider: 'test-provider', model: 'test-model',
    categoryId: 9, workspace: '/workspace/Keep', agentPreset: 'minimal', reasoningEffort: 'high',
  })), storageKey)
  const api = await mockHermesApi(page, { sessionCategories: [{ id: 9, name: 'Work' }] })
  await mockChatSocket(page)
  await page.goto('/#/hermes/chat')
  let draft = await openDraft(page, mobile)
  await expect(draft.locator('.agent-card.active')).toHaveAttribute('data-agent', 'hermes')
  await expect(draft.getByTestId('dsh-session-preset')).toHaveCount(0)
  await expect(draft.getByRole('radio', { name: 'Global', exact: true })).toHaveCount(0)
  await expect(draft.getByRole('button', { name: 'Workspace', exact: true })).toHaveAttribute('title', '/workspace/Keep')
  await expect(draft.locator('.input-model-button')).toContainText('test-model')
  await draft.locator('textarea').focus()
  await page.keyboard.press('Escape')
  draft = await openDraft(page, mobile)
  await expect(draft.locator('.agent-card.active')).toHaveAttribute('data-agent', 'hermes')
  await draft.locator('textarea').fill('Use my remembered form')
  await draft.getByRole('button', { name: 'Send', exact: true }).click()
  await expect.poll(() => page.evaluate(() => (window as any).__PW_CHAT_SOCKET__?.emitted?.find((event: any) => event.event === 'run')?.payload)).toMatchObject({
    source: 'cli', profile: 'research', provider: 'test-provider', model: 'test-model', category_id: 9, workspace: '/workspace/Keep', reasoning_effort: 'high',
  })
  expect(api.unexpectedRequests).toEqual([])
})

test('restoring removed options falls back without losing valid form choices', async ({ page }) => {
  await authenticate(page, TEST_ACCESS_KEY, 'research')
  await page.addInitScript(key => localStorage.setItem(key, JSON.stringify({
    agent: 'dsh', mode: 'scoped', profile: 'removed-profile', provider: 'removed-provider', model: 'removed-model',
    categoryId: 999, agentPreset: 'removed-mode', workspace: '/workspace/Keep',
  })), storageKey)
  await mockHermesApi(page)
  await mockChatSocket(page)
  await page.goto('/#/hermes/chat')
  const draft = await openDraft(page)
  await expect(draft.locator('.agent-card.active')).toHaveAttribute('data-agent', 'hermes')
  await expect(draft.locator('.input-model-button')).toContainText('test-model')
  await expect(draft.getByTestId('dsh-session-preset')).toHaveCount(0)
  await expect(draft.getByRole('button', { name: 'Workspace', exact: true })).toHaveAttribute('title', '/workspace/Keep')
  await draft.getByRole('button', { name: 'Chat settings', exact: true }).click()
  const settings = page.getByRole('dialog', { name: 'Chat settings', exact: true })
  await expect(settings.locator('.new-chat-field').filter({ hasText: /^Profiles/ })).toContainText('research')
  await expect(draft.getByRole('button', { name: 'Category', exact: true })).toHaveAttribute('title', 'Category: Uncategorized')
  await settings.getByRole('button', { name: 'Close', exact: true }).click()
  await draft.locator('textarea').fill('Fallback remains usable')
  await expect(draft.getByRole('button', { name: 'Send', exact: true })).toBeEnabled()
})

for (const combination of [false, true]) test(`AFY Studio restores its last ${combination ? 'combination' : 'custom'} model`, async ({ page }) => {
  const provider = combination ? 'moa' : 'test-provider'
  const model = combination ? 'ensemble' : 'custom-model'
  await authenticate(page, TEST_ACCESS_KEY, 'research')
  await page.addInitScript(({ key, provider, model, customModel }) => localStorage.setItem(key, JSON.stringify({
    agent: 'hermes', mode: 'scoped', profile: 'research', provider, model, customModel,
  })), { key: storageKey, provider, model, customModel: !combination })
  await mockHermesApi(page, { modelGroups: [TEST_MODEL_GROUP, { provider: 'moa', label: 'MoA', models: ['ensemble'] }] })
  await mockChatSocket(page)
  await page.goto('/#/hermes/chat')
  const draft = await openDraft(page)
  await expect(draft.locator('.agent-card.active')).toHaveAttribute('data-agent', 'hermes')
  await expect(draft.locator('.input-model-button')).toContainText(model)
  await draft.getByRole('button', { name: 'Chat settings', exact: true }).click()
  const settings = page.getByRole('dialog', { name: 'Chat settings', exact: true })
  await expect(draft.getByRole('button', { name: 'Category', exact: true })).toBeVisible()
  await expect(settings.locator('.new-chat-field').filter({ hasText: /^Protocol/ })).toHaveCount(0)
  await settings.getByRole('button', { name: 'Close', exact: true }).click()
  await draft.locator('textarea').fill('Use my last AFY Studio model')
  await draft.getByRole('button', { name: 'Send', exact: true }).click()
  await expect.poll(() => page.evaluate(() => (window as any).__PW_CHAT_SOCKET__?.emitted?.find((event: any) => event.event === 'run')?.payload)).toMatchObject({ provider, model })
})

for (const mobile of [false, true]) test(`no models has an actionable empty state (${mobile ? 'mobile' : 'desktop'})`, async ({ page }) => {
  if (mobile) await page.setViewportSize({ width: 320, height: 568 })
  await authenticate(page, TEST_ACCESS_KEY, 'research')
  await mockHermesApi(page, { modelGroups: [] })
  await mockChatSocket(page)
  await page.goto('/#/hermes/chat')
  await page.getByRole('dialog').filter({ hasText: 'No model provider configured' }).getByRole('button', { name: 'Not now', exact: true }).click()
  const draft = await openDraft(page, mobile)
  await expect(draft.locator('.input-model-button')).toHaveText('No models')
  await expect(draft.locator('.new-chat-config-hint')).toHaveText('No models · Go to settings')
  await draft.locator('textarea').fill('Waiting for a configured model')
  await expect(draft.getByRole('button', { name: 'Send', exact: true })).toBeDisabled()
  await draft.locator('.input-model-button').click()
  const models = page.locator('.model-cascader:visible')
  await expect(models.locator('.model-cascader-empty')).toContainText('No models')
  await expect(models.locator('.model-cascader-custom')).toHaveCount(0)
  const bounds = await models.boundingBox()
  expect(bounds!.x).toBeGreaterThanOrEqual(0)
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(mobile ? 320 : 1280)
  await page.screenshot({ path: `/tmp/studio-no-models-${mobile ? 'mobile' : 'desktop'}.png`, animations: 'disabled' })
  await models.getByRole('button', { name: 'Go to settings', exact: true }).click()
  await expect(page).toHaveURL(/\/hermes\/models\?modelProfile=research$/)
})
