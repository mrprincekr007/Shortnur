// Shortnur - Dashboard logic
import { auth, db, ref, get, onValue, onAuthStateChanged, signOut, set, update, remove, SITE_CONFIG, showToast, copyToClipboard, isValidUrl, normalizeUrl, generateShortCode, formatNumber, formatDate, timeAgo, getFavicon, escapeHtml, shortenDisplay, renderAvatar, icon, initMotion } from "./firebase-config.js";

initMotion();

let currentUser = null;
let userData = null;
let allLinks = [];
let filteredLinks = [];
let currentPage = 1;
let currentFilter = 'all';
let searchTerm = '';
let deleteTarget = null;
let linksListener = null;

const PER_PAGE = 8;

// ================= AUTH GUARD =================
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = 'login.html';
    return;
  }
  currentUser = user;
  userData = {
    email: user.email,
    name: user.displayName || 'User',
    createdAt: Date.now(),
    linksCount: 0,
    totalClicks: 0,
    totalEarnings: 0,
    plan: 'free',
    role: 'user',
  };
  try {
    await loadUserProfile();
  } catch (err) {
    console.error('Profile load failed:', err);
    showToast('Database access blocked. Please set Firebase Realtime Database rules and refresh.', 'error', 6000);
  }
  setupUI();
});

async function loadUserProfile() {
  const userRef = ref(db, 'users/' + currentUser.uid);
  const snap = await get(userRef);
  if (snap.exists()) {
    userData = snap.val();
  } else {
    await set(userRef, userData);
  }
}

// ================= SETUP UI =================
function setupUI() {
  document.getElementById('loadingScreen').classList.add('hidden');
  document.getElementById('appRoot').classList.remove('hidden');

  // Sidebar user
  const name = userData.name || currentUser.displayName || 'User';
  document.getElementById('userName').textContent = name;
  document.getElementById('userPlan').textContent = (userData.plan || 'free').toUpperCase() + ' plan';
  const avatar = document.getElementById('userAvatar');
  renderAvatar(avatar, userData, name);

  // Greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  document.getElementById('pageSub').textContent = `${greeting}, ${name}!`;

  const welcomeEmoji = document.getElementById('welcomeEmoji');
  if (welcomeEmoji) {
    welcomeEmoji.textContent = hour < 12 ? '🌅' : hour < 17 ? '☀️' : '🌙';
    document.getElementById('welcomeTitle').textContent = `${greeting}, ${name}!`;
  }

  startLinksListener();
  setupEventHandlers();
}

function startLinksListener() {
  if (linksListener) {
    linksListener.off && linksListener.off();
  }
  const linksRef = ref(db, 'links');
  onValue(linksRef, (snap) => {
    allLinks = [];
    snap.forEach((child) => {
      const link = child.val();
      if (link.uid === currentUser.uid) {
        link.key = child.key;
        link.shortUrl = SITE_CONFIG.shortBaseUrl + '/' + link.code;
        allLinks.push(link);
      }
    });
    allLinks.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    applyFiltersAndRender();
  }, (err) => {
    console.error('Links load failed:', err);
    showToast('Database rules blocked links. Set your Realtime Database rules to continue.', 'error', 6000);
  });
}

// ================= EVENT HANDLERS =================
function setupEventHandlers() {
  // Logout
  document.getElementById('logoutBtn').addEventListener('click', async () => {
    await signOut(auth);
    showToast('Logged out successfully', 'success');
    setTimeout(() => (window.location.href = 'index.html'), 600);
  });

  // Menu toggle
  document.getElementById('menuToggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });

  // New link button
  document.getElementById('createLinkBtn').addEventListener('click', () => openCreateModal());
  document.getElementById('emptyCreateBtn').addEventListener('click', () => openCreateModal());
  document.getElementById('linksEmptyCreateBtn').addEventListener('click', () => openCreateModal());
  const welcomeCreate = document.getElementById('welcomeCreateBtn');
  if (welcomeCreate) {
    welcomeCreate.addEventListener('click', () => openCreateModal());
  }

  // Status filter
  document.getElementById('statusFilter').addEventListener('change', (e) => {
    currentFilter = e.target.value;
    currentPage = 1;
    applyFiltersAndRender();
  });

  // Global search
  const searchInput = document.getElementById('globalSearch');
  searchInput.addEventListener('input', () => {
    searchTerm = searchInput.value.toLowerCase();
    currentPage = 1;
    applyFiltersAndRender();
  });

  // Create form
  const createForm = document.getElementById('createLinkForm');
  createForm.addEventListener('submit', handleCreateLink);

  // Edit form
  const editForm = document.getElementById('editLinkForm');
  editForm.addEventListener('submit', handleEditLink);

  // Custom alias toggle in create modal
  document.getElementById('cCustomToggle').addEventListener('change', (e) => {
    document.getElementById('cAliasGroup').classList.toggle('hidden', !e.target.checked);
  });

  // Delete confirm
  document.getElementById('confirmDeleteBtn').addEventListener('click', handleDelete);

  // Close modals
  document.querySelectorAll('[data-close]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.getElementById(btn.dataset.close).classList.remove('show');
    });
  });

  // Close modal on overlay click
  document.querySelectorAll('.modal-overlay').forEach((overlay) => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.classList.remove('show');
    });
  });
}

