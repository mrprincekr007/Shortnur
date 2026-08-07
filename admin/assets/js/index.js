// ============================================================
// Shortnur Admin - Login Page (Independent)
// ============================================================

import { auth, signInWithEmailAndPassword, onAuthStateChanged, ensureAdmins, isAdminUser } from "../../firebase/firebase-config.js";

// ============ SVG ICONS ============
const ICONS = {
  mail: `<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>`,
  lock: `<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>`,
  eye: `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`,
  shield: `<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>`,
  check: `<polyline points="20 6 9 17 4 12"/>`,
  close: `<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>`,
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

// ============ TOAST ============
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

// ============ INIT ============
initIcons();

onAuthStateChanged(auth, async (user) => {
  if (user) {
    await ensureAdmins();
    if (isAdminUser(user.uid)) {
      window.location.href = 'dashboard.html';
    }
  }
});

document.getElementById('togglePass').addEventListener('click', () => {
  const pass = document.getElementById('password');
  const btn = document.getElementById('togglePass');
  pass.type = pass.type === 'password' ? 'text' : 'password';
  btn.innerHTML = icon(pass.type === 'password' ? 'eye' : 'eye');
});

const errorAlert = document.getElementById('errorAlert');
function showError(msg) {
  errorAlert.textContent = msg;
  errorAlert.classList.add('show');
  setTimeout(() => errorAlert.classList.remove('show'), 5000);
}

const loginForm = document.getElementById('loginForm');
const loginBtn = document.getElementById('loginBtn');
const loginBtnText = document.getElementById('loginBtnText');

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  loginBtn.disabled = true;
  loginBtnText.innerHTML = '<span class="spinner"></span> Signing in...';

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    await ensureAdmins();
    if (!isAdminUser(user.uid)) {
      await auth.signOut();
      showError('Access denied. This account is not authorized to use the admin panel.');
      loginBtn.disabled = false;
      loginBtnText.textContent = 'Sign In';
      return;
    }

    showToast('Welcome back, Admin!', 'success');
    setTimeout(() => { window.location.href = 'dashboard.html'; }, 800);
  } catch (err) {
    let msg = 'Failed to sign in. Please try again.';
    if (err.code === 'auth/user-not-found') msg = 'No account found with this email.';
    else if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') msg = 'Invalid email or password.';
    else if (err.code === 'auth/too-many-requests') msg = 'Too many failed attempts. Please try again later.';
    else if (err.code === 'auth/invalid-email') msg = 'Please enter a valid email address.';
    else if (err.code === 'auth/network-request-failed') msg = 'Network error. Check your connection.';
    showError(msg);
    loginBtn.disabled = false;
    loginBtnText.textContent = 'Sign In';
  }
});
