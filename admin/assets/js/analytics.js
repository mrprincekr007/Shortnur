// ============================================================
// LINK BABA Admin - Analytics Page (traffic focused)
// ============================================================

import { auth, onAuthStateChanged, signOut, ensureAdmins, isAdminUser } from "../../firebase/firebase-config.js";
import { icon, initIcons, showToast, escapeHtml, formatNumber, animateCounter, downloadCSV, chartOptions, renderEmptyChart, loadAnalyticsData, buildDailySeries, getFavicon, shortenDisplay } from "./admin-lib.js";

// ============ STATE ============
let allLinks = [];
let clickRecords = [];
let adViewRecords = [];
let clicksChart = null;
let countryChart = null;
let deviceChart = null;
let trafficChart = null;
let earningsChart = null;
const chartReady = typeof Chart !== 'undefined';

// ============ INIT ============
initIcons();

onAuthStateChanged(auth, async (user) => {
  if (!user) { window.location.href = 'index.html'; return; }
  await ensureAdmins();
  if (!isAdminUser(user.uid)) { auth.signOut(); window.location.href = 'index.html'; return; }
  document.getElementById('adminEmail').textContent = user.email;
  loadData();
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await signOut(auth);
  window.location.href = 'index.html';
});

document.getElementById('menuToggle').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebarOverlay').classList.toggle('show');
});
document.getElementById('sidebarOverlay').addEventListener('click', () => {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('show');
});

const topbar = document.querySelector('.dash-topbar');
if (topbar) window.addEventListener('scroll', () => topbar.classList.toggle('scrolled', window.scrollY > 20));

document.getElementById('rangeSelect').addEventListener('change', renderAll);
document.getElementById('exportCsvBtn').addEventListener('click', exportDailyCSV);
document.getElementById('exportLinksCsvBtn').addEventListener('click', exportLinksCSV);

// ============ LOAD DATA ============
async function loadData() {
  try {
    const data = await loadAnalyticsData();
    allLinks = data.allLinks;
    clickRecords = data.clickRecords;
    adViewRecords = data.adViewRecords;
    renderAll();
  } catch (err) {
    showToast('Failed to load analytics data.', 'error');
    console.error(err);
  }
}

// ============ RENDER ALL ============
function renderAll() {
  const rangeDays = parseInt(document.getElementById('rangeSelect').value);
  const cutoff = Date.now() - rangeDays * 86400000;
  const rangeClicks = clickRecords.filter((c) => c.timestamp >= cutoff);
  const rangeAdViews = adViewRecords.filter((c) => c.timestamp >= cutoff);

  renderStats(rangeDays, rangeClicks);
  if (chartReady) {
    renderClickChart(rangeDays, rangeClicks);
    renderTrafficChart(rangeDays, rangeClicks, rangeAdViews);
    renderEarningsChart(rangeDays, rangeClicks);
    renderCountryChart(rangeClicks);
    renderDeviceChart(rangeClicks);
  }
  renderTopLinks();
}

// ============ STATS ============
function renderStats(rangeDays, rangeClicks) {
  const totalClicks = rangeClicks.length;
  const visitors = new Set(rangeClicks.map((c) => c.ip).filter(Boolean)).size;
  const countries = new Set(rangeClicks.map((c) => c.country).filter(Boolean)).size;
  const devices = new Set(rangeClicks.map((c) => c.device).filter(Boolean)).size;

  animateCounter(document.getElementById('statClicks'), totalClicks);
  animateCounter(document.getElementById('statVisitors'), visitors);
  animateCounter(document.getElementById('statCountries'), countries);
  animateCounter(document.getElementById('statDevices'), devices);

  const prevStart = cutoffFor(rangeDays * 2);
  const prevEnd = cutoffFor(rangeDays);
  const prevClicks = clickRecords.filter((c) => c.timestamp >= prevStart && c.timestamp < prevEnd).length;
  const deltaEl = document.getElementById('statClicksDelta');
  if (prevClicks > 0) {
    const pct = ((totalClicks - prevClicks) / prevClicks) * 100;
    deltaEl.textContent = (pct >= 0 ? '+' : '') + pct.toFixed(1) + '% vs previous period';
    deltaEl.className = 'stat-change ' + (pct >= 0 ? 'up' : 'down');
  } else {
    deltaEl.textContent = totalClicks + ' clicks this period';
  }
}

