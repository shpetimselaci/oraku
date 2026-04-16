let SECRET = ''

function api(path, opts) {
  opts = opts || {}
  return fetch(path, Object.assign({}, opts, {
    headers: Object.assign({
      'Content-Type': 'application/json',
      'x-admin-secret': SECRET
    }, opts.headers || {})
  }))
}

async function login() {
  const val = document.getElementById('secret-input').value.trim()
  if (!val) return
  SECRET = val
  const res = await api('/admin/settings')
  if (res.status === 401) {
    document.getElementById('login-error').textContent = 'Wrong secret.'
    document.getElementById('login-error').style.display = 'block'
    SECRET = ''
    return
  }
  document.getElementById('login-panel').style.display = 'none'
  document.getElementById('content').style.display = 'block'
  document.getElementById('auth-status').textContent = 'authenticated'
  document.getElementById('auth-status').className = 'ok'
  loadSettings()
}

document.getElementById('secret-input').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') login()
})

async function loadSettings() {
  const res = await api('/admin/settings')
  const data = await res.json()
  const tbody = document.getElementById('settings-body')

  const entries = Object.entries(data)
  if (!entries.length) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="4">No projects yet — ingest some events to create a project.</td></tr>'
    return
  }

  tbody.innerHTML = entries.map(function([key, settings]) {
    const s = settings
    const masked = key.length > 12 ? key.slice(0, 8) + '…' + key.slice(-4) : key
    return '<tr data-key="' + escHtml(key) + '">' +
      '<td class="key-cell" title="' + escHtml(key) + '">' + escHtml(masked) + '</td>' +
      '<td><input type="text" class="inline-input" placeholder="https://…" value="' + escHtml(s.webhookUrl || '') + '" data-field="webhookUrl" /></td>' +
      '<td><input type="number" class="inline-input" placeholder="–" value="' + (s.notificationsPerUser || '') + '" min="1" max="100" data-field="notificationsPerUser" style="max-width:100px" /></td>' +
      '<td class="actions"><button class="btn-save" onclick="saveSettings(this)">Save</button></td>' +
      '</tr>'
  }).join('')
}

async function saveSettings(btn) {
  const row = btn.closest('tr')
  const key = row.dataset.key
  const body = {}
  row.querySelectorAll('[data-field]').forEach(function(el) {
    const field = el.dataset.field
    const val = el.value.trim()
    if (val !== '') body[field] = field === 'notificationsPerUser' ? Number(val) : val
  })
  const res = await api('/admin/settings/' + encodeURIComponent(key), {
    method: 'PATCH',
    body: JSON.stringify(body)
  })
  toast(res.ok ? 'Settings saved' : 'Save failed', res.ok ? 'ok' : 'err')
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function toast(msg, type) {
  type = type || 'ok'
  const el = document.getElementById('toast')
  el.textContent = msg
  el.className = 'toast ' + type + ' show'
  setTimeout(function() { el.className = 'toast ' + type }, 2500)
}
