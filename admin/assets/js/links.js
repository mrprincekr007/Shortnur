// ============================================================
// Shortnur Admin - Links Page
// Features: search, status/ads filters, copy URL, link detail,
// bulk delete, pagination
// ============================================================

import { auth, db, ref, get, remove, update, onAuthStateChanged, signOut, ensureAdmins, isAdminUser, getShortBaseUrl } from "../../firebase/firebase-config.js";

let SHORT_BASE = 'https://shortnur.mrprincekr007.workers.dev';
getShortBaseUrl().then((v) => { SHORT_BASE = v; });

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
  trash: `<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>`,
  'chevron-left': `<polyline points="15 18 9 12 15 6"/>`,
  'chevron-right': `<polyline points="9 18 15 12 9 6"/>`,
  pointer: `<path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/><path d="M13 13l6 6"/>`,
  eye: `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`,
  copy: `<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>`,
  check: `<polyline points="20 6 9 17 4 12"/>`,
  close: `<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>`,
  money: `<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>`,
  zap: `<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>`,
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
  if (!ts) return 'â€”';
  return new Date(ts).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
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

function getFavicon(url) {
  try { const u = new URL(url); return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=64`; } catch { return null; }
}

function avatarColor(name) {
  const colors = ['#147090', '#2FA8CF', '#00CEB4', '#FF6B6B', '#FFB347', '#4ECDC4', '#A78BFA', '#F472B6'];
  let h = 0; const s = name || 'user';
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

function ownerFor(l) {
  return usersMap[l.uid] || usersMap[l.createdBy] || {};
}

function shortenDisplay(url, max = 40) {
  if (!url) return '';
  return url.length > max ? url.substring(0, max - 1) + '...' : url;
}

function copyToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(() => showToast('Short URL copied!', 'success')).catch(() => fallbackCopy(text));
  } else { fallbackCopy(text); }
}

function fallbackCopy(text) {
  const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
  document.body.appendChild(ta); ta.select();
  try { document.execCommand('copy'); showToast('Short URL copied!', 'success'); } catch { showToast('Copy failed.', 'error'); }
  document.body.removeChild(ta);
}

// ============ STATE ============
let allLinks = [];
let filteredLinks = [];
let usersMap = {};
let currentPage = 1;
const perPage = 15;
let deleteTargetCode = null;
let selected = new Set();
let detailCode = null;

// ============ INIT ============
initIcons();

onAuthStateChanged(auth, async (user) => {
  if (!user) { window.location.href = 'index.html'; return; }
  await ensureAdmins();
  if (!isAdminUser(user.uid)) { auth.signOut(); window.location.href = 'index.html'; return; }
  document.getElementById('adminEmail').textContent = user.email;
  loadLinks();
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

// ============ LOAD LINKS ============
async function loadLinks() {
  try {
    const [linksSnap, usersSnap] = await Promise.all([get(ref(db, 'links')), get(ref(db, 'users'))]);
    usersMap = {};
    if (usersSnap.exists()) {
      usersSnap.forEach((child) => { usersMap[child.key] = child.val(); });
    }
    if (!linksSnap.exists()) {
      allLinks = [];
      filteredLinks = [];
      renderPage();
      return;
    }
    const data = linksSnap.val();
    allLinks = Object.entries(data).map(([code, l]) => ({ code, ...l }));
    allLinks.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    applyFilters();
  } catch (err) {
    showToast('Failed to load links.', 'error');
    console.error(err);
  }
}

// ============ FILTERS ============
function applyFilters() {
  const q = document.getElementById('searchInput').value.toLowerCase().trim();
  const status = document.getElementById('statusFilter').value;
  const ads = document.getElementById('adsFilter').value;

  filteredLinks = allLinks.filter(l => {
    const owner = ownerFor(l);
    const ownerName = owner.name || owner.email || '';
    const ownerHandle = owner.username || '';
    if (q && !(l.code || '').toLowerCase().includes(q) && !(l.url || l.destination || '').toLowerCase().includes(q) && !ownerName.toLowerCase().includes(q) && !ownerHandle.toLowerCase().includes(q) && !(l.createdBy || '').toLowerCase().includes(q)) return false;
    if (status === 'active' && l.disabled) return false;
    if (status === 'disabled' && !l.disabled) return false;
    if (ads === 'on' && !l.adsEnabled) return false;
    if (ads === 'off' && l.adsEnabled) return false;
    return true;
  });
  currentPage = 1;
  renderPage();
}

document.getElementById('searchInput').addEventListener('input', applyFilters);
document.getElementById('statusFilter').addEventListener('change', applyFilters);
document.getElementById('adsFilter').addEventListener('change', applyFilters);

// ============ RENDER ============
function renderPage() {
  const tbody = document.getElementById('linksBody');
  const empty = document.getElementById('emptyState');
  const pag = document.getElementById('pagination');

  if (filteredLinks.length === 0) {
    empty.classList.remove('hidden');
    tbody.innerHTML = '';
    pag.innerHTML = '';
    document.getElementById('selectAll').checked = false;
    return;
  }

  empty.classList.add('hidden');
  const start = (currentPage - 1) * perPage;
  const pageItems = filteredLinks.slice(start, start + perPage);

  tbody.innerHTML = pageItems.map(l => {
    const dest = l.url || l.destination || '';
    const favicon = getFavicon(dest);
    const adsOn = !!l.adsEnabled;
    const owner = ownerFor(l);
    const ownerName = owner.name || owner.email || shortenDisplay(l.createdBy || l.uid || 'â€”', 16);
    const ownerHandle = owner.username ? '@' + owner.username : '';
    return `
      <tr>
        <td><input type="checkbox" class="row-check" data-code="${l.code}" ${selected.has(l.code) ? 'checked' : ''}></td>
        <td>
          <div class="link-dest">
            <div class="favicon">${favicon ? `<img src="${favicon}" alt="">` : icon('link')}</div>
            <span class="link-url" title="${escapeHtml(dest)}">${escapeHtml(shortenDisplay(dest))}</span>
          </div>
        </td>
        <td><span class="short-code">${escapeHtml(l.code)}</span></td>
        <td>
          <div class="user-row">
            <div class="user-avatar" id="oa_${l.code}"></div>
            <div class="user-cell">
              <span class="user-name">${escapeHtml(ownerName)}</span>
              ${ownerHandle ? `<span class="user-handle">${escapeHtml(ownerHandle)}</span>` : ''}
            </div>
          </div>
        </td>
        <td><span class="click-count">${icon('pointer')} ${formatNumber(l.clicks || 0)}</span></td>
        <td><span class="click-count">${icon('eye')} ${formatNumber(l.adViews || 0)}</span></td>
        <td><span class="earn-count">${icon('money')} $${(l.earnings || 0).toFixed(2)}</span></td>
        <td><span class="status-badge ${adsOn ? 'status-adson' : 'status-adsoff'}">${adsOn ? (l.adPages || 1) + ' page' + ((l.adPages || 1) > 1 ? 's' : '') : 'Off'}</span></td>
        <td><span class="status-badge ${l.disabled ? 'status-disabled' : 'status-active'}">${l.disabled ? 'Disabled' : 'Active'}</span></td>
        <td>${renderExpiryCell(l)}</td>
        <td class="text-muted">${formatDate(l.createdAt)}</td>
        <td>
          <div class="action-cell">
            <button class="btn-icon" onclick="window.__copyLink('${l.code}')" title="Copy short URL">${icon('copy')}</button>
            <button class="btn-icon" onclick="window.__viewLink('${l.code}')" title="View details">${icon('eye')}</button>
            <button class="btn-icon" onclick="window.__toggleLink('${l.code}', ${!!l.disabled})" title="${l.disabled ? 'Enable' : 'Disable'}">
              ${l.disabled ? icon('check') : icon('zap')}
            </button>
            <button class="btn-icon danger" onclick="window.__deleteLink('${l.code}')" title="Delete">${icon('trash')}</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  pageItems.forEach(l => {
    const el = document.getElementById('oa_' + l.code);
    if (el) renderAvatar(el, ownerFor(l), ownerFor(l).name || ownerFor(l).email || l.createdBy || l.uid || 'U');
  });

  // Pagination
  const totalPages = Math.ceil(filteredLinks.length / perPage);
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

function renderExpiryCell(l) {
  const exp = l.expiresAt || 0;
  if (!exp) return '<span class="text-muted">Never</span>';
  const expired = Date.now() > exp;
  return `<span class="status-badge ${expired ? 'status-expired' : 'status-active'}" title="${new Date(exp).toLocaleString()}">${expired ? 'Expired' : formatDate(exp)}</span>`;
}

// ============ SELECTION / BULK ============
document.getElementById('linksBody').addEventListener('change', (e) => {
  const cb = e.target.closest('.row-check');
  if (!cb) return;
  if (cb.checked) selected.add(cb.dataset.code);
  else selected.delete(cb.dataset.code);
  updateBulkUI();
});

document.getElementById('selectAll').addEventListener('change', (e) => {
  const pageCodes = filteredLinks.slice((currentPage - 1) * perPage, currentPage * perPage).map(l => l.code);
  if (e.target.checked) pageCodes.forEach(c => selected.add(c));
  else pageCodes.forEach(c => selected.delete(c));
  document.querySelectorAll('.row-check').forEach(cb => cb.checked = e.target.checked);
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
  const codes = [...selected];
  if (!codes.length) return;
  try {
    const tasks = [];
    codes.forEach(c => {
      tasks.push(remove(ref(db, 'links/' + c)));
      tasks.push(remove(ref(db, 'clicks/' + c)));
      tasks.push(remove(ref(db, 'adviews/' + c)));
    });
    await Promise.all(tasks);
    selected.clear();
    document.getElementById('bulkDeleteModal').classList.remove('show');
    updateBulkUI();
    showToast('Selected links deleted.', 'success');
    loadLinks();
  } catch (err) {
    showToast('Failed to delete links.', 'error');
    console.error(err);
  }
});

// ============ TOGGLE ============
window.__toggleLink = async (code, currentlyDisabled) => {
  try {
    await update(ref(db, 'links/' + code), { disabled: !currentlyDisabled });
    showToast(currentlyDisabled ? 'Link enabled.' : 'Link disabled.', 'success');
    loadLinks();
  } catch (err) {
    showToast('Failed to update link.', 'error');
  }
};

// ============ COPY ============
window.__copyLink = (code) => {
  copyToClipboard(SHORT_BASE + '/' + code);
};

// ============ DELETE ============
window.__deleteLink = (code) => {
  deleteTargetCode = code;
  document.getElementById('deleteLinkCode').textContent = code;
  document.getElementById('deleteModal').classList.add('show');
};

document.getElementById('closeDeleteModal').addEventListener('click', () => document.getElementById('deleteModal').classList.remove('show'));
document.getElementById('cancelDelete').addEventListener('click', () => document.getElementById('deleteModal').classList.remove('show'));
document.getElementById('confirmDelete').addEventListener('click', async () => {
  if (!deleteTargetCode) return;
  try {
    await Promise.all([
      remove(ref(db, 'links/' + deleteTargetCode)),
      remove(ref(db, 'clicks/' + deleteTargetCode)),
      remove(ref(db, 'adviews/' + deleteTargetCode))
    ]);
    selected.delete(deleteTargetCode);
    updateBulkUI();
    showToast('Link deleted successfully.', 'success');
    document.getElementById('deleteModal').classList.remove('show');
    loadLinks();
  } catch (err) {
    showToast('Failed to delete link.', 'error');
  }
});

// ============ DETAIL VIEW ============
window.__viewLink = (code) => {
  const link = allLinks.find(l => l.code === code);
  if (!link) return;

  detailCode = code;
  const dest = link.url || link.destination || '';
  const favicon = getFavicon(dest);

  document.getElementById('detailTitle').textContent = link.title || shortenDisplay(dest, 50) || 'â€”';
  document.getElementById('detailUrl').textContent = dest || 'â€”';
  document.getElementById('detailStatus').textContent = link.disabled ? 'DISABLED' : 'ACTIVE';
  document.getElementById('detailStatus').className = 'status-badge ' + (link.disabled ? 'status-disabled' : 'status-active');
  document.getElementById('detailAds').textContent = link.adsEnabled ? 'ADS ON' : 'ADS OFF';
  document.getElementById('detailAds').className = 'status-badge ' + (link.adsEnabled ? 'status-adson' : 'status-adsoff');
  document.getElementById('detailShortCode').textContent = SHORT_BASE + '/' + code;
  document.getElementById('detailClicks').textContent = formatNumber(link.clicks || 0);
  document.getElementById('detailAdViews').textContent = formatNumber(link.adViews || 0);
  document.getElementById('detailEarnings').textContent = '$' + (link.earnings || 0).toFixed(2);
  const owner = ownerFor(link);
  const ownerName = owner.name || owner.email || link.createdBy || link.uid || 'â€”';
  document.getElementById('detailOwner').innerHTML = escapeHtml(ownerName)
    + (owner.username ? `<br><span class="detail-handle">@${escapeHtml(owner.username)}</span>` : '');
  document.getElementById('detailCreated').textContent = formatDate(link.createdAt);
  document.getElementById('detailAdsPages').textContent = link.adsEnabled ? (link.adPages || 1) : 'â€”';

  const expiryInput = document.getElementById('expiryInput');
  const expiryStatus = document.getElementById('expiryStatus');
  if (link.expiresAt) {
    expiryInput.value = toLocalInputValue(link.expiresAt);
    expiryStatus.textContent = 'Expires ' + new Date(link.expiresAt).toLocaleString();
  } else {
    expiryInput.value = '';
    expiryStatus.textContent = 'No expiry â€” link works forever';
  }

  const favEl = document.getElementById('detailFavicon');
  if (favicon) favEl.innerHTML = `<img src="${favicon}" alt="">`;
  else favEl.innerHTML = icon('link');

  document.getElementById('detailModal').classList.add('show');
};

document.getElementById('closeDetailModal').addEventListener('click', () => document.getElementById('detailModal').classList.remove('show'));
document.getElementById('detailCopyBtn').addEventListener('click', () => {
  if (detailCode) copyToClipboard(SHORT_BASE + '/' + detailCode);
});

// ============ EXPIRY ============
function toLocalInputValue(ts) {
  const d = new Date(ts);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

document.getElementById('setExpiryBtn').addEventListener('click', async () => {
  const value = document.getElementById('expiryInput').value;
  if (!detailCode || !value) { showToast('Choose an expiry date/time.', 'error'); return; }
  const ts = new Date(value).getTime();
  if (isNaN(ts)) { showToast('Invalid date.', 'error'); return; }
  if (ts <= Date.now()) { showToast('Expiry must be in the future.', 'error'); return; }
  try {
    await update(ref(db, 'links/' + detailCode), { expiresAt: ts });
    showToast('Link expiry set.', 'success');
    loadLinks();
    document.getElementById('expiryStatus').textContent = 'Expires ' + new Date(ts).toLocaleString();
  } catch (err) {
    showToast('Failed to set expiry.', 'error');
  }
});

document.getElementById('clearExpiryBtn').addEventListener('click', async () => {
  if (!detailCode) return;
  try {
    await update(ref(db, 'links/' + detailCode), { expiresAt: null });
    showToast('Link expiry cleared.', 'success');
    document.getElementById('expiryInput').value = '';
    document.getElementById('expiryStatus').textContent = 'No expiry â€” link works forever';
    loadLinks();
  } catch (err) {
    showToast('Failed to clear expiry.', 'error');
  }
});
