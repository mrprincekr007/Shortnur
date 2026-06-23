import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc, collection, addDoc, serverTimestamp, updateDoc, increment, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let currentUser = null;
let currentBalance = 0;

// Short Alert Function
function showAlert(msg, isError = false) {
    const alertBox = document.getElementById('alertBox');
    alertBox.style.display = 'block';
    alertBox.textContent = msg;
    alertBox.className = isError ? 'alert-msg alert-error' : 'alert-msg alert-success';
    setTimeout(() => alertBox.style.display = 'none', 4000);
}

// 1. Check Login
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        await loadWalletData(); // Main data load
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

// 2. Load Balances & History
async function loadWalletData() {
    const tableBody = document.getElementById('historyTableBody');
    let pendingBal = 0;
    let totalPaidBal = 0;

    try {
        // A. Load Available Balance from User Profile
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
            currentBalance = parseFloat(userSnap.data().balance || 0);
            document.getElementById('availBal').textContent = "$" + currentBalance.toFixed(4);
        }

        // B. Load History and Calculate Pending/Paid
        const wRef = collection(db, "withdrawals");
        const q = query(wRef, where("userId", "==", currentUser.uid));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 20px; color:#b3b3cc;">No records found</td></tr>`;
            document.getElementById('pendBal').textContent = "$0.00";
            document.getElementById('totalPaidBal').textContent = "$0.00";
            return;
        }

        // Array mein daalkar latest date ke hisaab se sort karna
        const records = [];
        querySnapshot.forEach(doc => {
            records.push({ id: doc.id, ...doc.data() });
        });
        records.sort((a, b) => b.createdAt - a.createdAt);

        tableBody.innerHTML = '';

        records.forEach((data) => {
            // Calculation for stats
            if (data.status === 'Pending') pendingBal += parseFloat(data.amount);
            if (data.status === 'Approved') totalPaidBal += parseFloat(data.amount);

            // Date Format
            let dateStr = "-";
            if (data.createdAt) {
                const date = data.createdAt.toDate();
                dateStr = date.toLocaleDateString();
            }

            // Badges
            let badgeClass = 'badge-pending';
            if (data.status === 'Approved') badgeClass = 'badge-approved';
            if (data.status === 'Rejected') badgeClass = 'badge-rejected';

            // Table Row Generate
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="color: #b3b3cc; font-size: 12px;">#${data.id.substring(0,5).toUpperCase()}</td>
                <td style="font-weight: bold; color: #fff;">$${parseFloat(data.amount).toFixed(2)}</td>
                <td style="color: #00f2fe;">${data.payment_method}</td>
                <td style="color: #b3b3cc;">${dateStr}</td>
                <td><span class="status-badge ${badgeClass}">${data.status}</span></td>
            `;
            tableBody.appendChild(tr);
        });

        // Update Screen Stats
        document.getElementById('pendBal').textContent = "$" + pendingBal.toFixed(2);
        document.getElementById('totalPaidBal').textContent = "$" + totalPaidBal.toFixed(2);

    } catch (error) {
        console.error("Wallet Error:", error);
        tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#ff4757;">Error loading data</td></tr>`;
    }
}

// 3. Submit Withdrawal Request
const withdrawForm = document.getElementById('withdrawForm');
if (withdrawForm) {
    withdrawForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const method = document.getElementById('wMethod').value;
        const account = document.getElementById('wAccount').value.trim();
        const amount = parseFloat(document.getElementById('wAmount').value);
        const withdrawBtn = document.getElementById('withdrawBtn');

        // Minimum limit check (Admin baad mein change kar sakta hai)
        let minAmount = 5;
        if(method === 'PayPal') minAmount = 10;
        if(method === 'Bank') minAmount = 20;

        if (amount < minAmount) {
            showAlert(`Min limit for ${method} is $${minAmount}`, true);
            return;
        }

        if (amount > currentBalance) {
            showAlert("Low Balance!", true);
            return;
        }

        try {
            withdrawBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
            withdrawBtn.disabled = true;

            // Database me request daalna
            await addDoc(collection(db, "withdrawals"), {
                userId: currentUser.uid,
                amount: amount,
                payment_method: method,
                payment_account: account,
                status: "Pending", // Admin ise change karega
                createdAt: serverTimestamp()
            });

            // Main Balance se paise katna
            const userRef = doc(db, "users", currentUser.uid);
            await updateDoc(userRef, {
                balance: increment(-amount)
            });

            showAlert("Request Sent!", false);
            withdrawForm.reset();
            
            // UI Update instantly
            await loadWalletData(); 

        } catch (error) {
            showAlert("Error! Try again.", true);
        } finally {
            withdrawBtn.textContent = "Withdraw";
            withdrawBtn.disabled = false;
        }
    });
}
