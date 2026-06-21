// auth.js
import { 
    createUserWithEmailAndPassword, 
    sendEmailVerification 
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

import { auth, db } from "./firebase.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

// ===================== REJESTRACJA UŻYTKOWNIKA =====================
export async function registerUser(email, password) {
    try {
        // 1. Tworzymy użytkownika w Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // 2. Wysyłamy email weryfikacyjny
        await sendEmailVerification(user);

        // 3. Zapisujemy dane użytkownika do Firestore
        await setDoc(doc(db, "users", user.uid), {
            uid: user.uid,
            email: user.email,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            emailVerified: false
        });

        console.log("✅ Użytkownik zarejestrowany:", user.email);
        return user;

    } catch (error) {
        console.error("Błąd rejestracji:", error);
        throw error;
    }
}
