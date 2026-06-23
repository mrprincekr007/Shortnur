import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
// Yahan se maine 'orderBy' hata diya hai taaki Firebase error na de
import { collection, query, where, getDocs, deleteDoc, doc, updateDoc, increment } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let currentUser = null;

// Check Login Status
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        await loadMyLinks();
    } else {
        window.location.replace("index.html");
    }
});

// Logout
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        signOut(auth).then(() => window.location.replace("index.html"));
    });
}

// Global Delete Function (Window me bind karna zaroori hai taaki HTML se access ho sake)
window.deleteLink = async function(docId) {
    if(confirm("Are you sure you want to permanently delete this link?")) {
        try {
            // Delete from Database
            await deleteDoc(doc(db, "links", docId));
            
            // User profile se count -1 karna
            const userRef = doc(db, "users", currentUser.uid);
            await updateDoc(userRef, { total_links: increment(-1) });

            alert("Link deleted successfully!");
            // Reload list
            loadMyLinks();
        } catch (error) {
            console.error("Delete Error: ", error);
            alert("Failed to delete link.");
        }
    }
}

// Load Links Function (FIXED FOR FIREBASE ERROR)
async function loadMyLinks() {
    const container = document.getElementById('linksContainer');
    
    try {
        const linksRef = collection(db, "links");
        
        // BINA ORDER-BY KI QUERY (Isse error nahi aayega)
        const q = query(linksRef, where("userId", "==", currentUser.uid));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px 0; color: #b3b3cc;">
                    <i class="fas fa-folder-open" style="font-size: 40px; margin-bottom: 15px; color: rgba(255,255,255,0.1);"></i><br>
                    You haven't shortened any links yet. Go to Dashboard to create one!
                </div>
            `;
            return;
        }

        container.innerHTML = '';

        // Saare links ko ek array mein daalna
        let linksArray = [];
        querySnapshot.forEach((docSnap) => {
            linksArray.push({ id: docSnap.id, ...docSnap.data() });
        });

        // JAVASCRIPT SORTING: Naye links ko sabse upar dikhane ke liye
        linksArray.sort((a, b) => {
            const timeA = a.createdAt ? a.createdAt.toMillis() : 0;
            const timeB = b.createdAt ? b.createdAt.toMillis() : 0;
            return timeB - timeA;
        });

        // Cards Generate Karna
        linksArray.forEach((data) => {
            const docId = data.id; // Unique ID for deletion
            
            // URL Generate
            const shortUrl = window.location.origin + "/redirect.html?l=" + data.shortAlias;
            
            // Date format
            let dateStr = "Recently";
            if(data.createdAt) {
                dateStr = data.createdAt.toDate().toLocaleDateString();
            }

            // Create HTML Card
            const cardHTML = `
                <div class="link-card">
                    <div class="link-info">
                        <a href="${shortUrl}" target="_blank" class="short-url">
                            <i class="fas fa-link" style="margin-right: 8px;"></i> ${window.location.host}/${data.shortAlias}
                        </a>
                        <div class="long-url" title="${data.originalUrl}">${data.originalUrl}</div>
                        <div class="link-stats">
                            <span class="stat-badge" style="color: #2ed573;"><i class="fas fa-eye"></i> ${data.views || 0} Views</span>
                            <span class="stat-badge" style="color: #b3b3cc;"><i class="fas fa-calendar-alt"></i> ${dateStr}</span>
                        </div>
                    </div>
                    <div class="link-actions">
                        <button onclick="copyShortLink('${shortUrl}')" class="action-btn btn-copy">
                            <i class="fas fa-copy"></i> Copy
                        </button>
                        <button onclick="deleteLink('${docId}')" class="action-btn btn-delete">
                            <i class="fas fa-trash-alt"></i> Delete
                        </button>
                    </div>
                </div>
            `;
            
            // Append to container
            container.innerHTML += cardHTML;
        });

    } catch (error) {
        console.error("Load Links Error: ", error);
        container.innerHTML = `<div class="loading-text" style="color:#ff4757;">Error loading links. Please check console.</div>`;
    }
}
