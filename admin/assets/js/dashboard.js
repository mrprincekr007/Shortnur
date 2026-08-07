// ============================================================
// Shortnur Admin - Dashboard
// ============================================================

import { auth, db, ref, get, onAuthStateChanged, signOut, ensureAdmins, isAdminUser } from "../../firebase/firebase-config.js";

// ============ SVG ICONS ============
const ICONS = {
  dashboard: `<rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/>`,
  menu: `<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>`,
  users: `<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>`,
  link: `<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>`,
  chart: `<path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>`,
  activity: `<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>`,
  money: `<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>`,
  wallet: `<path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/>`,
  settings: `<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>`,
  'log-out': `<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>`,
  pointer: `<path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/><path d="M13 13l6 6"/>`,
  check: `<polyline points="20 6 9 17 4 12"/>`,
  close: `<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>`,
  eye: `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`,
  pointer: `<path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/><path d="M13 13l6 6"/>`,
  target: `<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>`,
  clock: `<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>`,
};

function icon(name) {
  const body = ICONS[name];
  if (!body) return '';
  return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}

function initIcons() {
  document.querySelectorAll('[data-icon]').forEach((el) => {
    if (el.querySelector('svg')) return;
    const name = el.getAttribute('data-icon');
    if (name) el.innerHTML = icon(name);
  });
}

// ============ UTILITIES ============
function showToast(message, type = 'info', duration = 3000) {
  let container = document.getElementById('toast-container');
  if (!container) { container = document.createElement('div'); container.id = 'toast-container'; document.body.appendChild(container); }
  const toastIcons = { success: icon('check'), error: icon('close') };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="toast-icon">${toastIcons[type] || ''}</span><span class="toast-msg"></span>`;
  toast.querySelector('.toast-msg').textContent = message;
  container.appendChild(toast);
  setTimeout(() => { toast.classList.add('leaving'); setTimeout(() => toast.remove(), 300); }, duration);
}

function formatNumber(n) {
  if (n == null) return '0';
  if (n >= 1e9) return (n / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
  return n.toString();
}

function formatDate(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getFavicon(url) {
  try { const u = new URL(url); return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=64`; } catch { return null; }
}

function shortenDisplay(url, max = 40) {
  if (!url) return '';
  return url.length > max ? url.substring(0, max - 1) + '...' : url;
}

function avatarColor(name) {
  const colors = ['#147090', '#2FA8CF', '#00CEB4', '#FF6B6B', '#FFB347', '#4ECDC4', '#A78BFA', '#F472B6'];
  let h = 0;
  const s = name || 'user';
  for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h);
  return colors[Math.abs(h) % colors.length];
}

function renderAvatar(el, userData, name) {
  if (!el) return;
  const u = userData || {};
  const n = name || u.name || 'User';
  el.classList.remove('has-photo');
  el.innerHTML = '';
  el.style.background = '';
  if (u.avatarUrl) { el.classList.add('has-photo'); el.innerHTML = `<img src="${u.avatarUrl}" alt="">`; return; }
  if (u.avatarEmoji) { el.textContent = u.avatarEmoji; el.style.background = u.avatarColor || '#18CBF0'; return; }
  el.textContent = n.charAt(0).toUpperCase();
  el.style.background = u.avatarColor || avatarColor(n);
}

function animateCounter(el, target, opts = {}) {
  const { prefix = '', suffix = '', duration = 900 } = opts;
  const startTime = performance.now();
  function tick(now) {
    const p = Math.min((now - startTime) / duration, 1);
    el.textContent = prefix + Math.round(target * (1 - Math.pow(1 - p, 3))).toLocaleString() + suffix;
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

// ============ INIT ============
initIcons();

// ============ AUTH GUARD ============
onAuthStateChanged(auth, async (user) => {
  if (!user) { window.location.href = 'index.html'; return; }
  await ensureAdmins();
  if (!isAdminUser(user.uid)) { auth.signOut(); window.location.href = 'index.html'; return; }
  document.getElementById('adminEmail').textContent = user.email;
  loadDashboard();
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await signOut(auth);
  window.location.href = 'index.html';
});

document.getElementById('menuToggle').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebarOverlay').classList.toggle('show');
});
document.getElementById('sidebarOverlay').addEventListener('click', () => {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('show');
});

