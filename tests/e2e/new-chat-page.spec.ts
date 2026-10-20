import { expect, test } from '@playwright/test'
import { authenticate, mockChatSocket, mockHermesApi, TEST_ACCESS_KEY, TEST_MODEL_GROUP } from './fixtures'
import catalog from '../../config/agents.json'
import { expectNewChatEffectsMoving, selectNewChatAgent } from './new-chat-helpers'

for (const reducedMotion of ['no-preference', 'reduce'] as const) test(`Agent card interiors keep moving with ${reducedMotion} system motion preference`, async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.emulateMedia({ reducedMotion })
  await authenticate(page, TEST_ACCESS_KEY, 'research')
  await mockHermesApi(page)
  await mockChatSocket(page)
  await page.route('**/api/agents/availability', route => route.fulfill({ json: {
    revision: 1, updatedAt: new Date().toISOString(), agents: catalog.agents.map(agent => ({ id: agent.id, installed: true, source: 'user-cli' })),
  } }))
  await page.goto('/#/hermes/chat')
  await page.getByRole('button', { name: 'New Chat', exact: true }).click()
  const active = page.locator('.agent-card.active')
  await expect(active).toHaveAttribute('data-agent', 'hermes')
  await expect(page.locator('.page-loading-overlay:visible')).toHaveCount(0)

  const layers = active.locator('.agent-card-foil, .agent-card-foil-beam, .agent-card-sweep')
  const expectInteriorMoving = async () => {
    await expect(layers).toHaveCount(4)
    await expect.poll(() => layers.first().evaluate(el => el.style.transform)).not.toBe('')
    const before = await layers.evaluateAll(elements => elements.map(el => getComputedStyle(el).transform))
    await expect.poll(() => layers.evaluateAll((elements, before) => elements.every((el, index) =>
      getComputedStyle(el).transform !== before[index]), before)).toBe(true)
  }
  await expectInteriorMoving()
  // Windows can update this media query while Studio is already running.
  await page.emulateMedia({ reducedMotion: reducedMotion === 'reduce' ? 'no-preference' : 'reduce' })
  await expectInteriorMoving()
})

