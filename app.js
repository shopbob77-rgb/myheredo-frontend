// =============================================
// MYHEREDO - Pełna wersja na Vercel + Ładny Certyfikat
// =============================================

let vaultData = {
    banki: "",
    krypto: ""
};
let categoryNames = {
    banki: "Banki & Finanse",
    krypto: "Kryptowaluty"
};
let heirs = [];
let customIcons = {};

document.addEventListener('DOMContentLoaded', () => {
    initDashboard();
});

function initDashboard() {
    const email = localStorage.getItem('myheredo_user_email');
    if (!email) {
        window.location.href = "login.html";
        return;
    }

    document.getElementById('userEmail').textContent = email;

    const savedVault = localStorage.getItem('myheredo_vault_data');
    const savedHeirs = localStorage.getItem('myheredo_heirs');
    const savedIcons = localStorage.getItem('myheredo_custom_icons');

    if (savedVault) vaultData = JSON.parse(savedVault);
    if (savedHeirs) heirs = JSON.parse(savedHeirs);
    if (savedIcons) customIcons = JSON.parse(savedIcons);

    renderSkrytki();
    renderHeirs();
    setupDMS();
}

// ==================== SKRYTKI ====================
function renderSkrytki() {
    const grid = document.getElementById('skrytkiGrid');
    grid.innerHTML = '';

    Object.keys(vaultData).forEach((key) => {
        const isFilled = vaultData[key] && vaultData[key].trim() !== '';
        const isCustom = !['banki', 'krypto'].includes(key);

        const card = document.createElement('div');
        card.className = `skrytka-card bg-slate-900 border ${isFilled ? 'border-emerald-500' : 'border-slate-700'} rounded-3xl p-6 cursor-pointer relative`;

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
    });
}

function getIcon(key) {
    if (customIcons[key]) return customIcons[key];
    if (key === 'banki') return '🏦';
    if (key === 'krypto') return '₿';
    return '📁';
}

// ==================== MODAL SKRYTKI ====================
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

function saveVault(key) {
    const content = document.getElementById('vaultContent').value.trim();
    vaultData[key] = content;
    localStorage.setItem('myheredo_vault_data', JSON.stringify(vaultData));
    closeVaultModal();
    renderSkrytki();
    showSuccessMessage("✅ Dane zapisane");
}

// ==================== NOWA SKRYTKA ====================
function addCustomVault() {
    const name = prompt("Podaj nazwę nowej skrytki:");
    if (!name || name.trim() === "") return;
    const key = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    if (vaultData[key]) return alert("Taka skrytka już istnieje.");

    const icons = ["🪙", "💎"];
    customIcons[key] = icons[Math.floor(Math.random() * icons.length)];

    vaultData[key] = "";
    categoryNames[key] = name;
    localStorage.setItem('myheredo_vault_data', JSON.stringify(vaultData));
    localStorage.setItem('myheredo_custom_icons', JSON.stringify(customIcons));

    renderSkrytki();
    showSuccessMessage(`✅ Dodano skrytkę: ${name}`);
}

function deleteCustomVault(key) {
    if (confirm(`Usunąć skrytkę "${categoryNames[key]}"?`)) {
        delete vaultData[key];
        delete categoryNames[key];
        if (customIcons[key]) delete customIcons[key];
        localStorage.setItem('myheredo_vault_data', JSON.stringify(vaultData));
        localStorage.setItem('myheredo_custom_icons', JSON.stringify(customIcons));
        renderSkrytki();
    }
}

// ==================== SPADKOBIERCY ====================
function renderHeirs() {
    const container = document.getElementById('heirsList');
    container.innerHTML = heirs.length ? '' : '<p class="text-slate-500 italic text-center py-12">Nie dodano spadkobierców...</p>';
    heirs.forEach((heir, i) => {
        const div = document.createElement('div');
        div.className = "flex justify-between items-center bg-slate-800 rounded-2xl p-4 mb-3";
        div.innerHTML = `<div><div class="font-medium">${heir.name}</div><div class="text-sm text-slate-400">${heir.email}</div></div>
                         <button onclick="removeHeir(${i})" class="text-red-400 hover:text-red-500 text-xl">✕</button>`;
        container.appendChild(div);
    });
}

function addHeir() {
    const name = document.getElementById('heirName').value.trim();
    const email = document.getElementById('heirEmail').value.trim();
    if (!name || !email) return alert("Wypełnij pola");
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
        slider.addEventListener('input', () => value.textContent = slider.value + " dni");
    }
}

