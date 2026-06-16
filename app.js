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
function logout(silent = false) {
    if (!silent && !confirm("Wylogować się?")) return;
    sessionStorage.clear();
    window.location.href = "index.html";
}

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
        card.className = `skrytka-card bg-slate-900 border ${isFilled ? 'border-emerald-500' : 'border-slate-700'} rounded-3xl p-6 cursor-pointer relative`;
        card.innerHTML = `
            <div class="flex items-center gap-4">
                <div class="text-4xl">${getIcon(key)}</div>
                <div class="flex-1 min-w-0">
                    <h3 class="font-semibold text-lg truncate">${categoryNames[key] || key}</h3>
                    <p class="text-sm ${isFilled ? 'text-emerald-400' : 'text-slate-500'}">
                        ${isFilled ? '✓ Zaszyfrowane' : 'Pusta skrytka'}
                    </p>
                </div>
            </div>
            ${isCustom ? `<button onclick="event.stopImmediatePropagation(); deleteCustomVault('${key}');" class="absolute top-4 right-4 text-red-400 hover:text-red-500 text-2xl">✕</button>` : ''}
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
    const html = `
    <div id="certificateOverlay" class="fixed inset-0 bg-black/95 flex items-center justify-center z-[1000] p-4 overflow-auto">
        <div class="bg-white text-slate-900 max-w-4xl w-full rounded-3xl shadow-2xl overflow-hidden">
            
            <!-- Nagłówek z Twoim logo -->
            <div class="bg-gradient-to-br from-slate-900 to-black text-white p-12 text-center relative">
                <img src="logo.png" alt="MyHeredo" class="h-40 mx-auto mb-8">
                <h1 class="text-5xl font-bold tracking-wider">CERTYFIKAT SUKCESJI</h1>
                <p class="text-amber-400 mt-3 text-xl">MyHeredo • Cyfrowy Sejf Sukcesyjny</p>
                <p class="text-sm text-slate-400 mt-4">ID: ${docId} | Wygenerowano: ${certificateData.versionLabel}</p>
            </div>

            <!-- Treść -->
            <div class="p-12 space-y-10">
                <!-- Właściciel -->
                <div class="text-center border-b pb-8">
                    <p class="text-slate-500 text-sm uppercase tracking-widest">Właściciel Sejfu</p>
                    <p class="text-3xl font-semibold mt-2">${certificateData.ownerEmail}</p>
                </div>

                <!-- Spadkobiercy -->
                <div>
                    <h2 class="text-2xl font-semibold mb-6 flex items-center gap-3">
                        👥 Spadkobiercy
                    </h2>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        ${certificateData.heirs.map(h => `
                            <div class="bg-slate-50 border border-slate-200 p-6 rounded-3xl">
                                <p class="font-semibold text-xl">${h.name}</p>
                                <p class="text-slate-600">${h.email}</p>
                                <div class="mt-4 text-emerald-600 text-sm font-medium">• Pełny dostęp do sejfu</div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Skrytki z ikonami z dashboardu -->
                <div>
                    <h2 class="text-2xl font-semibold mb-6 flex items-center gap-3">
                        🔒 Skrytki Sukcesyjne
                    </h2>
                    <div class="space-y-4">
                        ${vaults.map(v => `
                            <div class="border-l-4 border-amber-400 pl-6 py-5 bg-slate-50 rounded-r-3xl flex items-center gap-5">
                                <span class="text-5xl">${getIcon(v.category.toLowerCase().replace(/[^a-z]/g, ''))}</span>
                                <div>
                                    <p class="font-semibold text-lg">${v.category}</p>
                                    <p class="text-emerald-600 text-sm font-medium">● Dane zaszyfrowane end-to-end</p>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>

            <!-- Przyciski -->
            <div class="flex border-t">
                <button onclick="printCertificate()" class="flex-1 py-7 bg-slate-900 text-white font-semibold text-lg hover:bg-black transition-all">🖨️ Drukuj / Zapisz jako PDF</button>
                <button onclick="decryptCertificate('${docId}')" class="flex-1 py-7 bg-emerald-600 text-white font-semibold text-lg hover:bg-emerald-700 transition-all">🔓 Odszyfruj Skrytki</button>
                <button onclick="closeCertificate()" class="flex-1 py-7 font-semibold text-lg hover:bg-slate-100 transition-all">Zamknij</button>
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
// ==================== GLOBALNE FUNKCJE ====================
window.addHeir = addHeir;
window.removeHeir = removeHeir;
window.addCustomVault = addCustomVault;
window.deleteCustomVault = deleteCustomVault;
window.showCertificate = showCertificate;
window.simulateDeath = simulateDeath;
window.loadDemoData = loadDemoData;
window.handleLogout = logout;
window.loadCertificates = loadCertificates;
window.openCertificate = openCertificate;
window.deleteCertificate = deleteCertificate;
window.saveVault = saveVault;
window.closeVaultModal = closeVaultModal;
window.openVaultModal = openVaultModal;
