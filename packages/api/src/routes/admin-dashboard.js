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
  loadProjects()
  loadKeys()
  loadAudit()
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

async function loadProjects() {
  const res = await api('/admin/projects')
  const projects = await res.json()
  const select = document.getElementById('new-key-project')
  select.innerHTML = '<option value="">Select project…</option>'
  projects.forEach(function(p) {
    const opt = document.createElement('option')
    opt.value = p.id
    opt.textContent = p.name
    select.appendChild(opt)
  })
  if (projects.length === 1) select.value = projects[0].id
}

async function loadKeys() {
  const res = await api('/admin/keys')
  const keys = await res.json()
  const tbody = document.getElementById('keys-body')
  if (!keys.length) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="7">No keys yet — generate one above.</td></tr>'
    return
  }
  tbody.innerHTML = keys.map(function(k) {
    const masked = k.key.slice(0, 10) + '…' + k.key.slice(-4)
    const lastUsed = k.last_used_at ? new Date(k.last_used_at).toLocaleString() : '—'
    const badge = k.active
      ? '<span class="badge badge-active">Active</span>'
      : '<span class="badge badge-revoked">Revoked</span>'
    const revokeBtn = k.active
      ? '<button class="btn-danger" onclick="revokeKey(\'' + escHtml(k.key) + '\')">Revoke</button>'
      : ''
    const scopes = (k.scopes || []).join(', ') || '—'
    return '<tr>' +
      '<td>' + escHtml(k.name) + '</td>' +
      '<td class="key-cell" title="' + escHtml(k.key) + '">' + escHtml(masked) + '</td>' +
      '<td>' + escHtml(scopes) + '</td>' +
      '<td>' + new Date(k.created_at).toLocaleString() + '</td>' +
      '<td>' + lastUsed + '</td>' +
      '<td>' + badge + '</td>' +
      '<td class="actions">' + revokeBtn + '</td>' +
      '</tr>'
  }).join('')
}

async function createKey() {
  const nameInput = document.getElementById('new-key-name')
  const name = nameInput.value.trim()
  const projectId = document.getElementById('new-key-project').value
  if (!name) { toast('Enter a key name first', 'err'); return }
  if (!projectId) { toast('Select a project first', 'err'); return }
  const scopes = ['ingest', 'notifications', 'detectors'].filter(function(s) {
    return document.getElementById('scope-' + s).checked
  })
  const res = await api('/admin/keys', { method: 'POST', body: JSON.stringify({ name, projectId, scopes }) })
  if (!res.ok) { toast('Failed to create key', 'err'); return }
  const data = await res.json()
  nameInput.value = ''
  toast('Key created: ' + data.key, 'ok')
  loadKeys()
}

async function revokeKey(key) {
  const res = await api('/admin/keys/' + encodeURIComponent(key), { method: 'DELETE' })
  toast(res.ok ? 'Key revoked' : 'Revoke failed', res.ok ? 'ok' : 'err')
  if (res.ok) loadKeys()
}

async function loadAudit() {
  const res = await api('/admin/audit?limit=100')
  const entries = await res.json()
  const tbody = document.getElementById('audit-body')
  if (!entries.length) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="6">No activity yet.</td></tr>'
    return
  }
  tbody.innerHTML = entries.map(function(e) {
    const masked = e.api_key.slice(0, 10) + '…' + e.api_key.slice(-4)
    const statusClass = e.status >= 400 ? 'color:var(--danger)' : e.status >= 200 ? 'color:var(--success)' : ''
    return '<tr>' +
      '<td>' + new Date(e.ts).toLocaleString() + '</td>' +
      '<td class="key-cell" title="' + escHtml(e.api_key) + '">' + escHtml(masked) + '</td>' +
      '<td>' + escHtml(e.method) + '</td>' +
      '<td class="key-cell">' + escHtml(e.path) + '</td>' +
      '<td style="' + statusClass + '">' + e.status + '</td>' +
      '<td class="key-cell">' + escHtml(e.ip) + '</td>' +
      '</tr>'
  }).join('')
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