// ==================== ŁADNY CERTYFIKAT ====================
function showCertificate() {
    const dmsDays = document.getElementById('dmsSlider') ? document.getElementById('dmsSlider').value : 45;
    const userEmail = localStorage.getItem('myheredo_user_email') || "jan.kowalski@myheredo.pl";

    const certificateHTML = `
    <div id="certificateOverlay" class="fixed inset-0 bg-black/90 flex items-center justify-center z-[100] p-6 overflow-auto">
        <div class="max-w-3xl w-full bg-white text-slate-900 rounded-3xl shadow-2xl overflow-hidden">
            <div class="bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 p-10 text-center">
                <img src="logo.png" alt="MyHeredo" class="h-20 mx-auto mb-4">
                <h1 class="text-4xl font-bold">CERTYFIKAT SUKCESJI</h1>
                <p class="text-xl mt-2 opacity-90">MyHeredo • Cyfrowy Sejf Sukcesyjny</p>
            </div>

            <div class="p-10 space-y-8">
                <div class="grid grid-cols-2 gap-6 text-sm">
                    <div><strong>Właściciel:</strong><br>${userEmail}</div>
                    <div><strong>Data wystawienia:</strong><br>${new Date().toLocaleDateString('pl-PL')}</div>
                    <div><strong>Dead Man’s Switch:</strong><br>${dmsDays} dni</div>
                    <div><strong>Numer certyfikatu:</strong><br>MH-${Date.now().toString().slice(-8)}</div>
                </div>

                <div>
                    <h3 class="font-semibold text-lg mb-4 border-b pb-2">Zawartość Sejfu</h3>
                    <div class="space-y-4">
                        ${Object.keys(vaultData).map(key => `
                            <div class="flex justify-between bg-slate-50 p-4 rounded-2xl">
                                <div class="font-medium">${categoryNames[key] || key}</div>
                                <div class="${vaultData[key] ? 'text-emerald-600' : 'text-slate-400'}">
                                    ${vaultData[key] ? '✓ Zawiera dane' : 'Pusta'}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div>
                    <h3 class="font-semibold text-lg mb-4 border-b pb-2">Zaufani Spadkobiercy</h3>
                    ${heirs.length ? 
                        `<div class="grid gap-3">` + 
                        heirs.map(h => `
                            <div class="flex justify-between bg-slate-50 p-4 rounded-2xl">
                                <div><strong>${h.name}</strong></div>
                                <div class="text-slate-600">${h.email}</div>
                            </div>
                        `).join('') + `</div>` : 
                        `<p class="text-slate-500 italic">Brak spadkobierców</p>`}
                </div>
            </div>

            <div class="border-t p-8 flex gap-4 bg-slate-50">
                <button onclick="printCertificate()" class="flex-1 bg-slate-900 text-white py-5 rounded-2xl font-semibold hover:bg-black transition">🖨️ Drukuj / Zapisz jako PDF</button>
                <button onclick="closeCertificate()" class="flex-1 border border-slate-300 py-5 rounded-2xl font-semibold">Zamknij</button>
            </div>
        </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', certificateHTML);
}

function closeCertificate() {
    const overlay = document.getElementById('certificateOverlay');
    if (overlay) overlay.remove();
}

function printCertificate() {
    window.print();
}

// ==================== SYMULACJA ====================
function simulateDeath() {
    if (heirs.length === 0) return alert("Dodaj przynajmniej jednego spadkobiercę.");
    const days = document.getElementById('dmsSlider').value;
    let msg = `⚰️ SYMULACJA PO ŚMIERCI\n\n`;
    msg += `Dead Man’s Switch aktywowany po ${days} dniach.\n\n`;
    msg += "Pełny dostęp do sejfu otrzymują:\n\n";
    heirs.forEach(h => msg += `• ${h.name} (${h.email})\n`);
    alert(msg);
}

// ==================== POZOSTAŁE ====================
function handleLogout() {
    if (confirm("Wylogować się z MyHeredo?")) {
        localStorage.clear();
        window.location.href = "index.html";
    }
}

function showSuccessMessage(text) {
    alert(text);
}

function loadDemoData() {
    if (!confirm("Wczytać przykładowe dane demonstracyjne?")) return;

    vaultData = {
        banki: "ING Bank Śląski\nLogin: jan.kowalski\nHasło: SuperTajne123!",
        krypto: "Bitcoin Seed:\nwitch blossom aunt accuse black dress purse glass"
    };

    localStorage.setItem('myheredo_vault_data', JSON.stringify(vaultData));
    renderSkrytki();
    showSuccessMessage("✅ Przykładowe dane wczytane!");
}
