// ============================================================
// Shortnur Admin - CPM Rates Page (global + per-user custom CPM)
// ============================================================

import { auth, db, ref, get, set, update, onAuthStateChanged, signOut, ensureAdmins, isAdminUser } from "../../firebase/firebase-config.js";
import { icon, initIcons, showToast, escapeHtml } from "./admin-lib.js";

// ============ STATE ============
let users = [];
let selectedUid = '';
let globalCpm = 0.50;

function avatarColor(name) {
  const colors = ['#147090', '#2FA8CF', '#00CEB4', '#FF6B6B', '#FFB347', '#4ECDC4', '#A78BFA', '#F472B6'];
  let h = 0; const s = name || 'user';
  for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h);
  return colors[Math.abs(h) % colors.length];
}

function hasCustomCpm(u) {
  return u.customCpm != null && u.customCpm !== '';
}

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

document.getElementById('cpmUserSearch').addEventListener('input', onUserSearch);
document.getElementById('cpmClearUser').addEventListener('click', clearSelectedUser);
document.addEventListener('click', (e) => {
  if (!e.target.closest('.user-search-wrap')) hideUserResults();
});
document.getElementById('globalCpmForm').addEventListener('submit', saveGlobalCpm);
document.getElementById('customCpmForm').addEventListener('submit', saveCustomCpm);
document.getElementById('removeCustomCpm').addEventListener('click', removeCustomCpm);

// ============ LOAD DATA ============
async function loadData() {
  try {
    const [settingsSnap, usersSnap] = await Promise.all([
      get(ref(db, 'settings/ads')),
      get(ref(db, 'users')),
    ]);

    globalCpm = settingsSnap.exists() && settingsSnap.val().ratePer1000 != null
      ? parseFloat(settingsSnap.val().ratePer1000)
      : 0.50;
    document.getElementById('globalCpm').value = globalCpm;

    users = usersSnap.exists()
      ? Object.entries(usersSnap.val()).map(([id, u]) => ({ id, ...u }))
      : [];
    users.sort((a, b) => (a.name || a.email || '').localeCompare(b.name || b.email || ''));

    renderStats();
    renderCustomTable();
  } catch (err) {
    console.error(err);
    showToast('Failed to load CPM data.', 'error');
  }
}

// ============ RENDER ============
function renderStats() {
  const customUsers = users.filter(hasCustomCpm);
  const maxCpm = customUsers.length
    ? Math.max(...customUsers.map((u) => parseFloat(u.customCpm) || 0))
    : 0;

  document.getElementById('statGlobalCpm').textContent = '$' + globalCpm.toFixed(2);
  document.getElementById('statCustomUsers').textContent = customUsers.length;
  document.getElementById('statMaxCpm').textContent = '$' + maxCpm.toFixed(2);
  document.getElementById('statPerView').textContent = '$' + (globalCpm / 1000).toFixed(4);
}

function renderCustomTable() {
  const tbody = document.getElementById('customCpmBody');
  const empty = document.getElementById('customCpmEmpty');
  const customUsers = users.filter(hasCustomCpm);

  if (!customUsers.length) { empty.classList.remove('hidden'); tbody.innerHTML = ''; return; }
  empty.classList.add('hidden');

  tbody.innerHTML = customUsers.map((u) => {
    const userName = u.name || u.email || 'User';
    return `
      <tr>
        <td>
          <div class="cpm-user">
            <div class="report-avatar" style="background:${avatarColor(userName)}">${escapeHtml(userName.charAt(0).toUpperCase())}</div>
            <div class="report-user-meta">
              <b>${escapeHtml(u.name || 'Unknown')}</b>
              <span class="user-handle">${u.username ? '@' + escapeHtml(u.username) : ''}</span>
              <span>${escapeHtml(u.email || '—')}</span>
            </div>
          </div>
        </td>
        <td><span class="cpm-value">${icon('money')} $${parseFloat(u.customCpm).toFixed(2)} / 1000</span></td>
        <td><span class="status-badge status-active">Custom</span></td>
        <td><div class="action-cell">
          <button class="btn btn-ghost btn-sm" data-edit="${escapeHtml(u.id)}">Edit</button>
          <button class="btn btn-ghost btn-sm" data-remove="${escapeHtml(u.id)}">Remove</button>
        </div></td>
      </tr>
    `;
  }).join('');

  tbody.querySelectorAll('[data-edit]').forEach((btn) => {
    btn.addEventListener('click', () => {
      selectUser(btn.dataset.edit);
      document.getElementById('customCpmForm').scrollIntoView({ behavior: 'smooth' });
    });
  });
  tbody.querySelectorAll('[data-remove]').forEach((btn) => {
    btn.addEventListener('click', () => removeCustomCpmFor(btn.dataset.remove));
  });
}

