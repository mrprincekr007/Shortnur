// Shortnur - Landing page logic
import { auth, db, ref, set, get, onAuthStateChanged, signOut, update, SITE_CONFIG, showToast, isValidUrl, normalizeUrl, generateShortCode, copyToClipboard, timeAgo, initMotion } from "./firebase-config.js";

initMotion();

let currentUser = null;
let pendingShortLink = null;

// ---------- Navbar mobile toggle ----------
const menuToggle = document.getElementById('menuToggle');
const navLinks = document.getElementById('navLinks');
menuToggle.addEventListener('click', () => navLinks.classList.toggle('open'));

window.addEventListener('scroll', () => {
  document.querySelector('.navbar').classList.toggle('scrolled', window.scrollY > 20);
});

// ---------- Auth state in navbar ----------
onAuthStateChanged(auth, (user) => {
  currentUser = user;
  renderNavAuth();
  const saveToggle = document.getElementById('saveToggle');
  if (saveToggle) {
    saveToggle.checked = !!user;
    saveToggle.disabled = false;
  }
});

function renderNavAuth() {
  const container = document.getElementById('navAuth');
  if (!container) return;
  if (currentUser) {
    container.innerHTML = `
      <a href="dashboard.html" class="btn btn-primary btn-sm">Dashboard</a>
      <button id="navLogout" class="btn btn-ghost btn-sm">Logout</button>
    `;
    document.getElementById('navLogout').addEventListener('click', async () => {
      await signOut(auth);
      showToast('Logged out successfully', 'success');
    });
  } else {
    container.innerHTML = `
      <a href="login.html" class="btn btn-ghost btn-sm">Login</a>
      <a href="login.html?tab=signup" class="btn btn-primary btn-sm">Sign Up Free</a>
    `;
  }
}

// ---------- Custom alias toggle ----------
const aliasToggle = document.getElementById('customAliasToggle');
const aliasRow = document.getElementById('aliasRow');
aliasToggle.addEventListener('change', () => {
  aliasRow.style.display = aliasToggle.checked ? 'block' : 'none';
});

// ---------- Shorten form ----------
const shortenForm = document.getElementById('shortenForm');
const shortenBtn = document.getElementById('shortenBtn');
const shortenBtnText = document.getElementById('shortenBtnText');

shortenForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const rawUrl = document.getElementById('longUrl').value;
  const url = normalizeUrl(rawUrl);

  if (!isValidUrl(url)) {
    showToast('Please enter a valid URL', 'error');
    return;
  }

  let customAlias = null;
  if (aliasToggle.checked) {
    customAlias = document.getElementById('customAlias').value.trim();
    if (!customAlias) {
      showToast('Please enter a custom alias or turn off the option', 'error');
      return;
    }
    if (!/^[A-Za-z0-9_-]+$/.test(customAlias)) {
      showToast('Alias can only contain letters, numbers, - and _', 'error');
      return;
    }
  }

  setLoading(true);
  try {
    const link = await createLink(url, customAlias);
    pendingShortLink = link;
    showResult(link);
  } catch (err) {
    showToast(err.message || 'Failed to shorten URL', 'error');
  } finally {
    setLoading(false);
  }
});

async function createLink(longUrl, customAlias) {
  // Check custom alias availability
  if (customAlias) {
    const aliasRef = ref(db, 'links/' + customAlias);
    const snap = await get(aliasRef);
    if (snap.exists()) {
      throw new Error('This custom alias is already taken. Try another one.');
    }
  }

  let code = customAlias;
  if (!code) {
    code = generateShortCode(6);
    const checkRef = ref(db, 'links/' + code);
    const snap = await get(checkRef);
    if (snap.exists()) {
      code = generateShortCode(6);
    }
  }

  const linkData = {
    code: code,
    longUrl: longUrl,
    createdAt: Date.now(),
    clicks: 0,
    status: 'active',
    isCustom: !!customAlias,
    uid: currentUser ? currentUser.uid : 'guest',
    createdBy: currentUser ? currentUser.email : 'Guest',
  };

  if (currentUser) {
    linkData.uid = currentUser.uid;
  }

  await set(ref(db, 'links/' + code), linkData);

  if (currentUser) {
    // Update user's link count
    const userRef = ref(db, 'users/' + currentUser.uid);
    const userSnap = await get(userRef);
    if (userSnap.exists()) {
      await update(userRef, {
        linksCount: (userSnap.val().linksCount || 0) + 1,
      });
    }
  }

  return { ...linkData, shortUrl: SITE_CONFIG.shortBaseUrl + '/' + code };
}

function setLoading(isLoading) {
  if (isLoading) {
    shortenBtn.disabled = true;
    shortenBtnText.textContent = 'Shortening...';
    shortenBtn.innerHTML = '<span class="spinner"></span> Shortening...';
  } else {
    shortenBtn.disabled = false;
    shortenBtn.innerHTML = 'Shorten URL';
  }
}

function showResult(link) {
  const resultBox = document.getElementById('resultBox');
  const resultUrl = document.getElementById('resultUrl');
  const resultMeta = document.getElementById('resultMeta');
  const saveLinkBtn = document.getElementById('saveLinkBtn');

  resultUrl.textContent = link.shortUrl;
  resultUrl.href = link.shortUrl;
  resultMeta.textContent = `Created ${timeAgo(link.createdAt)} · ` + (currentUser ? 'Saved to your account' : 'Guest link');

  saveLinkBtn.style.display = currentUser ? 'none' : 'inline-flex';

  resultBox.classList.remove('show');
  void resultBox.offsetWidth;
  resultBox.classList.add('show');
  resultBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

document.getElementById('copyResultBtn').addEventListener('click', () => {
  if (pendingShortLink) {
    copyToClipboard(pendingShortLink.shortUrl);
  }
});

// Guest can save link after registering
document.getElementById('saveLinkBtn').addEventListener('click', () => {
  // Store the pending link in sessionStorage and redirect to login/signup page
  if (pendingShortLink) {
    sessionStorage.setItem('pendingLink', JSON.stringify(pendingShortLink));
  }
  window.location.href = 'login.html';
});
