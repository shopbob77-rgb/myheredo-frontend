

// ===================== REJESTRACJA =====================
// auth.js
import { 
    createUserWithEmailAndPassword, 
    sendEmailVerification 
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

import { auth, db } from "./firebase.js";
import { 
    doc, setDoc, serverTimestamp, 
    collection, addDoc 
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

// ===================== REJESTRACJA UŻYTKOWNIKA =====================
export async function registerUser(email, password) {
    try {
        // 1. Tworzymy użytkownika w Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // 2. Wysyłamy email weryfikacyjny
        await sendEmailVerification(user);

        // 3. Zapisujemy użytkownika do Firestore
        await setDoc(doc(db, "users", user.uid), {
            uid: user.uid,
            email: user.email,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            emailVerified: false
        });

        // 4. Tworzymy przykładowe puste skrytki dla nowego użytkownika
        const defaultVaults = [
            {
                title: "Konta bankowe i finansowe",
                type: "bank",
                encryptedContent: ""   // na razie puste (zaszyfrowane później przez użytkownika)
            },
            {
                title: "Kryptowaluty i Portfele",
                type: "crypto",
                encryptedContent: ""
            },
            {
                title: "Konta Cyfrowe i Social Media",
                type: "social",
                encryptedContent: ""
            },
            {
                title: "Instrukcje Sukcesyjne",
                type: "instructions",
                encryptedContent: ""
            }
        ];

        // Dodajemy skrytki do kolekcji vaults
        const vaultsCollection = collection(db, "vaults");
        
        for (const vault of defaultVaults) {
            await addDoc(vaultsCollection, {
                userId: user.uid,
                title: vault.title,
                type: vault.type,
                encryptedContent: vault.encryptedContent,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                isActive: true
            });
        }

        console.log("✅ Użytkownik zarejestrowany z przykładowymi skrytkami:", user.email);
        return user;

    } catch (error) {
        console.error("Błąd rejestracji:", error);
        throw error;
    }
}
// auth.js

import { 
    collection, query, where, getDocs, orderBy 
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

import { db } from "./firebase.js";

// ===================== POBIERANIE SKRYTEK UŻYTKOWNIKA =====================
export async function getUserVaults(userId) {
    try {
        const vaultsRef = collection(db, "vaults");
        
        // Tworzymy zapytanie: skrytki należące do użytkownika, posortowane od najnowszych
        const q = query(
            vaultsRef,
            where("userId", "==", userId),
            orderBy("createdAt", "desc")
        );

        const querySnapshot = await getDocs(q);
        const vaults = [];

        querySnapshot.forEach((doc) => {
            vaults.push({
                id: doc.id,
                ...doc.data()
            });
        });

        console.log(`✅ Pobrano ${vaults.length} skrytek dla użytkownika ${userId}`);
        return vaults;

    } catch (error) {
        console.error("Błąd pobierania skrytek:", error);
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
