// ============================================================
// Shortnur Admin - Withdraw Settings Page
// ============================================================

import { auth, db, ref, get, update, push, remove, onAuthStateChanged, signOut, ensureAdmins, isAdminUser } from "../../firebase/firebase-config.js";

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
  check: `<polyline points="20 6 9 17 4 12"/>`,
  close: `<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>`,
  plus: `<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>`,
  edit: `<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/>`,
  trash: `<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>`,
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

function escapeHtml(s) {
  if (!s) return '';
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

// ============ STATE ============
let withdrawMethods = [];
let editingMethodKey = null;
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

// ============ LOAD ============
async function loadData() {
  try {
    const [settingsSnap, methodsSnap] = await Promise.all([
      get(ref(db, 'settings')),
      get(ref(db, 'withdrawMethods'))
    ]);

    const s = settingsSnap.exists() ? settingsSnap.val() : {};
    const min = s.withdrawals && typeof s.withdrawals.minAmount === 'number' ? s.withdrawals.minAmount : 10;
    document.getElementById('minAmountInput').value = min;

    if (methodsSnap.exists()) {
      withdrawMethods = Object.entries(methodsSnap.val())
        .map(([key, m]) => ({ key, ...m }))
        .sort((a, b) => (a.order || 0) - (b.order || 0) || (a.createdAt || 0) - (b.createdAt || 0));
    } else {
      withdrawMethods = [];
    }
    renderMethods();
  } catch (err) {
    showToast('Failed to load settings.', 'error');
    console.error(err);
  }
}

// ============ MINIMUM WITHDRAWAL ============
document.getElementById('saveMinBtn').addEventListener('click', async () => {
  const val = parseFloat(document.getElementById('minAmountInput').value);
  if (isNaN(val) || val < 0) { showToast('Enter a valid minimum amount.', 'error'); return; }
  const btn = document.getElementById('saveMinBtn');
  btn.disabled = true;
  try {
    await update(ref(db, 'settings/withdrawals'), { minAmount: val, updatedAt: Date.now() });
    showToast('Minimum withdrawal updated.', 'success');
  } catch (err) {
    showToast('Failed to save minimum amount.', 'error');
    console.error(err);
  } finally {
    btn.disabled = false;
  }
});

// ============ PAYMENT METHODS ============
document.getElementById('addMethodBtn').addEventListener('click', openAddMethod);
document.getElementById('closeMethodModal').addEventListener('click', closeMethodModal);
document.getElementById('cancelMethod').addEventListener('click', closeMethodModal);
document.getElementById('saveMethodBtn').addEventListener('click', saveMethod);

function openAddMethod() {
  editingMethodKey = null;
  document.getElementById('methodModalTitle').textContent = 'Add Withdrawal Method';
  document.getElementById('methodNameInput').value = '';
  document.getElementById('methodFieldsInput').value = '';
  document.getElementById('methodModal').classList.add('show');
}

function closeMethodModal() {
  document.getElementById('methodModal').classList.remove('show');
  editingMethodKey = null;
}

window.__editMethod = (key) => {
  const m = withdrawMethods.find(x => x.key === key);
  if (!m) return;
  editingMethodKey = key;
  document.getElementById('methodModalTitle').textContent = 'Edit Withdrawal Method';
  document.getElementById('methodNameInput').value = m.name || '';
  document.getElementById('methodFieldsInput').value = (m.fields || []).join('\n');
  document.getElementById('methodModal').classList.add('show');
};

window.__toggleMethod = async (key) => {
  const m = withdrawMethods.find(x => x.key === key);
  if (!m) return;
  try {
    await update(ref(db, 'withdrawMethods/' + key), { enabled: !m.enabled, updatedAt: Date.now() });
    loadData();
  } catch (err) {
    showToast('Failed to update method.', 'error');
    console.error(err);
  }
};

window.__deleteMethod = (key) => {
  const m = withdrawMethods.find(x => x.key === key);
  if (!m) return;
  confirmAction = { type: 'deleteMethod', id: key };
  document.getElementById('confirmTitle').textContent = 'Delete Withdrawal Method';
  document.getElementById('confirmMessage').textContent = 'Delete this method? Users will no longer be able to select it.';
  document.getElementById('confirmAmount').textContent = escapeHtml(m.name || 'Method');
  const btn = document.getElementById('confirmAction');
  btn.textContent = 'Delete';
  btn.className = 'btn btn-danger';
  openConfirm();
};

async function saveMethod() {
  const name = document.getElementById('methodNameInput').value.trim();
  const fields = document.getElementById('methodFieldsInput').value.split('\n').map(s => s.trim()).filter(Boolean);
  if (!name) { showToast('Method name is required.', 'error'); return; }
  if (!fields.length) { showToast('Add at least one payment field.', 'error'); return; }

  const btn = document.getElementById('saveMethodBtn');
  btn.disabled = true;
  try {
    if (editingMethodKey) {
      await update(ref(db, 'withdrawMethods/' + editingMethodKey), { name, fields, updatedAt: Date.now() });
    } else {
      await push(ref(db, 'withdrawMethods'), { name, fields, enabled: true, createdAt: Date.now() });
    }
    closeMethodModal();
    showToast('Withdrawal method saved.', 'success');
    loadData();
  } catch (err) {
    showToast('Failed to save method.', 'error');
    console.error(err);
  } finally {
    btn.disabled = false;
  }
}

function renderMethods() {
  const container = document.getElementById('methodsList');
  if (!withdrawMethods.length) {
    container.innerHTML = `<div class="text-muted" style="padding:14px 0;">No methods yet. Add your first withdrawal method.</div>`;
    return;
  }
  container.innerHTML = withdrawMethods.map(m => `
    <div class="method-item">
      <div class="method-info">
        <div class="method-name">${escapeHtml(m.name)} <span class="status-badge status-${m.enabled === false ? 'rejected' : 'approved'}">${m.enabled === false ? 'OFF' : 'ACTIVE'}</span></div>
        <div class="method-fields">${(m.fields || []).map(f => `<span class="field-chip">${escapeHtml(f)}</span>`).join('') || '<span class="text-muted" style="font-size:0.8rem;">No fields</span>'}</div>
      </div>
      <div class="method-actions">
        <label class="switch" title="${m.enabled === false ? 'Enable' : 'Disable'}">
          <input type="checkbox" ${m.enabled === false ? '' : 'checked'} onchange="window.__toggleMethod('${m.key}')">
          <span class="slider"></span>
        </label>
        <button class="btn-icon btn-edit" onclick="window.__editMethod('${m.key}')" title="Edit">${icon('edit')}</button>
        <button class="btn-icon btn-delete" onclick="window.__deleteMethod('${m.key}')" title="Delete">${icon('trash')}</button>
      </div>
    </div>
  `).join('');
}

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

document.getElementById('confirmAction').addEventListener('click', async () => {
  if (!confirmAction) return;
  const { id } = confirmAction;
  const btn = document.getElementById('confirmAction');
  btn.disabled = true;
  try {
    await remove(ref(db, 'withdrawMethods/' + id));
    showToast('Withdrawal method deleted.', 'success');
    closeConfirm();
    loadData();
  } catch (err) {
    showToast('Failed to delete method.', 'error');
    console.error(err);
  } finally {
    btn.disabled = false;
  }
});
