// ============================================================
// LINK BABA Admin - Withdrawals Page
// ============================================================

import { auth, db, ref, get, update, onAuthStateChanged, signOut, ensureAdmins, isAdminUser } from "../../firebase/firebase-config.js";

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
  search: `<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>`,
  pointer: `<path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/><path d="M13 13l6 6"/>`,
  clock: `<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>`,
  check: `<polyline points="20 6 9 17 4 12"/>`,
  close: `<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>`,
  download: `<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>`,
  'chevron-left': `<polyline points="15 18 9 12 15 6"/>`,
  'chevron-right': `<polyline points="9 18 15 12 9 6"/>`,
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

function formatDate(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

function timeAgo(ts) {
  if (!ts) return '—';
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60); if (m < 60) return m + ' min ago';
  const h = Math.floor(m / 60); if (h < 24) return h + ' hr ago';
  const d = Math.floor(h / 24); if (d < 30) return d + ' days ago';
  return formatDate(ts);
}

function escapeHtml(s) {
  if (!s) return '';
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function formatNumber(n) {
  if (n == null) return '0';
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
  return n.toString();
}

function maskAccount(account) {
  if (!account) return '—';
  const a = String(account);
  if (a.length <= 4) return '••••' + a;
  return '••••' + a.slice(-4);
}

function renderDetails(w) {
  const d = w.details;
  if (d && typeof d === 'object' && Object.keys(d).length) {
    const lines = Object.entries(d).map(([k, v]) => {
      const value = v == null ? '' : String(v);
      return `<div class="detail-line" title="${escapeHtml(k + ': ' + value)}"><span class="detail-label">${escapeHtml(k)}</span>${escapeHtml(value)}</div>`;
    }).join('');
    return `<div class="detail-block">${lines}</div>`;
  }
  return `<span class="account-masked" title="${escapeHtml(w.account || '')}">${escapeHtml(maskAccount(w.account))}</span>`;
}

function avatarColor(name) {
  const colors = ['#147090', '#2FA8CF', '#00CEB4', '#FF6B6B', '#FFB347', '#4ECDC4', '#A78BFA', '#F472B6'];
  let h = 0;
  const s = name || 'user';
  for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h);
  return colors[Math.abs(h) % colors.length];
}

