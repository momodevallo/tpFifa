const form = document.getElementById('login');
const errorDiv = document.getElementById('error');

function getResponseKind(res) {
    const contentType = (res.headers.get('content-type') || '').toLowerCase();
    if (res.status === 401 || res.status === 403) return 'unauthorized';
    if (res.redirected || res.url.includes('/login')) return 'login-page';
    if (contentType.includes('application/json')) return 'json';
    if (contentType.includes('text/html')) return 'html';
    return 'other';
}

async function canAutoLogin() {
    try {
        const [meRes, creditsRes] = await Promise.all([
            fetch('/api/moi', { credentials: 'same-origin' }),
            fetch('/api/moi/credits', { credentials: 'same-origin' })
        ]);

        return meRes.ok
            && creditsRes.ok
            && getResponseKind(meRes) === 'json'
            && getResponseKind(creditsRes) === 'json';
    } catch (_) {
        return false;
    }
}

(async () => {
    if (await canAutoLogin()) {
        window.location.href = '/accueil.html';
        return;
    }

    const params = new URLSearchParams(window.location.search);
    if (params.has('error')) {
        errorDiv.textContent = 'Pseudo ou mot de passe incorrect.';
    }
    if (params.has('logout')) {
        errorDiv.style.color = '#1f9d55';
        errorDiv.textContent = 'Déconnexion réussie.';
    }
})();

form?.addEventListener('submit', () => {
    errorDiv.textContent = '';
});
