/* ==========================================================================
   KeepPulse PRO - Client Application Engine
   ========================================================================== */

const API_BASE = '/api';

// State Object
const state = {
  token: localStorage.getItem('keepalive_token') || null,
  user: null,
  targets: [],
  logs: [],
  autoRefreshTimer: null
};

// Application Boot
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

async function initApp() {
  setupEventListeners();
  if (state.token) {
    const verified = await fetchCurrentUser();
    if (verified) {
      showDashboard();
    } else {
      showAuthSection();
    }
  } else {
    showAuthSection();
  }
}

function setupEventListeners() {
  document.getElementById('loginForm').addEventListener('submit', handleLogin);
  document.getElementById('registerForm').addEventListener('submit', handleRegister);
  document.getElementById('targetForm').addEventListener('submit', handleSaveTarget);
  document.getElementById('logoutBtn').addEventListener('click', handleLogout);
}

/* Auth Handling */
function switchAuthTab(tab) {
  const loginForm = document.getElementById('loginForm');
  const regForm = document.getElementById('registerForm');
  const tabLogin = document.getElementById('tabLogin');
  const tabReg = document.getElementById('tabRegister');
  const alert = document.getElementById('authAlert');
  alert.style.display = 'none';

  if (tab === 'login') {
    loginForm.style.display = 'block';
    regForm.style.display = 'none';
    tabLogin.classList.add('active');
    tabReg.classList.remove('active');
  } else {
    loginForm.style.display = 'none';
    regForm.style.display = 'block';
    tabLogin.classList.remove('active');
    tabReg.classList.add('active');
  }
}

function togglePasswordVisibility(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const eyeOff = btn.querySelector('.eye-off-icon');
  const eyeOn = btn.querySelector('.eye-on-icon');

  if (input.type === 'password') {
    input.type = 'text';
    if (eyeOff) eyeOff.style.display = 'none';
    if (eyeOn) eyeOn.style.display = 'block';
  } else {
    input.type = 'password';
    if (eyeOff) eyeOff.style.display = 'block';
    if (eyeOn) eyeOn.style.display = 'none';
  }
}

function showSwalAlert(title, text, icon = 'error') {
  if (typeof Swal !== 'undefined') {
    Swal.fire({
      icon: icon,
      title: title,
      text: text,
      background: '#0e1626',
      color: '#f8fafc',
      confirmButtonColor: '#00f2fe',
      iconColor: icon === 'error' ? '#f43f5e' : '#10b981'
    });
  } else {
    showAuthAlert(text);
  }
}

function showAuthAlert(msg) {
  const alert = document.getElementById('authAlert');
  alert.textContent = msg;
  alert.style.display = 'flex';
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();

    if (!res.ok) {
      if (res.status === 404 || (data.error && data.error.toLowerCase().includes('email'))) {
        showSwalAlert('User Not Found', data.error || 'No user found with this email address', 'error');
      } else if (res.status === 401 || (data.error && data.error.toLowerCase().includes('password'))) {
        showSwalAlert('Password Error', data.error || 'Password did not match', 'error');
      } else {
        showSwalAlert('Login Failed', data.error || 'Authentication failed', 'error');
      }
      showAuthAlert(data.error || 'Authentication failed');
      return;
    }

    state.token = data.token;
    state.user = data.user;
    localStorage.setItem('keepalive_token', data.token);

    showDashboard();
  } catch (err) {
    showSwalAlert('Connection Error', err.message, 'error');
    showAuthAlert(err.message);
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;
  const confirmPassword = document.getElementById('regConfirmPassword')?.value;

  if (confirmPassword && password !== confirmPassword) {
    showSwalAlert('Password Mismatch', 'Password did not match', 'error');
    showAuthAlert('Password did not match');
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    const data = await res.json();

    if (!res.ok) {
      showSwalAlert('Registration Error', data.error || 'Account creation failed', 'error');
      showAuthAlert(data.error || 'Account creation failed');
      return;
    }

    state.token = data.token;
    state.user = data.user;
    localStorage.setItem('keepalive_token', data.token);

    showDashboard();
  } catch (err) {
    showSwalAlert('Connection Error', err.message, 'error');
    showAuthAlert(err.message);
  }
}