// ================= FILTER & RENDER =================
function applyFiltersAndRender() {
  filteredLinks = allLinks.filter((link) => {
    const matchesFilter = currentFilter === 'all' || link.status === currentFilter;
    if (!matchesFilter) return false;
    if (searchTerm) {
      const haystack = ((link.title || '') + ' ' + link.longUrl + ' ' + link.code + ' ' + link.shortUrl).toLowerCase();
      if (!haystack.includes(searchTerm)) return false;
    }
    return true;
  });

  document.getElementById('linksBadge').textContent = allLinks.length;
  renderOverview();
  renderLinksTable();
  renderPagination();
  renderRecentLinks();
}

function renderOverview() {
  const totalClicks = allLinks.reduce((sum, l) => sum + (l.clicks || 0), 0);
  const totalEarnings = allLinks.reduce((sum, l) => sum + (l.earnings || 0), 0);

  document.getElementById('statTotalLinks').textContent = formatNumber(allLinks.length);
  document.getElementById('statTotalClicks').textContent = formatNumber(totalClicks);
  document.getElementById('statEarnings').textContent = '$' + totalEarnings.toFixed(2);
  document.getElementById('statAvgClicks').textContent = allLinks.length ? Math.round(totalClicks / allLinks.length) : 0;
}

function renderLinksTable() {
  const tbody = document.getElementById('linksBody');
  const table = document.getElementById('linksTable');
  const empty = document.getElementById('linksEmpty');

  const start = (currentPage - 1) * PER_PAGE;
  const pageLinks = filteredLinks.slice(start, start + PER_PAGE);

  table.style.display = pageLinks.length ? '' : 'none';
  empty.classList.toggle('hidden', pageLinks.length > 0);

  if (pageLinks.length === 0) {
    tbody.innerHTML = '';
    return;
  }

  tbody.innerHTML = pageLinks.map(renderLinkRow).join('');
  bindRowActions();
}

function renderRecentLinks() {
  const tbody = document.getElementById('recentLinksBody');
  const table = document.getElementById('recentLinksTable');
  const empty = document.getElementById('recentEmpty');

  const recent = allLinks.slice(0, 5);
  table.style.display = recent.length ? '' : 'none';
  empty.classList.toggle('hidden', recent.length > 0);

  if (recent.length === 0) {
    tbody.innerHTML = '';
    return;
  }

  tbody.innerHTML = recent.map(renderLinkRow).join('');
  bindRowActions();
}

