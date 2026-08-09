// ============================================================
// LINK BABA - Login Page
// Self-contained — no shared dependencies
// ============================================================

import { auth, db, ref, push, set, update, remove, get, onValue, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut, sendPasswordResetEmail, updateProfile, updatePassword, deleteUser, reauthenticateWithCredential, EmailAuthProvider, setPersistence, browserLocalPersistence, browserSessionPersistence, SITE_CONFIG } from "../../firebase/firebase-config.js";

// ============ SVG ICONS ============
const ICONS = {
  link: `<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>`,
  dashboard: `<rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/>`,
  chart: `<path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>`,
  money: `<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>`,
  users: `<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>`,
  tools: `<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>`,
  settings: `<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>`,
  'log-out': `<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>`,
  menu: `<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>`,
  search: `<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>`,
  pointer: `<path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/><path d="M13 13l6 6"/>`,
  eye: `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`,
  'eye-off': `<path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 11 8 11 8a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.53 13.53 0 0 0 1 12s4 8 11 8a9.74 9.74 0 0 0 5.39-1.61"/><line x1="1" y1="1" x2="23" y2="23"/>`,
  globe: `<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>`,
  trophy: `<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/>`,
  calendar: `<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>`,
  cash: `<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/>`,
  wallet: `<path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/>`,
  gift: `<polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>`,
  info: `<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>`,
  copy: `<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>`,
  message: `<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>`,
  send: `<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>`,
  share: `<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>`,
  download: `<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>`,
  save: `<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>`,
  zap: `<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>`,
  lock: `<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>`,
  trash: `<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>`,
  headphones: `<path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>`,
  mail: `<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>`,
  'at-sign': `<circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94"/>`,
  user: `<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>`,
  tag: `<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/>`,
  target: `<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>`,
  clock: `<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>`,
  shield: `<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>`,
  smartphone: `<rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>`,
  heart: `<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>`,
  check: `<polyline points="20 6 9 17 4 12"/>`,
  close: `<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>`,
  'chevron-left': `<polyline points="15 18 9 12 15 6"/>`,
  'chevron-right': `<polyline points="9 18 15 12 9 6"/>`,
  'arrow-left': `<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>`,
  play: `<polygon points="6 3 20 12 6 21 6 3"/>`,
  pause: `<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>`,
  edit: `<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/>`,
  refresh: `<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>`,
};

function icon(name, cls = '') {
  const body = ICONS[name];
  if (!body) return '';
  return `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
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
  const toastIcons = { success: icon('check'), error: icon('close'), info: icon('info') };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="toast-icon">${toastIcons[type] || toastIcons.info}</span><span class="toast-msg"></span>`;
  toast.querySelector('.toast-msg').textContent = message;
  container.appendChild(toast);
  setTimeout(() => { toast.classList.add('leaving'); setTimeout(() => toast.remove(), 300); }, duration);
}

// ============ PREMIUM INTERACTIONS ============
function shakeCard() {
  const card = document.querySelector('.auth-card');
  if (!card) return;
  card.classList.remove('shake', 'flash-error');
  void card.offsetWidth;
  card.classList.add('shake', 'flash-error');
  setTimeout(() => card.classList.remove('flash-error'), 600);
}

async function morphSuccess(btn, textEl, message, url, delay = 1000) {
  btn.classList.add('btn-success-state');
  textEl.innerHTML = icon('check');
  textEl.classList.add('success-check');
  showToast(message, 'success');
  await new Promise((r) => setTimeout(r, delay));
  window.location.href = url;
}

function initTilt() {
  const card = document.querySelector('.auth-card');
  if (!card) return;
  const noHover = window.matchMedia('(hover: none)').matches;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (noHover || reduced) return;
  let raf = null;
  card.addEventListener('mousemove', (e) => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      const b = card.getBoundingClientRect();
      const px = (e.clientX - b.left) / b.width - 0.5;
      const py = (e.clientY - b.top) / b.height - 0.5;
      card.style.transform = `perspective(1100px) rotateX(${(-py * 3.5).toFixed(2)}deg) rotateY(${(px * 3.5).toFixed(2)}deg)`;
      raf = null;
    });
  });
  card.addEventListener('mouseleave', () => {
    if (raf) { cancelAnimationFrame(raf); raf = null; }
    card.style.transform = '';
  });
}
initTilt();

function copyToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(() => showToast('Link copied!', 'success')).catch(() => fallbackCopy(text));
  } else { fallbackCopy(text); }
}

function fallbackCopy(text) {
  const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
  document.body.appendChild(ta); ta.select();
  try { document.execCommand('copy'); showToast('Link copied!', 'success'); } catch { showToast('Copy failed.', 'error'); }
  document.body.removeChild(ta);
}

function isValidUrl(s) { try { const u = new URL(s); return u.protocol === 'http:' || u.protocol === 'https:'; } catch { return false; } }
function normalizeUrl(s) { const t = s.trim(); if (!t) return ''; return /^https?:\/\//i.test(t) ? t : 'https://' + t; }
function generateShortCode(len = 6) {
  const c = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const a = new Uint32Array(len); crypto.getRandomValues(a);
  return Array.from(a, (v) => c[v % c.length]).join('');
}
function escapeHtml(s) { if (!s) return ''; const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
function formatNumber(n) { if (n == null) return '0'; if (n >= 1e9) return (n/1e9).toFixed(1).replace(/\.0$/,'')+'B'; if (n >= 1e6) return (n/1e6).toFixed(1).replace(/\.0$/,'')+'M'; if (n >= 1e3) return (n/1e3).toFixed(1).replace(/\.0$/,'')+'K'; return n.toString(); }
function formatDate(ts) { if (!ts) return '—'; return new Date(ts).toLocaleDateString('en-US', { day:'numeric', month:'short', year:'numeric' }); }
function timeAgo(ts) {
  if (!ts) return '—';
  const s = Math.floor((Date.now()-ts)/1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s/60); if (m < 60) return m+' min ago';
  const h = Math.floor(m/60); if (h < 24) return h+' hr ago';
  const d = Math.floor(h/24); if (d < 30) return d+' day'+(d>1?'s':'')+' ago';
  const mo = Math.floor(d/30); if (mo < 12) return mo+' month'+(mo>1?'s':'')+' ago';
  return Math.floor(mo/12)+' yr ago';
}
function getFavicon(url) { try { const u = new URL(url); return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=64`; } catch { return null; } }
function shortenDisplay(url, max = 50) { if (!url) return ''; return url.length > max ? url.substring(0, max-1)+'…' : url; }
function avatarColor(name) {
  const colors = ['#147090','#2FA8CF','#00CEB4','#FF6B6B','#FFB347','#4ECDC4','#A78BFA','#F472B6'];
  let h = 0; const s = name || 'user';
  for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h);
  return colors[Math.abs(h) % colors.length];
}

// ============ AVATAR ============
const AVATAR_EMOJIS = ['😀','😎','🤖','🦊','🐱','🐼','🦁','🐯','🐸','🦄','🐙','🦉','🦋','🐳','🚀','⚡','🔥','🌟','🎯','🎮','🎧','💎','👑','🧿'];
const AVATAR_COLORS = ['#18CBF0','#00E5C7','#FF5E8A','#FFB347','#A78BFA','#F472B6','#4ECDC4','#147090','#FF6B6B','#34D399'];

function renderAvatar(el, userData, name = '') {
  if (!el) return;
  const u = userData || {}; const n = name || u.name || 'User';
  el.classList.remove('has-photo'); el.innerHTML = ''; el.style.background = '';
  if (u.avatarUrl) { el.classList.add('has-photo'); el.innerHTML = `<img src="${u.avatarUrl}" alt="">`; return; }
  if (u.avatarEmoji) { el.textContent = u.avatarEmoji; el.style.background = u.avatarColor || AVATAR_COLORS[0]; return; }
  el.textContent = n.charAt(0).toUpperCase(); el.style.background = u.avatarColor || avatarColor(n);
}

// ============ MOTION ============
function initReveal() {
  const els = document.querySelectorAll('.reveal');
  if (!els.length) return;
  if (!('IntersectionObserver' in window)) { els.forEach((el) => el.classList.add('visible')); return; }
  const obs = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        obs.unobserve(e.target);
        requestAnimationFrame(() => requestAnimationFrame(() => e.target.classList.add('visible')));
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  els.forEach((el) => obs.observe(el));
}
function initRevealAuto() {
  const sel = '.stat-grid > .stat-card, .stats-grid > .stat-card, .card, .section-title, .empty-state, .tool-card, .faq-item, .steps-grid > *, .features-grid > *, .auth-stats > *';
  const dirs = ['from-left', 'from-up', 'from-right'];
  const seen = new WeakSet();
  document.querySelectorAll(sel).forEach((el) => {
    if (el.classList.contains('reveal')) return;
    if (el.closest('nav, footer, .hero, .sidebar')) return;
    el.classList.add('reveal');
    const parent = el.parentElement;
    if (!parent || seen.has(parent)) return;
    seen.add(parent);
    const grp = Array.from(parent.children).filter((c) => c.classList.contains('reveal'));
    if (!grp.length) return;
    const n = grp.length;
    grp.forEach((c, i) => {
      if (n >= 5 && n % 2 === 1 && i === (n - 1) / 2) c.classList.add('zoom-in');
      else c.classList.add(dirs[i % 3]);
    });
  });
}
function initMotion() { initRevealAuto(); initReveal(); initIcons(); }
function animateCounter(el, target, opts = {}) {
  const { prefix = '', suffix = '', duration = 900, decimals = 0 } = opts;
  const startTime = performance.now();
  function tick(now) {
    const p = Math.min((now - startTime) / duration, 1);
    el.textContent = prefix + (target * (1 - Math.pow(1 - p, 3))).toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + suffix;
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

// ============ PAGE CODE ============
// LINK BABA - Login page logic (Login + Forgot password)
initMotion();

// If already logged in, redirect to dashboard
onAuthStateChanged(auth, (user) => {
  if (user) {
    window.location.href = 'dashboard.html';
  }
});

// ---------- Panel switching ----------
function switchTab(tab) {
  document.querySelectorAll('.auth-tab').forEach((t) => {
    if (t.dataset && t.dataset.tab) t.classList.toggle('active', t.dataset.tab === tab);
  });
  document.querySelectorAll('.auth-panel').forEach((p) => {
    p.classList.toggle('active', p.id === 'panel-' + tab);
  });
  const tabs = document.querySelector('.auth-tabs');
  if (tabs) tabs.classList.toggle('hidden', tab === 'forgot');
  document.getElementById('errorAlert').classList.remove('show');
  document.getElementById('forgotError').classList.remove('show');
  document.getElementById('forgotSuccess').classList.remove('show');
}

document.querySelectorAll('.auth-tab[data-tab]').forEach((tabBtn) => {
  tabBtn.addEventListener('click', () => switchTab(tabBtn.dataset.tab));
});

document.getElementById('goForgot').addEventListener('click', (e) => {
  e.preventDefault();
  switchTab('forgot');
});

document.getElementById('goBackLogin').addEventListener('click', (e) => {
  e.preventDefault();
  switchTab('login');
});

// ---------- Password visibility toggles ----------
function togglePassword(inputId, btnId) {
  const pass = document.getElementById(inputId);
  const btn = document.getElementById(btnId);
  pass.type = pass.type === 'password' ? 'text' : 'password';
  btn.innerHTML = icon(pass.type === 'password' ? 'eye' : 'eye-off');
}

document.getElementById('togglePass').addEventListener('click', () => {
  togglePassword('password', 'togglePass');
});

// ---------- Caps lock hint ----------
function initCapsLock(inputId) {
  const input = document.getElementById(inputId);
  const wrap = input.closest('.form-group');
  if (!input || !wrap) return;
  const hint = document.createElement('div');
  hint.className = 'caps-hint hidden';
  hint.innerHTML = icon('info') + '<span>Caps Lock is on</span>';
  wrap.appendChild(hint);
  input.addEventListener('keyup', (e) => {
    try {
      const on = e.getModifierState && e.getModifierState('CapsLock');
      hint.classList.toggle('hidden', !on);
    } catch (_) {}
  });
}

initCapsLock('password');

// ---------- Error alert ----------
const errorAlert = document.getElementById('errorAlert');
function showError(msg) {
  errorAlert.textContent = msg;
  errorAlert.classList.add('show');
  setTimeout(() => errorAlert.classList.remove('show'), 4000);
  shakeCard();
}

// Referral attribution: ?ref=<username or referral code> captured from URL
const REF_PARAM = (new URLSearchParams(window.location.search).get('ref') || '').trim();

// ================= LOGIN =================
const loginForm = document.getElementById('loginForm');
const loginBtn = document.getElementById('loginBtn');
const loginBtnText = document.getElementById('loginBtnText');

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const identifier = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const rememberMe = document.getElementById('rememberMe').checked;

  loginBtn.disabled = true;
  loginBtnText.textContent = 'Logging in...';

  try {
    let email = identifier;
    if (identifier && identifier.indexOf('@') === -1) {
      const unameSnap = await get(ref(db, 'usernames/' + identifier.toLowerCase()));
      if (!unameSnap.exists()) {
        showError('No account found with this username.');
        loginBtn.disabled = false;
        loginBtnText.textContent = 'Login';
        return;
      }
      const userSnap = await get(ref(db, 'users/' + unameSnap.val()));
      if (!userSnap.exists() || !userSnap.val().email) {
        showError('No account found with this username.');
        loginBtn.disabled = false;
        loginBtnText.textContent = 'Login';
        return;
      }
      email = userSnap.val().email;
    }

    try {
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
    } catch (_) {}

    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    const userRef = ref(db, 'users/' + user.uid);
    const snap = await get(userRef);
    if (snap.exists()) {
      await update(userRef, { lastLogin: Date.now() });
    } else {
      await set(userRef, {
        email: user.email,
        createdAt: Date.now(),
        lastLogin: Date.now(),
        linksCount: 0,
        totalClicks: 0,
        plan: 'free',
        role: 'user',
      });
    }

    // Save pending guest link if any
    const pendingLink = sessionStorage.getItem('pendingLink');
    if (pendingLink) {
      try {
        const link = JSON.parse(pendingLink);
        const linkRef = ref(db, 'links/' + link.code);
        await update(linkRef, { uid: user.uid, createdBy: user.email, savedAt: Date.now() });
        sessionStorage.removeItem('pendingLink');
      } catch (_) {}
    }

    await morphSuccess(loginBtn, loginBtnText, 'Welcome back! Logged in successfully.', 'dashboard.html', 900);
  } catch (err) {
    showError(getLoginError(err));
    loginBtn.disabled = false;
    loginBtnText.textContent = 'Login';
  }
});

function getLoginError(err) {
  switch (err.code) {
    case 'auth/user-not-found':
      return 'No account found with this email. Create one free instead.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return "That email or password doesn't look right. Check and try again.";
    case 'auth/too-many-requests':
      return 'Too many attempts. Take a short break and try again.';
    case 'auth/invalid-email':
      return "That doesn't look like a valid email. Double-check it.";
    case 'auth/network-request-failed':
      return "Can't reach the server. Check your connection and try again.";
    default:
      return err.message || 'Failed to login. Please try again.';
  }
}

// ================= GOOGLE LOGIN =================
function deriveUsername(email) {
  let base = (email || '').split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '').replace(/^_+/, '');
  if (!/^[a-z]/.test(base)) base = 'u' + base;
  if (base.length < 3) base = (base + 'user').slice(0, 20);
  return base.slice(0, 20);
}

async function getAvailableUsername(base) {
  let candidate = base;
  for (let i = 1; i < 100; i++) {
    const snap = await get(ref(db, 'usernames/' + candidate));
    if (!snap.exists()) return candidate;
    candidate = base.slice(0, 19 - String(i).length) + '_' + i;
  }
  return candidate + '_' + Date.now();
}

const googleProvider = new GoogleAuthProvider();

async function handleGoogleLogin(btn) {
  const btnText = btn.querySelector('span');
  const original = btnText.textContent;
  btn.disabled = true;
  btnText.textContent = 'Signing in...';
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    const userRef = ref(db, 'users/' + user.uid);
    const snap = await get(userRef);
    if (snap.exists()) {
      await update(userRef, { lastLogin: Date.now() });
    } else {
      const username = await getAvailableUsername(deriveUsername(user.email));
      const referralCode = generateShortCode(8);
      await set(userRef, {
        name: user.displayName || user.email || '',
        username: username,
        email: user.email,
        avatarUrl: user.photoURL || '',
        referredBy: REF_PARAM || null,
        createdAt: Date.now(),
        lastLogin: Date.now(),
        linksCount: 0,
        totalClicks: 0,
        totalEarnings: 0,
        plan: 'free',
        role: 'user',
        status: 'active',
        referralCode: referralCode,
      });
      await set(ref(db, 'usernames/' + username), user.uid);
    }

    // Save pending guest link if any
    const pendingLink = sessionStorage.getItem('pendingLink');
    if (pendingLink) {
      try {
        const link = JSON.parse(pendingLink);
        const linkRef = ref(db, 'links/' + link.code);
        await update(linkRef, { uid: user.uid, createdBy: user.email, savedAt: Date.now() });
        sessionStorage.removeItem('pendingLink');
      } catch (_) {}
    }

    await morphSuccess(btn, btnText, 'Welcome back! Logged in successfully.', 'dashboard.html', 900);
  } catch (err) {
    showError(getGoogleError(err));
    btn.disabled = false;
    btnText.textContent = original;
  }
}

function getGoogleError(err) {
  switch (err.code) {
    case 'auth/popup-closed-by-user':
      return 'Sign-in cancelled. Please try again.';
    case 'auth/popup-blocked':
      return 'Popup blocked. Please allow popups for this site.';
    case 'auth/cancelled-popup-request':
      return 'Sign-in cancelled. Please try again.';
    case 'auth/account-exists-with-different-credential':
      return 'This email is already registered with another sign-in method. Please login with your email.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your internet connection.';
    case 'auth/unauthorized-domain':
      return 'Google sign-in is not enabled for this domain. Contact support.';
    default:
      return err.message || 'Failed to sign in with Google. Please try again.';
  }
}

document.getElementById('googleLoginBtn').addEventListener('click', () => {
  handleGoogleLogin(document.getElementById('googleLoginBtn'));
});

// ================= FORGOT PASSWORD =================
const forgotForm = document.getElementById('forgotForm');
const resetBtn = document.getElementById('resetBtn');
const resetBtnText = document.getElementById('resetBtnText');
const forgotError = document.getElementById('forgotError');
const forgotSuccess = document.getElementById('forgotSuccess');

function showForgotError(msg) {
  forgotError.textContent = msg;
  forgotError.classList.add('show');
  setTimeout(() => forgotError.classList.remove('show'), 4000);
}

function showForgotSuccess(msg) {
  forgotSuccess.textContent = msg;
  forgotSuccess.classList.add('show');
}

forgotForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('fEmail').value.trim();

  resetBtn.disabled = true;
  resetBtnText.textContent = 'Sending...';

  try {
    await sendPasswordResetEmail(auth, email);
    forgotSuccess.classList.remove('show');
    forgotSuccess.textContent = '';
    showForgotSuccess(`Reset link sent to ${email}. Please check your inbox.`);
    forgotForm.reset();
  } catch (err) {
    let msg = 'Failed to send reset email.';
    if (err.code === 'auth/user-not-found') {
      msg = 'No account found with this email address.';
    } else if (err.code === 'auth/invalid-email') {
      msg = 'Please enter a valid email address.';
    } else if (err.code === 'auth/network-request-failed') {
      msg = 'Network error. Please try again.';
    }
    showForgotError(msg);
  } finally {
    resetBtn.disabled = false;
    resetBtnText.textContent = 'Send Reset Link';
  }
});

// Guarantee animation replays on every visit (incl. back/forward cache)
window.addEventListener('pageshow', function (e) { if (e.persisted) location.reload(); });