async function fetchCurrentUser() {
  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { 'Authorization': `Bearer ${state.token}` }
    });
    if (!res.ok) throw new Error('Session invalid');
    const data = await res.json();
    state.user = data.user;
    return true;
  } catch (err) {
    localStorage.removeItem('keepalive_token');
    state.token = null;
    state.user = null;
    return false;
  }
}

function handleLogout() {
  localStorage.removeItem('keepalive_token');
  state.token = null;
  state.user = null;
  if (state.autoRefreshTimer) clearInterval(state.autoRefreshTimer);
  showAuthSection();
}

function showAuthSection() {
  document.getElementById('authSection').style.display = 'flex';
  document.getElementById('dashboardSection').style.display = 'none';
  document.getElementById('userProfile').style.display = 'none';
  document.getElementById('globalStatusPill').style.display = 'none';
}

function showDashboard() {
  document.getElementById('authSection').style.display = 'none';
  document.getElementById('dashboardSection').style.display = 'block';
  document.getElementById('userProfile').style.display = 'flex';
  document.getElementById('globalStatusPill').style.display = 'flex';

  if (state.user) {
    document.getElementById('userName').textContent = state.user.name;
    document.getElementById('userEmail').textContent = state.user.email;
    document.getElementById('userAvatar').textContent = state.user.name.charAt(0).toUpperCase();
  }

  loadDashboardData();

  // Auto refresh data every 15s
  if (state.autoRefreshTimer) clearInterval(state.autoRefreshTimer);
  state.autoRefreshTimer = setInterval(loadDashboardData, 15000);
}

/* Dashboard Loader */
async function loadDashboardData() {
  if (!state.token) return;

  const authHeader = { 'Authorization': `Bearer ${state.token}` };

  try {
    const [targetsRes, logsRes] = await Promise.all([
      fetch(`${API_BASE}/services`, { headers: authHeader }),
      fetch(`${API_BASE}/logs`, { headers: authHeader })
    ]);

    if (targetsRes.status === 401 || logsRes.status === 401) {
      handleLogout();
      return;
    }

    const targetsData = await targetsRes.json();
    const logsData = await logsRes.json();

    state.targets = targetsData.targets || [];
    state.logs = logsData.logs || [];

    updateMetrics();
    renderTargets();
    updateLogFilterOptions();
    renderLogs();

  } catch (err) {
    console.error('Error fetching dashboard data:', err);
  }
}

/* Metrics Update */
function updateMetrics() {
  const total = state.targets.length;
  const active = state.targets.filter(t => t.isActive).length;
  const totalLogs = state.logs.length;

  const successLogs = state.logs.filter(l => l.status === 'success').length;
  const successRate = totalLogs > 0 ? Math.round((successLogs / totalLogs) * 100) : 100;

  document.getElementById('statTotalTargets').textContent = total;
  document.getElementById('statActiveTargets').textContent = active;
  document.getElementById('statSuccessRate').textContent = `${successRate}%`;
  document.getElementById('statTotalLogs').textContent = totalLogs;

  // Header status pill update
  const pillText = document.getElementById('statusPillText');
  const hasError = state.targets.some(t => t.lastStatus === 'error');
  if (hasError) {
    pillText.textContent = 'Degraded Performance Detected';
  } else {
    pillText.textContent = `${active} Services Operational`;
  }
}

