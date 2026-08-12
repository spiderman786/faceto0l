const statusEl = document.getElementById('status')
const detailEl = document.getElementById('detail')
const openFb = document.getElementById('openFb')

chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (res) => {
  if (chrome.runtime.lastError || !res?.ok) {
    statusEl.textContent = 'Extension error'
    statusEl.className = 'pill bad'
    detailEl.textContent = chrome.runtime.lastError?.message || 'Could not read status'
    return
  }

  if (res.facebook?.connected) {
    statusEl.textContent = 'Facebook Connected'
    statusEl.className = 'pill ok'
    detailEl.textContent = `User id ${res.facebook.userId} · v${res.version}`
  } else {
    statusEl.textContent = 'Facebook Disconnected'
    statusEl.className = 'pill bad'
    detailEl.textContent = 'Log into Facebook in this Chrome, then reload Faceto0l.'
  }
})

openFb.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'OPEN_FACEBOOK' })
})
