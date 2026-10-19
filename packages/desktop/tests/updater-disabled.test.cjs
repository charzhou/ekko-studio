const { test } = require('node:test')
const assert = require('node:assert/strict')
const updater = require('../dist/main/updater')

test('the compiled updater never contacts a provider or runs installation hooks', async () => {
  const originalFetch = global.fetch
  global.fetch = () => { throw new Error('unexpected update request') }
  try {
    updater.initAutoUpdater({ beforeQuitAndInstall: () => { throw new Error('unexpected installation') } })
    await updater.checkForDesktopUpdates(false)
    await updater.checkForDesktopUpdates(true)
    assert.equal(updater.downloadDesktopUpdate().status, 'idle')
    assert.equal(updater.cancelDesktopUpdateDownload().status, 'idle')
    assert.equal((await updater.installDesktopUpdate()).status, 'idle')
  } finally {
    global.fetch = originalFetch
  }
})
