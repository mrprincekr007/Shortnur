import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc, setDoc, collection, addDoc, serverTimestamp, updateDoc, increment, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let currentUser = null;

// ==========================================
// 1. AUTH STATE CHECK
// ==========================================
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        console.log("User logged in:", user.uid);
        await ensureUserDocument(user.uid);
        await loadAllData(user.uid);
    } else {
        console.warn("No user, redirecting to login");
        window.location.replace("index.html");
    }
});

// ==========================================
// 2. ENSURE USER DOCUMENT EXISTS
// ==========================================
async function ensureUserDocument(uid) {
    try {
        const userRef = doc(db, "users", uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
            await setDoc(userRef, {
                name: "User",
                username: "user_" + uid.substring(0, 6),
                email: auth.currentUser?.email || "unknown@email.com",
                balance: 0.0000,
                total_links: 0,
                total_views: 0,
                role: "user",
                cpm: 5.00,
                created_at: serverTimestamp()
            });
            console.log("✅ Created new user document for:", uid);
        }
    } catch (error) {
        console.error("Error ensuring user document:", error);
    }
}

// ==========================================
// 3. LOAD ALL DATA
// ==========================================
async function loadAllData(uid) {
    try {
        await loadUserData(uid);
        await loadRecentHistory(uid);
        initGraph();
    } catch (error) {
        console.error("Dashboard load error:", error);
        showError("Error loading dashboard. Please refresh.");
    }
}

// ==========================================
// 4. USER DATA LOAD
// ==========================================
async function loadUserData(uid) {
    try {
        const userRef = doc(db, "users", uid);
        const userSnap = await getDoc(userRef);

        let name = "User";
        let balance = 0;
        let totalViews = 0;
        let totalLinks = 0;
        let userCpm = 5.00;

        if (userSnap.exists()) {
            const data = userSnap.data();
            name = data.name || data.displayName || data.username || "User";
            balance = parseFloat(data.balance || 0);
            totalViews = data.total_views || 0;
            totalLinks = data.total_links || 0;
            userCpm = data.cpm ? parseFloat(data.cpm) : 5.00;
        }

        document.getElementById('userNameDisplay').textContent = "Hi, " + name;
        document.getElementById('statViews').textContent = totalViews;
        document.getElementById('statEarnings').textContent = "$" + balance.toFixed(4);
        document.getElementById('statLinks').textContent = totalLinks;
        document.getElementById('statCPM').textContent = "$" + userCpm.toFixed(2);

    } catch (error) {
        console.error("Error in loadUserData:", error);
        document.getElementById('userNameDisplay').textContent = "Hi, User";
        document.getElementById('statViews').textContent = "0";
        document.getElementById('statEarnings').textContent = "$0.0000";
        document.getElementById('statLinks').textContent = "0";
        document.getElementById('statCPM').textContent = "$5.00";
    }
}

// ==========================================
// 5. RECENT LINKS HISTORY
// ==========================================
async function loadRecentHistory(uid) {
    const listEl = document.getElementById('recentLinksList');
    if (!listEl) return;

    listEl.innerHTML = '<li style="text-align: center; color: #b3b3cc; padding: 20px 0;"><i class="fas fa-spinner fa-spin"></i> Loading links...</li>';

    try {
        const linksRef = collection(db, "links");
        const q = query(linksRef, where("userId", "==", uid));
        const snap = await getDocs(q);

        if (snap.empty) {
            listEl.innerHTML = '<li style="text-align: center; color: #b3b3cc; padding: 20px 0;">No links created yet.</li>';
            return;
        }

        let linksArray = [];
        snap.forEach(doc => {
            linksArray.push({ id: doc.id, ...doc.data() });
        });

        linksArray.sort((a, b) => {
            const timeA = a.createdAt ? a.createdAt.toMillis() : 0;
            const timeB = b.createdAt ? b.createdAt.toMillis() : 0;
            return timeB - timeA;
        });

        const top5 = linksArray.slice(0, 5);
        listEl.innerHTML = '';
        top5.forEach(data => {
            const shortUrl = window.location.origin + "/redirect.html?l=" + data.shortAlias;
            listEl.innerHTML += `
                <li class="history-item">
                    <a href="${shortUrl}" target="_blank" class="history-title">
                        <i class="fas fa-link" style="color:#00f2fe;"></i> /${data.shortAlias}
                    </a>
                    <span class="history-views">${data.views || 0} Views</span>
                </li>
            `;
        });

    } catch (error) {
        console.error("Error in loadRecentHistory:", error);
        listEl.innerHTML = '<li style="color: #ff4757; text-align:center; padding:20px;">Error loading history. Please refresh.</li>';
    }
}

