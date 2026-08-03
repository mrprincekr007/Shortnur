// Shortnur - Earnings page logic
import { auth, db, ref, get, onAuthStateChanged, signOut, push, update, SITE_CONFIG, showToast, formatNumber, getFavicon, escapeHtml, shortenDisplay, icon, initMotion, renderAvatar } from "./firebase-config.js";

initMotion();

let currentUser = null;
let userData = null;
let allLinks = [];

const RATE_PER_1000 = 0.50;
const MIN_WITHDRAW = 10;

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = 'login.html';
    return;
  }
  currentUser = user;
  try {
    await loadData();
  } catch (err) {
    console.error('Data load failed:', err);
    showToast('Database access blocked. Please set Firebase Realtime Database rules and refresh.', 'error', 6000);
    setupUI();
  }
});

async function loadData() {
  const userSnap = await get(ref(db, 'users/' + currentUser.uid));
  userData = userSnap.exists() ? userSnap.val() : {};

  const linksSnap = await get(ref(db, 'links'));
  linksSnap.forEach((child) => {
    const link = child.val();
    if (link.uid === currentUser.uid) {
      link.shortUrl = SITE_CONFIG.shortBaseUrl + '/' + link.code;
      allLinks.push(link);
    }
  });
  allLinks.sort((a, b) => (b.earnings || 0) - (a.earnings || 0));

  setupUI();
  renderStats();
  renderEarningsTable();
}

function setupUI() {
  document.getElementById('loadingScreen').classList.add('hidden');
  document.getElementById('appRoot').classList.remove('hidden');

  const name = userData.name || currentUser.displayName || 'User';
  document.getElementById('userName').textContent = name;
  document.getElementById('userPlan').textContent = (userData.plan || 'free').toUpperCase() + ' plan';
  const avatar = document.getElementById('userAvatar');
  renderAvatar(avatar, userData, name);

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

  document.getElementById('withdrawBtn').addEventListener('click', openWithdrawModal);
  document.getElementById('withdrawForm').addEventListener('submit', handleWithdraw);
}

function renderStats() {
  const totalEarnings = userData.totalEarnings || 0;
  const monthEarnings = userData.monthEarnings || 0;
  const totalClicks = allLinks.reduce((s, l) => s + (l.clicks || 0), 0);

  document.getElementById('totalEarnings').textContent = '$' + totalEarnings.toFixed(2);
  document.getElementById('monthEarnings').textContent = '$' + monthEarnings.toFixed(2);
  document.getElementById('totalClicks').textContent = formatNumber(totalClicks);
  document.getElementById('rate').textContent = '$' + RATE_PER_1000.toFixed(2);
}

function renderEarningsTable() {
  const tbody = document.getElementById('earningsBody');
  if (!allLinks.length) {
    tbody.innerHTML = `<tr><td colspan="3" class="text-center text-muted">No links yet. Create links to start earning!</td></tr>`;
    return;
  }

  tbody.innerHTML = allLinks.slice(0, 10).map((link) => {
    const favicon = getFavicon(link.longUrl);
    const clicks = link.clicks || 0;
    const earned = link.earnings || 0;
    return `
      <tr>
        <td>
          <div class="link-dest">
            <div class="favicon">${favicon ? `<img src="${favicon}" onerror="this.style.display='none'">` : icon('link')}</div>
            <div>
              <div class="link-title">${escapeHtml(shortenDisplay(link.title || link.longUrl, 30))}</div>
              <div class="link-dest-small">${escapeHtml(link.shortUrl)}</div>
            </div>
          </div>
        </td>
        <td><span class="click-count">${icon('pointer')} ${formatNumber(clicks)}</span></td>
        <td style="font-weight:700;color:var(--success);">$${earned.toFixed(2)}</td>
      </tr>
    `;
  }).join('');
}

function openWithdrawModal() {
  const balance = userData.totalEarnings || 0;
  document.getElementById('wBalance').textContent = '$' + balance.toFixed(2);
  document.getElementById('withdrawModal').classList.add('show');
}

async function handleWithdraw(e) {
  e.preventDefault();
  const method = document.getElementById('wMethod').value;
  const account = document.getElementById('wAccount').value.trim();
  const balance = userData.totalEarnings || 0;

  if (balance < MIN_WITHDRAW) {
    showToast(`Minimum withdrawal is $${MIN_WITHDRAW}. You need $${(MIN_WITHDRAW - balance).toFixed(2)} more.`, 'error');
    return;
  }
  if (!account) {
    showToast('Please enter your payment details.', 'error');
    return;
  }

  const btn = document.getElementById('withdrawSubmitBtn');
  btn.disabled = true;

  try {
    const requestRef = push(ref(db, 'withdrawals'));
    await update(requestRef, {
      uid: currentUser.uid,
      email: currentUser.email,
      method,
      account,
      amount: balance,
      status: 'pending',
      requestedAt: Date.now(),
    });

    await update(ref(db, 'users/' + currentUser.uid), {
      totalEarnings: 0,
      pendingWithdrawal: balance,
    });

    showToast('Withdrawal request submitted! We will process it within 48 hours.', 'success');
    document.getElementById('withdrawModal').classList.remove('show');
    document.getElementById('withdrawForm').reset();
    btn.disabled = false;

    setTimeout(() => window.location.reload(), 1200);
  } catch (err) {
    showToast('Failed to submit request. Please try again.', 'error');
    btn.disabled = false;
  }
}
