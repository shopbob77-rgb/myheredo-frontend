// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

// ==================== KONFIGURACJA FIREBASE ====================
const firebaseConfig = {
  apiKey: "AIzaSyDgKN7f9p4aTDFLMjQjg1DnrQleaqw-RM",
  authDomain: "myheredo.firebaseapp.com",
  projectId: "myheredo",
  storageBucket: "myheredo.firebasestorage.app",
  messagingSenderId: "819096717512",
  appId: "1:819096717512:web:ef46410042212263e6bdfd",
  measurementId: "G-T8KMX99DN4"
};
// ============================================================

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);

console.log("✅ Firebase MyHeredo połączony pomyślnie");