// ============ USER SEARCH ============
function onUserSearch(e) {
  const q = e.target.value.trim().toLowerCase();
  const results = document.getElementById('cpmUserResults');
  if (!q) { hideUserResults(); return; }

  const matches = users.filter((u) =>
    (u.name || '').toLowerCase().includes(q) || (u.username || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q)
  ).slice(0, 20);

  if (!matches.length) {
    results.innerHTML = '<div class="user-search-empty">No users found</div>';
    results.classList.add('show');
    return;
  }

  results.innerHTML = matches.map((u) => {
    const name = u.name || u.email || 'User';
    return `
      <button type="button" class="user-search-item" data-uid="${escapeHtml(u.id)}">
        <span class="report-avatar" style="background:${avatarColor(name)}">${escapeHtml(name.charAt(0).toUpperCase())}</span>
        <span class="user-search-text">
          <b>${escapeHtml(u.name || 'Unknown')}</b>
          <small>${u.username ? '@' + escapeHtml(u.username) + (u.email ? ' • ' : '') : ''}${escapeHtml(u.email || '')}</small>
        </span>
      </button>
    `;
  }).join('');
  results.classList.add('show');

  results.querySelectorAll('.user-search-item').forEach((item) => {
    item.addEventListener('click', () => selectUser(item.dataset.uid));
  });
}

function hideUserResults() {
  document.getElementById('cpmUserResults').classList.remove('show');
}

function selectUser(uid) {
  const user = users.find((u) => u.id === uid);
  if (!user) return;
  selectedUid = uid;
  hideUserResults();
  document.getElementById('cpmUserSearch').value = '';

  const name = user.name || user.email || 'User';
  const chip = document.getElementById('cpmSelectedUser');
  chip.classList.remove('hidden');
  const avatar = document.getElementById('cpmSelectedAvatar');
  avatar.textContent = name.charAt(0).toUpperCase();
  avatar.style.background = avatarColor(name);
  document.getElementById('cpmSelectedName').textContent = user.name || 'Unknown';
  document.getElementById('cpmSelectedEmail').textContent = user.email || '';

  const input = document.getElementById('customCpmInput');
  input.value = hasCustomCpm(user) ? user.customCpm : '';
  document.getElementById('customRateInfo').textContent = hasCustomCpm(user)
    ? 'Current custom rate: $' + parseFloat(user.customCpm).toFixed(2) + ' per 1000 views.'
    : 'No custom rate — this user earns the global $' + globalCpm.toFixed(2) + '.';
}

function clearSelectedUser() {
  selectedUid = '';
  document.getElementById('cpmSelectedUser').classList.add('hidden');
  document.getElementById('customCpmInput').value = '';
  document.getElementById('customRateInfo').textContent = 'Type to search for a user.';
  document.getElementById('cpmUserSearch').focus();
}

// ============ SAVE / REMOVE ============
async function saveGlobalCpm(e) {
  e.preventDefault();
  const val = parseFloat(document.getElementById('globalCpm').value);
  if (isNaN(val) || val < 0) { showToast('Enter a valid CPM.', 'error'); return; }

  try {
    const existing = (await get(ref(db, 'settings'))).val() || {};
    const ads = existing.ads || {};
    await set(ref(db, 'settings'), { ...existing, ads: { ...ads, ratePer1000: val } });
    globalCpm = val;
    renderStats();
    showToast('Global CPM updated to $' + val.toFixed(2) + '.', 'success');
  } catch (err) {
    console.error(err);
    showToast('Failed to save global CPM.', 'error');
  }
}

async function saveCustomCpm(e) {
  e.preventDefault();
  if (!selectedUid) { showToast('Select a user first.', 'error'); return; }
  const val = parseFloat(document.getElementById('customCpmInput').value);
  if (isNaN(val) || val < 0) { showToast('Enter a valid CPM.', 'error'); return; }

  try {
    await update(ref(db, 'users/' + selectedUid), { customCpm: val });
    showToast('Custom CPM saved for ' + userLabel(selectedUid) + '.', 'success');
    await loadData();
  } catch (err) {
    console.error(err);
    showToast('Failed to save custom CPM.', 'error');
  }
}

function removeCustomCpm() {
  if (!selectedUid) { showToast('Select a user first.', 'error'); return; }
  removeCustomCpmFor(selectedUid);
}

async function removeCustomCpmFor(uid) {
  try {
    await update(ref(db, 'users/' + uid), { customCpm: null });
    showToast('Custom CPM removed for ' + userLabel(uid) + '.', 'success');
    document.getElementById('customCpmInput').value = '';
    await loadData();
  } catch (err) {
    console.error(err);
    showToast('Failed to remove custom CPM.', 'error');
  }
}

function userLabel(uid) {
  const u = users.find((x) => x.id === uid);
  return u ? (u.name || u.email || 'user') : 'user';
}
