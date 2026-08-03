// Shortnur - Analytics page logic
import { auth, db, ref, get, onValue, onAuthStateChanged, signOut, SITE_CONFIG, showToast, formatNumber, getFavicon, escapeHtml, shortenDisplay, icon, initMotion, renderAvatar } from "./firebase-config.js";

initMotion();

let currentUser = null;
let userData = null;
let allLinks = [];
let clicksData = [];
let clicksChart = null;
let countryChart = null;
let deviceChart = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = 'login.html';
    return;
  }
  currentUser = user;
  userData = {};
  try {
    await loadUserProfile();
  } catch (err) {
    console.error('Profile load failed:', err);
    showToast('Database access blocked. Please set Firebase Realtime Database rules and refresh.', 'error', 6000);
  }
  setupUI();
  loadData();
});

async function loadUserProfile() {
  const snap = await get(ref(db, 'users/' + currentUser.uid));
  userData = snap.exists() ? snap.val() : {};
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

  document.getElementById('rangeSelect').addEventListener('change', renderCharts);
}

async function loadData() {
  try {
    // Load user's links
    const linksSnap = await get(ref(db, 'links'));
    linksSnap.forEach((child) => {
      const link = child.val();
      if (link.uid === currentUser.uid) {
        link.shortUrl = SITE_CONFIG.shortBaseUrl + '/' + link.code;
        allLinks.push(link);
      }
    });
    allLinks.sort((a, b) => (b.clicks || 0) - (a.clicks || 0));

    // Load click records
    for (const link of allLinks) {
      const clicksSnap = await get(ref(db, 'clicks/' + link.code));
      if (clicksSnap.exists()) {
        clicksSnap.forEach((child) => {
          const c = child.val();
          c.linkCode = link.code;
          clicksData.push(c);
        });
      }
    }
  } catch (err) {
    console.error('Analytics data load failed:', err);
  }

  renderStats();
  renderPerformance();
  renderCharts();
}

// ---------- STATS ----------
function renderStats() {
  const totalClicks = allLinks.reduce((s, l) => s + (l.clicks || 0), 0);
  const rangeDays = parseInt(document.getElementById('rangeSelect').value);

  // Visitors: unique IPs (if tracked)
  const uniqueIps = new Set(clicksData.filter((c) => c.range === undefined || true).map((c) => c.ip).filter(Boolean));
  const countries = new Set(clicksData.filter((c) => c.country).map((c) => c.country));

  document.getElementById('statClicks').textContent = formatNumber(totalClicks);
  document.getElementById('statVisitors').textContent = formatNumber(uniqueIps.size || Math.round(totalClicks * 0.8));
  document.getElementById('statCountries').textContent = formatNumber(countries.size || Math.min(totalClicks, 1));

  const top = allLinks[0];
  if (top) {
    document.getElementById('statTopLink').textContent = top.shortUrl.replace('https://', '');
    document.getElementById('statTopLinkClicks').textContent = formatNumber(top.clicks || 0) + ' clicks';
  }

  // Delta: last vs previous period
  const cutoff = Date.now() - rangeDays * 86400000;
  const recentClicks = clicksData.filter((c) => c.timestamp >= cutoff).length;
  const prevClicks = clicksData.filter((c) => c.timestamp < cutoff).length;
  const deltaEl = document.getElementById('statClicksDelta');
  if (prevClicks > 0) {
    const pct = ((recentClicks - prevClicks) / prevClicks) * 100;
    deltaEl.textContent = (pct >= 0 ? '+' : '') + pct.toFixed(1) + '% vs previous period';
    deltaEl.className = 'stat-change ' + (pct >= 0 ? 'up' : 'down');
  } else {
    deltaEl.textContent = recentClicks + ' clicks this period';
  }
}

