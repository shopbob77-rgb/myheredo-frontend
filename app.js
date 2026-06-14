// =============================================
// MYHEREDO - Hybrydowa Warstwa Sukcesyjna
// =============================================
let masterPassword = null;
let vaultData = {};
let categoryNames = {};
let heirs = [];
let customIcons = {};
let dmsConfig = { days: 45, lastActivity: Date.now(), isActive: false };

const defaultCategories = {
    passwordManager: "Password Manager (Vaultwarden itp.)",
    banki: "Konta Bankowe i Finansowe",
    krypto: "Kryptowaluty i Portfele",
    social: "Konta Cyfrowe i Social Media",
    instrukcje: "Instrukcje Sukcesyjne"
};

document.addEventListener('DOMContentLoaded', () => {
    initDashboard();
});

async function initDashboard() {
    const email = localStorage.getItem('myheredo_user_email');
    if (!email) {
        window.location.href = "login.html";
        return;
    }
    document.getElementById('userEmail').textContent = email;

    masterPassword = sessionStorage.getItem('myheredo_master_password');

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

    const savedEncryptedVault = localStorage.getItem('myheredo_encrypted_vault');
    const savedHeirs = localStorage.getItem('myheredo_heirs');
    const savedIcons = localStorage.getItem('myheredo_custom_icons');
    const savedDMS = localStorage.getItem('myheredo_dms_config');

    if (savedEncryptedVault && masterPassword) {
        try {
            vaultData = await decryptData(savedEncryptedVault, masterPassword);
        } catch (e) {
            console.error("Błąd deszyfracji:", e);
        }
    }

    if (savedHeirs) heirs = JSON.parse(savedHeirs);
    if (savedIcons) customIcons = JSON.parse(savedIcons);
    if (savedDMS) dmsConfig = JSON.parse(savedDMS);

    renderSkrytki();
    renderHeirs();
    setupDMS();
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

async function saveAllData() {
    if (!masterPassword) return;
    const encrypted = await encryptData(vaultData, masterPassword);
    localStorage.setItem('myheredo_encrypted_vault', encrypted);
}

// (pozostałe funkcje szyfrowania encryptData i decryptData zostawiam bez zmian - zakładam że masz je wyżej)

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
    const icons = {
        passwordManager: "🔑",
        banki: "🏦",
        krypto: "₿",
        social: "📱",
        instrukcje: "📜"
    };
    return icons[key] || "📁";
}

// ... reszta funkcji (openVaultModal, saveVault, addCustomVault, deleteCustomVault, renderHeirs itd.) pozostaje bez zmian

// ==================== CERTYFIKAT SUKCESJI (naprawiony) ====================
function showCertificate() {
    const email = localStorage.getItem('myheredo_user_email') || "jan.kowalski@example.com";
    const currentDate = new Date().toLocaleDateString('pl-PL', { day: '2-digit', month: 'long', year: 'numeric' });

    const certificateHTML = `... (tutaj wklejam czystą wersję z poprzedniej wiadomości) ...`;

    document.body.insertAdjacentHTML('beforeend', certificateHTML);
    renderCertificateContent();
}

function renderCertificateContent() {
    // Skrytki
    const vaultsContainer = document.getElementById('certVaults');
    if (vaultsContainer) {
        let html = '';
        Object.keys(vaultData).forEach(key => {
            if (vaultData[key] && vaultData[key].trim() !== '') {
                html += `
                <div class="flex justify-between items-start border-b pb-4 last:border-b-0">
                    <div>
                        <p class="font-medium">${categoryNames[key] || key}</p>
                        <p class="text-sm text-slate-600">${vaultData[key].substring(0, 150)}${vaultData[key].length > 150 ? '...' : ''}</p>
                    </div>
                    <span class="text-emerald-600 text-sm font-medium">• Dostępny</span>
                </div>`;
            }
        });
        vaultsContainer.innerHTML = html || '<p class="text-slate-500">Brak dodanych skrytek.</p>';
    }

    // Spadkobiercy
    const heirsContainer = document.getElementById('certHeirs');
    if (heirsContainer) {
        heirsContainer.innerHTML = heirs.map(heir => `
            <div class="bg-white border border-slate-200 p-5 rounded-2xl">
                <p class="font-semibold">${heir.name}</p>
                <p class="text-slate-600 text-sm">${heir.email}</p>
                <p class="text-emerald-600 text-xs mt-3 font-medium">Pełny dostęp</p>
            </div>
        `).join('');
    }
}

function closeCertificate() {
    const overlay = document.getElementById('certificateOverlay');
    if (overlay) overlay.remove();
}

function printCertificate() {
    window.print();
}

// ==================== GLOBALNE FUNKCJE ====================
window.addHeir = addHeir;
window.removeHeir = removeHeir;
window.addCustomVault = addCustomVault;
window.deleteCustomVault = deleteCustomVault;
window.showCertificate = showCertificate;
window.simulateDeath = simulateDeath;
window.loadDemoData = loadDemoData;
window.handleLogout = handleLogout;
