import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { collection, addDoc, serverTimestamp, doc, updateDoc, increment } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let currentUser = null;

// Security Login Check
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
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

// Mass Shortener Logic
const massForm = document.getElementById('massForm');
if (massForm) {
    massForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const textarea = document.getElementById('massUrls');
        const massBtn = document.getElementById('massBtn');
        const resultBox = document.getElementById('bulkResultBox');
        const listContainer = document.getElementById('bulkLinksList');

        // Sabhi URLs ko lines ke basis par alag-alag array mein convert karna
        const lines = textarea.value.split('\n').map(line => line.trim()).filter(line => line.length > 0);

        if (lines.length === 0) return;

        // Security check: Ek baar mein max 5 links allow karenge taaki server crash na ho
        if (lines.length > 5) {
            alert("Maximum 5 links allowed at a time!");
            return;
        }

        try {
            massBtn.textContent = "Processing Bulk Links...";
            massBtn.disabled = true;
            listContainer.innerHTML = ""; // Purani list saaf karna

            let linksCreatedCount = 0;

            // Loop chala kar har ek single link ko database mein insert karna
            for (let longUrl of lines) {
                // Ek basic URL validation text check
                if (!longUrl.startsWith('http://') && !longUrl.startsWith('https://')) {
                    longUrl = 'https://' + longUrl;
                }

                // Random 6 letters code generation
                const randomAlias = Math.random().toString(36).substring(2, 8);

                // Firestore links collection save
                await addDoc(collection(db, "links"), {
                    originalUrl: longUrl,
                    shortAlias: randomAlias,
                    userId: currentUser.uid,
                    views: 0,
                    earnings: 0,
                    status: "active",
                    createdAt: serverTimestamp()
                });

                linksCreatedCount++;

                // Naya URL ready karna display ke liye
                const generatedShortUrl = window.location.origin + "/redirect.html?l=" + randomAlias;

                // Screen par real-time item append karna
                const itemDiv = document.createElement('div');
                itemDiv.className = 'result-item';
                itemDiv.innerHTML = `<i class="fas fa-link" style="color: #94a3b8; font-size:11px;"></i> <a href="${generatedShortUrl}" target="_blank" style="color:#00f2fe; font-weight:600;">${generatedShortUrl}</a>`;
                listContainer.appendChild(itemDiv);
            }

            // User account total balance links counter ko directly update karna updateDoc single hit se
            const userRef = doc(db, "users", currentUser.uid);
            await updateDoc(userRef, {
                total_links: increment(linksCreatedCount)
            });

            // Result dikhana aur form clear karna
            resultBox.style.display = "block";
            textarea.value = "";

        } catch (error) {
            console.error("Bulk process error:", error);
            alert("Something went wrong during bulk process!");
        } finally {
            massBtn.textContent = "Mass Shorten";
            massBtn.disabled = false;
        }
    });
}
