const SOURCE_EXT = 'faceto0l-extension'
const SOURCE_WEB = 'faceto0l-web'

function post(payload) {
  window.postMessage({ source: SOURCE_EXT, ...payload }, '*')
}

function requestStatus() {
  chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (res) => {
    if (chrome.runtime.lastError) {
      post({
        type: 'STATUS',
        ok: false,
        extension: false,
        error: chrome.runtime.lastError.message,
      })
      return
    }
    post({ type: 'STATUS', ...res })
  })
}

function relay(type, payload = {}) {
  chrome.runtime.sendMessage({ type, ...payload }, (res) => {
    if (chrome.runtime.lastError) {
      post({
        type: `${type}_RESULT`,
        ok: false,
        error: chrome.runtime.lastError.message,
      })
      return
    }
    post({ type: `${type}_RESULT`, ...(res || {}) })
  })
}

window.addEventListener('message', (event) => {
  if (event.source !== window) return
  const data = event.data
  if (!data || data.source !== SOURCE_WEB) return

  if (data.type === 'REQUEST_STATUS' || data.type === 'PING') {
    requestStatus()
  }

  if (data.type === 'OPEN_FACEBOOK') {
    chrome.runtime.sendMessage({ type: 'OPEN_FACEBOOK' }, () => {
      void chrome.runtime.lastError
    })
  }

  if (data.type === 'LIST_PAGES') {
    relay('LIST_PAGES', { force: Boolean(data.force) })
  }

  if (data.type === 'OPEN_PAGE_COMPOSER') {
    relay('OPEN_PAGE_COMPOSER', { pageId: data.pageId })
  }

  if (data.type === 'OPEN_BUSINESS_SUITE') {
    relay('OPEN_BUSINESS_SUITE', { pageId: data.pageId })
  }

  if (data.type === 'GRAB_SOURCE') {
    relay('GRAB_SOURCE', {
      platform: data.platform,
      maxItems: data.maxItems,
      scrollRounds: data.scrollRounds,
    })
  }

  if (data.type === 'PREPARE_POST' || data.type === 'POST_TO_PAGE') {
    relay(data.type === 'POST_TO_PAGE' ? 'POST_TO_PAGE' : 'PREPARE_POST', {
      pageId: data.pageId,
      itemUrl: data.itemUrl,
      caption: data.caption,
    })
  }
})

post({
  type: 'READY',
  ok: true,
  extension: true,
  version: chrome.runtime.getManifest().version,
})

requestStatus()
setInterval(requestStatus, 5000)
