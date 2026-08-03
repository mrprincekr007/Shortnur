// Shortnur - Tools page logic (QR generator + bulk shortener)
import { auth, db, ref, get, onAuthStateChanged, signOut, set, update, SITE_CONFIG, showToast, copyToClipboard, normalizeUrl, isValidUrl, generateShortCode, escapeHtml, shortenDisplay, icon, initMotion, renderAvatar } from "./firebase-config.js";

initMotion();

let currentUser = null;
let userData = null;
let qrCodeUrl = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = 'login.html';
    return;
  }
  currentUser = user;
  userData = {};

  try {
    const snap = await get(ref(db, 'users/' + currentUser.uid));
    userData = snap.exists() ? snap.val() : {};
  } catch (err) {
    console.error('Profile load failed:', err);
    showToast('Database access blocked. Please set Firebase Realtime Database rules and refresh.', 'error', 6000);
  }

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

  document.getElementById('qrGenerateBtn').addEventListener('click', generateQR);
  document.getElementById('qrDownloadBtn').addEventListener('click', downloadQR);
  document.getElementById('bulkShortenBtn').addEventListener('click', bulkShorten);
});

// ---------- QR CODE ----------
function generateQR() {
  const rawUrl = document.getElementById('qrUrl').value;
  const url = normalizeUrl(rawUrl);

  if (!isValidUrl(url)) {
    showToast('Please enter a valid URL', 'error');
    return;
  }

  const qrResult = document.getElementById('qrResult');
  const placeholder = document.getElementById('qrPlaceholder');
  const downloadBtn = document.getElementById('qrDownloadBtn');

  qrCodeUrl = url;
  qrResult.innerHTML = '';
  placeholder.classList.add('hidden');
  qrResult.classList.remove('hidden');
  downloadBtn.classList.remove('hidden');

  // Use API-based QR generation (works without local libs)
  const img = document.createElement('img');
  img.src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(url)}`;
  img.alt = 'QR Code';
  img.style.width = '100%';
  img.style.height = '100%';
  img.onerror = () => {
    showToast('Failed to generate QR. Please try again.', 'error');
  };
  qrResult.appendChild(img);
  showToast('QR code generated!', 'success');
}

function downloadQR() {
  if (!qrCodeUrl) return;
  window.open(`https://api.qrserver.com/v1/create-qr-code/?size=512x512&data=${encodeURIComponent(qrCodeUrl)}`, '_blank');
}

// ---------- BULK SHORTEN ----------
async function bulkShorten() {
  const rawText = document.getElementById('bulkUrls').value;
  const urls = rawText.split('\n').map((u) => u.trim()).filter(Boolean);

  if (!urls.length) {
    showToast('Please paste at least one URL', 'error');
    return;
  }

  const btn = document.getElementById('bulkShortenBtn');
  btn.disabled = true;
  btn.textContent = 'Shortening...';

  const results = [];
  let created = 0;

  for (const raw of urls) {
    const url = normalizeUrl(raw);
    if (!isValidUrl(url)) {
      results.push({ original: raw, shortUrl: null, error: 'Invalid URL' });
      continue;
    }

    try {
      let code = generateShortCode(6);
      const check = await get(ref(db, 'links/' + code));
      if (check.exists()) code = generateShortCode(6);

      await set(ref(db, 'links/' + code), {
        code,
        longUrl: url,
        title: url,
        uid: currentUser.uid,
        createdBy: currentUser.email,
        createdAt: Date.now(),
        clicks: 0,
        earnings: 0,
        status: 'active',
        isCustom: false,
      });

      results.push({ original: url, shortUrl: SITE_CONFIG.shortBaseUrl + '/' + code, error: null });
      created++;
    } catch (err) {
      results.push({ original: url, shortUrl: null, error: 'Failed' });
    }
  }

  if (created > 0) {
    await update(ref(db, 'users/' + currentUser.uid), {
      linksCount: (userData.linksCount || 0) + created,
    });
    userData.linksCount = (userData.linksCount || 0) + created;
  }

  renderBulkResults(results);
  btn.disabled = false;
  btn.innerHTML = `${icon('zap')} Shorten All`;
  showToast(`${created} links created successfully!`, 'success');
}

function renderBulkResults(results) {
  const container = document.getElementById('bulkResults');
  const tbody = document.getElementById('bulkResultsBody');

  tbody.innerHTML = results.map((r) => `
    <tr>
      <td style="max-width:260px;"><div class="link-dest-small" title="${escapeHtml(r.original)}">${escapeHtml(shortenDisplay(r.original, 40))}</div></td>
      <td>
        ${r.error
          ? `<span class="text-danger">${escapeHtml(r.error)}</span>`
          : `<span class="text-primary" style="font-weight:600;">${escapeHtml(r.shortUrl)}</span>`}
      </td>
      <td style="text-align:right;">
        ${r.error ? '' : `<button class="btn-icon bulk-copy" data-url="${escapeHtml(r.shortUrl)}" title="Copy">${icon('copy')}</button>`}
      </td>
    </tr>
  `).join('');

  container.classList.remove('hidden');
  container.scrollIntoView({ behavior: 'smooth', block: 'center' });

  tbody.querySelectorAll('.bulk-copy').forEach((btn) => {
    btn.addEventListener('click', () => copyToClipboard(btn.dataset.url));
  });
}