// ==========================================
// 6. GRAPH INIT
// ==========================================
function initGraph() {
    const canvas = document.getElementById('earningsChart');
    if (!canvas) return;

    if (typeof Chart === 'undefined') {
        canvas.parentElement.innerHTML = '<p style="color:#b3b3cc; text-align:center; padding:20px;">Chart not available</p>';
        return;
    }

    try {
        const ctx = canvas.getContext('2d');
        let gradient = ctx.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, 'rgba(0, 242, 254, 0.5)');
        gradient.addColorStop(1, 'rgba(138, 43, 226, 0)');

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Earnings ($)',
                    data: [0.000, 0.050, 0.120, 0.080, 0.250, 0.150, 0.300],
                    backgroundColor: gradient,
                    borderColor: '#00f2fe',
                    borderWidth: 2,
                    pointBackgroundColor: '#8a2be2',
                    pointBorderColor: '#fff',
                    pointRadius: 4,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { display: false, drawBorder: false }, ticks: { color: '#b3b3cc' } },
                    y: { grid: { color: 'rgba(255,255,255,0.05)', drawBorder: false }, ticks: { color: '#b3b3cc' } }
                }
            }
        });
    } catch (error) {
        console.error("Chart error:", error);
        canvas.parentElement.innerHTML = '<p style="color:#b3b3cc; text-align:center; padding:20px;">Chart could not be loaded</p>';
    }
}

// ==========================================
// 7. GENERATE UNIQUE ALIAS (COLLISION SAFE)
// ==========================================
async function generateUniqueAlias() {
    let alias = '';
    let attempts = 0;
    const maxAttempts = 20;

    while (attempts < maxAttempts) {
        // Generate 6-character random string
        alias = Math.random().toString(36).substring(2, 8);

        // Check if alias already exists in Firestore
        const linksRef = collection(db, "links");
        const q = query(linksRef, where("shortAlias", "==", alias));
        const snap = await getDocs(q);

        if (snap.empty) {
            // Alias is unique
            return alias;
        }
        attempts++;
    }

    // If we couldn't find a unique alias, use timestamp-based
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
}

// ==========================================
// 8. SHORTEN FORM (FIXED — UNIQUE LINKS)
// ==========================================
const shortenForm = document.getElementById('shortenForm');
if (shortenForm) {
    shortenForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const longUrl = document.getElementById('longUrl').value.trim();
        const shortenBtn = document.getElementById('shortenBtn');
        if (!longUrl) {
            alert("Please enter a valid URL");
            return;
        }

        if (!currentUser) {
            alert("You are not logged in. Please refresh.");
            return;
        }

        try {
            shortenBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
            shortenBtn.disabled = true;

            // Ensure user document exists
            await ensureUserDocument(currentUser.uid);

            // Generate unique alias
            const randomAlias = await generateUniqueAlias();

            // Add link to Firestore
            await addDoc(collection(db, "links"), {
                originalUrl: longUrl,
                shortAlias: randomAlias,
                userId: currentUser.uid,
                views: 0,
                earnings: 0,
                status: "active",
                createdAt: serverTimestamp()
            });

            // Update user total_links
            await updateDoc(doc(db, "users", currentUser.uid), {
                total_links: increment(1)
            });

            const shortLinkUrl = window.location.href.split('?')[0].replace(/[^/]*$/, '') + "redirect.html?l=" + randomAlias;
            document.getElementById('newShortLink').textContent = shortLinkUrl;
            document.getElementById('shortenedResult').style.display = "block";
            document.getElementById('longUrl').value = "";

            // Refresh data
            await loadUserData(currentUser.uid);
            await loadRecentHistory(currentUser.uid);

        } catch (error) {
            console.error("Shorten error:", error);
            let msg = "Error generating link! ";
            if (error.code === 'permission-denied') {
                msg += "You don't have permission. Check Firestore rules.";
            } else if (error.code === 'unavailable') {
                msg += "Network issue. Please try again.";
            } else {
                msg += error.message;
            }
            alert(msg);
        } finally {
            shortenBtn.innerHTML = 'Shorten Link <i class="fas fa-arrow-right"></i>';
            shortenBtn.disabled = false;
        }
    });
}

// Helper to show error on screen
function showError(msg) {
    const container = document.querySelector('.dashboard-container');
    if (container) {
        const errDiv = document.createElement('div');
        errDiv.style.cssText = 'background:rgba(255,71,87,0.1); border:1px solid #ff4757; color:#ff4757; padding:12px; border-radius:8px; margin-bottom:15px; text-align:center;';
        errDiv.textContent = msg;
        container.prepend(errDiv);
    }
}
