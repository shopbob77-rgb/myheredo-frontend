// auth.js
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword,
    signOut,
    sendEmailVerification 
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

import { auth, db } from "./firebase.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

// ===================== REJESTRACJA =====================
export async function registerUser(email, password) {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Wysyłamy email weryfikacyjny
        await sendEmailVerification(user);

        // Zapisujemy użytkownika do Firestore
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

// ===================== LOGOWANIE =====================
export async function loginUser(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        console.log("✅ Zalogowano użytkownika:", user.email);
        return user;

    } catch (error) {
        console.error("Błąd logowania:", error);
        throw error;
    }
}

// ===================== WYLOGOWANIE =====================
export async function logoutUser() {
    try {
        await signOut(auth);
        console.log("✅ Wylogowano użytkownika");
    } catch (error) {
        console.error("Błąd wylogowania:", error);
        throw error;
    }
}