function renderLinkRow(link) {
  const favicon = getFavicon(link.longUrl);
  const title = link.title || link.longUrl;
  const statusClass = link.status === 'disabled' ? 'status-disabled' : 'status-active';
  const statusText = link.status === 'disabled' ? 'Disabled' : 'Active';
  const faviconHtml = favicon
    ? `<img src="${favicon}" alt="" onerror="this.style.display='none'">`
    : icon('link');

  return `
    <tr data-code="${escapeHtml(link.code)}">
      <td>
        <div class="link-dest">
          <div class="favicon">${faviconHtml}</div>
          <div>
            <div class="link-title" title="${escapeHtml(title)}">
              <a href="${escapeHtml(link.shortUrl)}" target="_blank" rel="noopener">${escapeHtml(shortenDisplay(title, 30))}</a>
            </div>
            <div class="link-dest-small" title="${escapeHtml(link.longUrl)}">${escapeHtml(shortenDisplay(link.longUrl, 45))}</div>
          </div>
        </div>
      </td>
      <td><span class="text-primary" style="font-weight:600;">${escapeHtml(link.shortUrl)}</span></td>
      <td><span class="click-count">${icon('pointer')} ${formatNumber(link.clicks || 0)}</span></td>
      <td><span class="status-badge ${statusClass}">${statusText}</span></td>
      <td class="text-muted" title="${formatDate(link.createdAt)}">${timeAgo(link.createdAt)}</td>
      <td>
        <div class="action-cell">
          <button class="btn-icon copy-link" data-url="${escapeHtml(link.shortUrl)}" title="Copy short URL">${icon('copy')}</button>
          <button class="btn-icon toggle-status" data-code="${escapeHtml(link.code)}" data-status="${link.status}" title="${link.status === 'disabled' ? 'Enable' : 'Disable'}">${link.status === 'disabled' ? icon('play') : icon('pause')}</button>
          <button class="btn-icon edit-link" data-code="${escapeHtml(link.code)}" title="Edit link">${icon('edit')}</button>
          <button class="btn-icon danger delete-link" data-code="${escapeHtml(link.code)}" title="Delete">${icon('trash')}</button>
        </div>
      </td>
    </tr>
  `;
}

function bindRowActions() {
  // Copy
  document.querySelectorAll('.copy-link').forEach((btn) => {
    btn.addEventListener('click', () => copyToClipboard(btn.dataset.url));
  });

  // Toggle status
  document.querySelectorAll('.toggle-status').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const code = btn.dataset.code;
      const linkRef = ref(db, 'links/' + code);
      const newStatus = btn.dataset.status === 'disabled' ? 'active' : 'disabled';
      try {
        await update(linkRef, { status: newStatus });
        showToast(newStatus === 'active' ? 'Link enabled' : 'Link disabled', 'success');
      } catch (err) {
        showToast('Failed to update link', 'error');
      }
    });
  });

  // Edit
  document.querySelectorAll('.edit-link').forEach((btn) => {
    btn.addEventListener('click', () => {
      const link = allLinks.find((l) => l.code === btn.dataset.code);
      if (link) openEditModal(link);
    });
  });

  // Delete
  document.querySelectorAll('.delete-link').forEach((btn) => {
    btn.addEventListener('click', () => {
      const link = allLinks.find((l) => l.code === btn.dataset.code);
      if (link) openDeleteModal(link);
    });
  });
}

function renderPagination() {
  const container = document.getElementById('pagination');
  const totalPages = Math.ceil(filteredLinks.length / PER_PAGE);
  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  let html = '';
  html += `<button class="page-btn" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}>${icon('chevron-left')}</button>`;

  for (let i = 1; i <= totalPages; i++) {
    if (totalPages > 7 && i > 2 && i < totalPages - 1 && Math.abs(i - currentPage) > 1) {
      if (Math.abs(i - currentPage) === 2) html += `<span class="page-btn" style="background:transparent;border:none;pointer-events:none;">...</span>`;
      continue;
    }
    html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
  }

  html += `<button class="page-btn" data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''}>${icon('chevron-right')}</button>`;
  container.innerHTML = html;

  container.querySelectorAll('.page-btn').forEach((btn) => {
    if (btn.disabled) return;
    btn.addEventListener('click', () => {
      currentPage = parseInt(btn.dataset.page);
      applyFiltersAndRender();
    });
  });
}

// ================= CREATE LINK =================
function openCreateModal() {
  document.getElementById('createError').classList.remove('show');
  document.getElementById('createLinkForm').reset();
  document.getElementById('cAliasGroup').classList.add('hidden');
  document.getElementById('cCustomToggle').checked = false;
  document.getElementById('createModal').classList.add('show');
}