for (const mobile of [false, true]) test(`new chat uses cards and the existing composer (${mobile ? 'mobile' : 'desktop'})`, async ({ page }) => {
  await page.setViewportSize(mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 })
  await authenticate(page, TEST_ACCESS_KEY, 'research')
  const api = await mockHermesApi(page)
  await mockChatSocket(page)
  await page.route('**/api/agents/availability', route => route.fulfill({ json: {
    revision: 1, updatedAt: new Date().toISOString(), agents: catalog.agents.map(agent => ({ id: agent.id, installed: true, source: 'user-cli' })),
  } }))
  await page.goto('/#/hermes/chat')
  if (mobile) await page.getByRole('button', { name: 'Menu', exact: true }).click()
  await page.getByRole('button', { name: 'New Chat', exact: true }).click()
  const draft = page.locator('.new-chat-page')
  await expect(draft).toBeVisible()
  await expect(draft.getByRole('button', { name: 'Cancel', exact: true })).toHaveCount(0)
  const actions = await draft.locator('.new-chat-config-actions').boundingBox()
  const composer = await draft.locator('.input-wrapper').boundingBox()
  expect(Math.abs(actions!.x - composer!.x)).toBeLessThanOrEqual(1)
  await expect(draft.locator('.new-chat-config-actions')).toHaveCSS('justify-content', 'flex-start')
  await expect(draft.locator('.new-chat-config-bar img, .new-chat-selected-agent')).toHaveCount(0)
  await expect(draft.locator('.reasoning-effort-button')).toBeVisible()
  await expect(page.locator('.n-drawer:visible')).toHaveCount(0)
  await expect(draft.locator('.agent-card.active')).toHaveAttribute('data-agent', 'hermes')
  await expectNewChatEffectsMoving(page)
  await expect(draft.locator('.agent-card:not(.active) .agent-card-ember')).toHaveCount(0)
  await expect(draft.locator('.input-wrapper')).toBeVisible()
  await expect(draft.getByRole('button', { name: 'Send', exact: true })).toBeDisabled()
  await expect(page.locator('.message-list')).toHaveCount(0)
  await draft.getByRole('button', { name: 'Chat settings', exact: true }).click()
  const settings = page.getByRole('dialog', { name: 'Chat settings', exact: true })
  await expect(settings).toContainText('research')
  await expect(settings).toHaveAttribute('aria-modal', 'true')
  await settings.getByRole('button', { name: 'Close', exact: true }).click()
  await expect(settings).toBeHidden()
  await draft.locator('.input-model-button').click()
  const models = page.locator('.model-cascader:visible')
  await expect(models.locator('.model-cascader-columns')).toContainText('Test Provider')
  await models.locator('.model-cascader-search input').focus()
  await page.keyboard.press('Escape')
  await expect(models).toBeHidden()
  await expect(draft).toBeVisible()
  await draft.getByRole('button', { name: 'Workspace', exact: true }).click()
  const workspace = page.getByRole('dialog').filter({ hasText: 'Set Session Workspace' })
  await expect(workspace.locator('.folder-picker')).toBeVisible()
  await workspace.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(workspace).toBeHidden()
  await page.screenshot({ path: `/tmp/studio-new-chat-${mobile ? 'mobile' : 'desktop'}.png`, animations: 'allow' })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await draft.locator('textarea').fill('Start a fresh conversation')
  await draft.getByRole('button', { name: 'Send', exact: true }).click()
  await expect(draft).toBeHidden()
  await expect(page.locator('.agent-card-ember')).toHaveCount(0)
  await expect(page).toHaveURL(/#\/hermes\/session\//)
  const sessionId = new URL(page.url()).hash.split('/').pop()!
  await expect.poll(() => page.evaluate(() => (window as any).__PW_CHAT_SOCKET__?.emitted?.find((item: any) => item.event === 'run')?.payload)).toMatchObject({
    session_id: sessionId, source: 'cli', input: 'Start a fresh conversation',
  })
  await expect(page.locator('.input-wrapper')).toBeVisible()
  await expect(page.locator('textarea')).toHaveValue('')
  expect(await page.evaluate(id => (window as any).__PW_CHAT_SOCKET__.emitted.filter((item: any) => item.event === 'resume' && item.payload.session_id === id), sessionId)).toEqual([])
  expect(api.unexpectedRequests).toEqual([])
})

test('exiting or selecting a session restores the current conversation without creating an empty chat', async ({ page }) => {
  const session = { id: 'existing-chat', title: 'Existing conversation', source: 'cli', profile: 'research', model: 'test-model', provider: 'test-provider', started_at: 100, last_active: 101, message_count: 1 }
  await authenticate(page, TEST_ACCESS_KEY, 'research')
  await page.addInitScript(id => {
    (window as any).__PW_CHAT_SOCKET_RESUMES__ = { [id]: { session_id: id, messages: [{ id: 'answer', role: 'assistant', content: 'Previous answer', timestamp: 101 }], isWorking: true, messageLoadedCount: 1, messageTotal: 1 } }
  }, session.id)
  await mockHermesApi(page, { sessions: [session] })
  await mockChatSocket(page)
  await page.goto(`/#/hermes/session/${session.id}`)
  await expect(page.locator('.page-loading-overlay:visible')).toHaveCount(0)
  await expect(page.getByText('Previous answer', { exact: true })).toBeVisible()
  await page.locator('textarea').fill('Keep my previous draft')
  await page.getByRole('button', { name: 'New Chat', exact: true }).click()
  const draft = page.locator('.new-chat-page')
  await expect(draft.locator('textarea')).toHaveValue('')
  await expect(draft.getByRole('button', { name: 'Send', exact: true })).toBeDisabled()
  await expect(draft.getByRole('button', { name: 'Stop', exact: true })).toHaveCount(0)
  await draft.locator('textarea').fill('Do not create this conversation')
  await draft.locator('textarea').focus()
  await page.keyboard.press('Escape')
  await expect(page.locator('textarea')).toHaveValue('Keep my previous draft')
  await expect(page.getByText('Previous answer', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'New Chat', exact: true }).click()
  await page.locator('.session-item').filter({ hasText: 'Existing conversation' }).first().click()
  await expect(draft).toBeHidden()
  await expect(page.locator('textarea')).toHaveValue('Keep my previous draft')
  await expect(page).toHaveURL(new RegExp(`/hermes/session/${session.id}$`))
  expect(await page.evaluate(() => (window as any).__PW_CHAT_SOCKET__.emitted.filter((item: any) => item.event === 'run'))).toEqual([])
})

