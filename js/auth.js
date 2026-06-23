import { auth, db } from './firebase-config.js';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, setDoc, getDoc, collection, query, where, getDocs, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

function showAlert(message, isError = false) {
    const alertBox = document.getElementById('alertBox');
    alertBox.style.display = 'block';
    alertBox.textContent = message;
    alertBox.className = isError ? 'alert-msg alert-error' : 'alert-msg alert-success';
}

// ==========================================
// 1. REGISTER
// ==========================================
const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('regName').value.trim();
        const username = document.getElementById('regUsername').value.trim().toLowerCase();
        const email = document.getElementById('regEmail').value.trim();
        const password = document.getElementById('regPassword').value;
        const regBtn = document.getElementById('regBtn');

        try {
            regBtn.textContent = "Checking...";
            regBtn.disabled = true;

            // Check username uniqueness
            const usersRef = collection(db, "users");
            const q = query(usersRef, where("username", "==", username));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                showAlert("Username is already taken! Choose another.", true);
                regBtn.textContent = "Create Account";
                regBtn.disabled = false;
                return;
            }

            regBtn.textContent = "Creating Account...";
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Save user profile with name
            await setDoc(doc(db, "users", user.uid), {
                name: name,
                username: username,
                email: email,
                balance: 0.0000,
                total_links: 0,
                total_views: 0,
                role: "user",
                cpm: 5.00,
                created_at: serverTimestamp()
            });

            await sendEmailVerification(user);

            showAlert("Success! A verification link has been sent to your Gmail. Please verify to login.", false);
            registerForm.reset();
            setTimeout(() => switchTab('login'), 3000);

        } catch (error) {
            showAlert("Error: " + error.message, true);
        } finally {
            regBtn.textContent = "Create Account";
            regBtn.disabled = false;
        }
    });
}

// ==========================================
// 2. LOGIN
// ==========================================
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const inputStr = document.getElementById('loginUsernameEmail').value.trim();
        const password = document.getElementById('loginPassword').value;
        const loginBtn = document.getElementById('loginBtn');

        try {
            loginBtn.textContent = "Logging in...";
            loginBtn.disabled = true;

            let loginEmail = inputStr;

            if (!inputStr.includes('@')) {
                const usersRef = collection(db, "users");
                const q = query(usersRef, where("username", "==", inputStr.toLowerCase()));
                const querySnapshot = await getDocs(q);

                if (querySnapshot.empty) {
                    showAlert("Username not found!", true);
                    loginBtn.textContent = "Login";
                    loginBtn.disabled = false;
                    return;
                }
                loginEmail = querySnapshot.docs[0].data().email;
            }

            const userCredential = await signInWithEmailAndPassword(auth, loginEmail, password);
            const user = userCredential.user;

            if (!user.emailVerified) {
                showAlert("Please verify your email first! Check your Gmail inbox/spam.", true);
                auth.signOut();
                loginBtn.textContent = "Login";
                loginBtn.disabled = false;
                return;
            }

            // ✅ Ensure user document exists (important for admin accounts created via email/password but not registered)
            const userRef = doc(db, "users", user.uid);
            const userSnap = await getDoc(userRef);
            if (!userSnap.exists()) {
                // Create default document for this user (this covers admin logins too)
                await setDoc(userRef, {
                    name: "User",
                    username: "user_" + user.uid.substring(0, 6),
                    email: user.email,
                    balance: 0.0000,
                    total_links: 0,
                    total_views: 0,
                    role: "user",
                    cpm: 5.00,
                    created_at: serverTimestamp()
                });
                console.log("✅ Created user document on login for:", user.uid);
            }

            showAlert("Login successful! Redirecting...", false);
            setTimeout(() => window.location.href = "dashboard.html", 1000);

        } catch (error) {
            showAlert("Error: Invalid details!", true);
            loginBtn.textContent = "Login";
            loginBtn.disabled = false;
        }
    });
}

// ==========================================
// 3. GOOGLE SIGN-IN
// ==========================================
const googleLoginBtn = document.getElementById('googleLoginBtn');
if (googleLoginBtn) {
    googleLoginBtn.addEventListener('click', async () => {
        const provider = new GoogleAuthProvider();
        try {
            googleLoginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Please wait...';
            googleLoginBtn.disabled = true;

            const result = await signInWithPopup(auth, provider);
            const user = result.user;

            const userRef = doc(db, "users", user.uid);
            const userSnap = await getDoc(userRef);

            if (!userSnap.exists()) {
                await setDoc(userRef, {
                    name: user.displayName || "Google User",
                    username: "user_" + user.uid.substring(0, 6),
                    email: user.email,
                    balance: 0.0000,
                    total_links: 0,
                    total_views: 0,
                    role: "user",
                    cpm: 5.00,
                    created_at: serverTimestamp()
                });
            }

            showAlert("Google Login Successful! Redirecting...", false);
            setTimeout(() => window.location.href = "dashboard.html", 1000);

        } catch (error) {
            showAlert("Google Sign-in cancelled or failed.", true);
            googleLoginBtn.innerHTML = '<i class="fab fa-google"></i> Sign in with Google';
            googleLoginBtn.disabled = false;
        }
    });
}

// Tab switching function
window.switchTab = function(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('registerForm').classList.add('hidden');
    document.getElementById('alertBox').style.display = 'none';

    if (tab === 'login') {
        document.querySelectorAll('.tab-btn')[0].classList.add('active');
        document.getElementById('loginForm').classList.remove('hidden');
    } else {
        document.querySelectorAll('.tab-btn')[1].classList.add('active');
        document.getElementById('registerForm').classList.remove('hidden');
    }
};