const topbar = document.querySelector('.dash-topbar');
if (topbar) window.addEventListener('scroll', () => topbar.classList.toggle('scrolled', window.scrollY > 20));

// ============ LOAD DASHBOARD ============
let clickRecords = [];
let adViewRecords = [];
let trafficChart = null;
let deviceChart = null;
let countryChart = null;
const chartReady = typeof Chart !== 'undefined';

async function loadDashboard() {
  try {
    const [usersSnap, linksSnap, withdrawalsSnap] = await Promise.all([
      get(ref(db, 'users')),
      get(ref(db, 'links')),
      get(ref(db, 'withdrawals'))
    ]);

    const users = usersSnap.exists() ? usersSnap.val() : {};
    const links = linksSnap.exists() ? linksSnap.val() : {};
    const withdrawals = withdrawalsSnap.exists() ? withdrawalsSnap.val() : {};

    const userList = Object.entries(users).map(([id, u]) => ({ id, ...u }));
    const linkList = Object.entries(links).map(([code, l]) => ({ code, ...l }));
    const withdrawalList = Object.entries(withdrawals).map(([id, w]) => ({ id, ...w }));

    // Stats
    const totalUsers = userList.length;
    const totalLinks = linkList.length;
    const totalClicks = linkList.reduce((sum, l) => sum + (l.clicks || 0), 0);
    const totalEarnings = linkList.reduce((sum, l) => sum + (l.earnings || 0), 0);
    const totalAdViews = linkList.reduce((sum, l) => sum + (l.adViews || 0), 0);
    const pendingWithdrawals = withdrawalList.filter(w => w.status === 'pending');

    animateCounter(document.getElementById('statUsers'), totalUsers);
    animateCounter(document.getElementById('statLinks'), totalLinks);
    animateCounter(document.getElementById('statClicks'), totalClicks);
    document.getElementById('statEarnings').textContent = '$' + totalEarnings.toFixed(2);
    animateCounter(document.getElementById('statAdViews'), totalAdViews);
    animateCounter(document.getElementById('statWithdrawals'), pendingWithdrawals.length);

    // Load click + adview records for charts / today stats
    const tasks = linkList.map(async (link) => {
      const [clicksSnap, adViewsSnap] = await Promise.all([
        get(ref(db, 'clicks/' + link.code)),
        get(ref(db, 'adviews/' + link.code))
      ]);
      if (clicksSnap.exists()) clicksSnap.forEach((c) => clickRecords.push(c.val()));
      if (adViewsSnap.exists()) adViewsSnap.forEach((c) => adViewRecords.push(c.val()));
    });
    await Promise.all(tasks);

    const todayStart = new Date().setHours(0, 0, 0, 0);
    const todayClicks = clickRecords.filter(c => c.timestamp >= todayStart).length;
    const conversions = clickRecords.filter(c => c.type === 'conversion').length;
    const conversionRate = clickRecords.length ? Math.round((conversions / clickRecords.length) * 1000) / 10 : 0;
    animateCounter(document.getElementById('statToday'), todayClicks);
    document.getElementById('statConversion').textContent = conversionRate + '%';

    if (chartReady) {
      renderTrafficChart();
      renderDeviceChart();
      renderCountryChart();
    }

    renderRecentWithdrawals(withdrawalList, users);
    renderRecentUsers(userList);
    renderRecentLinks(linkList);
  } catch (err) {
    showToast('Failed to load dashboard data.', 'error');
    console.error(err);
  }
}

