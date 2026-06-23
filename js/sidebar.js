// ==========================================
// 1. MENU KO SABHI PAGES PAR LOAD KARNA
// ==========================================
function loadSidebar() {
    // Ye fetch request 'sidebar.html' ko dhoondh kar page me inject karegi
    fetch('sidebar.html')
        .then(response => response.text())
        .then(data => {
            // Body ke sabse upar menu ko daal do
            document.body.insertAdjacentHTML('afterbegin', data);
            
            // Menu lagne ke baad check karo ki konsa page open hai
            setActivePage();
            
            // Logout button ko activate karo (agar firebase logged in hai)
            setupLogout();
        })
        .catch(error => console.error("Sidebar load nahi hua. Check if you are running a local server.", error));
}

// ==========================================
// 2. ACTIVE PAGE KO HIGHLIGHT KARNA
// ==========================================
function setActivePage() {
    // Current URL URL se page ka naam nikalna (e.g., 'dashboard.html')
    const path = window.location.pathname.split("/").pop() || "dashboard.html";
    
    // Page ke naam ke hisaab se menu ki ID select karna
    const map = {
        "dashboard.html": "nav-dashboard",
        "links.html": "nav-links",
        "withdraw.html": "nav-withdraw",
        "tools.html": "nav-tools",
        "referrals.html": "nav-referrals",
        "settings.html": "nav-settings"
    };
    
    // Uss ID wale button ko 'active' class de dena taaki wo chamke
    if(map[path]) {
        const activeElement = document.getElementById(map[path]);
        if(activeElement) activeElement.classList.add('active');
    }
}

// ==========================================
// 3. BACK BUTTON CONTROL (APP CLOSURE FIX)
// ==========================================
function setupBackButton() {
    const path = window.location.pathname.split("/").pop();
    
    // Agar user Dashboard ya Index (login) par nahi hai...
    if (path !== "dashboard.html" && path !== "index.html" && path !== "") {
        // Phone ki history me ek dummy state push kardo
        history.pushState(null, null, window.location.href);
        
        // Jab user phone ka 'Back' button dabayega, tab ye chalega
        window.addEventListener('popstate', function(event) {
            // Use seedha Dashboard par phek do
            window.location.replace("dashboard.html");
        });
    }
}

// ==========================================
// 4. FIREBASE LOGOUT CONNECTION
// ==========================================
function setupLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            // Firebase logout logic aapke dashboard.js me bhi hai, yahan fallback diya hai
            window.location.replace("index.html");
        });
    }
}

// Run the engine
loadSidebar();
setupBackButton();
