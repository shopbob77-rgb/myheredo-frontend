// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

// ==================== TWOJA KONFIGURACJA ====================
const firebaseConfig = {
    apiKey: "PASTE_YOUR_API_KEY_HERE",
    authDomain: "myheredo.firebaseapp.com",   // zmień jeśli inne
    projectId: "myheredo",
    storageBucket: "myheredo.appspot.com",
    messagingSenderId: "XXXXXXXXXXXX",
    appId: "1:XXXXXXXXXXXX:web:XXXXXXXXXXXXXXXX"
};
// =========================================================

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

console.log("✅ Firebase MyHeredo initialized");
