// Shortnur - Settings page logic
import { auth, db, ref, get, onAuthStateChanged, signOut, update, remove, reauthenticateWithCredential, EmailAuthProvider, updatePassword, updateProfile, deleteUser, showToast, avatarColor, formatDate, initMotion, renderAvatar, AVATAR_EMOJIS, AVATAR_COLORS } from "./firebase-config.js";

initMotion();

let currentUser = null;
let userData = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = 'login.html';
    return;
  }
  currentUser = user;
  userData = {};
  try {
    await loadData();
  } catch (err) {
    console.error('Data load failed:', err);
    showToast('Database access blocked. Please set Firebase Realtime Database rules and refresh.', 'error', 6000);
    setupEvents();
  }
});

async function loadData() {
  const snap = await get(ref(db, 'users/' + currentUser.uid));
  userData = snap.exists() ? snap.val() : {};

  document.getElementById('loadingScreen').classList.add('hidden');
  document.getElementById('appRoot').classList.remove('hidden');

  const name = userData.name || currentUser.displayName || 'User';
  document.getElementById('userName').textContent = name;
  document.getElementById('userPlan').textContent = (userData.plan || 'free').toUpperCase() + ' plan';

  renderAvatar(document.getElementById('userAvatar'), userData, name);
  renderAvatar(document.getElementById('profileAvatar'), userData, name);
  renderAvatar(document.getElementById('avatarPreview'), userData, name);
  buildAvatarPicker();

  document.getElementById('profileEmail').textContent = currentUser.email;
  document.getElementById('profileJoined').textContent = formatDate(userData.createdAt || Date.now());

  document.getElementById('pName').value = name;
  document.getElementById('pBio').value = userData.bio || '';

  // Notification prefs
  document.getElementById('notifEarnings').checked = userData.notifEarnings !== false;
  document.getElementById('notifWeekly').checked = userData.notifWeekly !== false;
  document.getElementById('notifUpdates').checked = !!userData.notifUpdates;

  setupEvents();
}

function setupEvents() {
  document.getElementById('logoutBtn').addEventListener('click', async () => {
    await signOut(auth);
    window.location.href = 'index.html';
  });

  document.getElementById('menuToggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });

  document.querySelectorAll('[data-close]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.getElementById(btn.dataset.close).classList.remove('show');
    });
  });

  document.getElementById('profileForm').addEventListener('submit', saveProfile);
  document.getElementById('passForm').addEventListener('submit', changePassword);
  document.getElementById('savePrefsBtn').addEventListener('click', savePrefs);
  document.getElementById('deleteAccountBtn').addEventListener('click', () => {
    document.getElementById('deleteAccountModal').classList.add('show');
  });
  document.getElementById('confirmDeleteAccount').addEventListener('click', confirmDeleteAccount);
}

// ---------- PROFILE ----------
async function saveProfile(e) {
  e.preventDefault();
  const name = document.getElementById('pName').value.trim();
  const bio = document.getElementById('pBio').value.trim();

  const successEl = document.getElementById('profileSuccess');
  const errorEl = document.getElementById('profileError');
  successEl.classList.remove('show');
  errorEl.classList.remove('show');

  if (name.length < 2) {
    errorEl.textContent = 'Name must be at least 2 characters.';
    errorEl.classList.add('show');
    return;
  }

  try {
    await update(ref(db, 'users/' + currentUser.uid), { name, bio });
    try {
      await updateProfile(currentUser, { displayName: name });
    } catch (_) {}

    document.getElementById('userName').textContent = name;
    renderAvatar(document.getElementById('userAvatar'), userData, name);
    renderAvatar(document.getElementById('profileAvatar'), userData, name);
    userData.name = name;

    successEl.textContent = 'Profile updated successfully!';
    successEl.classList.add('show');
    setTimeout(() => successEl.classList.remove('show'), 3000);
  } catch (err) {
    errorEl.textContent = 'Failed to update profile.';
    errorEl.classList.add('show');
  }
}

// ---------- PASSWORD ----------
async function changePassword(e) {
  e.preventDefault();
  const currentPass = document.getElementById('currentPass').value;
  const newPass = document.getElementById('newPass').value;
  const confirmPass = document.getElementById('confirmNewPass').value;

  const successEl = document.getElementById('passSuccess');
  const errorEl = document.getElementById('passError');
  successEl.classList.remove('show');
  errorEl.classList.remove('show');

  if (newPass.length < 6) {
    errorEl.textContent = 'New password must be at least 6 characters.';
    errorEl.classList.add('show');
    return;
  }
  if (newPass !== confirmPass) {
    errorEl.textContent = 'New passwords do not match.';
    errorEl.classList.add('show');
    return;
  }

  try {
    const credential = EmailAuthProvider.credential(currentUser.email, currentPass);
    await reauthenticateWithCredential(currentUser, credential);
    await updatePassword(currentUser, newPass);
    successEl.textContent = 'Password changed successfully!';
    successEl.classList.add('show');
    document.getElementById('passForm').reset();
    setTimeout(() => successEl.classList.remove('show'), 3000);
  } catch (err) {
    if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
      errorEl.textContent = 'Current password is incorrect.';
    } else {
      errorEl.textContent = 'Failed to change password. Please try again.';
    }
    errorEl.classList.add('show');
  }
}