function cutoffFor(days) { return Date.now() - days * 86400000; }

// ============ CHARTS ============
function renderClickChart(rangeDays, rangeClicks) {
  const clickMap = {};
  rangeClicks.forEach((c) => { const d = new Date(c.timestamp).toDateString(); clickMap[d] = (clickMap[d] || 0) + 1; });

  const { labels, series } = buildDailySeries(rangeDays, [clickMap]);
  const ctx = document.getElementById('clicksChart').getContext('2d');
  if (clicksChart) clicksChart.destroy();

  clicksChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Clicks',
        data: series[0],
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

function renderTrafficChart(rangeDays, rangeClicks, rangeAdViews) {
  const clickMap = {};
  const adViewMap = {};
  rangeClicks.forEach((c) => { const d = new Date(c.timestamp).toDateString(); clickMap[d] = (clickMap[d] || 0) + 1; });
  rangeAdViews.forEach((c) => { const d = new Date(c.timestamp).toDateString(); adViewMap[d] = (adViewMap[d] || 0) + 1; });

  const { labels, series } = buildDailySeries(rangeDays, [clickMap, adViewMap]);
  const ctx = document.getElementById('trafficChart').getContext('2d');
  if (trafficChart) trafficChart.destroy();

  trafficChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Clicks',
          data: series[0],
          borderColor: '#00CEB4',
          backgroundColor: 'rgba(0, 206, 180, 0.15)',
          fill: true,
          tension: 0.4,
          borderWidth: 2.5,
          pointRadius: 3,
          pointBackgroundColor: '#00CEB4',
        },
        {
          label: 'Ad Views',
          data: series[1],
          borderColor: '#A78BFA',
          backgroundColor: 'rgba(167, 139, 250, 0.12)',
          fill: true,
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 3,
          pointBackgroundColor: '#A78BFA',
          borderDash: [5, 5],
        },
      ],
    },
    options: chartOptions(false),
  });
}

function renderEarningsChart(rangeDays, rangeClicks) {
  const earnMap = {};
  rangeClicks.forEach((c) => {
    if (c.type === 'conversion' && c.earned) {
      const d = new Date(c.timestamp).toDateString();
      earnMap[d] = (earnMap[d] || 0) + c.earned;
    }
  });

  const { labels, series } = buildDailySeries(rangeDays, [earnMap]);
  const ctx = document.getElementById('earningsChart').getContext('2d');
  if (earningsChart) earningsChart.destroy();

  earningsChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Earnings',
        data: series[0],
        backgroundColor: 'rgba(255, 179, 71, 0.55)',
        borderColor: '#FFB347',
        borderWidth: 1.5,
        borderRadius: 6,
      }],
    },
    options: {
      ...chartOptions(false),
      plugins: {
        ...chartOptions(false).plugins,
        legend: { display: false },
        tooltip: {
          backgroundColor: '#131A33',
          borderColor: '#26304f',
          borderWidth: 1,
          titleColor: '#fff',
          bodyColor: '#9AA3BD',
          callbacks: { label: (c) => ' $' + Number(c.parsed.y).toFixed(4) },
        },
      },
      scales: {
        x: { grid: { color: 'rgba(38,48,79,0.3)' }, ticks: { color: '#9AA3BD' } },
        y: { grid: { color: 'rgba(38,48,79,0.3)' }, ticks: { color: '#9AA3BD', callback: (v) => '$' + v }, beginAtZero: true },
      },
    },
  });
}

