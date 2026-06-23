// Firebase Imports
import { db } from './firebase-config.js';
import { collection, query, where, getDocs, doc, updateDoc, increment } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Page load hote hi ye function chalega
document.addEventListener('DOMContentLoaded', async () => {
    
    // URL se short code nikalna (jaise: ?l=x8Kj2m)
    const urlParams = new URLSearchParams(window.location.search);
    const shortAlias = urlParams.get('l');

    const statusText = document.getElementById('statusText');
    const timerDisplay = document.getElementById('timerDisplay');
    const getLinkBtn = document.getElementById('getLinkBtn');

    if (!shortAlias) {
        statusText.textContent = "Error: Invalid Link!";
        statusText.style.color = "#ff4757";
        timerDisplay.textContent = "X";
        timerDisplay.style.borderColor = "#ff4757";
        timerDisplay.style.color = "#ff4757";
        return;
    }

    try {
        // Database mein ye short code dhoondhna
        const linksRef = collection(db, "links");
        const q = query(linksRef, where("shortAlias", "==", shortAlias));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            statusText.textContent = "Error: Link not found or deleted!";
            statusText.style.color = "#ff4757";
            timerDisplay.textContent = "404";
            return;
        }

        // Link mil gaya! Ab details nikalte hain
        const linkDoc = querySnapshot.docs[0];
        const linkData = linkDoc.data();
        const originalUrl = linkData.originalUrl;
        const linkOwnerId = linkData.userId;

        // --- TIMER SYSTEM ---
        let timeLeft = 5; // 5 seconds ka timer
        
        const timerInterval = setInterval(() => {
            timeLeft--;
            timerDisplay.textContent = timeLeft;

            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                timerDisplay.innerHTML = '<i class="fas fa-check"></i>';
                timerDisplay.style.borderColor = "#2ed573";
                timerDisplay.style.color = "#2ed573";
                statusText.textContent = "Your link is ready!";
                
                // Button ko activate karna
                getLinkBtn.disabled = false;
                getLinkBtn.classList.add('active');
                getLinkBtn.innerHTML = '<i class="fas fa-external-link-alt"></i> Get Link';
                
                // Button click hone par kya hoga?
                getLinkBtn.addEventListener('click', async () => {
                    getLinkBtn.textContent = "Redirecting...";
                    getLinkBtn.disabled = true;

                    // 1 View ke kitne paise dene hain? (Yahan set karein. 0.005 = $5 per 1000 views)
                    const earningPerView = 0.005;

                    try {
                        // 1. Link ki setting mein view aur paisa badhana
                        await updateDoc(doc(db, "links", linkDoc.id), {
                            views: increment(1),
                            earnings: increment(earningPerView)
                        });

                        // 2. User ke main account mein views aur paisa badhana
                        await updateDoc(doc(db, "users", linkOwnerId), {
                            total_views: increment(1),
                            balance: increment(earningPerView)
                        });

                        // 3. User ko original URL par bhej dena
                        window.location.href = originalUrl;

                    } catch (err) {
                        console.error("Error updating stats:", err);
                        // Agar koi error aaye fir bhi user ko redirect kar do taaki uska nuksan na ho
                        window.location.href = originalUrl;
                    }
                });
            }
        }, 1000); // Har 1 second (1000ms) mein update hoga

    } catch (error) {
        console.error("Error fetching link:", error);
        statusText.textContent = "Server Error! Try again later.";
    }
});
