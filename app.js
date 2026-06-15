// =============================================
// MYHEREDO - Hybrydowa Warstwa Sukcesyjna
// Stabilna wersja - Firebase + E2EE + Certyfikaty
// =============================================

// ==================== FIREBASE COMPAT ====================
let db = null;

function initializeFirebase() {
    const config = {
        apiKey: "wpisz_tutaj_api_key",
        authDomain: "myheredo.firebaseapp.com",
        projectId: "myheredo",
        storageBucket: "myheredo.appspot.com",
        messagingSenderId: "wpisz_sender_id",
        appId: "wpisz_app_id"
    };

    firebase.initializeApp(config);
    db = firebase.firestore();
    console.log("✅ Firebase pomyślnie zainicjowany");
}

// Ładowanie Firebase
const loadFirebaseScripts = () => {
    const script1 = document.createElement('script');
    script1.src = "https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js";
    document.head.appendChild(script1);

    script1.onload = () => {
        const script2 = document.createElement('script');
        script2.src = "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore-compat.js";
        document.head.appendChild(script2);
        script2.onload = initializeFirebase;
    };
};

loadFirebaseScripts();
// =======================================================

let masterPassword = null;
let vaultData = {};
let categoryNames = {};
let heirs = [];
let customIcons = {};
let dmsConfig = { days: 45, lastActivity: Date.now(), isActive: false };
let inactivityTimer = null;

const defaultCategories = {
    passwordManager: "Password Manager (Vaultwarden itp.)",
    banki: "Konta Bankowe i Finansowe",
    krypto: "Kryptowaluty i Portfele",
    social: "Konta Cyfrowe i Social Media",
    instrukcje: "Instrukcje Sukcesyjne"
};

document.addEventListener('DOMContentLoaded', () => {
    initDashboard();
    startInactivityTimer();
});

document.addEventListener('mousemove', resetInactivityTimer);
document.addEventListener('keypress', resetInactivityTimer);

// ==================== INIT DASHBOARD ====================
async function initDashboard() {
    const email = localStorage.getItem('myheredo_user_email');
    if (!email) {
        window.location.href = "login.html";
        return;
    }

    document.getElementById('userEmail').textContent = email;
    masterPassword = sessionStorage.getItem('myheredo_master_password');

    const savedEncryptedVault = localStorage.getItem('myheredo_encrypted_vault');
    
    if (savedEncryptedVault && masterPassword) {
        try {
            vaultData = await decryptData(savedEncryptedVault, masterPassword);
        } catch (e) {
            console.warn("Nie udało się odszyfrować danych");
            vaultData = {};
        }
    } else {
        vaultData = {};
    }

    // Inicjalizacja domyślnych skrytek
    if (Object.keys(vaultData).length === 0) {
        vaultData = {
            passwordManager: "",
            banki: "",
            krypto: "",
            social: "",
            instrukcje: ""
        };
        categoryNames = { ...defaultCategories };
    }

    const savedHeirs = localStorage.getItem('myheredo_heirs');
    const savedIcons = localStorage.getItem('myheredo_custom_icons');
    const savedDMS = localStorage.getItem('myheredo_dms_config');

    if (savedHeirs) heirs = JSON.parse(savedHeirs);
    if (savedIcons) customIcons = JSON.parse(savedIcons);
    if (savedDMS) dmsConfig = JSON.parse(savedDMS);

    renderSkrytki();
    renderHeirs();
    setupDMS();
    loadCertificates();        // ładuje listę certyfikatów
}

// ==================== INACTIVITY TIMER ====================
function startInactivityTimer() {
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => handleLogout(true), 20 * 60 * 1000);
}

function resetInactivityTimer() {
    startInactivityTimer();
}

function handleLogout(silent = false) {
    if (!silent && !confirm("Wylogować się z MyHeredo?")) return;
    sessionStorage.clear();
    window.location.href = "index.html";
}

// ==================== CERTYFIKAT ====================
async function showCertificate() {
    if (!db) {
        alert("Firebase jeszcze się ładuje... Spróbuj za chwilę.");
        return;
    }
    if (!masterPassword) {
        alert("Aby wygenerować certyfikat, wymagane jest hasło master.");
        return;
    }

    const userEmail = localStorage.getItem('myheredo_user_email');
    if (!userEmail) return alert("Brak zalogowanego użytkownika");

    const now = new Date();
    const certificateData = {
        ownerEmail: userEmail,
        generatedAt: firebase.firestore.Timestamp.now(),
        generatedDate: now.toISOString(),
        dmsDays: parseInt(document.getElementById('dmsSlider')?.value || 45),
        heirs: heirs,
        vaults: Object.keys(vaultData).map(key => ({
            category: categoryNames[key] || key,
            preview: vaultData[key] ? vaultData[key].substring(0, 280) + (vaultData[key].length > 280 ? '...' : '') : ''
        })),
        status: "generated",
        version: now.getTime(),
        versionLabel: now.toLocaleString('pl-PL')
    };

    try {
        const docRef = await db.collection("certificates").add(certificateData);
        console.log("✅ Certyfikat zapisany! ID:", docRef.id);
        alert(`✅ Zapisano nową wersję certyfikatu!\nID: ${docRef.id}`);

        renderCertificateOverlay(certificateData, docRef.id);
    } catch (error) {
        console.error(error);
        alert("Błąd zapisu: " + error.message);
    }
}

