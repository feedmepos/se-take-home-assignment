const BASE = 'http://localhost:8080'
const api = {
  newNormal: BASE + '/order/normal',
  newVip: BASE + '/order/vip',
  addBot: BASE + '/bot/add',
  removeBot: BASE + '/bot/remove',
  orders: BASE + '/orders'
}

const $ = id => document.getElementById(id)

async function post(path) {
  const res = await fetch(path, {method:'POST'})
  return res.json()
}

function showToast(text, kind = 'success', ms = 1000) {
  const container = document.getElementById('toast-container')
  if (!container) return
  const t = document.createElement('div')
  t.className = 'toast ' + kind
  t.textContent = text
  container.appendChild(t)
  // allow transition
  requestAnimationFrame(()=> t.classList.add('show'))
  // remove after ms
  setTimeout(()=>{
    t.classList.remove('show')
    // remove from DOM after transition
    setTimeout(()=> t.remove(), 200)
  }, ms)
}

function statusText(s){
  switch(s){
    case 0: return 'Pending'
    case 1: return 'Processing'
    case 2: return 'Complete'
    default: return String(s)
  }
}

async function refresh() {
  const res = await fetch(api.orders)
  const data = await res.json()
  const pending = data.pending_queue || []
  const all = data.all || []

  const pendingBody = $("pending-body")
  const completeBody = $("complete-body")
  pendingBody.innerHTML = ''
  completeBody.innerHTML = ''

  // update counts
  const pendingCountEl = $('pending-count')
  if (pendingCountEl) pendingCountEl.textContent = String(pending.length)

  // populate pending table rows
  pending.forEach(o => {
    const tr = document.createElement('tr')
    const idTd = document.createElement('td')
    idTd.textContent = String(o.id)
    const createdTd = document.createElement('td')
    createdTd.textContent = o.created_at || ''
    const typeTd = document.createElement('td')
    typeTd.textContent = o.type===1 ? 'VIP' : 'Normal'
    const statusTd = document.createElement('td')
    statusTd.textContent = statusText(o.status)
    tr.appendChild(idTd)
    tr.appendChild(createdTd)
    tr.appendChild(typeTd)
    tr.appendChild(statusTd)
    pendingBody.appendChild(tr)
  })

  const completeItems = all.filter(o => o.status===2)
  const completeCountEl = $('complete-count')
  if (completeCountEl) completeCountEl.textContent = String(completeItems.length)

  // populate complete table rows (show completion time)
  completeItems.forEach(o => {
    const tr = document.createElement('tr')
    const idTd = document.createElement('td')
    idTd.textContent = String(o.id)
    const completedTd = document.createElement('td')
    completedTd.textContent = o.completed_at || o.completedAt || ''
    const typeTd = document.createElement('td')
    typeTd.textContent = o.type===1 ? 'VIP' : 'Normal'
    const statusTd = document.createElement('td')
    statusTd.textContent = statusText(o.status)
    tr.appendChild(idTd)
    tr.appendChild(completedTd)
    tr.appendChild(typeTd)
    tr.appendChild(statusTd)
    completeBody.appendChild(tr)
  })

  // show bot count if provided by server
  const botCountEl = $('bot-count')
  if (botCountEl) {
    botCountEl.textContent = 'Bots: ' + (data.bot_count ?? 0)
  }
}

async function handleClick(btn, path, successText = 'OK'){
  try{
    // visual pressed feedback
    btn.classList.add('pressed')
    // ensure quick tactile feel even if network is very fast
    const start = Date.now()
    const res = await post(path)
    const elapsed = Date.now() - start
    const minDelay = 120
    if (elapsed < minDelay) await new Promise(r=>setTimeout(r, minDelay - elapsed))
    // show server message if available
    const message = (res && (res.message || res.msg || res.status)) || successText
    showToast(String(message), 'success', 1000)
    refresh()
  }catch(err){
    console.error(err)
    showToast('Request failed', 'error', 1200)
  }finally{
    // keep pressed state briefly so user perceives it
    setTimeout(()=> btn.classList.remove('pressed'), 180)
  }
}

$('new-normal').addEventListener('click', function(){ handleClick(this, api.newNormal, 'Created normal order') })
$('new-vip').addEventListener('click', function(){ handleClick(this, api.newVip, 'Created VIP order') })
$('add-bot').addEventListener('click', function(){ handleClick(this, api.addBot, 'Bot added') })
// when removing a bot, prevent request if bot count is already zero
$('remove-bot').addEventListener('click', function(){
  const btn = this
  const botCountEl = $('bot-count')
  let botCount = 0
  if (botCountEl) {
    const txt = botCountEl.textContent || ''
    const m = txt.match(/(-?\d+)/)
    botCount = m ? parseInt(m[0], 10) : 0
  }
  if (botCount <= 0) {
    showToast('No bots to remove', 'error', 1200)
    // small pressed feedback so user feels the click
    btn.classList.add('pressed')
    setTimeout(()=> btn.classList.remove('pressed'), 160)
    return
  }
  handleClick(this, api.removeBot, 'Bot removed')
})

setInterval(refresh, 2000)
refresh()