function renderCountryChart(rangeClicks) {
  const countryMap = {};
  rangeClicks.forEach((c) => { if (c.country) countryMap[c.country] = (countryMap[c.country] || 0) + 1; });
  const sorted = Object.entries(countryMap).sort((a, b) => b[1] - a[1]).slice(0, 7);

  const ctx = document.getElementById('countryChart').getContext('2d');
  if (countryChart) countryChart.destroy();
  if (!sorted.length) { renderEmptyChart(ctx, 'No geo data yet'); return; }

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
  rangeClicks.forEach((c) => { if (c.device) deviceMap[c.device] = (deviceMap[c.device] || 0) + 1; });

  const ctx = document.getElementById('deviceChart').getContext('2d');
  if (deviceChart) deviceChart.destroy();
  if (!Object.keys(deviceMap).length) { renderEmptyChart(ctx, 'No device data yet'); return; }

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

// ============ TOP LINKS ============
function renderTopLinks() {
  const tbody = document.getElementById('topLinksBody');
  const empty = document.getElementById('emptyState');
  if (!allLinks.length) { empty.classList.remove('hidden'); tbody.innerHTML = ''; return; }
  empty.classList.add('hidden');

  const uniqueByCode = {};
  clickRecords.forEach((c) => {
    if (!c.linkCode || !c.ip) return;
    uniqueByCode[c.linkCode] = uniqueByCode[c.linkCode] || new Set();
    uniqueByCode[c.linkCode].add(c.ip);
  });

  tbody.innerHTML = allLinks.slice(0, 15).map(l => {
    const dest = l.url || l.destination || '';
    const favicon = getFavicon(dest);
    const unique = uniqueByCode[l.code] ? uniqueByCode[l.code].size : 0;
    return `
      <tr>
        <td>
          <div class="link-dest">
            <div class="favicon">${favicon ? `<img src="${favicon}" alt="">` : icon('link')}</div>
            <span class="link-url" title="${escapeHtml(dest)}">${escapeHtml(shortenDisplay(dest))}</span>
          </div>
        </td>
        <td><span class="link-code">${escapeHtml(l.code || '')}</span></td>
        <td><span class="click-count">${icon('pointer')} ${formatNumber(l.clicks || 0)}</span></td>
        <td><span class="click-count">${icon('users')} ${formatNumber(unique)}</span></td>
        <td><span class="click-count">${icon('eye')} ${formatNumber(l.adViews || 0)}</span></td>
        <td><span class="status-badge ${l.disabled ? 'status-disabled' : 'status-active'}">${l.disabled ? 'Disabled' : 'Active'}</span></td>
      </tr>
    `;
  }).join('');
}

// ============ EXPORT ============
function exportDailyCSV() {
  const rangeDays = parseInt(document.getElementById('rangeSelect').value);
  const now = new Date();
  const cutoff = Date.now() - rangeDays * 86400000;
  const rangeClicks = clickRecords.filter((c) => c.timestamp >= cutoff);

  const clickMap = {};
  const visitorMap = {};
  const countryMap = {};
  rangeClicks.forEach((c) => {
    const d = new Date(c.timestamp).toDateString();
    clickMap[d] = (clickMap[d] || 0) + 1;
    if (c.ip) { visitorMap[d] = visitorMap[d] || new Set(); visitorMap[d].add(c.ip); }
    if (c.country) countryMap[d] = countryMap[d] || new Set();
    if (c.country) countryMap[d].add(c.country);
  });

  const rows = [['Date', 'Clicks', 'Unique Visitors', 'Countries']];
  for (let i = rangeDays - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    const key = d.toDateString();
    rows.push([
      d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
      clickMap[key] || 0,
      visitorMap[key] ? visitorMap[key].size : 0,
      countryMap[key] ? countryMap[key].size : 0,
    ]);
  }

  downloadCSV('linkbaba-analytics-' + rangeDays + 'd.csv', rows);
  showToast('Analytics exported.', 'success');
}

function exportLinksCSV() {
  const uniqueByCode = {};
  clickRecords.forEach((c) => {
    if (!c.linkCode || !c.ip) return;
    uniqueByCode[c.linkCode] = uniqueByCode[c.linkCode] || new Set();
    uniqueByCode[c.linkCode].add(c.ip);
  });

  const rows = [['Code', 'Destination', 'Clicks', 'Unique Visitors', 'Ad Views', 'Status']];
  allLinks.forEach(l => {
    rows.push([
      l.code || '',
      l.url || l.destination || '',
      l.clicks || 0,
      uniqueByCode[l.code] ? uniqueByCode[l.code].size : 0,
      l.adViews || 0,
      l.disabled ? 'Disabled' : 'Active',
    ]);
  });
  downloadCSV('linkbaba-links-analytics.csv', rows);
  showToast('Links analytics exported.', 'success');
}
