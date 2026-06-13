// =============================================
// MYHEREDO - Dashboard z End-to-End Encryption (Naprawiony)
// =============================================

let masterPassword = null;
let vaultData = {};
let categoryNames = {
    banki: "Banki & Finanse",
    krypto: "Kryptowaluty"
};
let heirs = [];
let customIcons = {};

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

    const savedEncryptedVault = localStorage.getItem('myheredo_encrypted_vault');
    const savedHeirs = localStorage.getItem('myheredo_heirs');
    const savedIcons = localStorage.getItem('myheredo_custom_icons');

    // Jeśli nie ma jeszcze zaszyfrowanych danych → załaduj domyślne skrytki
    if (!savedEncryptedVault) {
        vaultData = {
            banki: "",
            krypto: ""
        };
    } 
    else if (masterPassword) {
        try {
            vaultData = await decryptData(savedEncryptedVault, masterPassword);
        } catch (e) {
            alert("Nie udało się odszyfrować danych. Zaloguj się ponownie.");
            window.location.href = "login.html";
            return;
        }
    }

    if (savedHeirs) heirs = JSON.parse(savedHeirs);
    if (savedIcons) customIcons = JSON.parse(savedIcons);

    renderSkrytki();
    renderHeirs();
    setupDMS();
}

// ==================== SZYFROWANIE E2EE ====================
async function deriveKey(password, salt) {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits", "deriveKey"]);
    return crypto.subtle.deriveKey(
        { name: "PBKDF2", salt: encoder.encode(salt), iterations: 100000, hash: "SHA-256" },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
    );
}

async function encryptData(data, password) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const key = await deriveKey(password, salt);
    const encoder = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoder.encode(JSON.stringify(data)));
    const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(encrypted), salt.length + iv.length);
    return btoa(String.fromCharCode(...combined));
}

async function decryptData(encryptedBase64, password) {
    try {
        const combined = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
        const salt = combined.slice(0, 16);
        const iv = combined.slice(16, 28);
        const ciphertext = combined.slice(28);

        const key = await deriveKey(password, salt);
        const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
        return JSON.parse(new TextDecoder().decode(decrypted));
    } catch (e) {
        console.error(e);
        throw new Error("Nieprawidłowe hasło");
    }
}

// ==================== SKRYTKI ====================
function renderSkrytki() {
    const grid = document.getElementById('skrytkiGrid');
    grid.innerHTML = '';

    Object.keys(vaultData).forEach((key, index) => {
        const isFilled = vaultData[key] && vaultData[key].trim() !== '';
        const isCustom = !['banki', 'krypto'].includes(key);

        const card = document.createElement('div');
        card.className = `skrytka-card bg-slate-900 border ${isFilled ? 'border-emerald-500' : 'border-slate-700'} rounded-3xl p-6 cursor-pointer relative opacity-0 translate-y-6`;
        card.style.transitionDelay = `${index * 60}ms`;

        card.innerHTML = `
            <div class="flex items-center gap-4">
                <div class="text-4xl">${getIcon(key)}</div>
                <div class="flex-1 min-w-0">
                    <h3 class="font-semibold text-lg truncate">${categoryNames[key] || key}</h3>
                    <p class="text-sm ${isFilled ? 'text-emerald-400' : 'text-slate-500'}">
                        ${isFilled ? '✓ Zaszyfrowane' : 'Skrytka pusta'}
                    </p>
                </div>
            </div>
            ${isCustom ? `<button onclick="event.stopImmediatePropagation(); deleteCustomVault('${key}');" class="absolute top-4 right-4 text-red-400 hover:text-red-500 text-2xl">✕</button>` : ''}
        `;

        card.onclick = () => openVaultModal(key);
        grid.appendChild(card);

        setTimeout(() => card.classList.add('visible', 'opacity-100', 'translate-y-0'), 50);
    });
}

function getIcon(key) {
    if (customIcons[key]) return customIcons[key];
    if (key === 'banki') return '🏦';
    if (key === 'krypto') return '₿';
    return '📁';
}

// ... (pozostałe funkcje: openVaultModal, saveVault, addCustomVault, deleteCustomVault, renderHeirs itd. zostają bez zmian)

function openVaultModal(key) { /* Twoja aktualna wersja */ }
function closeVaultModal() { /* Twoja aktualna wersja */ }
async function saveVault(key) { /* Twoja aktualna wersja */ }
function addCustomVault() { /* Twoja aktualna wersja */ }
function deleteCustomVault(key) { /* Twoja aktualna wersja */ }
function renderHeirs() { /* Twoja aktualna wersja */ }
function addHeir() { /* Twoja aktualna wersja */ }
function removeHeir(i) { /* Twoja aktualna wersja */ }
function setupDMS() { /* Twoja aktualna wersja */ }
function showCertificate() { /* Twoja aktualna wersja */ }
function simulateDeath() { /* Twoja aktualna wersja */ }
function handleLogout() { /* Twoja aktualna wersja */ }
function showSuccessMessage(text) { /* Twoja aktualna wersja */ }
function loadDemoData() { /* Twoja aktualna wersja */ }