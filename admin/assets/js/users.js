// ============================================================
// Shortnur Admin - Users Page
// Features: search, plan/status filters, ban/unban, detail view,
// bulk delete, pagination
// ============================================================

import { auth, db, ref, get, update, remove, onAuthStateChanged, signOut, ensureAdmins, isAdminUser } from "../../firebase/firebase-config.js";

// ============ SVG ICONS ============
const ICONS = {
  dashboard: `<rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/>`,
  menu: `<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>`,
  users: `<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>`,
  link: `<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>`,
  chart: `<path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>`,
  activity: `<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>`,
  wallet: `<path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/>`,
  settings: `<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>`,
  'log-out': `<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>`,
  search: `<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>`,
  edit: `<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/>`,
  trash: `<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>`,
  'chevron-left': `<polyline points="15 18 9 12 15 6"/>`,
  'chevron-right': `<polyline points="9 18 15 12 9 6"/>`,
  pointer: `<path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/><path d="M13 13l6 6"/>`,
  eye: `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`,
  ban: `<circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>`,
  check: `<polyline points="20 6 9 17 4 12"/>`,
  close: `<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>`,
  money: `<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>`,
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
  const sec = Math.floor((Date.now() - ts) / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return min + 'm ago';
  const hr = Math.floor(min / 60);
  if (hr < 24) return hr + 'h ago';
  const day = Math.floor(hr / 24);
  if (day < 30) return day + 'd ago';
  const mon = Math.floor(day / 30);
  if (mon < 12) return mon + 'mo ago';
  return Math.floor(mon / 12) + 'y ago';
}

function escapeHtml(s) {
  if (!s) return '';
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
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

function formatNumber(n) {
  if (n == null) return '0';
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
  return n.toString();
}

function getFavicon(url) {
  try { const u = new URL(url); return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=64`; } catch { return null; }
}

function shortenDisplay(url, max = 40) {
  if (!url) return '';
  return url.length > max ? url.substring(0, max - 1) + '...' : url;
}

// ============ STATE ============
let allUsers = [];
let filteredUsers = [];
let userLinkStats = {};
let currentPage = 1;
const perPage = 15;
let deleteTargetId = null;
let editTargetId = null;
let selected = new Set();

// ============ INIT ============
initIcons();

onAuthStateChanged(auth, async (user) => {
  if (!user) { window.location.href = 'index.html'; return; }
  await ensureAdmins();
  if (!isAdminUser(user.uid)) { auth.signOut(); window.location.href = 'index.html'; return; }
  document.getElementById('adminEmail').textContent = user.email;
  loadUsers();
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

// ============ LOAD USERS ============
async function loadUsers() {
  try {
    const [usersSnap, linksSnap] = await Promise.all([get(ref(db, 'users')), get(ref(db, 'links'))]);
    userLinkStats = {};
    if (linksSnap.exists()) {
      linksSnap.forEach((child) => {
        const l = child.val();
        const uid = l.uid;
        if (!uid) return;
        const s = userLinkStats[uid] || (userLinkStats[uid] = { links: 0, clicks: 0, adViews: 0, earnings: 0 });
        s.links += 1;
        s.clicks += l.clicks || 0;
        s.adViews += l.adViews || 0;
        s.earnings += l.earnings || 0;
      });
    }
    if (!usersSnap.exists()) {
      allUsers = [];
      filteredUsers = [];
      renderPage();
      return;
    }
    const data = usersSnap.val();
    allUsers = Object.entries(data).map(([id, u]) => ({ id, ...u }));
    allUsers.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    applyFilters();
  } catch (err) {
    showToast('Failed to load users.', 'error');
    console.error(err);
  }
}

// ============ FILTERS ============
function applyFilters() {
  const q = document.getElementById('searchInput').value.toLowerCase().trim();
  const plan = document.getElementById('planFilter').value;
  const status = document.getElementById('statusFilter').value;

  filteredUsers = allUsers.filter(u => {
    if (q && !(u.name || '').toLowerCase().includes(q) && !(u.username || '').toLowerCase().includes(q) && !(u.email || '').toLowerCase().includes(q)) return false;
    if (plan !== 'all' && (u.plan || 'free') !== plan) return false;
    if (status === 'banned' && !u.banned) return false;
    if (status === 'active' && u.banned) return false;
    return true;
  });
  currentPage = 1;
  renderPage();
}

document.getElementById('searchInput').addEventListener('input', applyFilters);
document.getElementById('planFilter').addEventListener('change', applyFilters);
document.getElementById('statusFilter').addEventListener('change', applyFilters);

// ============ RENDER ============
function renderPage() {
  const tbody = document.getElementById('usersBody');
  const empty = document.getElementById('emptyState');
  const pag = document.getElementById('pagination');

  if (filteredUsers.length === 0) {
    empty.classList.remove('hidden');
    tbody.innerHTML = '';
    pag.innerHTML = '';
    return;
  }

  empty.classList.add('hidden');
  const start = (currentPage - 1) * perPage;
  const pageItems = filteredUsers.slice(start, start + perPage);

  tbody.innerHTML = pageItems.map(u => {
    const banned = !!u.banned;
    const st = userLinkStats[u.id] || { links: 0, clicks: 0, adViews: 0, earnings: 0 };
    const pending = u.pendingWithdrawal || 0;
    return `
      <tr>
        <td><input type="checkbox" class="row-check" data-id="${u.id}" ${selected.has(u.id) ? 'checked' : ''}></td>
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
        <td>${st.links || 0}</td>
        <td><span class="click-count">${icon('pointer')} ${formatNumber(st.clicks)}</span></td>
        <td>${formatNumber(st.adViews)}</td>
        <td>$${(u.totalEarnings || 0).toFixed(2)}</td>
        <td>$${(u.monthEarnings || 0).toFixed(2)}</td>
        <td><span class="${pending > 0 ? 'pending-wd' : 'text-muted'}">$${pending.toFixed(2)}</span></td>
        <td>
          <select class="user-status-select" data-id="${u.id}" onchange="window.__setUserStatus('${u.id}', this.value)">
            <option value="active" ${banned ? '' : 'selected'}>Active</option>
            <option value="inactive" ${banned ? 'selected' : ''}>Inactive</option>
          </select>
        </td>
        <td class="text-muted">${formatDate(u.createdAt)}</td>
        <td class="text-muted" title="${formatDate(u.lastLogin)}">${timeAgo(u.lastLogin)}</td>
        <td>
          <div class="action-cell">
            <button class="btn-icon" onclick="window.__viewUser('${u.id}')" title="View details">${icon('eye')}</button>
            <button class="btn-icon" onclick="window.__editUser('${u.id}')" title="Edit">${icon('edit')}</button>
            <button class="btn-icon danger" onclick="window.__deleteUser('${u.id}', '${escapeHtml(u.name || u.email)}')" title="Delete">${icon('trash')}</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  pageItems.forEach(u => {
    const el = document.getElementById('ua_' + u.id);
    if (el) renderAvatar(el, u, u.name);
  });

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / perPage);
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

// ============ SELECTION / BULK ============
document.getElementById('usersBody').addEventListener('change', (e) => {
  const cb = e.target.closest('.row-check');
  if (!cb) return;
  if (cb.checked) selected.add(cb.dataset.id);
  else selected.delete(cb.dataset.id);
  updateBulkUI();
});

function updateBulkUI() {
  const btn = document.getElementById('bulkDeleteBtn');
  const count = selected.size;
  if (count > 0) {
    btn.classList.remove('hidden');
    document.getElementById('bulkCount').textContent = count;
  } else {
    btn.classList.add('hidden');
  }
}

document.getElementById('bulkDeleteBtn').addEventListener('click', () => {
  if (!selected.size) return;
  document.getElementById('bulkDeleteCount').textContent = selected.size;
  document.getElementById('bulkDeleteModal').classList.add('show');
});

document.getElementById('closeBulkDeleteModal').addEventListener('click', () => document.getElementById('bulkDeleteModal').classList.remove('show'));
document.getElementById('cancelBulkDelete').addEventListener('click', () => document.getElementById('bulkDeleteModal').classList.remove('show'));
document.getElementById('confirmBulkDelete').addEventListener('click', async () => {
  const ids = [...selected].filter(id => !isAdminUser(id));
  if (!ids.length) {
    showToast('Selected users are admins and cannot be deleted.', 'error');
    document.getElementById('bulkDeleteModal').classList.remove('show');
    return;
  }
  const skipped = selected.size - ids.length;
  try {
    await Promise.all(ids.map(deleteUserData));
    selected.clear();
    document.getElementById('bulkDeleteModal').classList.remove('show');
    updateBulkUI();
    showToast(skipped ? `${ids.length} users deleted (${skipped} admin skipped).` : 'Selected users deleted.', 'success');
    loadUsers();
  } catch (err) {
    showToast('Failed to delete users.', 'error');
    console.error(err);
  }
});

// ============ DELETE USER DATA (user + links + withdrawals) ============
async function deleteUserData(id) {
  const user = allUsers.find(u => u.id === id);
  if (user && isAdminUser(id)) throw new Error('Cannot delete an admin account.');

  const updates = {};
  if (user && user.username) updates['usernames/' + user.username.toLowerCase()] = null;
  updates['users/' + id] = null;

  const linksSnap = await get(ref(db, 'links'));
  if (linksSnap.exists()) {
    linksSnap.forEach((child) => {
      const l = child.val();
      if (l.uid === id || l.createdBy === id) {
        updates['links/' + child.key] = null;
        updates['clicks/' + child.key] = null;
        updates['adviews/' + child.key] = null;
      }
    });
  }

  const wdSnap = await get(ref(db, 'withdrawals'));
  if (wdSnap.exists()) {
    wdSnap.forEach((child) => {
      const w = child.val();
      if (w.uid === id) updates['withdrawals/' + child.key] = null;
    });
  }

  await update(ref(db), updates);
}

// ============ DELETE (single) ============
window.__deleteUser = (id, name) => {
  deleteTargetId = id;
  document.getElementById('deleteUserName').textContent = name;
  document.getElementById('deleteModal').classList.add('show');
};

document.getElementById('closeDeleteModal').addEventListener('click', () => document.getElementById('deleteModal').classList.remove('show'));
document.getElementById('cancelDelete').addEventListener('click', () => document.getElementById('deleteModal').classList.remove('show'));
document.getElementById('confirmDelete').addEventListener('click', async () => {
  if (!deleteTargetId) return;
  try {
    if (isAdminUser(deleteTargetId)) { showToast('Cannot delete an admin account.', 'error'); document.getElementById('deleteModal').classList.remove('show'); return; }
    await deleteUserData(deleteTargetId);
    selected.delete(deleteTargetId);
    updateBulkUI();
    showToast('User deleted successfully.', 'success');
    document.getElementById('deleteModal').classList.remove('show');
    loadUsers();
  } catch (err) {
    showToast(err.message || 'Failed to delete user.', 'error');
  }
});

// ============ STATUS (ACTIVE / INACTIVE) ============
window.__setUserStatus = async (id, value) => {
  const active = value === 'active';
  try {
    await update(ref(db, 'users/' + id), { banned: !active });
    showToast(active ? 'User marked active.' : 'User marked inactive.', 'success');
    loadUsers();
  } catch (err) {
    showToast('Failed to update user status.', 'error');
    console.error(err);
  }
};

// ============ EDIT ============
window.__editUser = (id) => {
  editTargetId = id;
  const user = allUsers.find(u => u.id === id);
  if (!user) return;
  document.getElementById('editName').value = user.name || '';
  document.getElementById('editEmail').value = user.email || '';
  document.getElementById('editPlan').value = user.plan || 'free';
  document.getElementById('editModal').classList.add('show');
};

document.getElementById('closeEditModal').addEventListener('click', () => document.getElementById('editModal').classList.remove('show'));
document.getElementById('cancelEdit').addEventListener('click', () => document.getElementById('editModal').classList.remove('show'));

document.getElementById('editForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!editTargetId) return;
  const name = document.getElementById('editName').value.trim();
  const email = document.getElementById('editEmail').value.trim();
  const plan = document.getElementById('editPlan').value;

  try {
    await update(ref(db, 'users/' + editTargetId), { name, email, plan });
    showToast('User updated successfully.', 'success');
    document.getElementById('editModal').classList.remove('show');
    loadUsers();
  } catch (err) {
    showToast('Failed to update user.', 'error');
  }
});

// ============ DETAIL VIEW ============
window.__viewUser = async (id) => {
  const user = allUsers.find(u => u.id === id);
  if (!user) return;

  document.getElementById('detailName').textContent = user.name || 'Unknown';
  document.getElementById('detailEmail').textContent = user.email || '';
  document.getElementById('detailHandle').textContent = user.username ? '@' + user.username : '';
  document.getElementById('detailPlan').textContent = (user.plan || 'free').toUpperCase();
  document.getElementById('detailPlan').className = 'status-badge status-' + (user.plan || 'free');
  document.getElementById('detailStatus').textContent = user.banned ? 'BANNED' : 'ACTIVE';
  document.getElementById('detailStatus').className = 'status-badge ' + (user.banned ? 'status-banned' : 'status-active');
  document.getElementById('detailRole').textContent = (user.role || 'user').toUpperCase();
  document.getElementById('detailRole').className = 'status-badge ' + ((user.role || 'user') === 'admin' ? 'status-pro' : 'status-free');
  const st = userLinkStats[id] || { links: 0, clicks: 0, adViews: 0, earnings: 0 };
  document.getElementById('detailLinks').textContent = st.links || user.linksCount || 0;
  document.getElementById('detailClicks').textContent = formatNumber(st.clicks);
  document.getElementById('detailAdViews').textContent = formatNumber(st.adViews);
  document.getElementById('detailEarnings').textContent = '$' + (user.totalEarnings || 0).toFixed(2);
  document.getElementById('detailMonth').textContent = '$' + (user.monthEarnings || 0).toFixed(2);
  document.getElementById('detailPending').textContent = '$' + (user.pendingWithdrawal || 0).toFixed(2);
  document.getElementById('detailJoined').textContent = formatDate(user.createdAt);
  document.getElementById('detailLastActive').textContent = user.lastLogin ? formatDate(user.lastLogin) + ' (' + timeAgo(user.lastLogin) + ')' : 'Never';
  const cpm = (user.customCpm != null && user.customCpm !== '') ? parseFloat(user.customCpm) : null;
  const cpmEl = document.getElementById('detailCpm');
  cpmEl.textContent = (cpm != null && !isNaN(cpm)) ? '$' + cpm.toFixed(2) + ' / 1000' : 'Default rate';
  cpmEl.className = (cpm != null && !isNaN(cpm)) ? 'text-primary' : 'text-muted';
  document.getElementById('detailReferral').textContent = user.referralCode || '—';
  document.getElementById('detailUid').textContent = id;

  const avatarEl = document.getElementById('detailAvatar');
  avatarEl.style.background = user.avatarColor || avatarColor(user.name || 'user');
  if (user.avatarUrl) { avatarEl.classList.add('has-photo'); avatarEl.innerHTML = `<img src="${user.avatarUrl}" alt="">`; }
  else if (user.avatarEmoji) { avatarEl.classList.remove('has-photo'); avatarEl.textContent = user.avatarEmoji; }
  else { avatarEl.classList.remove('has-photo'); avatarEl.textContent = (user.name || 'U').charAt(0).toUpperCase(); }

  const body = document.getElementById('detailLinksBody');
  body.innerHTML = `<tr><td colspan="6" class="text-center text-muted">Loading links...</td></tr>`;
  const wdBody = document.getElementById('detailWithdrawBody');
  wdBody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">Loading withdrawals...</td></tr>`;
  document.getElementById('detailModal').classList.add('show');

  try {
    const [linksSnap, wdSnap] = await Promise.all([get(ref(db, 'links')), get(ref(db, 'withdrawals'))]);
    const userLinks = [];
    if (linksSnap.exists()) {
      linksSnap.forEach((child) => {
        const l = child.val();
        if (l.uid === id || l.createdBy === id) {
          l.code = child.key;
          userLinks.push(l);
        }
      });
    }
    userLinks.sort((a, b) => (b.clicks || 0) - (a.clicks || 0));

    if (userLinks.length) document.getElementById('detailLinks').textContent = userLinks.length;

    if (!userLinks.length) {
      body.innerHTML = `<tr><td colspan="6" class="text-center text-muted">No links found for this user.</td></tr>`;
    } else {
      body.innerHTML = userLinks.slice(0, 10).map(l => {
        const dest = l.url || l.destination || '';
        const favicon = getFavicon(dest);
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
            <td>${formatNumber(l.adViews || 0)}</td>
            <td>$${(l.earnings || 0).toFixed(2)}</td>
            <td><span class="status-badge ${l.disabled ? 'status-disabled' : 'status-active'}">${l.disabled ? 'Disabled' : 'Active'}</span></td>
          </tr>
        `;
      }).join('');
    }

    const userWithdrawals = [];
    if (wdSnap.exists()) {
      wdSnap.forEach((child) => {
        const w = child.val();
        if (w.uid === id) userWithdrawals.push({ id: child.key, ...w });
      });
    }
    userWithdrawals.sort((a, b) => (b.requestedAt || 0) - (a.requestedAt || 0));

    if (!userWithdrawals.length) {
      wdBody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">No withdrawals yet.</td></tr>`;
    } else {
      wdBody.innerHTML = userWithdrawals.slice(0, 5).map(w => `
        <tr>
          <td><span class="method-chip">${escapeHtml((w.method || '—').toUpperCase())}</span></td>
          <td>$${(w.amount || 0).toFixed(2)}</td>
          <td><span class="status-badge status-${w.status || 'pending'}">${(w.status || 'pending').toUpperCase()}</span></td>
          <td class="text-muted" title="${formatDate(w.requestedAt)}">${timeAgo(w.requestedAt)}</td>
        </tr>
      `).join('');
    }
  } catch (err) {
    body.innerHTML = `<tr><td colspan="6" class="text-center text-muted">Failed to load links.</td></tr>`;
    wdBody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">Failed to load withdrawals.</td></tr>`;
  }
};

document.getElementById('closeDetailModal').addEventListener('click', () => document.getElementById('detailModal').classList.remove('show'));
