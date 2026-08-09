// ============================================================
// LINK BABA Admin - Reports Page (user report management)
// ============================================================

import { auth, db, ref, onValue, update, onAuthStateChanged, signOut, ensureAdmins, isAdminUser } from "../../firebase/firebase-config.js";
import { icon, initIcons, showToast, escapeHtml, formatDate } from "./admin-lib.js";

// ============ STATE ============
let supportMessages = [];
let usersById = {};
let reportFilter = 'all';
let reportPage = 1;
const reportsPerPage = 50;

// ============ CONSTANTS ============
const TOPIC_LABELS = {
  account: 'Account Issues',
  earnings: 'Earnings / Withdrawal',
  links: 'Links not working',
  analytics: 'Analytics',
  abuse: 'Report Abuse',
  other: 'Other',
};

const STATUS_LABELS = { new: 'New', 'in-review': 'In Review', resolved: 'Resolved' };

function avatarColor(name) {
  const colors = ['#147090', '#2FA8CF', '#00CEB4', '#FF6B6B', '#FFB347', '#4ECDC4', '#A78BFA', '#F472B6'];
  let h = 0; const s = name || 'user';
  for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h);
  return colors[Math.abs(h) % colors.length];
}

// ============ INIT ============
initIcons();

onAuthStateChanged(auth, async (user) => {
  if (!user) { window.location.href = 'index.html'; return; }
  await ensureAdmins();
  if (!isAdminUser(user.uid)) { auth.signOut(); window.location.href = 'index.html'; return; }
  document.getElementById('adminEmail').textContent = user.email;
  initUserReports();
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

document.getElementById('reportFilter').addEventListener('change', (e) => { reportFilter = e.target.value; reportPage = 1; renderUserReports(); });

// ============ USER REPORTS ============
function initUserReports() {
  onValue(ref(db, 'users'), (snap) => {
    usersById = {};
    if (snap.exists()) {
      snap.forEach((child) => {
        usersById[child.key] = child.val();
      });
    }
    renderUserReports();
  });
  onValue(ref(db, 'supportMessages'), (snap) => {
    supportMessages = [];
    if (snap.exists()) {
      snap.forEach((child) => {
        const v = child.val();
        v.id = child.key;
        supportMessages.push(v);
      });
    }
    supportMessages.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    renderUserReports();
  });
}

function renderUserReports() {
  const tbody = document.getElementById('userReportsBody');
  const empty = document.getElementById('userReportsEmpty');

  const newCount = supportMessages.filter((m) => m.status === 'new' || !m.status).length;
  const reviewCount = supportMessages.filter((m) => m.status === 'in-review').length;
  const resolvedCount = supportMessages.filter((m) => m.status === 'resolved').length;
  document.getElementById('statTotalReports').textContent = supportMessages.length;
  document.getElementById('statNewReports').textContent = newCount;
  document.getElementById('statInReview').textContent = reviewCount;
  document.getElementById('statResolved').textContent = resolvedCount;

  const list = reportFilter === 'all' ? supportMessages : supportMessages.filter((m) => (m.status || 'new') === reportFilter);
  if (!list.length) { empty.classList.remove('hidden'); tbody.innerHTML = ''; document.getElementById('reportsPagination').innerHTML = ''; return; }
  empty.classList.add('hidden');

  const totalPages = Math.ceil(list.length / reportsPerPage);
  if (reportPage > totalPages) reportPage = totalPages;
  const start = (reportPage - 1) * reportsPerPage;
  const pageItems = list.slice(start, start + reportsPerPage);

  tbody.innerHTML = pageItems.map((m) => {
    const userName = m.name || m.email || 'User';
    const status = m.status || 'new';
    const msgUser = usersById[m.uid] || {};
    return `
      <tr>
        <td>
          <div class="report-user">
            <div class="report-avatar" style="background:${avatarColor(userName)}">${escapeHtml(userName.charAt(0).toUpperCase())}</div>
            <div class="report-user-meta">
              <b>${escapeHtml(m.name || 'Anonymous')}</b>
              ${msgUser.username ? `<span class="user-handle">@${escapeHtml(msgUser.username)}</span>` : ''}
              <span>${escapeHtml(m.email || '—')}</span>
            </div>
          </div>
        </td>
        <td><span class="topic-badge">${escapeHtml(TOPIC_LABELS[m.topic] || m.topic || 'Other')}</span></td>
        <td><p class="report-msg" title="${escapeHtml(m.message)}">${escapeHtml(m.message)}</p></td>
        <td><span class="status-badge status-${status}">${escapeHtml(STATUS_LABELS[status] || 'New')}</span></td>
        <td><span class="report-date">${formatDate(m.createdAt)}</span></td>
        <td><div class="action-cell">
          ${status !== 'in-review' ? `<button class="btn btn-ghost btn-sm" data-action="in-review" data-id="${m.id}">Review</button>` : ''}
          ${status !== 'resolved' ? `<button class="btn btn-ghost btn-sm" data-action="resolved" data-id="${m.id}">Resolve</button>` : ''}
        </div></td>
      </tr>
    `;
  }).join('');

  tbody.querySelectorAll('[data-action]').forEach((btn) => {
    btn.addEventListener('click', () => updateReportStatus(btn.dataset.id, btn.dataset.action));
  });

  // Pagination
  const pag = document.getElementById('reportsPagination');
  if (totalPages <= 1) { pag.innerHTML = ''; return; }
  let ph = '';
  ph += `<button class="page-btn" ${reportPage === 1 ? 'disabled' : ''} onclick="window.__reportPage(${reportPage - 1})">${icon('chevron-left')}</button>`;
  for (let i = 1; i <= totalPages; i++) {
    ph += `<button class="page-btn ${i === reportPage ? 'active' : ''}" onclick="window.__reportPage(${i})">${i}</button>`;
  }
  ph += `<button class="page-btn" ${reportPage === totalPages ? 'disabled' : ''} onclick="window.__reportPage(${reportPage + 1})">${icon('chevron-right')}</button>`;
  pag.innerHTML = ph;
}

window.__reportPage = (p) => { reportPage = p; renderUserReports(); };

async function updateReportStatus(id, status) {
  try {
    await update(ref(db, 'supportMessages/' + id), { status, updatedAt: Date.now() });
    showToast('Report marked as ' + STATUS_LABELS[status] + '.', 'success');
  } catch (err) {
    console.error(err);
    showToast('Failed to update report.', 'error');
  }
}