for (const brightness of ['light', 'dark'] as const) test(`Agent card edges fade transparently over a custom background (${brightness})`, async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await authenticate(page, TEST_ACCESS_KEY, 'research')
  await page.addInitScript(mode => localStorage.setItem('hermes_brightness', mode), brightness)
  await mockHermesApi(page, { theme: { background: { name: 'cards-background.svg', mime: 'image/svg+xml', updatedAt: 101 } } })
  await mockChatSocket(page)
  await page.route('**/api/theme/background*', route => route.fulfill({
    contentType: 'image/svg+xml',
    body: '<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="1000"><defs><linearGradient id="bg"><stop stop-color="#305181"/><stop offset=".5" stop-color="#b06c85"/><stop offset="1" stop-color="#d9aa70"/></linearGradient></defs><path fill="url(#bg)" d="M0 0h1440v1000H0z"/><path fill="none" stroke="#fff" stroke-opacity=".3" stroke-width="50" d="M0 900 1000 0M400 1000 1400 0"/></svg>',
  }))
  await page.goto('/#/hermes/chat')
  await page.getByRole('button', { name: 'New Chat', exact: true }).click()
  await expect(page.locator('html')).toHaveClass(/theme-has-custom-background/)
  const viewport = page.locator('.agent-card-viewport')
  await expect(viewport).toHaveCSS('mask-image', /linear-gradient\(90deg, rgba\(0, 0, 0, 0\), rgb\(0, 0, 0\) 70px/)
  await expect(viewport).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
  await expect(page.locator('.agent-card-side-fade')).toHaveCount(0)
  await expect(page.locator('.agent-card.active')).toHaveAttribute('data-agent', 'hermes')
  await page.screenshot({ path: `/tmp/studio-agent-cards-background-${brightness}.png`, animations: 'allow' })
})

for (const { width, height, agent } of [
  { width: 1280, height: 720, agent: 'Studio' },
  { width: 1366, height: 768, agent: 'Studio' },
  { width: 1440, height: 900, agent: 'Studio' },
  { width: 1024, height: 600, agent: 'Studio' },
  { width: 1000, height: 560, agent: 'Studio' },
  { width: 1920, height: 1080, agent: 'Studio' },
]) test(`new chat fits one screen at ${width}x${height} with ${agent}`, async ({ page }) => {
  await page.setViewportSize({ width, height })
  await authenticate(page, TEST_ACCESS_KEY, 'research')
  await mockHermesApi(page)
  await mockChatSocket(page)
  await page.route('**/api/agents/availability', route => route.fulfill({ json: {
    revision: 1, updatedAt: new Date().toISOString(), agents: catalog.agents.map(item => ({ id: item.id, installed: true, source: 'user-cli' })),
  } }))
  await page.goto('/#/hermes/chat')
  await page.getByRole('button', { name: 'New Chat', exact: true }).click()
  await selectNewChatAgent(page, agent)
  const draft = page.locator('.new-chat-page')
  await expect(draft.locator('.new-chat-intro > svg')).toHaveCount(0)
  await expect(draft.locator('.agent-card-hint, .new-chat-send-hint')).toHaveCount(0)
  await expect.poll(() => draft.evaluate(el => el.scrollHeight - el.clientHeight)).toBeLessThanOrEqual(1)
  const [surface, card, send] = await Promise.all([
    draft.boundingBox(), draft.locator('.agent-card.active').boundingBox(), draft.getByRole('button', { name: 'Send', exact: true }).boundingBox(),
  ])
  expect(card!.width).toBeLessThanOrEqual(177)
  expect(send!.y + send!.height).toBeLessThanOrEqual(surface!.y + surface!.height)
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(true)
  if (width === 1280) await page.screenshot({ path: '/tmp/studio-new-chat-compact-desktop.png', animations: 'allow' })
})

