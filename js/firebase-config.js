// Firebase ke zaroori tools import karna
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Aapki personal Firebase Configuration (MetaLink ke liye)
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

// Firebase ko Initialize (Start) karna
const app = initializeApp(firebaseConfig);

// Database aur Auth ko set karna
const db = getFirestore(app);
const auth = getAuth(app);

// In sabko export karna taaki auth.js, dashboard.js inhe aasaani se use kar sakein
export { app, db, auth };
