// ============================================================
// LINK BABA - Shared Topbar (balance, notifications, profile)
// Loaded on every panel page
// ============================================================

import { auth, db, ref, get, signOut, onAuthStateChanged } from "../../firebase/firebase-config.js";

const AVATAR_COLORS = ['#18CBF0','#00E5C7','#FF5E8A','#FFB347','#A78BFA','#F472B6','#4ECDC4','#147090','#FF6B6B','#34D399'];

function avatarColor(name) {
  const colors = ['#147090','#2FA8CF','#00CEB4','#FF6B6B','#FFB347','#4ECDC4','#A78BFA','#F472B6'];
  let h = 0; const s = name || 'user';
  for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h);
  return colors[Math.abs(h) % colors.length];
}

function renderAvatar(el, u, name) {
  if (!el) return;
  u = u || {}; name = name || u.name || 'User';
  el.classList.remove('has-photo'); el.innerHTML = ''; el.style.background = '';
  if (u.avatarUrl) { el.classList.add('has-photo'); el.innerHTML = `<img src="${u.avatarUrl}" alt="">`; return; }
  if (u.avatarEmoji) { el.textContent = u.avatarEmoji; el.style.background = u.avatarColor || AVATAR_COLORS[0]; return; }
  el.textContent = name.charAt(0).toUpperCase(); el.style.background = u.avatarColor || avatarColor(name);
}

function bindTopbar() {
  const pBtn = document.getElementById('profileBtn');
  const dd = document.getElementById('profileDropdown');
  const nBtn = document.getElementById('notifBtn');
  const np = document.getElementById('notifPanel');

  if (pBtn) pBtn.setAttribute('type', 'button');
  if (nBtn) nBtn.setAttribute('type', 'button');

  if (pBtn && dd) {
    pBtn.addEventListener('click', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      const open = dd.classList.toggle('hidden');
      if (!open && np) np.classList.add('hidden');
    });
  }
  if (nBtn && np) {
    nBtn.addEventListener('click', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      const open = np.classList.toggle('hidden');
      if (!open && dd) dd.classList.add('hidden');
    });
  }
  document.addEventListener('click', (ev) => {
    if (dd && !dd.classList.contains('hidden') && pBtn && !pBtn.contains(ev.target) && !dd.contains(ev.target)) {
      dd.classList.add('hidden');
    }
    if (np && !np.classList.contains('hidden') && nBtn && !nBtn.contains(ev.target) && !np.contains(ev.target)) {
      np.classList.add('hidden');
    }
  });

  const lo = document.getElementById('pdLogoutBtn');
  if (lo) {
    lo.addEventListener('click', async (ev) => {
      ev.preventDefault();
      await signOut(auth);
      window.location.href = 'index.html';
    });
  }
}

bindTopbar();

onAuthStateChanged(auth, async (user) => {
  if (!user) return;

  let ud = { email: user.email, name: user.displayName || 'User' };
  try {
    const snap = await get(ref(db, 'users/' + user.uid));
    if (snap.exists()) ud = snap.val();
  } catch (err) {}

  const name = ud.name || user.displayName || 'User';

  const bal = document.getElementById('topBalanceVal');
  if (bal) {
    const total = Number(ud.totalEarnings || ud.balance || 0);
    bal.textContent = '$' + total.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  renderAvatar(document.getElementById('topAvatar'), ud, name);
  renderAvatar(document.getElementById('pdAvatar'), ud, name);

  const pn = document.getElementById('pdName'); if (pn) pn.textContent = name;
  const pe = document.getElementById('pdEmail'); if (pe) pe.textContent = user.email || ud.email || '';
});
