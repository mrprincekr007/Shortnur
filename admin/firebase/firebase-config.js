// ============================================================
// Shortnur Admin - Firebase Configuration (SHARED)
// Change your Firebase credentials here â€” all admin pages use this.
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getDatabase, ref, get, set, update, remove, onValue, push, query, orderByChild, limitToLast } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyAjet_W9tac7mYDEZnRpZ07qcrTce7oTng",
  authDomain: "link-shortnur.firebaseapp.com",
  databaseURL: "https://link-shortnur-default-rtdb.firebaseio.com",
  projectId: "link-shortnur",
  storageBucket: "link-shortnur.firebasestorage.app",
  messagingSenderId: "759363054488",
  appId: "1:759363054488:web:0809a43d4ee3058cf599ed",
  measurementId: "G-H5421J4M9W"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

const ADMIN_UID = "E8eHGeEEdJZ8AMQZZuIo4xEnDsc2";

let cachedAdmins = new Set([ADMIN_UID]);
let adminsLoaded = false;

async function ensureAdmins(force = false) {
  if (adminsLoaded && !force) return cachedAdmins;
  try {
    const snap = await get(ref(db, "settings/admins"));
    const list = new Set([ADMIN_UID]);
    if (snap.exists()) {
      const data = snap.val();
      if (Array.isArray(data)) {
        data.forEach((u) => { if (u) list.add(u); });
      } else {
        Object.keys(data).forEach((u) => { if (data[u]) list.add(u); });
      }
    }
    cachedAdmins = list;
  } catch (e) {}
  adminsLoaded = true;
  return cachedAdmins;
}

function isAdminUser(uid) {
  return cachedAdmins.has(uid);
}

const SHORT_BASE_FALLBACK = "https://linkbaba.online";

let cachedShortBase = null;

// Admin settings (settings/shortBaseUrl) ko priority deta hai, warna fallback
async function getShortBaseUrl() {
  if (cachedShortBase) return cachedShortBase;
  try {
    const snap = await get(ref(db, "settings/shortBaseUrl"));
    if (snap.exists() && snap.val()) {
      cachedShortBase = snap.val();
      return cachedShortBase;
    }
  } catch (e) {}
  return SHORT_BASE_FALLBACK;
}

export { auth, db, ref, get, set, update, remove, onValue, push, query, orderByChild, limitToLast, onAuthStateChanged, signInWithEmailAndPassword, signOut, ensureAdmins, isAdminUser, ADMIN_UID, getShortBaseUrl };