/* Render Targets Grid */
function renderTargets() {
  const container = document.getElementById('targetsGrid');

  if (state.targets.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-icon">📡</div>
        <h3 style="font-family: var(--font-heading); color: var(--text-main);">No Monitored Services</h3>
        <p>Click "Add Monitored Service" to start keeping your Render & Supabase apps awake.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = state.targets.map(target => {
    const isSuccess = target.lastStatus === 'success';
    const isError = target.lastStatus === 'error';

    const statusBadgeClass = isSuccess ? 'status-success' : isError ? 'status-error' : 'status-pending';
    const statusLabel = isSuccess ? '🟢 Online' : isError ? '🔴 Error / Offline' : '🟡 Pending';

    const typeClass = target.type === 'render' ? 'type-render' :
                      target.type === 'supabase' ? 'type-supabase' : 'type-custom';

    const typeIcon = target.type === 'render' ? '⚡ Render' :
                     target.type === 'supabase' ? '⚡ Supabase' : '🌐 Custom';

    const lastPingStr = target.lastPingAt ? new Date(target.lastPingAt).toLocaleTimeString() : 'Never';
    
    // Response Latency styling
    let latencyBadge = '--';
    if (target.lastResponseTimeMs !== null) {
      const ms = target.lastResponseTimeMs;
      const color = ms < 300 ? '#10b981' : ms < 800 ? '#f59e0b' : '#f43f5e';
      latencyBadge = `<span style="color: ${color}; font-weight: 700;">${ms}ms</span>`;
    }

    return `
      <div class="target-card">
        <div>
          <div class="target-top">
            <span class="type-pill ${typeClass}">${typeIcon}</span>
            <span class="status-badge ${statusBadgeClass}">${statusLabel}</span>
          </div>

          <div class="target-name">${escapeHtml(target.name)}</div>
          <div class="target-url-box">${escapeHtml(target.url)}</div>

          <div class="target-meta-grid">
            <div class="meta-col">
              <span class="lbl">Last Latency</span>
              <span class="val">${latencyBadge}</span>
            </div>
            <div class="meta-col">
              <span class="lbl">Ping Interval</span>
              <span class="val">Every ${target.intervalMinutes}m</span>
            </div>
            <div class="meta-col">
              <span class="lbl">Last Checked</span>
              <span class="val">${lastPingStr}</span>
            </div>
            <div class="meta-col">
              <span class="lbl">HTTP Code</span>
              <span class="val font-mono">${target.lastStatusCode || '--'}</span>
            </div>
          </div>
        </div>

        <div class="target-actions">
          <button class="btn btn-primary btn-sm" style="flex: 1;" onclick="pingTargetNow('${target.id}', this)" ${!target.isActive ? 'disabled' : ''}>
            ⚡ Ping Now
          </button>
          <button class="btn btn-secondary btn-sm" onclick="editTarget('${target.id}')">✏️ Edit</button>
          <button class="btn btn-danger-ghost btn-sm" onclick="deleteTarget('${target.id}')">🗑️ Delete</button>
        </div>
      </div>
    `;
  }).join('');
}

/* Render Activity Logs */
function updateLogFilterOptions() {
  const select = document.getElementById('logTargetFilter');
  const currentVal = select.value;
  select.innerHTML = '<option value="">All Monitored Targets</option>' + 
    state.targets.map(t => `<option value="${t.id}">${escapeHtml(t.name)}</option>`).join('');
  select.value = currentVal;
}

function filterLogs() {
  renderLogs();
}

function renderLogs() {
  const tbody = document.getElementById('logsTableBody');
  const searchTerm = document.getElementById('logSearchInput').value.toLowerCase();
  const targetFilter = document.getElementById('logTargetFilter').value;

  let filtered = state.logs;

  if (targetFilter) {
    filtered = filtered.filter(l => l.targetId === targetFilter);
  }

  if (searchTerm) {
    filtered = filtered.filter(l => 
      l.targetName.toLowerCase().includes(searchTerm) ||
      (l.message && l.message.toLowerCase().includes(searchTerm)) ||
      (l.statusCode && String(l.statusCode).includes(searchTerm))
    );
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="empty-state" style="padding: 2.5rem;">
          No telemetry logs matching criteria.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(log => {
    const isSuccess = log.status === 'success';
    const statusChip = isSuccess
      ? `<span class="status-badge status-success">HTTP ${log.statusCode || 200}</span>`
      : `<span class="status-badge status-error">HTTP ${log.statusCode || 0}</span>`;

    const timeStr = new Date(log.timestamp).toLocaleString();

    return `
      <tr>
        <td class="font-mono" style="font-size: 0.8rem;">${timeStr}</td>
        <td><strong>${escapeHtml(log.targetName)}</strong></td>
        <td><span class="type-pill type-${log.type}">${log.type}</span></td>
        <td>${statusChip}</td>
        <td class="font-mono">${log.responseTimeMs ? log.responseTimeMs + 'ms' : '--'}</td>
        <td class="font-mono" style="font-size: 0.8rem; color: var(--text-dim);">${escapeHtml(log.message || '')}</td>
      </tr>
    `;
  }).join('');
}

/* Target Modal Operations */
function openTargetModal(targetId = null) {
  const modal = document.getElementById('targetModal');
  const form = document.getElementById('targetForm');
  const title = document.getElementById('modalTitle');
  const alert = document.getElementById('modalAlert');

  alert.style.display = 'none';
  form.reset();
  document.getElementById('targetId').value = '';

  if (targetId) {
    const target = state.targets.find(t => t.id === targetId);
    if (target) {
      title.textContent = 'Edit Target Service';
      document.getElementById('targetId').value = target.id;
      document.getElementById('targetName').value = target.name;
      
      setRadioType(target.type);
      document.getElementById('targetUrl').value = target.url;
      document.getElementById('targetApiKey').value = target.apiKey || '';
      document.getElementById('targetInterval').value = target.intervalMinutes || 60;
    }
  } else {
    title.textContent = 'Add Monitored Service';
    setRadioType('render');
  }

  modal.classList.add('active');
}

function setRadioType(typeVal) {
  document.getElementById('targetType').value = typeVal;
  const radios = document.getElementsByName('targetTypeRadio');
  radios.forEach(r => {
    r.checked = (r.value === typeVal);
  });
  onTypeRadioChange(typeVal);
}

function onTypeRadioChange(val) {
  document.getElementById('targetType').value = val;
  const apiKeyGroup = document.getElementById('apiKeyGroup');
  const urlHelp = document.getElementById('urlHelpText');

  if (val === 'supabase') {
    apiKeyGroup.style.display = 'block';
    urlHelp.textContent = 'Enter your Supabase Project URL (e.g. https://xyz.supabase.co)';
  } else {
    apiKeyGroup.style.display = 'none';
    urlHelp.textContent = 'Enter full HTTPS URL of your Render service or HTTP endpoint.';
  }
}

function closeTargetModal() {
  document.getElementById('targetModal').classList.remove('active');
}

function editTarget(id) {
  openTargetModal(id);
}

async function handleSaveTarget(e) {
  e.preventDefault();
  const id = document.getElementById('targetId').value;
  const name = document.getElementById('targetName').value.trim();
  const type = document.getElementById('targetType').value;
  const url = document.getElementById('targetUrl').value.trim();
  const apiKey = document.getElementById('targetApiKey').value.trim();
  const intervalMinutes = document.getElementById('targetInterval').value;

  const payload = { name, type, url, apiKey, intervalMinutes };

  try {
    const isEdit = Boolean(id);
    const apiUrl = isEdit ? `${API_BASE}/services/${id}` : `${API_BASE}/services`;
    const method = isEdit ? 'PUT' : 'POST';

    const res = await fetch(apiUrl, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.token}`
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to save service target');

    closeTargetModal();
    loadDashboardData();
  } catch (err) {
    const alert = document.getElementById('modalAlert');
    alert.textContent = err.message;
    alert.style.display = 'flex';
  }
}

async function deleteTarget(id) {
  if (!confirm('Are you sure you want to remove this service target from monitoring?')) return;

  try {
    const res = await fetch(`${API_BASE}/services/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${state.token}` }
    });

    if (!res.ok) throw new Error('Failed to delete service target');

    loadDashboardData();
  } catch (err) {
    alert(err.message);
  }
}

async function pingTargetNow(id, btnElement) {
  const originalText = btnElement.innerHTML;
  btnElement.innerHTML = '<div class="spinner"></div>';
  btnElement.disabled = true;

  try {
    const res = await fetch(`${API_BASE}/services/${id}/ping`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${state.token}` }
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Ping failed');

    loadDashboardData();
  } catch (err) {
    alert('Ping execution failed: ' + err.message);
    btnElement.innerHTML = originalText;
    btnElement.disabled = false;
  }
}

function copyHealthUrl() {
  const healthUrl = `${window.location.origin}/api/health`;
  navigator.clipboard.writeText(healthUrl).then(() => {
    alert(`Health Check Endpoint copied to clipboard:\n${healthUrl}`);
  }).catch(() => {
    prompt('Copy your bot health check URL:', healthUrl);
  });
}

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
