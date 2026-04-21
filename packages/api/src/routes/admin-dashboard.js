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
  loadRegistrations()
  loadOrgs()
  loadSettings()
  loadKeys()
  loadAudit()
}

document.getElementById('secret-input').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') login()
})

async function loadSettings() {
  const [settingsRes, projectsRes] = await Promise.all([api('/admin/settings'), api('/admin/projects')])
  const settingsData = await settingsRes.json()
  const projects = await projectsRes.json()
  const tbody = document.getElementById('settings-body')

  if (!projects.length) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="6">No projects yet.</td></tr>'
    return
  }

  tbody.innerHTML = projects.map(function(p) {
    const s = settingsData[p.id] || {}
    const label = escHtml(p.name) + ' <span style="font-size:11px;color:#52525b" title="' + escHtml(p.id) + '">(' + escHtml(p.id.slice(0, 8)) + '…)</span>'
    const secret = s.webhookAuthKey ? s.webhookAuthKey.slice(0, 8) + '…' : '—'
    return '<tr data-key="' + escHtml(p.id) + '">' +
      '<td>' + label + '</td>' +
      '<td><input type="text" class="inline-input" placeholder="https://…" value="' + escHtml(s.webhookUrl || '') + '" data-field="webhookUrl" /></td>' +
      '<td class="key-cell" title="' + escHtml(s.webhookAuthKey || '') + '">' + escHtml(secret) + '</td>' +
      '<td><input type="number" class="inline-input" placeholder="–" value="' + (s.notificationsPerUser || '') + '" min="1" max="100" data-field="notificationsPerUser" style="max-width:100px" /></td>' +
      '<td><input type="number" class="inline-input" placeholder="10" value="' + (s.rateLimit || '') + '" min="1" max="1000" data-field="rateLimit" style="max-width:100px" /></td>' +
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
    if (val !== '') body[field] = (field === 'notificationsPerUser' || field === 'rateLimit') ? Number(val) : val
  })
  const res = await api('/admin/settings/' + encodeURIComponent(key), {
    method: 'PATCH',
    body: JSON.stringify(body)
  })
  toast(res.ok ? 'Settings saved' : 'Save failed', res.ok ? 'ok' : 'err')
}

async function loadRegistrations() {
  const res = await api('/admin/registrations')
  const regs = await res.json()
  const tbody = document.getElementById('registrations-body')
  if (!regs.length) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="5">No registrations yet.</td></tr>'
    return
  }
  tbody.innerHTML = regs.map(function(r) {
    const statusColors = { pending: '#f59e0b', approved: '#22c55e', rejected: '#ef4444' }
    const badge = '<span style="color:' + (statusColors[r.status] || '#71717a') + ';font-weight:600">' + escHtml(r.status) + '</span>'
    const actions = r.status === 'pending'
      ? '<button class="btn-primary" onclick="approveReg(\'' + escHtml(r.id) + '\')">Approve</button> ' +
        '<button class="btn-danger" onclick="rejectReg(\'' + escHtml(r.id) + '\')">Reject</button>'
      : ''
    return '<tr>' +
      '<td>' + escHtml(r.name) + '</td>' +
      '<td class="key-cell">' + escHtml(r.webhook_url) + '</td>' +
      '<td>' + badge + '</td>' +
      '<td>' + new Date(r.created_at).toLocaleString() + '</td>' +
      '<td class="actions">' + actions + '</td>' +
      '</tr>'
  }).join('')
}

async function approveReg(id) {
  const res = await api('/admin/registrations/' + encodeURIComponent(id) + '/approve', { method: 'POST' })
  toast(res.ok ? 'Approved — key delivered' : 'Failed to approve', res.ok ? 'ok' : 'err')
  if (res.ok) { loadRegistrations(); loadOrgs(); loadKeys() }
}

async function rejectReg(id) {
  const res = await api('/admin/registrations/' + encodeURIComponent(id) + '/reject', { method: 'POST' })
  toast(res.ok ? 'Rejected' : 'Failed to reject', res.ok ? 'ok' : 'err')
  if (res.ok) loadRegistrations()
}

async function loadOrgs() {
  const res = await api('/admin/projects')
  const orgs = await res.json()
  const tbody = document.getElementById('orgs-body')
  if (!orgs.length) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="4">No organizations yet.</td></tr>'
    return
  }
  tbody.innerHTML = orgs.map(function(o) {
    const masked = o.id.length > 12 ? o.id.slice(0, 8) + '…' + o.id.slice(-4) : o.id
    const badge = o.active
      ? '<span class="badge badge-active">Active</span>'
      : '<span class="badge badge-revoked">Suspended</span>'
    const btn = o.active
      ? '<button class="btn-danger" onclick="toggleOrg(\'' + escHtml(o.id) + '\', false)">Suspend</button>'
      : '<button class="btn-primary" onclick="toggleOrg(\'' + escHtml(o.id) + '\', true)">Reinstate</button>'
    return '<tr>' +
      '<td class="key-cell" title="' + escHtml(o.id) + '">' + escHtml(masked) + '</td>' +
      '<td>' + escHtml(o.name) + '</td>' +
      '<td>' + badge + '</td>' +
      '<td class="actions">' + btn + '</td>' +
      '</tr>'
  }).join('')
}

async function toggleOrg(id, active) {
  const res = await api('/admin/projects/' + encodeURIComponent(id), { method: 'PATCH', body: JSON.stringify({ active }) })
  toast(res.ok ? (active ? 'Organization reinstated' : 'Organization suspended') : 'Failed', res.ok ? 'ok' : 'err')
  if (res.ok) loadOrgs()
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