// ============ CHARTS ============
function renderTrafficChart() {
  const days = 14;
  const labels = [];
  const clickData = [];
  const adViewData = [];
  const now = new Date();
  const clickMap = {};
  const adViewMap = {};

  clickRecords.forEach((c) => { const d = new Date(c.timestamp).toDateString(); clickMap[d] = (clickMap[d] || 0) + 1; });
  adViewRecords.forEach((c) => { const d = new Date(c.timestamp).toDateString(); adViewMap[d] = (adViewMap[d] || 0) + 1; });

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    labels.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    clickData.push(clickMap[d.toDateString()] || 0);
    adViewData.push(adViewMap[d.toDateString()] || 0);
  }

  const ctx = document.getElementById('trafficChart').getContext('2d');
  if (trafficChart) trafficChart.destroy();
  trafficChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Clicks',
          data: clickData,
          borderColor: '#00CEB4',
          backgroundColor: 'rgba(0, 206, 180, 0.15)',
          fill: true,
          tension: 0.4,
          borderWidth: 2.5,
          pointRadius: 3,
          pointBackgroundColor: '#00CEB4',
        },
        {
          label: 'Ad Views',
          data: adViewData,
          borderColor: '#A78BFA',
          backgroundColor: 'rgba(167, 139, 250, 0.12)',
          fill: true,
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 3,
          pointBackgroundColor: '#A78BFA',
          borderDash: [5, 5],
        },
      ],
    },
    options: chartOptions(false),
  });
}

function renderDeviceChart() {
  const deviceMap = {};
  clickRecords.forEach((c) => { if (c.device) deviceMap[c.device] = (deviceMap[c.device] || 0) + 1; });

  const ctx = document.getElementById('deviceChart').getContext('2d');
  if (deviceChart) deviceChart.destroy();
  if (!Object.keys(deviceMap).length) { renderEmptyChart(ctx, 'No device data yet'); return; }

  deviceChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: Object.keys(deviceMap),
      datasets: [{
        data: Object.values(deviceMap),
        backgroundColor: ['#147090', '#2FA8CF', '#00CEB4', '#FF6B6B'],
        borderColor: '#1A2340',
        borderWidth: 3,
      }],
    },
    options: chartOptions(true),
  });
}

function renderCountryChart() {
  const countryMap = {};
  clickRecords.forEach((c) => { if (c.country) countryMap[c.country] = (countryMap[c.country] || 0) + 1; });
  const sorted = Object.entries(countryMap).sort((a, b) => b[1] - a[1]).slice(0, 7);

  const ctx = document.getElementById('countryChart').getContext('2d');
  if (countryChart) countryChart.destroy();
  if (!sorted.length) { renderEmptyChart(ctx, 'No geo data yet'); return; }

  countryChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: sorted.map(([c]) => c),
      datasets: [{
        data: sorted.map(([, v]) => v),
        backgroundColor: ['#147090', '#2FA8CF', '#00CEB4', '#FF6B6B', '#FFB347', '#4ECDC4', '#A78BFA', '#F472B6'],
        borderColor: '#1A2340',
        borderWidth: 3,
      }],
    },
    options: chartOptions(true),
  });
}

function chartOptions(isDoughnut) {
  const base = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: isDoughnut ? { position: 'bottom', labels: { color: '#9AA3BD', padding: 14 } } : { position: 'bottom', labels: { color: '#9AA3BD', padding: 14, usePointStyle: true, pointStyleWidth: 10 } },
      tooltip: {
        backgroundColor: '#131A33',
        borderColor: '#26304f',
        borderWidth: 1,
        titleColor: '#fff',
        bodyColor: '#9AA3BD',
      },
    },
  };

  if (!isDoughnut) {
    base.scales = {
      x: { grid: { color: 'rgba(38,48,79,0.3)' }, ticks: { color: '#9AA3BD' } },
      y: { grid: { color: 'rgba(38,48,79,0.3)' }, ticks: { color: '#9AA3BD', precision: 0 }, beginAtZero: true },
    };
  }

  return base;
}

function renderEmptyChart(ctx, message) {
  ctx.font = '15px Segoe UI';
  ctx.fillStyle = '#9AA3BD';
  ctx.textAlign = 'center';
  ctx.fillText(message, ctx.canvas.width / 2, ctx.canvas.height / 2);
}