// ---------- PREFERENCES ----------
async function savePrefs() {
  const prefs = {
    notifEarnings: document.getElementById('notifEarnings').checked,
    notifWeekly: document.getElementById('notifWeekly').checked,
    notifUpdates: document.getElementById('notifUpdates').checked,
  };

  try {
    await update(ref(db, 'users/' + currentUser.uid), prefs);
    showToast('Preferences saved!', 'success');
  } catch (err) {
    showToast('Failed to save preferences', 'error');
  }
}

// ---------- DELETE ACCOUNT ----------
async function confirmDeleteAccount() {
  const password = document.getElementById('delPass').value;
  const btn = document.getElementById('confirmDeleteAccount');
  btn.disabled = true;

  if (!password) {
    showToast('Please enter your password', 'error');
    btn.disabled = false;
    return;
  }

  try {
    const credential = EmailAuthProvider.credential(currentUser.email, password);
    await reauthenticateWithCredential(currentUser, credential);

    // Delete all user links
    const linksSnap = await get(ref(db, 'links'));
    const removals = [];
    linksSnap.forEach((child) => {
      const link = child.val();
      if (link.uid === currentUser.uid) {
        removals.push(remove(ref(db, 'links/' + child.key)));
        removals.push(remove(ref(db, 'clicks/' + link.code)));
      }
    });
    await Promise.all(removals);

    // Delete user data
    await remove(ref(db, 'users/' + currentUser.uid));

    // Delete auth account
    await deleteUser(currentUser);

    showToast('Account deleted. Goodbye!', 'success');
    setTimeout(() => (window.location.href = 'index.html'), 1200);
  } catch (err) {
    if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
      showToast('Incorrect password. Please try again.', 'error');
    } else if (err.code === 'auth/requires-recent-login') {
      showToast('Please login again and retry.', 'error');
      signOut(auth);
    } else {
      showToast('Failed to delete account.', 'error');
    }
    btn.disabled = false;
  }
}

// ---------- AVATAR ----------
let selectedEmoji = null;
let selectedColor = null;

function buildAvatarPicker() {
  selectedEmoji = userData.avatarEmoji || null;
  selectedColor = userData.avatarColor || null;
  document.getElementById('avatarUrl').value = userData.avatarUrl || '';

  const eg = document.getElementById('emojiGrid');
  eg.innerHTML = '';
  AVATAR_EMOJIS.forEach((e) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'emoji-opt' + (selectedEmoji === e ? ' selected' : '');
    b.textContent = e;
    b.addEventListener('click', () => {
      selectedEmoji = e;
      eg.querySelectorAll('.emoji-opt').forEach((x) => x.classList.remove('selected'));
      b.classList.add('selected');
      updateAvatarPreview();
    });
    eg.appendChild(b);
  });

  const cr = document.getElementById('colorRow');
  cr.innerHTML = '';
  AVATAR_COLORS.forEach((c) => {
    const s = document.createElement('button');
    s.type = 'button';
    s.className = 'color-opt' + (selectedColor === c ? ' selected' : '');
    s.style.background = c;
    s.addEventListener('click', () => {
      selectedColor = c;
      cr.querySelectorAll('.color-opt').forEach((x) => x.classList.remove('selected'));
      s.classList.add('selected');
      updateAvatarPreview();
    });
    cr.appendChild(s);
  });
}

function updateAvatarPreview() {
  const url = document.getElementById('avatarUrl').value.trim();
  renderAvatar(document.getElementById('avatarPreview'), {
    avatarEmoji: selectedEmoji,
    avatarColor: selectedColor,
    avatarUrl: url
  }, userData.name);
}

document.getElementById('avatarUrl').addEventListener('input', updateAvatarPreview);

document.getElementById('saveAvatarBtn').addEventListener('click', async () => {
  const avatarUrl = document.getElementById('avatarUrl').value.trim();
  try {
    await update(ref(db, 'users/' + currentUser.uid), {
      avatarEmoji: selectedEmoji || '',
      avatarColor: selectedColor || '',
      avatarUrl
    });
    userData.avatarEmoji = selectedEmoji;
    userData.avatarColor = selectedColor;
    userData.avatarUrl = avatarUrl;
    renderAvatar(document.getElementById('userAvatar'), userData, userData.name);
    renderAvatar(document.getElementById('profileAvatar'), userData, userData.name);
    showToast('Avatar saved!', 'success');
  } catch (err) {
    showToast('Failed to save avatar', 'error');
  }
});

document.getElementById('avatarResetBtn').addEventListener('click', () => {
  selectedEmoji = null;
  selectedColor = null;
  document.getElementById('avatarUrl').value = '';
  document.getElementById('emojiGrid').querySelectorAll('.emoji-opt').forEach((x) => x.classList.remove('selected'));
  document.getElementById('colorRow').querySelectorAll('.color-opt').forEach((x) => x.classList.remove('selected'));
  updateAvatarPreview();
});
