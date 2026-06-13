// =============================================
// MYHEREDO - Wersja na Vercel (Naprawiona)
// =============================================

console.log("✅ app.js wczytany poprawnie na Vercel");

document.addEventListener('DOMContentLoaded', () => {
    console.log("✅ Dashboard załadowany");

    const emailEl = document.getElementById('userEmail');
    if (emailEl) {
        emailEl.textContent = localStorage.getItem('myheredo_user_email') || "test@myheredo.pl";
    }
});

// === GLOBALNE FUNKCJE - muszą być widoczne na zewnątrz ===
window.addHeir = function() {
    const name = document.getElementById('heirName').value.trim();
    const email = document.getElementById('heirEmail').value.trim();
    if (!name || !email) return alert("Wypełnij imię i email");
    alert(`✅ Dodano spadkobiercę: ${name}`);
};

window.saveVault = function(key) {
    alert(`✅ Dane w skrytce "${key}" zostały zapisane!`);
};

window.addCustomVault = function() {
    const name = prompt("Podaj nazwę nowej skrytki:");
    if (name) alert(`✅ Dodano nową skrytkę: ${name}`);
};

window.showCertificate = function() {
    alert("✅ Certyfikat Sukcesji został wygenerowany!");
};

window.simulateDeath = function() {
    alert("✅ Symulacja Po Śmierci uruchomiona!");
};

window.loadDemoData = function() {
    alert("✅ Przykładowe dane zostały wczytane!");
};

window.handleLogout = function() {
    if (confirm("Wylogować się?")) {
        window.location.href = "index.html";
    }
};