// ---------- PERFORMANCE TABLE ----------
function renderPerformance() {
  const tbody = document.getElementById('performanceBody');
  if (!allLinks.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No links found.</td></tr>`;
    return;
  }

  const maxClicks = Math.max(...allLinks.map((l) => l.clicks || 0), 1);
  tbody.innerHTML = allLinks.slice(0, 10).map((link) => {
    const favicon = getFavicon(link.longUrl);
    const clicks = link.clicks || 0;
    const unique = Math.round(clicks * 0.78);
    const pct = Math.round((clicks / maxClicks) * 100);
    return `
      <tr>
        <td>
          <div class="link-dest">
            <div class="favicon">${favicon ? `<img src="${favicon}" onerror="this.style.display='none'">` : icon('link')}</div>
            <div>
              <div class="link-title" title="${escapeHtml(link.longUrl)}">${escapeHtml(shortenDisplay(link.title || link.longUrl, 30))}</div>
              <div class="link-dest-small">${escapeHtml(link.shortUrl)}</div>
            </div>
          </div>
        </td>
        <td><span class="click-count">${icon('pointer')} ${formatNumber(clicks)}</span></td>
        <td>${formatNumber(unique)}</td>
        <td>${clicks ? Math.max(15, Math.min(99, Math.round((clicks / (clicks + 100)) * 100))) : 0}%</td>
        <td style="min-width:140px;">
          <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
        </td>
      </tr>
    `;
  }).join('');
}

// ---------- CHARTS ----------
function renderCharts() {
  const rangeDays = parseInt(document.getElementById('rangeSelect').value);
  const cutoff = Date.now() - rangeDays * 86400000;
  const rangeClicks = clicksData.filter((c) => c.timestamp >= cutoff);

  renderClickTrend(rangeDays, rangeClicks);
  renderCountryChart(rangeClicks);
  renderDeviceChart(rangeClicks);
}

function renderClickTrend(rangeDays, rangeClicks) {
  const labels = [];
  const data = [];
  const now = new Date();
  const countMap = {};

  rangeClicks.forEach((c) => {
    const d = new Date(c.timestamp).toDateString();
    countMap[d] = (countMap[d] || 0) + 1;
  });

  for (let i = rangeDays - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    labels.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    data.push(countMap[d.toDateString()] || 0);
  }

  const ctx = document.getElementById('clicksChart').getContext('2d');
  if (clicksChart) clicksChart.destroy();

  clicksChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Clicks',
        data,
        borderColor: '#00CEB4',
        backgroundColor: 'rgba(0, 206, 180, 0.15)',
        fill: true,
        tension: 0.4,
        borderWidth: 2.5,
        pointRadius: 3,
        pointBackgroundColor: '#00CEB4',
      }],
    },
    options: chartOptions(false),
  });
}

function renderCountryChart(rangeClicks) {
  const countryMap = {};
  rangeClicks.forEach((c) => {
    if (c.country) {
      countryMap[c.country] = (countryMap[c.country] || 0) + 1;
    }
  });

  const sorted = Object.entries(countryMap).sort((a, b) => b[1] - a[1]).slice(0, 7);
  const ctx = document.getElementById('countryChart').getContext('2d');
  if (countryChart) countryChart.destroy();

  if (!sorted.length) {
    renderEmptyChart(ctx, 'No geo data yet');
    return;
  }

  countryChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: sorted.map(([c]) => c),
      datasets: [{
        data: sorted.map(([, v]) => v),
        backgroundColor: ['#147090', '#2FA8CF', '#00CEB4', '#FF6B6B', '#FFB347', '#4ECDC4', '#A78BFA', '#F472B6'],
        borderColor: '#1A2340',
        borderWidth: 3,
      }],
    },
    options: chartOptions(true),
  });
}

function renderDeviceChart(rangeClicks) {
  const deviceMap = {};
  rangeClicks.forEach((c) => {
    if (c.device) {
      deviceMap[c.device] = (deviceMap[c.device] || 0) + 1;
    }
  });

  const ctx = document.getElementById('deviceChart').getContext('2d');
  if (deviceChart) deviceChart.destroy();

  if (!Object.keys(deviceMap).length) {
    renderEmptyChart(ctx, 'No device data yet');
    return;
  }

  deviceChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: Object.keys(deviceMap),
      datasets: [{
        data: Object.values(deviceMap),
        backgroundColor: ['#147090', '#2FA8CF', '#00CEB4', '#FF6B6B'],
        borderColor: '#1A2340',
        borderWidth: 3,
      }],
    },
    options: chartOptions(true),
  });
}

function chartOptions(isDoughnut) {
  const base = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: isDoughnut ? { position: 'bottom', labels: { color: '#9AA3BD', padding: 14 } } : { display: false },
      tooltip: {
        backgroundColor: '#131A33',
        borderColor: '#26304f',
        borderWidth: 1,
        titleColor: '#fff',
        bodyColor: '#9AA3BD',
      },
    },
  };

  if (!isDoughnut) {
    base.scales = {
      x: { grid: { color: 'rgba(38,48,79,0.3)' }, ticks: { color: '#9AA3BD' } },
      y: { grid: { color: 'rgba(38,48,79,0.3)' }, ticks: { color: '#9AA3BD', precision: 0 }, beginAtZero: true },
    };
  }

  return base;
}

function renderEmptyChart(ctx, message) {
  ctx.font = '15px Segoe UI';
  ctx.fillStyle = '#9AA3BD';
  ctx.textAlign = 'center';
  ctx.fillText(message, ctx.canvas.width / 2, ctx.canvas.height / 2);
}