// ============ RECENT WITHDRAWALS ============
function renderRecentWithdrawals(withdrawalList, users) {
  const recent = withdrawalList.sort((a, b) => (b.requestedAt || 0) - (a.requestedAt || 0)).slice(0, 5);
  const body = document.getElementById('recentWithdrawalsBody');
  const empty = document.getElementById('withdrawalsEmpty');

  if (recent.length === 0) {
    empty.classList.remove('hidden');
    body.innerHTML = '';
    return;
  }
  empty.classList.add('hidden');
  body.innerHTML = recent.map(w => {
    const u = users[w.uid] || {};
    const name = u.name || 'User';
    return `
      <tr>
        <td>
          <div class="user-row">
            <div class="user-avatar" style="background:${u.avatarColor || avatarColor(name)}">${(u.avatarEmoji || name.charAt(0).toUpperCase())}</div>
            <span class="user-name">${escapeHtml(name)}</span>
          </div>
        </td>
        <td><span class="method-chip">${escapeHtml((w.method || '—').toUpperCase())}</span></td>
        <td><span class="amount-cell">$${(w.amount || 0).toFixed(2)}</span></td>
        <td><span class="status-badge status-${w.status || 'pending'}">${(w.status || 'pending').toUpperCase()}</span></td>
        <td class="text-muted">${formatDate(w.requestedAt)}</td>
      </tr>
    `;
  }).join('');
}

// ============ RECENT USERS ============
function renderRecentUsers(userList) {
  const recentUsers = [...userList].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 5);
  const usersBody = document.getElementById('recentUsersBody');
  const usersEmpty = document.getElementById('usersEmpty');

  if (recentUsers.length === 0) {
    usersEmpty.classList.remove('hidden');
    return;
  }

  usersEmpty.classList.add('hidden');
  usersBody.innerHTML = recentUsers.map(u => `
    <tr>
      <td>
        <div class="user-row">
          <div class="user-avatar" id="ua_${u.id}">${(u.name || 'U').charAt(0).toUpperCase()}</div>
          <div class="user-cell">
            <span class="user-name">${escapeHtml(u.name || 'Unknown')}</span>
            <span class="user-handle">${u.username ? '@' + escapeHtml(u.username) : ''}</span>
          </div>
        </div>
      </td>
      <td class="text-muted">${escapeHtml(u.email || '')}</td>
      <td><span class="status-badge status-${u.plan || 'free'}">${(u.plan || 'free').toUpperCase()}</span></td>
      <td>${u.linksCount || 0}</td>
      <td class="text-muted">${formatDate(u.createdAt)}</td>
    </tr>
  `).join('');

  recentUsers.forEach(u => {
    const el = document.getElementById('ua_' + u.id);
    if (el) renderAvatar(el, u, u.name);
  });
}

// ============ RECENT LINKS ============
function renderRecentLinks(linkList) {
  const recentLinks = [...linkList].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 5);
  const linksBody = document.getElementById('recentLinksBody');
  const linksEmpty = document.getElementById('linksEmpty');

  if (recentLinks.length === 0) {
    linksEmpty.classList.remove('hidden');
    return;
  }

  linksEmpty.classList.add('hidden');
  linksBody.innerHTML = recentLinks.map(l => {
    const favicon = getFavicon(l.url || l.destination || '');
    const dest = l.url || l.destination || '';
    return `
      <tr>
        <td>
          <div class="link-dest">
            <div class="favicon">${favicon ? `<img src="${favicon}" alt="">` : icon('link')}</div>
            <span class="link-url" title="${escapeHtml(dest)}">${escapeHtml(shortenDisplay(dest))}</span>
          </div>
        </td>
        <td><span class="short-code">${escapeHtml(l.code || '')}</span></td>
        <td><span class="click-count">${icon('pointer')} ${formatNumber(l.clicks || 0)}</span></td>
        <td><span class="status-badge ${l.disabled ? 'status-disabled' : 'status-active'}">${l.disabled ? 'Disabled' : 'Active'}</span></td>
        <td class="text-muted">${formatDate(l.createdAt)}</td>
      </tr>
    `;
  }).join('');
}

function escapeHtml(s) {
  if (!s) return '';
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}
