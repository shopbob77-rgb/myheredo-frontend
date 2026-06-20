// =============================================
// MYHEREDO - Hybrydowa Warstwa Sukcesyjna
// Stabilna wersja
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
    console.log("✅ Firebase zainicjowany");
}

const loadFirebaseScripts = () => {
    const s1 = document.createElement('script');
    s1.src = "https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js";
    document.head.appendChild(s1);
    s1.onload = () => {
        const s2 = document.createElement('script');
        s2.src = "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore-compat.js";
        document.head.appendChild(s2);
        s2.onload = initializeFirebase;
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
            vaultData = {};
        }
    } else {
        vaultData = {};
    }

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
    setTimeout(() => loadCertificates(), 800); // opóźnienie
}

// ==================== TIMER ====================
function startInactivityTimer() {
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => logout(true), 20 * 60 * 1000);
}
function resetInactivityTimer() {
    startInactivityTimer();
}
// ==================== WYLOGOWANIE ====================
function handleLogout() {
    if (confirm("Wylogować się z MyHeredo?")) {
        // Czyszczenie wszystkich danych sesji
        sessionStorage.clear();
        localStorage.removeItem('myheredo_user_email');
        localStorage.removeItem('myheredo_encrypted_vault');
        localStorage.removeItem('myheredo_heirs');
        localStorage.removeItem('myheredo_dms_config');
        
        console.log("Wylogowano - przekierowanie na stronę główną");
        window.location.href = "index.html";   // lub "/" jeśli index.html jest w root
    }
}

// Alternatywna nazwa dla kompatybilności
window.logout = handleLogout;


// ==================== SZYFROWANIE ====================
async function deriveKey(password, salt) {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits", "deriveKey"]);
    return crypto.subtle.deriveKey(
        { name: "PBKDF2", salt: salt, iterations: 100000, hash: "SHA-256" },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
    );
}
async function encryptData(data, password) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(password, salt);
    const encoder = new TextEncoder();
    const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoder.encode(JSON.stringify(data)));
    const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(encrypted), salt.length + iv.length);
    return btoa(String.fromCharCode(...combined));
}
async function decryptData(encryptedData, password) {
    const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
    const salt = combined.slice(0, 16);
    const iv = combined.slice(16, 28);
    const ciphertext = combined.slice(28);
    const key = await deriveKey(password, salt);
    const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
    return JSON.parse(new TextDecoder().decode(decrypted));
}
async function saveAllData() {
    if (!masterPassword) return;
    const encrypted = await encryptData(vaultData, masterPassword);
    localStorage.setItem('myheredo_encrypted_vault', encrypted);
}

// ==================== SKRYTKI ====================
function renderSkrytki() {
    const grid = document.getElementById('skrytkiGrid');
    if (!grid) return;
    grid.innerHTML = '';

    Object.keys(vaultData).forEach((key) => {
        const isFilled = vaultData[key] && vaultData[key].trim() !== '';
        const isCustom = !Object.keys(defaultCategories).includes(key);

        const card = document.createElement('div');
        card.className = `skrytka-card bg-slate-900 border ${isFilled ? 'border-emerald-500' : 'border-slate-700'} 
                          rounded-3xl p-5 sm:p-6 cursor-pointer relative transition-all hover:-translate-y-1`;

        const icon = getIcon ? getIcon(key) : '📁';

        card.innerHTML = `
            <div class="flex items-start gap-4">
                <div class="text-4xl flex-shrink-0 mt-0.5">${icon}</div>
                <div class="flex-1 min-w-0">
                    <h3 class="font-semibold text-base sm:text-lg leading-tight break-words">${categoryNames[key] || key}</h3>
                    <p class="text-sm mt-1 ${isFilled ? 'text-emerald-400' : 'text-slate-500'}">
                        ${isFilled ? '✓ Zaszyfrowane' : 'Pusta skrytka'}
                    </p>
                </div>
            </div>
            ${isCustom ? `<button onclick="event.stopImmediatePropagation(); deleteCustomVault('${key}');" 
                         class="absolute top-4 right-4 text-red-400 hover:text-red-500 text-2xl">✕</button>` : ''}
        `;

        card.onclick = () => openVaultModal(key);
        grid.appendChild(card);
    });
}
function getIcon(key) {
    if (customIcons[key]) return customIcons[key];
    const icons = { passwordManager: "🔑", banki: "🏦", krypto: "₿", social: "📱", instrukcje: "📜" };
    return icons[key] || "📁";
}