test('new chat shares the session model picker and automatically sends the Provider protocol and asks only when missing', async ({ page }, testInfo) => {
  await authenticate(page, TEST_ACCESS_KEY, 'research')
  const api = await mockHermesApi(page, { modelGroups: [TEST_MODEL_GROUP, {
    ...TEST_MODEL_GROUP, provider: 'other-provider', label: 'Other Provider', models: ['other-model', 'disabled-model'],
    api_mode: 'anthropic_messages', model_meta: { 'disabled-model': { disabled: true } },
  }, { provider: 'moa', label: 'MoA', models: ['ensemble'] }] })
  await mockChatSocket(page)
  await page.goto('/#/hermes/chat')
  await page.getByRole('button', { name: 'New Chat', exact: true }).click()
  const draft = page.locator('.new-chat-page')
  await draft.locator('textarea').fill('Use the model I selected')
  await draft.locator('.input-model-button').click()
  const models = page.locator('.model-cascader:visible')
  await expect(models.locator('.model-cascader-provider').filter({ hasText: 'MoA combinations' })).toHaveCount(1)
  await models.locator('.model-cascader-search input').fill('other')
  await expect(models.locator('.model-cascader-provider > span:first-child')).toHaveText('Other Provider')
  await models.locator('.model-cascader-search input').fill('disabled')
  const disabled = models.locator('.model-cascader-item').filter({ hasText: 'disabled-model' })
  await expect(disabled).toHaveAttribute('aria-disabled', 'true')
  await disabled.click({ force: true })
  await expect(page.getByRole('dialog').filter({ hasText: 'Protocol' })).toBeHidden()
  await models.locator('.model-cascader-search input').fill('other-model')
  await models.locator('.model-cascader-item').filter({ hasText: 'other-model' }).click()
  const protocol = page.getByRole('dialog').filter({ hasText: 'Protocol' })
  await expect(protocol).toBeHidden()
  await expect(models).toBeHidden()
  await expect(draft.locator('.input-model-button')).toContainText('other-model')
  await expect(draft.locator('textarea')).toHaveValue('Use the model I selected')
  await draft.getByRole('button', { name: 'Chat settings', exact: true }).click()
  const settings = page.getByRole('dialog', { name: 'Chat settings', exact: true })
  await expect(settings).toBeVisible()
  await expect(settings.locator('.new-chat-field').filter({ hasText: /^Protocol/ })).toHaveCount(0)
  await page.screenshot({ path: testInfo.outputPath('provider-protocol-settings.png'), animations: 'disabled' })
  await settings.getByRole('button', { name: 'Close', exact: true }).click()
  expect(api.requests.filter(request => request.pathname.endsWith('/model') && request.method !== 'GET')).toEqual([])
  await draft.getByRole('button', { name: 'Send', exact: true }).click()
  await expect.poll(() => page.evaluate(() => (window as any).__PW_CHAT_SOCKET__?.emitted?.find((item: any) => item.event === 'run')?.payload)).toMatchObject({
    source: 'cli', model: 'other-model', provider: 'other-provider', input: 'Use the model I selected',
  })
  // The same picker still works for the newly created conversation.
  await page.locator('.input-model-button').click()
  await expect(models.locator('.model-cascader-item.active')).toContainText('other-model')
  await expect(models).toContainText('Test Provider')
  await models.locator('.model-cascader-provider').filter({ hasText: 'Test Provider' }).click()
  await models.locator('.model-cascader-item').filter({ hasText: 'test-model' }).click()
  await expect(protocol).toBeHidden()
  await expect(models).toBeHidden()
  await expect(page.locator('.input-model-button')).toContainText('test-model')
  expect(api.unexpectedRequests).toEqual([])
})

