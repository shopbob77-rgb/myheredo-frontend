// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

// ==================== TWOJA KONFIGURACJA ====================
const firebaseConfig = {
    apiKey: "wpisz_tutaj_api_key",
    authDomain: "myheredo.firebaseapp.com",
    projectId: "myheredo",
    storageBucket: "myheredo.appspot.com",
    messagingSenderId: "wpisz_messaging_sender_id",
    appId: "wpisz_app_id"
};
// =========================================================

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

console.log("✅ Firebase MyHeredo połączony pomyślnie");
