// ============================================================
// Shortnur Admin - Settings Page
// ============================================================

import { auth, db, ref, get, set, update, remove, onAuthStateChanged, signOut, ensureAdmins, isAdminUser } from "../../firebase/firebase-config.js";

// ============ SVG ICONS ============
const ICONS = {
  dashboard: `<rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/>`,
  menu: `<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>`,
  users: `<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>`,
  link: `<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>`,
  settings: `<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>`,
  'log-out': `<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>`,
  trash: `<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>`,
  check: `<polyline points="20 6 9 17 4 12"/>`,
  close: `<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>`,
  zap: `<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>`,
  chart: `<path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>`,
  activity: `<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>`,
  wallet: `<path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/>`,
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

// ============ STATE ============
let confirmAction = null;

// ============ INIT ============
initIcons();

onAuthStateChanged(auth, async (user) => {
  if (!user) { window.location.href = 'index.html'; return; }
  await ensureAdmins();
  if (!isAdminUser(user.uid)) { auth.signOut(); window.location.href = 'index.html'; return; }
  document.getElementById('adminEmail').textContent = user.email;
  loadSettings();
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

// ============ LOAD SETTINGS ============
async function loadSettings() {
  try {
    const snap = await get(ref(db, 'settings'));
    if (snap.exists()) {
      const s = snap.val();
      document.getElementById('siteName').value = s.siteName || 'Shortnur';
      document.getElementById('shortUrl').value = s.shortBaseUrl || 'https://shortnur.mrprincekr007.workers.dev';
      document.getElementById('linksPerPage').value = s.linksPerPage || 10;

      // Ad system settings
      const ads = s.ads || {};
      document.getElementById('adsEnabled').checked = ads.enabled !== false;
      document.getElementById('adsTimer').value = ads.timerSeconds || 8;
      document.getElementById('adsPages').value = ads.adPages || 2;
      document.getElementById('adsRate').value = ads.ratePer1000 ?? 0.50;
      document.getElementById('adsBannerUrl').value = ads.bannerUrl || '';
      document.getElementById('adsBannerHtml').value = ads.bannerHtml || '';
      document.getElementById('adsPopunderUrl').value = ads.popunderUrl || '';
    }
  } catch (err) {
    console.error(err);
  }

  // Show admin emails (from firebase-config.js ADMIN_UIDS)
  const adminUids = await import('../../firebase/firebase-config.js').then(m => m.ADMIN_UIDS).catch(() => []);
  if (adminUids.length) {
    document.getElementById('adminList').innerHTML = adminUids.map(uid => `
      <div class="admin-email-item">
        <span class="admin-uid">${uid}</span>
        <span class="status-badge status-active">ADMIN</span>
      </div>
    `).join('');
  } else {
    document.getElementById('adminList').innerHTML = '<p class="text-muted">No admins configured. Add UIDs to <code>ADMIN_UIDS</code> in firebase-config.js</p>';
  }
}

// ============ GENERAL FORM ============
document.getElementById('generalForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const existing = (await get(ref(db, 'settings'))).val() || {};
    await set(ref(db, 'settings'), {
      ...existing,
      siteName: document.getElementById('siteName').value.trim(),
      shortBaseUrl: document.getElementById('shortUrl').value.trim(),
      linksPerPage: parseInt(document.getElementById('linksPerPage').value) || 10,
    });
    showToast('Settings saved successfully.', 'success');
  } catch (err) {
    showToast('Failed to save settings.', 'error');
  }
});

// ============ ADS FORM ============
document.getElementById('adsForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const existing = (await get(ref(db, 'settings'))).val() || {};
    await set(ref(db, 'settings'), {
      ...existing,
      ads: {
        enabled: document.getElementById('adsEnabled').checked,
        timerSeconds: parseInt(document.getElementById('adsTimer').value) || 8,
        adPages: parseInt(document.getElementById('adsPages').value) || 2,
        ratePer1000: parseFloat(document.getElementById('adsRate').value) || 0,
        bannerUrl: document.getElementById('adsBannerUrl').value.trim(),
        bannerHtml: document.getElementById('adsBannerHtml').value.trim(),
        popunderUrl: document.getElementById('adsPopunderUrl').value.trim(),
      },
    });
    showToast('Ad settings saved successfully.', 'success');
  } catch (err) {
    showToast('Failed to save ad settings.', 'error');
  }
});

// ============ DANGER ZONE ============
document.getElementById('clearAllLinks').addEventListener('click', () => {
  document.getElementById('confirmText').textContent = 'Are you sure you want to delete ALL links? This cannot be undone.';
  confirmAction = async () => {
    await remove(ref(db, 'links'));
    showToast('All links deleted.', 'success');
  };
  document.getElementById('confirmModal').classList.add('show');
});

document.getElementById('clearAllUsers').addEventListener('click', () => {
  document.getElementById('confirmText').textContent = 'Are you sure you want to delete ALL users? Your own account will be kept. This cannot be undone.';
  confirmAction = async () => {
    const myUid = auth.currentUser.uid;
    const snap = await get(ref(db, 'users'));
    if (!snap.exists()) return;
    const users = snap.val();
    const updates = {};
    Object.keys(users).forEach(uid => { if (uid !== myUid) updates[uid] = null; });
    await update(ref(db, 'users'), updates);
    showToast('All other users deleted.', 'success');
  };
  document.getElementById('confirmModal').classList.add('show');
});

document.getElementById('closeConfirmModal').addEventListener('click', () => document.getElementById('confirmModal').classList.remove('show'));
document.getElementById('cancelConfirm').addEventListener('click', () => document.getElementById('confirmModal').classList.remove('show'));
document.getElementById('doConfirm').addEventListener('click', async () => {
  if (confirmAction) {
    try {
      await confirmAction();
      document.getElementById('confirmModal').classList.remove('show');
      confirmAction = null;
    } catch (err) {
      showToast('Action failed.', 'error');
    }
  }
});
