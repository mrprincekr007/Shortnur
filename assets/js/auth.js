// Shortnur - Combined auth page logic (Login + Signup tabs)
import { auth, db, ref, get, set, update, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, setPersistence, browserLocalPersistence, browserSessionPersistence, sendPasswordResetEmail, showToast, generateShortCode, icon, initMotion } from "./firebase-config.js";

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
    t.classList.toggle('active', t.dataset.tab === tab);
  });
  document.querySelectorAll('.auth-panel').forEach((p) => {
    p.classList.toggle('active', p.id === 'panel-' + tab);
  });
  document.querySelector('.auth-tabs').classList.toggle('hidden', tab === 'forgot');
  document.getElementById('errorAlert').classList.remove('show');
  document.getElementById('forgotError').classList.remove('show');
  document.getElementById('forgotSuccess').classList.remove('show');
}

document.querySelectorAll('.auth-tab').forEach((tabBtn) => {
  tabBtn.addEventListener('click', () => switchTab(tabBtn.dataset.tab));
});

document.getElementById('goSignup').addEventListener('click', (e) => {
  e.preventDefault();
  switchTab('signup');
});

document.getElementById('goLogin').addEventListener('click', (e) => {
  e.preventDefault();
  switchTab('login');
});

document.getElementById('goForgot').addEventListener('click', (e) => {
  e.preventDefault();
  switchTab('forgot');
});

document.getElementById('goBackLogin').addEventListener('click', (e) => {
  e.preventDefault();
  switchTab('login');
});

// Open the signup tab directly when URL contains ?tab=signup
if (new URLSearchParams(window.location.search).get('tab') === 'signup') {
  switchTab('signup');
}

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

document.getElementById('togglePass2').addEventListener('click', () => {
  togglePassword('sPassword', 'togglePass2');
});

// ---------- Error alert ----------
const errorAlert = document.getElementById('errorAlert');
function showError(msg) {
  errorAlert.textContent = msg;
  errorAlert.classList.add('show');
  setTimeout(() => errorAlert.classList.remove('show'), 4000);
}

// ================= LOGIN =================
const loginForm = document.getElementById('loginForm');
const loginBtn = document.getElementById('loginBtn');
const loginBtnText = document.getElementById('loginBtnText');

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const rememberMe = document.getElementById('rememberMe').checked;

  loginBtn.disabled = true;
  loginBtnText.textContent = 'Logging in...';

  try {
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

    showToast('Welcome back! Logged in successfully.', 'success');
    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 800);
  } catch (err) {
    showError(getLoginError(err));
    loginBtn.disabled = false;
    loginBtnText.textContent = 'Login';
  }
});

function getLoginError(err) {
  switch (err.code) {
    case 'auth/user-not-found':
      return 'No account found with this email. Please sign up first.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Invalid email or password.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please try again later.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your internet connection.';
    default:
      return err.message || 'Failed to login. Please try again.';
  }
}

// ================= SIGNUP =================
const signupForm = document.getElementById('signupForm');
const signupBtn = document.getElementById('signupBtn');
const signupBtnText = document.getElementById('signupBtnText');

signupForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('sEmail').value.trim();
  const password = document.getElementById('sPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  if (name.length < 2) {
    showError('Please enter your full name.');
    return;
  }
  if (password.length < 6) {
    showError('Password must be at least 6 characters.');
    return;
  }
  if (password !== confirmPassword) {
    showError('Passwords do not match.');
    return;
  }

  signupBtn.disabled = true;
  signupBtnText.textContent = 'Creating account...';

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    try {
      await updateProfile(user, { displayName: name });
    } catch (_) {}

    const referralCode = generateShortCode(8);
    await set(ref(db, 'users/' + user.uid), {
      name: name,
      email: email,
      createdAt: Date.now(),
      lastLogin: Date.now(),
      linksCount: 0,
      totalClicks: 0,
      totalEarnings: 0,
      plan: 'free',
      role: 'user',
      status: 'active',
      referralCode: referralCode,
      avatarUrl: '',
    });

    // Save pending guest link
    const pendingLink = sessionStorage.getItem('pendingLink');
    if (pendingLink) {
      try {
        const link = JSON.parse(pendingLink);
        const linkRef = ref(db, 'links/' + link.code);
        await update(linkRef, { uid: user.uid, createdBy: user.email, savedAt: Date.now() });
        sessionStorage.removeItem('pendingLink');
      } catch (_) {}
    }

    showToast('Account created successfully! Welcome to Shortnur.', 'success');
    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 1200);
  } catch (err) {
    showError(getSignupError(err));
    signupBtn.disabled = false;
    signupBtnText.textContent = 'Create Account';
  }
});

function getSignupError(err) {
  switch (err.code) {
    case 'auth/email-already-in-use':
      return 'This email is already registered. Please login instead.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/weak-password':
      return 'Password is too weak. Use at least 6 characters.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your internet connection.';
    case 'auth/operation-not-allowed':
      return 'Email/Password sign up is disabled. Contact support.';
    default:
      return err.message || 'Failed to create account. Please try again.';
  }
}

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
