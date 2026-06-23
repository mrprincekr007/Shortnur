import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let currentUser = null;

// Alert Function
function showAlert(message, isError = false) {
    const alertBox = document.getElementById('alertBox');
    alertBox.style.display = 'block';
    alertBox.textContent = message;
    alertBox.className = isError ? 'alert-msg alert-error' : 'alert-msg alert-success';
    
    // Auto hide
    setTimeout(() => { alertBox.style.display = 'none'; }, 5000);
    // Screen ko upar scroll karna taaki alert dikhe
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 1. Check Login & Load Data
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        document.getElementById('setAccountEmail').value = user.email;
        await loadAllSettings();
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

// 2. Load Profile & Payment Data
async function loadAllSettings() {
    try {
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
            const data = userSnap.data();
            
            // Profile details
            document.getElementById('setAccountName').value = data.name || "";
            document.getElementById('setUsername').value = data.username || "Google User";
            
            // Payment details
            if(data.saved_method) document.getElementById('setDefaultMethod').value = data.saved_method;
            if(data.saved_account) document.getElementById('setDefaultAccount').value = data.saved_account;
        }
    } catch (error) {
        console.error("Error loading settings:", error);
    }
}

// 3. Update Profile Data
const profileForm = document.getElementById('profileForm');
if (profileForm) {
    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newName = document.getElementById('setAccountName').value.trim();
        const btn = document.getElementById('updateProfileBtn');

        try {
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
            btn.disabled = true;

            const userRef = doc(db, "users", currentUser.uid);
            await updateDoc(userRef, { name: newName });
            
            showAlert("Profile Name updated successfully!", false);
        } catch (error) {
            showAlert("Failed to update profile.", true);
        } finally {
            btn.innerHTML = 'Update Name';
            btn.disabled = false;
        }
    });
}

// 4. Update Saved Payment Info
const paymentSettingsForm = document.getElementById('paymentSettingsForm');
if (paymentSettingsForm) {
    paymentSettingsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const method = document.getElementById('setDefaultMethod').value;
        const account = document.getElementById('setDefaultAccount').value.trim();
        const btn = document.getElementById('updatePaymentBtn');

        try {
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
            btn.disabled = true;

            const userRef = doc(db, "users", currentUser.uid);
            await updateDoc(userRef, { 
                saved_method: method,
                saved_account: account
            });
            
            showAlert("Default Payment Info saved successfully! This will save your time while withdrawing.", false);
        } catch (error) {
            showAlert("Failed to save payment info.", true);
        } finally {
            btn.innerHTML = 'Save Payment Info';
            btn.disabled = false;
        }
    });
}

// 5. SECURITY: Send Password Reset Email (Acts like OTP)
const sendResetLinkBtn = document.getElementById('sendResetLinkBtn');
if (sendResetLinkBtn) {
    sendResetLinkBtn.addEventListener('click', async () => {
        try {
            sendResetLinkBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending Link...';
            sendResetLinkBtn.disabled = true;

            // Firebase function to send reset email
            await sendPasswordResetEmail(auth, currentUser.email);
            
            showAlert(`A secure password reset link has been sent to ${currentUser.email}. Please check your Inbox or Spam folder to change your password.`, false);
            
            sendResetLinkBtn.innerHTML = '<i class="fas fa-check"></i> Link Sent Successfully';
            // Button ko dobara jaldi click karne se rokna
            setTimeout(() => {
                sendResetLinkBtn.innerHTML = '<i class="fas fa-envelope"></i> Send Reset Link Again';
                sendResetLinkBtn.disabled = false;
            }, 60000); // 1 minute tak disable rahega spam rokne ke liye

        } catch (error) {
            console.error(error);
            showAlert("Error sending link. Please try again later.", true);
            sendResetLinkBtn.innerHTML = '<i class="fas fa-envelope"></i> Send Reset Link to Email';
            sendResetLinkBtn.disabled = false;
        }
    });
}