function openVaultModal(key) {
    const content = vaultData[key] || '';
    const modalHTML = `
    <div id="vaultModal" class="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
        <div class="bg-slate-900 rounded-3xl p-8 max-w-lg w-full mx-4">
            <h2 class="text-2xl font-semibold mb-6">${categoryNames[key] || key}</h2>
            <textarea id="vaultContent" class="w-full h-64 bg-slate-950 border border-slate-700 rounded-2xl p-5 text-slate-200">${content}</textarea>
            <div class="flex gap-4 mt-6">
                <button onclick="saveVault('${key}')" class="flex-1 bg-amber-400 text-slate-950 font-semibold py-4 rounded-2xl hover:bg-amber-300">Zapisz</button>
                <button onclick="closeVaultModal()" class="flex-1 border border-slate-700 font-semibold py-4 rounded-2xl">Anuluj</button>
            </div>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function closeVaultModal() {
    const modal = document.getElementById('vaultModal');
    if (modal) modal.remove();
}

async function saveVault(key) {
    const content = document.getElementById('vaultContent').value.trim();
    vaultData[key] = content;
    await saveAllData();
    closeVaultModal();
    renderSkrytki();
}

// ==================== NOWA SKRYTKA ====================
function addCustomVault() {
    const name = prompt("Podaj nazwę nowej skrytki:");
    if (!name || name.trim() === "") return;
    const key = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    if (vaultData[key]) return alert("Taka skrytka już istnieje.");
    customIcons[key] = "📁";
    vaultData[key] = "";
    categoryNames[key] = name;
    saveAllData();
    localStorage.setItem('myheredo_custom_icons', JSON.stringify(customIcons));
    renderSkrytki();
}

function deleteCustomVault(key) {
    if (confirm(`Usunąć skrytkę "${categoryNames[key]}"?`)) {
        delete vaultData[key];
        delete categoryNames[key];
        if (customIcons[key]) delete customIcons[key];
        saveAllData();
        localStorage.setItem('myheredo_custom_icons', JSON.stringify(customIcons));
        renderSkrytki();
    }
}

// ==================== SPADKOBIERCY ====================
function renderHeirs() {
    const container = document.getElementById('heirsList');
    if (!container) return;
    container.innerHTML = heirs.length ? '' : '<p class="text-slate-500 italic text-center py-12">Nie dodano spadkobierców...</p>';
    heirs.forEach((heir, i) => {
        const div = document.createElement('div');
        div.className = "flex justify-between items-center bg-slate-800 rounded-2xl p-4 mb-3";
        div.innerHTML = `
            <div>
                <div class="font-medium">${heir.name}</div>
                <div class="text-sm text-slate-400">${heir.email}</div>
            </div>
            <button onclick="removeHeir(${i})" class="text-red-400 hover:text-red-500 text-2xl">✕</button>`;
        container.appendChild(div);
    });
}

function addHeir() {
    const name = document.getElementById('heirName').value.trim();
    const email = document.getElementById('heirEmail').value.trim();
    if (!name || !email) return alert("Wypełnij oba pola");
    heirs.push({name, email});
    localStorage.setItem('myheredo_heirs', JSON.stringify(heirs));
    document.getElementById('heirName').value = '';
    document.getElementById('heirEmail').value = '';
    renderHeirs();
}

function removeHeir(i) {
    if (confirm("Usunąć spadkobiercę?")) {
        heirs.splice(i, 1);
        localStorage.setItem('myheredo_heirs', JSON.stringify(heirs));
        renderHeirs();
    }
}

// ==================== DMS ====================
function setupDMS() {
    const slider = document.getElementById('dmsSlider');
    const value = document.getElementById('dmsValue');
    if (slider && value) {
        slider.addEventListener('input', () => {
            value.textContent = slider.value + " dni";
            dmsConfig.days = parseInt(slider.value);
            localStorage.setItem('myheredo_dms_config', JSON.stringify(dmsConfig));
        });
    }
}

// ==================== CERTYFIKAT ====================
async function showCertificate() {
    if (!db) {
        alert("Firebase jeszcze się ładuje...");
        return;
    }
    if (!masterPassword) {
        alert("Wymagane hasło master.");
        return;
    }

    const userEmail = localStorage.getItem('myheredo_user_email');
    if (!userEmail) return alert("Brak użytkownika");

    const now = new Date();

    // Szyfrujemy dane skrytek
    const encryptedVaults = {};
    for (let key in vaultData) {
        if (vaultData[key] && vaultData[key].trim() !== '') {
            encryptedVaults[key] = await encryptData(vaultData[key], masterPassword);
        }
    }

    const certificateData = {
        ownerEmail: userEmail,
        generatedAt: firebase.firestore.Timestamp.now(),
        generatedDate: now.toISOString(),
        dmsDays: parseInt(document.getElementById('dmsSlider')?.value || 45),
        heirs: heirs,
        encryptedVaults: encryptedVaults,   // <-- zaszyfrowane dane
        vaultsSummary: Object.keys(vaultData).map(key => ({
            category: categoryNames[key] || key,
            status: "Zaszyfrowane"
        })),
        status: "generated",
        version: now.getTime(),
        versionLabel: now.toLocaleString('pl-PL')
    };

    try {
        const docRef = await db.collection("certificates").add(certificateData);
        alert(`✅ Zaszyfrowany certyfikat zapisany!\nID: ${docRef.id}`);
        renderCertificateOverlay(certificateData, docRef.id);
    } catch (error) {
        console.error(error);
        alert("Błąd zapisu.");
    }
}

function renderCertificateOverlay(certificateData, docId) {
    const vaults = certificateData.vaultsSummary || [];
    const generatedDate = new Date(certificateData.generatedAt?.toDate ? certificateData.generatedAt.toDate() : Date.now());
    const formattedDate = generatedDate.toLocaleDateString('pl-PL', { day: '2-digit', month: 'long', year: 'numeric' });
    
    const html = `
    <div id="certificateOverlay" class="fixed inset-0 bg-black/95 flex items-center justify-center z-[10000] p-4 sm:p-6 overflow-hidden">
        <div class="bg-white w-full max-w-3xl md:max-w-4xl rounded-3xl shadow-2xl overflow-hidden text-slate-900" style="max-height: 95vh;">
            
            <!-- Nagłówek -->
            <div class="pt-8 sm:pt-12 pb-6 sm:pb-8 text-center border-b border-slate-200">
                <img src="logo.png" alt="MyHeredo" class="h-16 sm:h-20 mx-auto mb-5 sm:mb-6">
                <h1 class="text-3xl sm:text-4xl font-bold flex items-center justify-center gap-3">
                    <span class="text-2xl sm:text-3xl">🪶</span> CERTYFIKAT SUKCESJI
                </h1>
                <p class="text-lg sm:text-xl text-amber-600 font-medium mt-1">Cyfrowa Sukcesja</p>
                <p class="text-slate-600 text-sm sm:text-base">MyHeredo • Bezpieczny Sejf Spadkowy</p>
            </div>
            
            <!-- Treść główna - z kontrolowaną wysokością -->
            <div class="p-6 sm:p-12 space-y-8 sm:space-y-10 overflow-auto" style="max-height: calc(95vh - 220px);">
                <!-- Numer i data -->
                <div class="grid grid-cols-2 gap-6 text-sm sm:text-base">
                    <div>
                        <p class="text-xs uppercase tracking-widest text-slate-500">Numer certyfikatu</p>
                        <p class="font-mono font-bold text-lg sm:text-2xl break-all">${docId}</p>
                    </div>
                    <div class="text-right">
                        <p class="text-xs uppercase tracking-widest text-slate-500">Data wystawienia</p>
                        <p class="text-lg sm:text-xl">${formattedDate}</p>
                    </div>
                </div>
                <div>
                    <p class="text-xs uppercase tracking-widest text-slate-500">Właściciel sejfu</p>
                    <p class="text-xl sm:text-2xl font-semibold break-all">${certificateData.ownerEmail}</p>
                </div>
                <div>
                    <p class="text-xs uppercase tracking-widest text-slate-500">Dead Man’s Switch</p>
                    <p class="text-xl sm:text-2xl font-semibold">${certificateData.dmsDays || 45} dni bezczynności</p>
                </div>
                
                <!-- Skrytki -->
                <div>
                    <p class="text-xs uppercase tracking-widest text-slate-500 mb-5">ZABEZPIECZONE SKRYTKI</p>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        ${vaults.map(v => {
                            let iconKey = v.category.toLowerCase();
                            if (iconKey.includes('password') || iconKey.includes('vault')) iconKey = 'passwordmanager';
                            else if (iconKey.includes('bank')) iconKey = 'banki';
                            else if (iconKey.includes('krypto')) iconKey = 'krypto';
                            else if (iconKey.includes('social') || iconKey.includes('cyfrowe')) iconKey = 'social';
                            else if (iconKey.includes('instrukcje')) iconKey = 'instrukcje';
                            const icon = getIcon ? getIcon(iconKey) : '🔒';
                            return `
                                <div class="flex items-center gap-4 bg-slate-50 border border-slate-200 p-5 rounded-2xl">
                                    <span class="text-4xl flex-shrink-0">${icon}</span>
                                    <div class="min-w-0">
                                        <p class="font-medium leading-tight">${v.category}</p>
                                        <p class="text-emerald-600 text-sm">Zaszyfrowane</p>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
                
                <!-- Spadkobiercy -->
                <div>
                    <p class="text-xs uppercase tracking-widest text-slate-500 mb-5">SPADKOBIERCY (${certificateData.heirs ? certificateData.heirs.length : 0})</p>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        ${(certificateData.heirs || []).map(h => `
                            <div class="bg-slate-50 border border-slate-200 p-6 rounded-2xl">
                                <p class="font-semibold">${h.name}</p>
                                <p class="text-slate-600 break-all">${h.email}</p>
                                <p class="text-emerald-600 text-sm mt-3">● Pełny dostęp</p>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
            
            <!-- Przyciski -->
            <div class="border-t p-6 sm:p-10 flex flex-col gap-3 print:hidden">
                <button onclick="printCertificate()" class="w-full py-5 sm:py-6 bg-slate-900 text-white font-semibold rounded-2xl text-base sm:text-lg hover:bg-black transition">🖨️ Drukuj / Zapisz jako PDF</button>
                <button onclick="decryptCertificate('${docId}')" class="w-full py-5 sm:py-6 bg-emerald-600 text-white font-semibold rounded-2xl text-base sm:text-lg hover:bg-emerald-700 transition">🔓 Odszyfruj Skrytki</button>
                <button onclick="closeCertificate()" class="w-full py-5 sm:py-6 border border-slate-300 font-semibold rounded-2xl text-base sm:text-lg hover:bg-slate-100 transition">Zamknij</button>
            </div>
        </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', html);
}
}
function closeCertificate() {
    const overlay = document.getElementById('certificateOverlay');
    if (overlay) overlay.remove();
}

function printCertificate() {
    window.print();
}

// ==================== MOJE CERTYFIKATY ====================
async function loadCertificates() {
    const container = document.getElementById('certificatesList');
    if (!container) return;
    container.innerHTML = '<p class="text-slate-400">Ładowanie...</p>';

    if (!db) {
        container.innerHTML = '<p class="text-red-400">Firebase nie jest gotowy.</p>';
        return;
    }

    try {
        const userEmail = localStorage.getItem('myheredo_user_email');
        const snapshot = await db.collection("certificates")
            .where("ownerEmail", "==", userEmail)
            .orderBy("version", "desc")
            .get();

        container.innerHTML = '';
        if (snapshot.empty) {
            container.innerHTML = `<p class="text-slate-400 text-center py-12">Nie wygenerowałeś jeszcze certyfikatów.</p>`;
            return;
        }

        snapshot.forEach(doc => {
            const cert = doc.data();
            if (cert.isDeleted) return;
            const date = cert.generatedDate ? new Date(cert.generatedDate).toLocaleString('pl-PL') : '—';
            const card = document.createElement('div');
            card.className = "bg-slate-900 border border-slate-700 rounded-3xl p-6 hover:border-amber-400 transition-all flex justify-between items-center";
            card.innerHTML = `
                <div>
                    <p class="text-sm text-slate-400">${date}</p>
                    <p class="font-medium mt-1">Wersja ${cert.versionLabel || ''}</p>
                </div>
                <div class="flex gap-3">
                    <button onclick="openCertificate('${doc.id}')" class="px-5 py-2 bg-amber-400 text-slate-950 rounded-2xl text-sm font-medium hover:bg-amber-300">Otwórz</button>
                    <button onclick="deleteCertificate('${doc.id}')" class="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-sm">Usuń</button>
                </div>
            `;
            container.appendChild(card);
        });
    } catch (e) {
        console.error(e);
        container.innerHTML = `<p class="text-red-400">Błąd ładowania.</p>`;
    }
}

async function openCertificate(certId) {
    try {
        const doc = await db.collection("certificates").doc(certId).get();
        if (!doc.exists) return alert("Certyfikat nie istnieje");
        const cert = doc.data();
        renderCertificateOverlay(cert, certId);
    } catch (error) {
        console.error(error);
        alert("Nie udało się otworzyć certyfikatu.");
    }
}

async function deleteCertificate(certId) {
    if (!confirm("Usunąć certyfikat? Zostanie oznaczony jako usunięty.")) return;
    try {
        await db.collection("certificates").doc(certId).update({
            isDeleted: true,
            deletedAt: firebase.firestore.Timestamp.now()
        });
        alert("Certyfikat usunięty.");
        loadCertificates();
    } catch (error) {
        console.error(error);
        alert("Błąd usuwania.");
    }
}

// ==================== POZOSTAŁE ====================
function simulateDeath() {
    if (heirs.length === 0) return alert("Dodaj spadkobierców");
    const days = document.getElementById('dmsSlider')?.value || 45;
    let msg = `⚰️ SYMULACJA PO ŚMIERCI\n\nDead Man’s Switch po ${days} dniach.\n\nDostęp przekazany:\n`;
    heirs.forEach(h => msg += `• ${h.name} (${h.email})\n`);
    alert(msg);
}

function showSuccessMessage(text) {
    alert(text);
}

function loadDemoData() {
    if (!confirm("Wczytać przykładowe dane?")) return;
    vaultData = {
        passwordManager: "Vaultwarden: https://vault.twojadomena.pl\nLogin: jan.kowalski",
        banki: "ING Bank Śląski\nLogin: jan.kowalski",
        krypto: "Bitcoin Seed: witch blossom aunt accuse...",
        social: "Gmail: jan.kowalski@gmail.com",
        instrukcje: "Testament u notariusza"
    };
    saveAllData();
    renderSkrytki();
    renderHeirs();
    setupDMS();
    setTimeout(() => loadCertificates(), 800);
    showSuccessMessage("✅ Przykładowe dane wczytane!");
}
async function decryptCertificate(certId) {
    const masterPass = prompt("Podaj Master Password aby odszyfrować skrytki:");
    if (!masterPass) return;

    try {
        const doc = await db.collection("certificates").doc(certId).get();
        const cert = doc.data();

        if (!cert.encryptedVaults) {
            alert("Ten certyfikat nie zawiera zaszyfrowanych danych.");
            return;
        }

        let decryptedText = "🔓 Odszyfrowane skrytki:\n\n";
        for (let key in cert.encryptedVaults) {
            const decrypted = await decryptData(cert.encryptedVaults[key], masterPass);
            decryptedText += `${key.toUpperCase()}:\n${decrypted}\n\n`;
        }

        alert(decryptedText);
    } catch (error) {
        console.error(error);
        alert("Nieprawidłowe hasło lub błąd odszyfrowania.");
    }
}
// ==================== GLOBALNA REJESTRACJA FUNKCJI ====================
// MUSI BYĆ NA SAMYM KOŃCU PLIKU app.js !!!
window.addHeir = addHeir;
window.removeHeir = removeHeir;
window.addCustomVault = addCustomVault;
window.deleteCustomVault = deleteCustomVault;
window.saveRecoveryPassword = saveRecoveryPassword;
window.showCertificate = showCertificate;
window.decryptCertificate = decryptCertificate;
window.simulateDeath = simulateDeath;
window.loadDemoData = loadDemoData;
window.handleLogout = handleLogout;
window.loadCertificates = loadCertificates;
window.openCertificate = openCertificate;
window.closeCertificate = closeCertificate;
window.printCertificate = printCertificate;
window.openVaultModal = openVaultModal;
window.closeVaultModal = closeVaultModal;
window.saveVault = saveVault;

console.log("✅ Wszystkie funkcje zostały pomyślnie zarejestrowane globalnie");