function downloadCSV(filename, rows) {
  const csv = rows.map(r => r.map(c => {
    const s = String(c == null ? '' : c);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}

// ============ STATE ============
let allWithdrawals = [];
let filteredWithdrawals = [];
let usersMap = {};
let currentFilter = 'all';
let currentPage = 1;
const perPage = 15;
let confirmAction = null;

// ============ INIT ============
initIcons();

onAuthStateChanged(auth, async (user) => {
  if (!user) { window.location.href = 'index.html'; return; }
  await ensureAdmins();
  if (!isAdminUser(user.uid)) { auth.signOut(); window.location.href = 'index.html'; return; }
  document.getElementById('adminEmail').textContent = user.email;
  loadData();
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

// Filter tabs
document.getElementById('filterTabs').addEventListener('click', (e) => {
  const tab = e.target.closest('.filter-tab');
  if (!tab) return;
  currentFilter = tab.getAttribute('data-filter');
  document.querySelectorAll('.filter-tab').forEach(t => t.classList.toggle('active', t === tab));
  currentPage = 1;
  applyFilter();
});

document.getElementById('exportCsvBtn').addEventListener('click', exportCSV);

// ============ LOAD ============
async function loadData() {
  try {
    const [withdrawalsSnap, usersSnap] = await Promise.all([
      get(ref(db, 'withdrawals')),
      get(ref(db, 'users'))
    ]);

    if (usersSnap.exists()) usersMap = usersSnap.val();

    if (!withdrawalsSnap.exists()) {
      renderStats();
      applyFilter();
      return;
    }

    const data = withdrawalsSnap.val();
    allWithdrawals = Object.entries(data).map(([id, w]) => ({ id, ...w }));
    allWithdrawals.sort((a, b) => (b.requestedAt || 0) - (a.requestedAt || 0));
    applyFilter();
  } catch (err) {
    showToast('Failed to load withdrawals.', 'error');
    console.error(err);
  }
}

function applyFilter() {
  filteredWithdrawals = currentFilter === 'all'
    ? [...allWithdrawals]
    : allWithdrawals.filter(w => w.status === currentFilter);
  renderStats();
  renderPage();
}

// ============ STATS ============
function renderStats() {
  const counts = { pending: 0, approved: 0, rejected: 0 };
  const totals = { pending: 0, approved: 0, rejected: 0 };
  allWithdrawals.forEach(w => {
    const st = w.status || 'pending';
    counts[st] = (counts[st] || 0) + 1;
    totals[st] = (totals[st] || 0) + (w.amount || 0);
  });

  document.getElementById('statPending').textContent = counts.pending || 0;
  document.getElementById('statApproved').textContent = counts.approved || 0;
  document.getElementById('statRejected').textContent = counts.rejected || 0;
  document.getElementById('statPendingAmount').textContent = '$' + (totals.pending || 0).toFixed(2) + ' awaiting review';
  document.getElementById('statApprovedAmount').textContent = '$' + (totals.approved || 0).toFixed(2) + ' processed';
  document.getElementById('statRejectedAmount').textContent = '$' + (totals.rejected || 0).toFixed(2) + ' refunded';
  document.getElementById('statPaidOut').textContent = '$' + (totals.approved || 0).toFixed(2);
}

// ============ RENDER ============
function renderPage() {
  const tbody = document.getElementById('withdrawalsBody');
  const empty = document.getElementById('emptyState');
  const pag = document.getElementById('pagination');

  if (filteredWithdrawals.length === 0) {
    empty.classList.remove('hidden');
    tbody.innerHTML = '';
    pag.innerHTML = '';
    return;
  }

  empty.classList.add('hidden');
  const start = (currentPage - 1) * perPage;
  const pageItems = filteredWithdrawals.slice(start, start + perPage);

  tbody.innerHTML = pageItems.map(w => {
    const u = usersMap[w.uid] || {};
    const name = u.name || 'User';
    const isPending = w.status === 'pending';
    return `
      <tr>
        <td>
          <div class="user-row">
            <div class="user-avatar" id="wua_${w.id}" style="background:${u.avatarColor || avatarColor(name)}">${(u.avatarEmoji || name.charAt(0).toUpperCase())}</div>
            <div>
              <div class="user-name">${escapeHtml(name)}</div>
              ${u.username ? `<div class="user-handle">@${escapeHtml(u.username)}</div>` : ''}
              <div class="text-muted" style="font-size:0.8rem;">${escapeHtml(w.email || '')}</div>
            </div>
          </div>
        </td>
        <td><span class="method-chip">${escapeHtml((w.method || '—').toUpperCase())}</span></td>
        <td>${renderDetails(w)}</td>
        <td><span class="amount-cell">$${(w.amount || 0).toFixed(2)}</span></td>
        <td><span class="status-badge status-${w.status || 'pending'}">${(w.status || 'pending').toUpperCase()}</span></td>
        <td class="text-muted" title="${formatDate(w.requestedAt)}">${timeAgo(w.requestedAt)}</td>
        <td>
          <div class="action-cell">
            ${isPending ? `
              <button class="btn-icon btn-approve" onclick="window.__approve('${w.id}')" title="Approve">${icon('check')}</button>
              <button class="btn-icon btn-reject" onclick="window.__reject('${w.id}')" title="Reject">${icon('close')}</button>
            ` : '<span class="text-muted">—</span>'}
          </div>
        </td>
      </tr>
    `;
  }).join('');

  // Pagination
  const totalPages = Math.ceil(filteredWithdrawals.length / perPage);
  if (totalPages <= 1) { pag.innerHTML = ''; return; }
  let html = '';
  html += `<button class="page-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="window.__goPage(${currentPage - 1})">${icon('chevron-left')}</button>`;
  for (let i = 1; i <= totalPages; i++) {
    html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="window.__goPage(${i})">${i}</button>`;
  }
  html += `<button class="page-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="window.__goPage(${currentPage + 1})">${icon('chevron-right')}</button>`;
  pag.innerHTML = html;
}

window.__goPage = (p) => { currentPage = p; renderPage(); };

// ============ CONFIRM MODAL ============
function openConfirm() {
  document.getElementById('confirmModal').classList.add('show');
}

function closeConfirm() {
  document.getElementById('confirmModal').classList.remove('show');
  confirmAction = null;
}

document.getElementById('closeConfirmModal').addEventListener('click', closeConfirm);
document.getElementById('cancelConfirm').addEventListener('click', closeConfirm);

// ============ APPROVE ============
window.__approve = (id) => {
  const w = allWithdrawals.find(x => x.id === id);
  if (!w) return;
  const un = usersMap[w.uid] || {};
  const userLabel = (un.name || w.email || 'user') + (un.username ? ' (@' + un.username + ')' : '');
  confirmAction = { type: 'approve', id };
  document.getElementById('confirmTitle').textContent = 'Approve Withdrawal';
  document.getElementById('confirmMessage').textContent = 'Approve this withdrawal? The funds will be marked as paid.';
  document.getElementById('confirmAmount').textContent = '$' + (w.amount || 0).toFixed(2) + ' to ' + escapeHtml(userLabel);
  const btn = document.getElementById('confirmAction');
  btn.textContent = 'Approve';
  btn.className = 'btn btn-primary';
  openConfirm();
};

// ============ REJECT ============
window.__reject = (id) => {
  const w = allWithdrawals.find(x => x.id === id);
  if (!w) return;
  const un = usersMap[w.uid] || {};
  const userLabel = (un.name || w.email || 'user') + (un.username ? ' (@' + un.username + ')' : '');
  confirmAction = { type: 'reject', id };
  document.getElementById('confirmTitle').textContent = 'Reject Withdrawal';
  document.getElementById('confirmMessage').textContent = 'Reject this withdrawal? The amount will be refunded to the user\'s balance.';
  document.getElementById('confirmAmount').textContent = '$' + (w.amount || 0).toFixed(2) + ' to ' + escapeHtml(userLabel);
  const btn = document.getElementById('confirmAction');
  btn.textContent = 'Reject';
  btn.className = 'btn btn-danger';
  openConfirm();
};

document.getElementById('confirmAction').addEventListener('click', async () => {
  if (!confirmAction) return;
  const { type, id } = confirmAction;
  const w = allWithdrawals.find(x => x.id === id);
  if (!w) { closeConfirm(); return; }

  const btn = document.getElementById('confirmAction');
  btn.disabled = true;
  try {
    if (type === 'approve') {
      await update(ref(db, 'withdrawals/' + id), { status: 'approved', processedAt: Date.now() });
      const u = usersMap[w.uid] || {};
      await update(ref(db, 'users/' + w.uid), {
        pendingWithdrawal: Math.max(0, (u.pendingWithdrawal || 0) - (w.amount || 0)),
      });
      showToast('Withdrawal approved.', 'success');
    } else {
      await update(ref(db, 'withdrawals/' + id), { status: 'rejected', rejectedAt: Date.now() });
      const u = usersMap[w.uid] || {};
      await update(ref(db, 'users/' + w.uid), {
        totalEarnings: (u.totalEarnings || 0) + (w.amount || 0),
        pendingWithdrawal: Math.max(0, (u.pendingWithdrawal || 0) - (w.amount || 0)),
      });
      showToast('Withdrawal rejected and refunded.', 'success');
    }
    closeConfirm();
    loadData();
  } catch (err) {
    showToast('Action failed. Please try again.', 'error');
    console.error(err);
  } finally {
    btn.disabled = false;
  }
});

// ============ EXPORT ============
function exportCSV() {
  const rows = [['User', 'Email', 'Method', 'Account / Details', 'Amount (USD)', 'Status', 'Requested', 'Processed']];
  allWithdrawals.forEach(w => {
    const u = usersMap[w.uid] || {};
    const d = w.details;
    const details = d && typeof d === 'object'
      ? Object.entries(d).map(([k, v]) => k + ': ' + (v == null ? '' : v)).join(' | ')
      : (w.account || '');
    rows.push([
      u.name || 'User',
      w.email || u.email || '',
      w.method || '',
      details,
      (w.amount || 0).toFixed(2),
      w.status || 'pending',
      formatDate(w.requestedAt),
      formatDate(w.processedAt || w.rejectedAt),
    ]);
  });
  downloadCSV('linkbaba-withdrawals.csv', rows);
  showToast('Withdrawals exported.', 'success');
}
