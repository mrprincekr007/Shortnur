// Shortnur - Referrals page logic
import { auth, db, ref, get, onAuthStateChanged, signOut, update, showToast, copyToClipboard, formatDate, timeAgo, formatNumber, escapeHtml, icon, initMotion, generateShortCode, renderAvatar } from "./firebase-config.js";

initMotion();

let currentUser = null;
let userData = null;
let referredUsers = [];

const APP_URL = 'https://shortnur.com';
const COMMISSION = 0.20;

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
    setupUI();
  }
});

async function loadData() {
  const snap = await get(ref(db, 'users/' + currentUser.uid));
  userData = snap.exists() ? snap.val() : {};

  if (!userData.referralCode) {
    const code = generateShortCode(8);
    userData.referralCode = code;
    await update(ref(db, 'users/' + currentUser.uid), { referralCode: code });
  }

  // Load referred users (users who have this user's referralCode)
  const usersSnap = await get(ref(db, 'users'));
  usersSnap.forEach((child) => {
    const u = child.val();
    if (u.referredBy === userData.referralCode || u.referredBy === currentUser.uid) {
      referredUsers.push({
        name: u.name || u.email || 'User',
        email: u.email || '',
        joined: u.createdAt || 0,
        earnings: u.totalEarnings || 0,
      });
    }
  });
  referredUsers.sort((a, b) => b.joined - a.joined);

  setupUI();
  renderAll();
}

function setupUI() {
  document.getElementById('loadingScreen').classList.add('hidden');
  document.getElementById('appRoot').classList.remove('hidden');

  const name = userData.name || currentUser.displayName || 'User';
  document.getElementById('userName').textContent = name;
  document.getElementById('userPlan').textContent = (userData.plan || 'free').toUpperCase() + ' plan';
  renderAvatar(document.getElementById('userAvatar'), userData, name);

  document.getElementById('logoutBtn').addEventListener('click', async () => {
    await signOut(auth);
    window.location.href = 'index.html';
  });

  document.getElementById('menuToggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });

  document.getElementById('copyReferralBtn').addEventListener('click', () => {
    copyToClipboard(APP_URL + '/?ref=' + userData.referralCode);
  });
}

function renderAll() {
  const referralLink = APP_URL + '/?ref=' + userData.referralCode;
  document.getElementById('referralLink').textContent = referralLink;

  const encodedLink = encodeURIComponent(referralLink);
  document.getElementById('shareWhatsApp').href = `https://wa.me/?text=${encodeURIComponent('Join Shortnur and earn money from your links! ' + referralLink)}`;
  document.getElementById('shareTelegram').href = `https://t.me/share/url?url=${encodedLink}&text=${encodeURIComponent('Join Shortnur and earn money from your links!')}`;
  document.getElementById('shareTwitter').href = `https://twitter.com/intent/tweet?text=${encodeURIComponent('Earn money from your links with Shortnur! ' + referralLink)}`;

  document.getElementById('statReferred').textContent = formatNumber(referredUsers.length);

  const totalCommission = referredUsers.reduce((s, u) => s + u.earnings * COMMISSION, 0);
  document.getElementById('statRefEarnings').textContent = '$' + totalCommission.toFixed(2);

  renderReferredTable();
}

function renderReferredTable() {
  const tbody = document.getElementById('referredBody');
  if (!referredUsers.length) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">No referrals yet. Share your link to start earning!</td></tr>`;
    return;
  }

  tbody.innerHTML = referredUsers.map((u) => `
    <tr>
      <td>
        <div class="link-dest">
          <div class="favicon">${icon('user')}</div>
          <div>
            <div class="link-title">${escapeHtml(u.name)}</div>
            <div class="link-dest-small">${escapeHtml(u.email)}</div>
          </div>
        </div>
      </td>
      <td class="text-muted" title="${formatDate(u.joined)}">${timeAgo(u.joined)}</td>
      <td style="font-weight:600;">$${u.earnings.toFixed(2)}</td>
      <td style="font-weight:700;color:var(--success);">$${(u.earnings * COMMISSION).toFixed(2)}</td>
    </tr>
  `).join('');
}
