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
      return;
    }

    state.token = data.token;
    state.user = data.user;
    localStorage.setItem('keepalive_token', data.token);

    if (typeof Swal !== 'undefined') {
      Swal.fire({
        icon: 'success',
        title: 'Login Successful!',
        text: `Welcome back, ${data.user.name || 'Developer'}!`,
        background: '#0e1626',
        color: '#f8fafc',
        iconColor: '#10b981',
        showConfirmButton: false,
        timer: 1500
      });
    }

    showDashboard();
  } catch (err) {
    showSwalAlert('Connection Error', err.message, 'error');
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
      return;
    }

    if (typeof Swal !== 'undefined') {
      await Swal.fire({
        icon: 'success',
        title: 'Registration Successful!',
        text: 'Your account has been created successfully. Please sign in with your credentials.',
        background: '#0e1626',
        color: '#f8fafc',
        confirmButtonColor: '#00f2fe',
        iconColor: '#10b981',
        confirmButtonText: 'Proceed to Login'
      });
    }

    // Reset registration form
    document.getElementById('registerForm').reset();

    // Pre-fill login email input
    document.getElementById('loginEmail').value = email;

    // Switch tab to Login page
    switchAuthTab('login');
  } catch (err) {
    showSwalAlert('Connection Error', err.message, 'error');
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

function getPlatformBadge(type) {
  if (type === 'render') {
    return `
      <span class="type-pill type-render">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align: -2px; margin-right: 3px;">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>
        RENDER
      </span>`;
  } else if (type === 'supabase') {
    return `
      <span class="type-pill type-supabase">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style="display:inline-block; vertical-align: -2px; margin-right: 3px;">
          <path fill-rule="evenodd" clip-rule="evenodd" d="M13.35 2.5C13.67 2.5 13.9 2.8 13.78 3.09L10.75 10.5H18.5C18.96 10.5 19.22 11.02 18.93 11.38L9.93 22.38C9.62 22.76 9.01 22.5 9.09 22.02L11.5 13.5H4C3.51 13.5 3.25 12.93 3.56 12.56L12.56 2.69C12.76 2.57 13.06 2.5 13.35 2.5Z" fill="#3ECF8E"/>
        </svg>
        SUPABASE
      </span>`;
  } else {
    return `
      <span class="type-pill type-custom">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align: -2px; margin-right: 3px;">
          <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
        </svg>
        CUSTOM
      </span>`;
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
    const platformBadge = getPlatformBadge(target.type);

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
            ${platformBadge}
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

    const platformBadge = getPlatformBadge(log.type);
    const timeStr = new Date(log.timestamp).toLocaleString();

    return `
      <tr>
        <td class="font-mono" style="font-size: 0.8rem;">${timeStr}</td>
        <td><strong>${escapeHtml(log.targetName)}</strong></td>
        <td>${platformBadge}</td>
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
    showSwalAlert(isEdit ? 'Target Updated' : 'Target Added', `Service "${name}" configured successfully.`, 'success');
    loadDashboardData();
  } catch (err) {
    const alertBox = document.getElementById('modalAlert');
    if (alertBox) {
      alertBox.textContent = err.message;
      alertBox.style.display = 'flex';
    }
    showSwalAlert('Save Failed', err.message, 'error');
  }
}

async function deleteTarget(id) {
  const result = await Swal.fire({
    title: 'Remove Target Service?',
    text: 'Are you sure you want to stop monitoring this target endpoint?',
    icon: 'warning',
    showCancelButton: true,
    background: '#0e1626',
    color: '#f8fafc',
    confirmButtonColor: '#f43f5e',
    cancelButtonColor: '#1e293b',
    confirmButtonText: 'Yes, Delete Service',
    cancelButtonText: 'Cancel',
    iconColor: '#f59e0b'
  });

  if (!result.isConfirmed) return;

  try {
    const res = await fetch(`${API_BASE}/services/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${state.token}` }
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete service target');

    showSwalAlert('Service Deleted', 'Target endpoint removed successfully.', 'success');
    loadDashboardData();
  } catch (err) {
    showSwalAlert('Delete Failed', err.message, 'error');
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

    showSwalAlert('Ping Triggered', 'Target pinged successfully!', 'success');
    loadDashboardData();
  } catch (err) {
    showSwalAlert('Ping Failed', err.message, 'error');
    btnElement.innerHTML = originalText;
    btnElement.disabled = false;
  }
}

function copyHealthUrl() {
  const healthUrl = `${window.location.origin}/api/health`;
  navigator.clipboard.writeText(healthUrl).then(() => {
    showSwalAlert('Copied to Clipboard', healthUrl, 'success');
  }).catch(() => {
    if (typeof Swal !== 'undefined') {
      Swal.fire({
        title: 'Health Check URL',
        input: 'text',
        inputValue: healthUrl,
        background: '#0e1626',
        color: '#f8fafc',
        confirmButtonColor: '#00f2fe'
      });
    }
  });
}

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
