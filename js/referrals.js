import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let currentUser = null;

// Security Check & Auth Listener
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        generateRefLink(user.uid);
        loadReferralStats(user.uid);
    } else {
        window.location.replace("index.html");
    }
});

// Logout Feature
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        signOut(auth).then(() => window.location.replace("index.html"));
    });
}

// 1. Generate Referral Link Base on Domain Name
function generateRefLink(uid) {
    const domain = window.location.origin;
    // index.html?ref=USER_ID structure
    const referralLink = `${domain}/index.html?ref=${uid}`;
    
    document.getElementById('refLinkUrl').value = referralLink;
}

// 2. Fetch Live Stats from Firestore Users Database
async function loadReferralStats(uid) {
    try {
        const userRef = doc(db, "users", uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
            const data = userSnap.data();
            
            // Stats filter (if data is null/undefined, set default 0)
            const totalReferred = data.total_referrals || 0;
            const cashEarnings = parseFloat(data.referral_earnings || 0).toFixed(4);
            
            // Screen rendering
            document.getElementById('refCount').textContent = totalReferred;
            document.getElementById('refEarnings').textContent = "$" + cashEarnings;
        }
    } catch (error) {
        console.error("Error loading referral statistics:", error);
    }
}