for (const choice of ['standard', 'custom', 'moa'] as const) test(`Studio draft uses the shared ${choice === 'custom' ? 'saved custom' : choice} model selection without changing the existing conversation`, async ({ page }) => {
  const session = { id: 'existing-model-chat', title: 'Existing conversation', source: 'cli', profile: 'research', model: 'test-model', provider: 'test-provider', started_at: 100, last_active: 101, message_count: 0 }
  await authenticate(page, TEST_ACCESS_KEY, 'research')
  await page.addInitScript(id => {
    (window as any).__PW_CHAT_SOCKET_RESUMES__ = { [id]: { session_id: id, messages: [], isWorking: false, messageLoadedCount: 0, messageTotal: 0 } }
  }, session.id)
  const api = await mockHermesApi(page, { sessions: [session], customModels: { 'test-provider': ['custom-model'] }, modelGroups: [
    { ...TEST_MODEL_GROUP, models: ['test-model', 'other-model'] }, { provider: 'moa', label: 'MoA', models: ['ensemble'] },
  ] })
  await mockChatSocket(page)
  await page.goto(`/#/hermes/session/${session.id}`)
  await expect(page.locator('.page-loading-overlay:visible')).toHaveCount(0)
  await page.getByRole('button', { name: 'New Chat', exact: true }).click()
  await selectNewChatAgent(page, 'Studio')
  const draft = page.locator('.new-chat-page')
  if (choice === 'moa') {
    await draft.locator('.reasoning-effort-button').click()
    await page.getByRole('slider').focus()
    await page.keyboard.press('ArrowRight')
    await expect(draft.locator('.reasoning-effort-button')).toHaveAttribute('aria-label', /none/i)
    await page.keyboard.press('Escape')
  }
  await draft.locator('.input-model-button').click()
  const models = page.locator('.model-cascader:visible')
  await expect(models.locator('.model-cascader-provider').filter({ hasText: 'MoA combinations' })).toHaveCount(1)
  if (choice === 'custom') {
    await models.locator('.model-cascader-item').filter({ hasText: 'custom-model' }).click()
  } else if (choice === 'moa') {
    await models.getByText('MoA combinations', { exact: true }).click()
    await models.locator('.model-cascader-item').filter({ hasText: 'ensemble' }).click()
  } else {
    await models.locator('.model-cascader-search input').fill('other-model')
    await models.locator('.model-cascader-item').filter({ hasText: 'other-model' }).click()
  }
  await expect(models).toBeHidden()
  const model = choice === 'custom' ? 'custom-model' : choice === 'moa' ? 'ensemble' : 'other-model'
  const provider = choice === 'moa' ? 'moa' : 'test-provider'
  await expect(draft.locator('.input-model-button')).toContainText(model)
  if (choice === 'moa') await expect(draft.locator('.reasoning-effort-button')).toHaveCount(0)
  expect(api.requests.filter(request => request.pathname.endsWith('/model') && request.method !== 'GET')).toEqual([])
  expect(await page.evaluate(() => (window as any).__PW_CHAT_SOCKET__.emitted.filter((item: any) => item.event === 'run'))).toEqual([])
  if (choice === 'standard') {
    await draft.locator('textarea').focus()
    await page.keyboard.press('Escape')
    await expect(page.locator('.input-model-button')).toContainText('test-model')
  } else {
    await draft.locator('textarea').fill('Use my selected configuration')
    await draft.getByRole('button', { name: 'Send', exact: true }).click()
    await expect.poll(() => page.evaluate(() => (window as any).__PW_CHAT_SOCKET__?.emitted?.find((item: any) => item.event === 'run')?.payload)).toMatchObject({ model, provider, input: 'Use my selected configuration' })
    if (choice === 'moa') expect(await page.evaluate(() => (window as any).__PW_CHAT_SOCKET__.emitted.find((item: any) => item.event === 'run').payload.reasoning_effort)).toBeUndefined()
  }
  expect(api.unexpectedRequests).toEqual([])
})
