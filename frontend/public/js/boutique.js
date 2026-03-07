const POLL_MAX_ATTEMPTS = 30;
const POLL_DELAY_MS = 1000;

function getResponseKind(res) {
    const contentType = (res.headers.get('content-type') || '').toLowerCase();
    if (res.status === 401 || res.status === 403) return 'unauthorized';
    if (res.redirected || res.url.includes('/login')) return 'login-page';
    if (contentType.includes('text/html')) return 'html';
    if (contentType.includes('application/json')) return 'json';
    return 'other';
}

async function safeJsonFetch(url, options = {}) {
    const res = await fetch(url, { credentials: 'same-origin', ...options });
    const kind = getResponseKind(res);

    if (kind === 'unauthorized' || kind === 'login-page') {
        window.location.href = '/login';
        return null;
    }

    if (kind !== 'json') {
        const text = await res.text().catch(() => '');
        throw new Error(text || `Réponse invalide (${res.status})`);
    }

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
        throw new Error(data?.message || data?.error || `Erreur ${res.status}`);
    }

    return data;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function qualityLabel(qualite) {
    switch ((qualite || '').toLowerCase()) {
        case 'bronze': return 'Bronze';
        case 'argent': return 'Argent';
        case 'or': return 'Or';
        default: return qualite || 'Inconnue';
    }
}

function renderRevealCard(carte) {
    const joueur = carte?.joueur || {};
    const qualite = (joueur.qualite || '').toLowerCase();
    return `
        <article class="reveal-card reveal-card--${qualite}">
            <div class="reveal-card__top">
                <span class="reveal-badge">${qualityLabel(joueur.qualite)}</span>
                <span class="reveal-note">${joueur.note ?? '-'}</span>
            </div>
            <div class="reveal-avatar-wrap">
                <img class="reveal-avatar" src="${joueur.imageUrl || ''}" alt="${joueur.nom || 'Joueur'}"
                     onerror="this.closest('.reveal-avatar-wrap').classList.add('reveal-avatar-wrap--fallback'); this.remove();">
                <span class="reveal-fallback-name">${joueur.nom || 'Joueur'}</span>
            </div>
            <div class="reveal-card__body">
                <h3>${joueur.nom || 'Joueur'}</h3>
                <p>${joueur.poste || 'POSTE'} · ${joueur.club || 'Club inconnu'}</p>
                <p>${joueur.nationalite || 'Nationalité inconnue'}</p>
            </div>
        </article>
    `;
}

function showStatus(message, type = 'info') {
    const node = document.getElementById('shopStatus');
    if (!node) return;
    node.textContent = message;
    node.className = `shop-status shop-status--${type}`;
}

function setButtonsDisabled(disabled) {
    document.querySelectorAll('.btn-buy').forEach(button => {
        button.disabled = disabled;
        button.classList.toggle('is-loading', disabled);
    });
}

function renderPackResult(result) {
    const grid = document.getElementById('packResult');
    if (!grid) return;
    grid.innerHTML = (result?.cartes || []).map(renderRevealCard).join('');
}

async function refreshCredits() {
    const data = await safeJsonFetch('/api/moi/credits');
    if (!data) return;
    const money = document.getElementById('money');
    if (money) money.textContent = data.credits;
}

async function fetchPackMap() {
    const packs = await safeJsonFetch('/api/packs');
    const map = {};

    for (const pack of packs || []) {
        const nom = String(pack.nom || '').toLowerCase();
        if (nom.includes('bronze')) map.bronze = pack;
        else if (nom.includes('argent') || nom.includes('silver')) map.silver = pack;
        else if (nom.includes('or') || nom.includes('gold')) map.gold = pack;
    }

    if (!map.bronze && packs?.[0]) map.bronze = packs[0];
    if (!map.silver && packs?.[1]) map.silver = packs[1];
    if (!map.gold && packs?.[2]) map.gold = packs[2];
    return map;
}

async function waitForPack(uuid) {
    for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS; attempt++) {
        const result = await safeJsonFetch(`/api/packs/${uuid}`);

        if (!result) return null;
        if (result.statut === 'READY') return result;
        if (result.statut === 'FAILED') {
            throw new Error(result.message || 'Échec du pack');
        }

        await sleep(POLL_DELAY_MS);
    }

    throw new Error('Le pack prend trop de temps à être généré');
}

(async () => {
    let packMap = {};

    try {
        packMap = await fetchPackMap();
        await refreshCredits();
        showStatus('Boutique prête.', 'info');
    } catch (error) {
        console.error(error);
        showStatus(error.message || 'Impossible de charger la boutique.', 'error');
    }

    document.querySelectorAll('.btn-buy').forEach(btn => {
        btn.addEventListener('click', async (event) => {
            const key = event.currentTarget.dataset.pack;
            const pack = packMap[key];

            if (!pack) {
                showStatus('Pack introuvable côté serveur.', 'error');
                return;
            }

            setButtonsDisabled(true);
            showStatus(`Ouverture de ${pack.nom}...`, 'info');

            try {
                const launch = await safeJsonFetch(`/api/packs/${pack.id}/ouvrir`, {
                    method: 'POST'
                });

                if (!launch?.uuid) {
                    throw new Error('UUID de suivi manquant');
                }

                const result = await waitForPack(launch.uuid);
                renderPackResult(result);
                await refreshCredits();
                showStatus(`${pack.nom} ouvert avec succès.`, 'success');
            } catch (error) {
                console.error(error);
                showStatus(error.message || 'Erreur pendant l’ouverture du pack.', 'error');
            } finally {
                setButtonsDisabled(false);
            }
        });
    });
})();