async function handleCreateLink(e) {
  e.preventDefault();
  const errorEl = document.getElementById('createError');
  const rawUrl = document.getElementById('cLongUrl').value;
  const url = normalizeUrl(rawUrl);
  const title = document.getElementById('cTitle').value.trim();

  if (!isValidUrl(url)) {
    errorEl.textContent = 'Please enter a valid URL.';
    errorEl.classList.add('show');
    return;
  }

  let code = null;
  if (document.getElementById('cCustomToggle').checked) {
    code = document.getElementById('cAlias').value.trim();
    if (!code) {
      errorEl.textContent = 'Please enter a custom alias.';
      errorEl.classList.add('show');
      return;
    }
    if (!/^[A-Za-z0-9_-]+$/.test(code)) {
      errorEl.textContent = 'Alias can only contain letters, numbers, - and _.';
      errorEl.classList.add('show');
      return;
    }
    const aliasCheck = await get(ref(db, 'links/' + code));
    if (aliasCheck.exists()) {
      errorEl.textContent = 'This alias is already taken. Try another one.';
      errorEl.classList.add('show');
      return;
    }
  }

  const btn = document.getElementById('createSubmitBtn');
  btn.disabled = true;
  document.getElementById('createSubmitText').textContent = 'Creating...';

  try {
    if (!code) {
      code = generateShortCode(6);
      const check = await get(ref(db, 'links/' + code));
      if (check.exists()) code = generateShortCode(6);
    }

    const linkData = {
      code: code,
      longUrl: url,
      title: title || url,
      uid: currentUser.uid,
      createdBy: currentUser.email,
      createdAt: Date.now(),
      clicks: 0,
      earnings: 0,
      status: 'active',
      isCustom: !!document.getElementById('cCustomToggle').checked,
    };

    await set(ref(db, 'links/' + code), linkData);

    // Update user's link count
    await update(ref(db, 'users/' + currentUser.uid), {
      linksCount: (userData.linksCount || 0) + 1,
    });
    userData.linksCount = (userData.linksCount || 0) + 1;

    showToast('Link created successfully!', 'success');
    document.getElementById('createModal').classList.remove('show');
    btn.disabled = false;
    document.getElementById('createSubmitText').textContent = 'Create Link';
  } catch (err) {
    errorEl.textContent = 'Failed to create link. Please try again.';
    errorEl.classList.add('show');
    btn.disabled = false;
    document.getElementById('createSubmitText').textContent = 'Create Link';
  }
}

// ================= EDIT LINK =================
function openEditModal(link) {
  document.getElementById('editError').classList.remove('show');
  document.getElementById('eCode').value = link.code;
  document.getElementById('eLongUrl').value = link.longUrl;
  document.getElementById('eTitle').value = link.title || '';
  document.getElementById('editModal').classList.add('show');
}

async function handleEditLink(e) {
  e.preventDefault();
  const errorEl = document.getElementById('editError');
  const code = document.getElementById('eCode').value;
  const url = normalizeUrl(document.getElementById('eLongUrl').value);
  const title = document.getElementById('eTitle').value.trim();

  if (!isValidUrl(url)) {
    errorEl.textContent = 'Please enter a valid URL.';
    errorEl.classList.add('show');
    return;
  }

  const btn = document.getElementById('editSubmitBtn');
  btn.disabled = true;
  document.getElementById('editSubmitText').textContent = 'Saving...';

  try {
    await update(ref(db, 'links/' + code), {
      longUrl: url,
      title: title || url,
      updatedAt: Date.now(),
    });
    showToast('Link updated successfully', 'success');
    document.getElementById('editModal').classList.remove('show');
    btn.disabled = false;
    document.getElementById('editSubmitText').textContent = 'Save Changes';
  } catch (err) {
    errorEl.textContent = 'Failed to update link.';
    errorEl.classList.add('show');
    btn.disabled = false;
    document.getElementById('editSubmitText').textContent = 'Save Changes';
  }
}

// ================= DELETE LINK =================
function openDeleteModal(link) {
  deleteTarget = link;
  document.getElementById('deleteConfirmText').textContent =
    `Are you sure you want to delete "${link.title || link.shortUrl}"? This action cannot be undone.`;
  document.getElementById('deleteModal').classList.add('show');
}

async function handleDelete() {
  if (!deleteTarget) return;
  const btn = document.getElementById('confirmDeleteBtn');
  btn.disabled = true;

  try {
    await remove(ref(db, 'links/' + deleteTarget.code));
    // Clean up clicks if stored
    const clicksRef = ref(db, 'clicks/' + deleteTarget.code);
    await remove(clicksRef);

    // Update user's link count
    await update(ref(db, 'users/' + currentUser.uid), {
      linksCount: Math.max(0, (userData.linksCount || 0) - 1),
    });
    userData.linksCount = Math.max(0, (userData.linksCount || 0) - 1);

    showToast('Link deleted', 'success');
    document.getElementById('deleteModal').classList.remove('show');
    btn.disabled = false;
    deleteTarget = null;
  } catch (err) {
    showToast('Failed to delete link', 'error');
    btn.disabled = false;
  }
}
