// ============================================================
// Shortnur - Firebase Configuration (SHARED)
// Change your Firebase credentials here — all pages use this.
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js";
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut, sendPasswordResetEmail, updateProfile, updatePassword, deleteUser, reauthenticateWithCredential, EmailAuthProvider, setPersistence, browserLocalPersistence, browserSessionPersistence } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getDatabase, ref, push, set, update, remove, get, onValue } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

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
getAnalytics(app);
const auth = getAuth(app);
const db = getDatabase(app);

export const SITE_CONFIG = {
  shortBaseUrl: "https://shortnur.to",
  websiteBaseUrl: "https://mrprincekr007.github.io/Shortnur",
  appName: "Shortnur",
  linksPerPage: 10,
};

export { auth, db, ref, push, set, update, remove, get, onValue, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut, sendPasswordResetEmail, updateProfile, updatePassword, deleteUser, reauthenticateWithCredential, EmailAuthProvider, setPersistence, browserLocalPersistence, browserSessionPersistence };
