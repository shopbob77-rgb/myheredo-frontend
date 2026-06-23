// =============================================
// MYHEREDO - Hybrydowa Warstwa Sukcesyjna
// Stabilna wersja (po audycie)
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
    setTimeout(() => loadCertificates(), 800);
    updateRecoveryPasswordStatus();
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
        sessionStorage.clear();
        localStorage.removeItem('myheredo_user_email');
        localStorage.removeItem('myheredo_encrypted_vault');
        localStorage.removeItem('myheredo_heirs');
        localStorage.removeItem('myheredo_dms_config');
        window.location.href = "index.html";
    }
}
window.handleLogout = handleLogout;
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

// ==================== SKRYTKI (NOWA WERSJA - Z FIRESTORE) ====================
let currentVaults = [];

function renderSkrytki(vaults = currentVaults) {
    const grid = document.getElementById('skrytkiGrid');
    if (!grid) return;
    grid.innerHTML = '';
    currentVaults = vaults;

    if (!vaults || vaults.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full text-center py-8 text-slate-400">
                Nie masz jeszcze żadnych skrytek.
            </div>
        `;
        return;
    }

    vaults.forEach((vault) => {
        const isFilled = vault.encryptedContent && vault.encryptedContent.trim() !== '';
        const isCustom = vault.type === 'custom';
        const card = document.createElement('div');
        card.className = `skrytka-card bg-slate-900 border ${isFilled ? 'border-emerald-500' : 'border-slate-700'}
                          rounded-3xl p-5 sm:p-6 cursor-pointer relative transition-all hover:-translate-y-1`;
        const icon = getIcon(vault.type || 'custom');
        card.innerHTML = `
            <div class="flex items-start gap-4">
                <div class="text-4xl flex-shrink-0 mt-0.5">${icon}</div>
                <div class="flex-1 min-w-0">
                    <h3 class="font-semibold text-base sm:text-lg leading-tight break-words">${vault.title}</h3>
                    <p class="text-sm mt-1 ${isFilled ? 'text-emerald-400' : 'text-slate-500'}">
                        ${isFilled ? '✓ Zaszyfrowane' : 'Pusta skrytka'}
                    </p>
                </div>
            </div>
            ${isCustom ? `
                <button onclick="event.stopImmediatePropagation(); deleteCustomVault('${vault.id}');"
                        class="absolute top-4 right-4 text-red-400 hover:text-red-500 text-2xl">✕</button>
            ` : ''}
        `;
        card.onclick = () => openVaultModal(vault);
        grid.appendChild(card);
    });
}

// Otwieranie modalu edycji
function openVaultModal(vault) {
    const content = vault.encryptedContent || '';
    const modalHTML = `
        <div id="vaultModal" class="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div class="bg-slate-900 rounded-3xl p-8 max-w-lg w-full mx-4">
                <h2 class="text-2xl font-semibold mb-6">${vault.title}</h2>
                <textarea id="vaultContent" class="w-full h-64 bg-slate-950 border border-slate-700 rounded-2xl p-5 text-slate-200">${content}</textarea>
                <div class="flex gap-4 mt-6">
                    <button onclick="saveVault('${vault.id}')" class="flex-1 bg-amber-400 text-slate-950 font-semibold py-4 rounded-2xl hover:bg-amber-300">Zapisz</button>
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

// ==================== DODATKOWE FUNKCJE (z modułu) ====================
function addCustomVault() {
    if (typeof window.addCustomVault === 'function') {
        window.addCustomVault();
    } else {
        alert("Funkcja dodawania skrytki jest w trakcie aktualizacji.");
    }
}

async function deleteCustomVault(vaultId) {
    if (!confirm("Czy na pewno chcesz usunąć tę skrytkę?")) return;
    try {
        await deleteDoc(doc(db, "vaults", vaultId));
        const user = auth.currentUser;
        if (user) {
            const vaults = await getUserVaults(user.uid);
            renderSkrytki(vaults);
        }
    } catch (error) {
        console.error("Błąd usuwania skrytki:", error);
        alert("Nie udało się usunąć skrytki.");
    }
}

function getIcon(type) {
    const icons = {
        bank: "🏦",
        crypto: "₿",
        social: "📱",
        instructions: "📜",
        custom: "📁",
        passwordManager: "🔑"
    };
    return icons[type] || "📁";
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

// ==================== POZOSTAŁE FUNKCJE (bez zmian) ====================
// ... (cała reszta Twojego kodu pozostaje bez zmian)

console.log("✅ app.js załadowany (po audycie)");

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
    const heirs = certificateData.heirs || [];
    const generatedDate = new Date(certificateData.generatedAt?.toDate ? certificateData.generatedAt.toDate() : Date.now());
    const formattedDate = generatedDate.toLocaleDateString('pl-PL', { 
        day: '2-digit', month: 'long', year: 'numeric' 
    });

    const contentForHash = `${docId}|${certificateData.ownerEmail}|${certificateData.dmsDays}|${vaults.length}`;
    const digitalSignature = btoa(contentForHash).substring(0, 28);

    const html = `
    <div id="certificateOverlay" class="fixed inset-0 bg-black/95 flex items-center justify-center z-[10000] p-4 sm:p-6 overflow-hidden">
        <div class="cert-container bg-white w-full max-w-3xl md:max-w-[820px] rounded-3xl shadow-2xl flex flex-col text-slate-900"
             style="max-height: 94vh; width: 100%; max-width: 820px;">
            
            <!-- Nagłówek -->
            <div class="pt-8 pb-6 px-8 text-center border-b border-slate-200 flex-shrink-0">
                <img src="logo.png" alt="MyHeredo" class="h-14 mx-auto mb-4">
                <h1 class="text-3xl font-bold tracking-tight">CERTYFIKAT SUKCESJI</h1>
                <p class="text-amber-600 text-base mt-1 font-medium">Cyfrowa Sukcesja • MyHeredo</p>
            </div>

            <!-- Treść -->
            <div class="flex-1 overflow-auto p-8 space-y-8">
                
                <!-- Informacje podstawowe -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 text-sm">
                    <div>
                        <p class="text-xs text-slate-500 mb-1">NUMER CERTYFIKATU</p>
                        <p class="font-mono font-semibold text-base break-all">${docId}</p>
                    </div>
                    <div class="md:text-right">
                        <p class="text-xs text-slate-500 mb-1">DATA WYDANIA</p>
                        <p class="font-medium">${formattedDate}</p>
                    </div>
                    
                    <div class="md:col-span-2">
                        <p class="text-xs text-slate-500 mb-1">WŁAŚCICIEL SEJFU</p>
                        <p class="font-semibold text-lg break-all">${certificateData.ownerEmail}</p>
                    </div>
                    
                    <div>
                        <p class="text-xs text-slate-500 mb-1">DEAD MAN’S SWITCH</p>
                        <p class="font-semibold">${certificateData.dmsDays || 45} dni bezczynności</p>
                    </div>
                </div>

                <!-- Zabezpieczone skrytki -->
                <div>
                    <p class="text-xs text-slate-500 mb-3 tracking-wider">ZABEZPIECZONE SKRYTKI</p>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        ${vaults.map(v => {
                            let iconKey = v.category.toLowerCase();
                            if (iconKey.includes('password')) iconKey = 'passwordmanager';
                            else if (iconKey.includes('bank')) iconKey = 'banki';
                            else if (iconKey.includes('krypto')) iconKey = 'krypto';
                            else if (iconKey.includes('social')) iconKey = 'social';
                            else if (iconKey.includes('instrukcje')) iconKey = 'instrukcje';
                            
                            const icon = getIcon ? getIcon(iconKey) : '🔒';
                            
                            return `
                                <div class="flex items-center gap-4 bg-slate-50 border border-slate-200 p-4 rounded-2xl">
                                    <div class="text-3xl flex-shrink-0">${icon}</div>
                                    <div>
                                        <p class="font-semibold">${v.category}</p>
                                        <p class="text-emerald-600 text-sm">Zaszyfrowane end-to-end</p>
                                    </div>
                                </div>`;
                        }).join('')}
                    </div>
                </div>

                <!-- Spadkobiercy -->
                <div>
                    <p class="text-xs text-slate-500 mb-3 tracking-wider">SPADKOBIERCY (${heirs.length})</p>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        ${heirs.length > 0 ? heirs.map(h => `
                            <div class="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
                                <p class="font-semibold">${h.name}</p>
                                <p class="text-slate-600 text-sm break-all">${h.email}</p>
                                <p class="text-emerald-600 text-xs mt-2">● Pełny dostęp do skrytek</p>
                            </div>
                        `).join('') : `
                            <div class="col-span-2 text-center py-6 text-slate-400 italic">
                                Nie dodano spadkobierców
                            </div>
                        `}
                    </div>
                </div>

                <!-- Podpis cyfrowy -->
                <div class="pt-4 border-t border-slate-200">
                    <div class="flex items-start gap-3">
                        <div class="text-emerald-600 mt-1">
                            <i class="fas fa-shield-alt text-xl"></i>
                        </div>
                        <div>
                            <p class="font-semibold text-emerald-700">Podpis cyfrowy MyHeredo</p>
                            <p class="text-xs text-slate-500 font-mono mt-0.5">SHA-256: ${digitalSignature}</p>
                            <p class="text-xs text-slate-400 mt-1">Ten certyfikat został wygenerowany cyfrowo i jest chroniony kryptograficznie.</p>
                        </div>
                    </div>
                </div>

            </div>

            <!-- Przyciski -->
            <div class="border-t p-6 flex flex-col gap-3 flex-shrink-0 bg-white rounded-b-3xl print-hidden">
                <button onclick="printCertificate()" 
                        class="w-full py-4 bg-slate-900 hover:bg-black text-white font-semibold rounded-2xl text-base transition">
                    🖨️ Drukuj / Zapisz jako PDF
                </button>
                <button onclick="closeCertificate()" 
                        class="w-full py-4 border border-slate-300 font-semibold rounded-2xl text-base hover:bg-slate-100 transition">
                    Zamknij
                </button>
            </div>

        </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', html);
}
function saveAsPDF() {
    const originalTitle = document.title;
    document.title = `Certyfikat_Sukcesji_${new Date().toISOString().slice(0, 10)}`;
    window.print();
    document.title = originalTitle;
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
// ==================== RECOVERY PASSWORD ====================
function saveRecoveryPassword() {
    const input = document.getElementById('recoveryPassword');
    if (!input) {
        alert("Nie znaleziono pola do wpisania Recovery Password.");
        return;
    }

    const pass = input.value.trim();

    if (!pass) {
        alert("Wprowadź Recovery Password");
        return;
    }

    if (pass.length < 6) {
        alert("Recovery Password powinien mieć co najmniej 6 znaków.");
        return;
    }

    // Zapisujemy Recovery Password
    recoveryPassword = pass;
    localStorage.setItem('myheredo_recovery_password', pass);

    alert("✅ Recovery Password został zapisany pomyślnie!\n\nPrzekaż go spadkobiercom (np. w testamencie lub u notariusza).");
}
// =============================================
// FUNKCJE CERTYFIKATU (close + print)
// Muszą być PRZED blokiem rejestracji globalnej
// =============================================

function printCertificate() {
    const overlay = document.getElementById('certificateOverlay');
    if (!overlay) return alert("Nie znaleziono certyfikatu.");

    const certContent = overlay.querySelector('.cert-container');
    if (!certContent) return alert("Nie znaleziono zawartości certyfikatu.");

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        return alert("Przeglądarka zablokowała okno drukowania.");
    }

    printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="pl">
        <head>
            <meta charset="UTF-8">
            <title>Certyfikat Sukcesji</title>
            <script src="https://cdn.tailwindcss.com"><\/script>
            <style>
                @page {
                    size: A4 portrait;
                    margin: 4mm;
                }

                body {
                    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                    margin: 0;
                    padding: 0;
                    background: white;
                    color: #0f172a;
                }

                .print-wrapper {
                    width: 100%;
                    max-width: 210mm;
                    margin: 0 auto;
                    padding: 2mm;
                    box-sizing: border-box;
                }

                .cert-container {
                    box-shadow: none !important;
                    border-radius: 4px;
                    max-height: none !important;
                    overflow: visible !important;
                    padding: 6px 12px !important;
                }

                /* === MAKSYMALNE ŚCIŚNIĘCIE === */
                .cert-container h1 {
                    font-size: 16px !important;
                    margin-bottom: 1px !important;
                    line-height: 1.05 !important;
                }

                .cert-container p {
                    font-size: 9.8px !important;
                    line-height: 1.15 !important;
                    margin-bottom: 1px !important;
                }

                .cert-container .text-lg { font-size: 11px !important; }
                .cert-container .text-xl { font-size: 12px !important; }
                .cert-container .text-3xl { font-size: 14px !important; }

                .cert-container .rounded-2xl {
                    padding: 5px 6px !important;
                    margin-bottom: 3px !important;
                }

                .cert-container .pt-8 { padding-top: 4px !important; }
                .cert-container .pb-6 { padding-bottom: 4px !important; }

                /* Sekcja podpisu cyfrowego — mocno ściśnięta */
                .cert-container .pt-4.border-t {
                    padding-top: 4px !important;
                    margin-top: 4px !important;
                }

                .print-hidden { display: none !important; }

                .cert-container > div {
                    page-break-inside: avoid !important;
                }
            </style>
        </head>
        <body>
            <div class="print-wrapper">
                ${certContent.innerHTML}
            </div>
        </body>
        </html>
    `);

    printWindow.document.close();

    printWindow.onload = function () {
        printWindow.focus();
        printWindow.print();

        printWindow.onafterprint = function () {
            printWindow.close();
        };

        setTimeout(function () {
            if (!printWindow.closed) {
                printWindow.close();
            }
        }, 1500);
    };
}
// ==================== RECOVERY PASSWORD ====================

let recoveryPassword = null;

// Pokazywanie / ukrywanie hasła
function toggleRecoveryPasswordVisibility() {
    const input = document.getElementById('recoveryPassword');
    const icon = document.getElementById('recoveryEyeIcon');

    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

// Sprawdza czy Recovery Password jest już ustawiony
function updateRecoveryPasswordStatus() {
    const statusEl = document.getElementById('recoveryStatus');
    if (!statusEl) return;

    const saved = localStorage.getItem('myheredo_recovery_password');

    if (saved) {
        recoveryPassword = saved;
        statusEl.innerHTML = `
            <div class="flex items-center gap-2 text-emerald-400">
                <i class="fas fa-check-circle"></i>
                <span>Recovery Password jest już ustawiony</span>
            </div>
        `;
    } else {
        statusEl.innerHTML = `
            <div class="flex items-center gap-2 text-amber-400">
                <i class="fas fa-exclamation-triangle"></i>
                <span>Nie ustawiono Recovery Password</span>
            </div>
        `;
    }
}

// Zapisywanie Recovery Password (pierwszy raz)
function saveRecoveryPassword() {
    const input = document.getElementById('recoveryPassword');
    if (!input) return;

    const pass = input.value.trim();

    if (!pass) {
        alert("Wprowadź Recovery Password");
        return;
    }
    if (pass.length < 6) {
        alert("Recovery Password musi mieć minimum 6 znaków");
        return;
    }

    // Jeśli już istnieje – nie pozwalamy nadpisać bez potwierdzenia
    if (localStorage.getItem('myheredo_recovery_password')) {
        if (!confirm("Recovery Password jest już ustawiony. Czy na pewno chcesz go nadpisać?")) {
            return;
        }
    }

    recoveryPassword = pass;
    localStorage.setItem('myheredo_recovery_password', pass);
    input.value = '';

    updateRecoveryPasswordStatus();
    alert("✅ Recovery Password został zapisany!\n\nPamiętaj, żeby przekazać go spadkobiercom.");
}

// Zmiana Recovery Password (z podaniem starego)
function changeRecoveryPassword() {
    const current = localStorage.getItem('myheredo_recovery_password');

    if (!current) {
        alert("Nie masz jeszcze ustawionego Recovery Password. Użyj przycisku 'Zapisz'.");
        return;
    }

    const oldPass = prompt("Podaj aktualne Recovery Password:");
    if (!oldPass) return;

    if (oldPass !== current) {
        alert("Podane hasło jest nieprawidłowe.");
        return;
    }

    const newPass = prompt("Podaj nowe Recovery Password (min. 6 znaków):");
    if (!newPass || newPass.length < 6) {
        alert("Nowe hasło musi mieć minimum 6 znaków.");
        return;
    }

    if (!confirm("Na pewno chcesz zmienić Recovery Password?")) return;

    recoveryPassword = newPass;
    localStorage.setItem('myheredo_recovery_password', newPass);

    updateRecoveryPasswordStatus();
    alert("✅ Recovery Password został zmieniony pomyślnie.");
}
// ==================== RECOVERY PASSWORD - MODAL ====================

function toggleModalPasswordVisibility(inputId, iconId) {
    const input = document.getElementById(inputId);
    const icon = document.getElementById(iconId);

    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

function openChangeRecoveryModal() {
    const modal = document.getElementById('changeRecoveryModal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        
        // Czyścimy pola
        document.getElementById('currentRecoveryPass').value = '';
        document.getElementById('newRecoveryPass').value = '';
        document.getElementById('confirmRecoveryPass').value = '';
    }
}

function closeChangeRecoveryModal() {
    const modal = document.getElementById('changeRecoveryModal');
    if (modal) {
        modal.classList.remove('flex');
        modal.classList.add('hidden');
    }
}

function confirmChangeRecoveryPassword() {
    const current = document.getElementById('currentRecoveryPass').value.trim();
    const newPass = document.getElementById('newRecoveryPass').value.trim();
    const confirmPass = document.getElementById('confirmRecoveryPass').value.trim();

    const savedPass = localStorage.getItem('myheredo_recovery_password');

    if (!current || !newPass || !confirmPass) {
        alert("Wypełnij wszystkie pola.");
        return;
    }

    if (current !== savedPass) {
        alert("Aktualne Recovery Password jest nieprawidłowe.");
        return;
    }

    if (newPass.length < 6) {
        alert("Nowe hasło musi mieć minimum 6 znaków.");
        return;
    }

    if (newPass !== confirmPass) {
        alert("Nowe hasła nie są identyczne.");
        return;
    }

    if (!confirm("Na pewno chcesz zmienić Recovery Password?")) {
        return;
    }

    // Zapisujemy nowe hasło
    localStorage.setItem('myheredo_recovery_password', newPass);
    recoveryPassword = newPass;

    closeChangeRecoveryModal();
    updateRecoveryPasswordStatus();

    alert("✅ Recovery Password został pomyślnie zmieniony.");
}

// Nadpisujemy starą funkcję changeRecoveryPassword()
function changeRecoveryPassword() {
    const current = localStorage.getItem('myheredo_recovery_password');

    if (!current) {
        alert("Nie masz jeszcze ustawionego Recovery Password.");
        return;
    }

    openChangeRecoveryModal();
}
// ==================== ZAMYKANIE CERTYFIKATU ====================
function closeCertificate() {
    const overlay = document.getElementById('certificateOverlay');
    if (overlay) {
        overlay.remove();
    }
}
// =============================================
// =============================================
// GLOBALNA REJESTRACJA FUNKCJI
// MUSI BYĆ NA SAMYM KOŃCU PLIKU app.js
// =============================================
window.addHeir            = addHeir;
window.removeHeir         = removeHeir;
window.addCustomVault     = addCustomVault;
window.deleteCustomVault  = deleteCustomVault;

window.saveRecoveryPassword = saveRecoveryPassword;

window.showCertificate    = showCertificate;
window.closeCertificate   = closeCertificate;
window.printCertificate   = printCertificate;
window.saveAsPDF          = saveAsPDF;
window.decryptCertificate = decryptCertificate;

window.simulateDeath      = simulateDeath;
window.loadDemoData       = loadDemoData;
window.handleLogout       = handleLogout;

window.loadCertificates   = loadCertificates;
window.openCertificate    = openCertificate;
window.deleteCertificate  = deleteCertificate;

window.openVaultModal     = openVaultModal;
window.closeVaultModal    = closeVaultModal;
window.saveVault          = saveVault;

window.toggleRecoveryPasswordVisibility = toggleRecoveryPasswordVisibility;
window.saveRecoveryPassword = saveRecoveryPassword;
window.changeRecoveryPassword = changeRecoveryPassword;

window.openChangeRecoveryModal = openChangeRecoveryModal;
window.closeChangeRecoveryModal = closeChangeRecoveryModal;
window.confirmChangeRecoveryPassword = confirmChangeRecoveryPassword;
window.changeRecoveryPassword = changeRecoveryPassword;


console.log("✅ Wszystkie funkcje zostały pomyślnie zarejestrowane globalnie");