function renderCertificateOverlay(certificateData, docId) {
    const html = `
    <div id="certificateOverlay" class="fixed inset-0 bg-black/95 flex items-center justify-center z-[1000] p-4 overflow-auto">
        <div class="bg-white text-slate-900 max-w-4xl w-full rounded-3xl shadow-2xl overflow-hidden">
            <div class="bg-gradient-to-br from-slate-900 to-black text-white p-12 text-center">
                <img src="logo.png" alt="MyHeredo" class="h-28 mx-auto mb-6">
                <h1 class="text-5xl font-bold">CERTYFIKAT SUKCESJI</h1>
                <p class="text-amber-400 mt-3">MyHeredo • ID: ${docId}</p>
            </div>
            <div class="p-12 space-y-10">
                <div class="text-center">
                    <p class="text-slate-500">Właściciel</p>
                    <p class="text-2xl font-semibold">${certificateData.ownerEmail}</p>
                </div>
                <!-- reszta certyfikatu... -->
            </div>
            <div class="flex border-t">
                <button onclick="printCertificate()" class="flex-1 py-6 bg-slate-900 text-white font-semibold">🖨️ Drukuj / Zapisz PDF</button>
                <button onclick="closeCertificate()" class="flex-1 py-6 font-semibold hover:bg-slate-100">Zamknij</button>
            </div>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
}

function closeCertificate() {
    const overlay = document.getElementById('certificateOverlay');
    if (overlay) overlay.remove();
}

function printCertificate() {
    window.print();
}

// ==================== Pozostałe funkcje (loadCertificates, etc.) ====================
// ... możesz je dodać poniżej

console.log("%cMyHeredo Dashboard - Stabilna wersja z Firebase", "color:#fbbf24; font-weight:bold");
// ==================== MOJE CERTYFIKATY ====================
async function loadCertificates() {
    const container = document.getElementById('certificatesList');
    if (!container) return;

    container.innerHTML = '<p class="text-slate-400">Ładowanie certyfikatów...</p>';

    try {
        const userEmail = localStorage.getItem('myheredo_user_email');
        const snapshot = await db.collection("certificates")
            .where("ownerEmail", "==", userEmail)
            .orderBy("version", "desc")
            .get();

        if (snapshot.empty) {
            container.innerHTML = `<p class="text-slate-400 text-center py-12">Nie wygenerowałeś jeszcze żadnych certyfikatów.</p>`;
            return;
        }

        container.innerHTML = '';
        snapshot.forEach(doc => {
            const cert = doc.data();
            const date = cert.generatedDate ? new Date(cert.generatedDate).toLocaleString('pl-PL') : '—';

            const cardHTML = `
                <div class="bg-slate-900 border border-slate-700 rounded-3xl p-6 hover:border-amber-400 transition-all">
                    <div class="flex justify-between">
                        <div>
                            <p class="text-sm text-slate-400">${date}</p>
                            <p class="font-medium">Wersja ${cert.versionLabel || ''}</p>
                            <p class="text-sm text-slate-500 mt-1">
                                ${cert.heirs ? cert.heirs.length : 0} spadkobierców • 
                                ${cert.vaults ? cert.vaults.length : 0} skrytek
                            </p>
                        </div>
                        <button onclick="openCertificate('${doc.id}')" 
                                class="px-6 py-2 bg-amber-400 text-slate-950 rounded-2xl text-sm font-medium hover:bg-amber-300">
                            Otwórz
                        </button>
                    </div>
                </div>`;
            container.innerHTML += cardHTML;
        });
    } catch (e) {
        console.error(e);
        container.innerHTML = `<p class="text-red-400">Błąd podczas wczytywania certyfikatów.</p>`;
    }
}

function openCertificate(certId) {
    // Tymczasowo otwieramy overlay (możemy później rozwinąć)
    alert(`Otwieram certyfikat ID: ${certId}\n\n(Funkcja w budowie)`);
}
