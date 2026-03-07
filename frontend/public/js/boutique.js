const POLL_MAX_ATTEMPTS = 30;
const POLL_DELAY_MS = 1000;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function getPlayerImageSrc(joueur) {
    if (!joueur) return '';
    if (joueur.id) return `/player-image/${joueur.id}`;
    return joueur.imageUrl || '';
}

function getResponseKind(res) {
    const contentType = (res.headers.get('content-type') || '').toLowerCase();
    if (res.status === 401 || res.status === 403) return 'unauthorized';
    if (res.redirected || res.url.includes('/login')) return 'login-page';
    if (contentType.includes('application/json')) return 'json';
    if (contentType.includes('text/html')) return 'html';
    return 'other';
}

async function safeJsonFetch(url, options = {}) {
    const res = await fetch(url, { credentials: 'same-origin', ...options });
    const kind = getResponseKind(res);

    if (kind === 'unauthorized' || kind === 'login-page') {
        window.location.href = '/login';
        return null;
    }

    const data = kind === 'json' ? await res.json().catch(() => ({})) : {};

    if (!res.ok) {
        throw new Error(data?.message || data?.error || `Erreur ${res.status}`);
    }

    return data;
}

function setButtonsDisabled(disabled) {
    document.querySelectorAll('.btn-buy').forEach(button => {
        button.disabled = disabled;
        button.classList.toggle('is-loading', disabled);
    });
}

function setExperienceState(stateClass, title, text = '') {
    const section = document.getElementById('packExperience');
    const stage = document.getElementById('packStage');
    const titleNode = document.getElementById('packExperienceTitle');
    const textNode = document.getElementById('packExperienceText');

    section.classList.remove('hidden');
    stage.className = `pack-stage ${stateClass}`;
    titleNode.textContent = title;
    textNode.textContent = text;
}

function renderRevealCard(carte) {
    const joueur = carte?.joueur || {};
    return `
        <article class="reveal-card">
            <div class="reveal-card__top">
                <span class="reveal-note">${joueur.note ?? '-'}</span>
                <span class="reveal-position">${joueur.poste || '-'}</span>
            </div>
            <div class="reveal-avatar-wrap">
                <img class="reveal-avatar" src="${getPlayerImageSrc(joueur)}" alt="${joueur.nom || 'Joueur'}"
                     onerror="this.onerror=null; this.src='https://placehold.co/140x140?text=J';">
            </div>
            <div class="reveal-card__body">
                <h3>${joueur.nom || 'Joueur'}</h3>
                <p>${joueur.club || 'Club inconnu'}</p>
                <p>${joueur.nationalite || 'Nationalité inconnue'}</p>
            </div>
        </article>
    `;
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

    throw new Error('Le pack met trop de temps à arriver');
}

async function playPackAnimation(packName) {
    const revealGrid = document.getElementById('packRevealGrid');
    revealGrid.innerHTML = '';

    setExperienceState('stage-start', packName, 'Le pack arrive...');
    await sleep(450);
    setExperienceState('stage-spin', packName, 'Ouverture en cours...');
    await sleep(1400);
    setExperienceState('stage-open', packName, 'Révélation des joueurs...');
    await sleep(700);
}

(async () => {
    let packMap = {};

    try {
        packMap = await fetchPackMap();
        await refreshCredits();
    } catch (error) {
        console.error(error);
        setExperienceState('stage-error', 'Boutique indisponible', error.message || 'Impossible de charger les packs.');
    }

    document.querySelectorAll('.btn-buy').forEach(btn => {
        btn.addEventListener('click', async (event) => {
            const key = event.currentTarget.dataset.pack;
            const pack = packMap[key];

            if (!pack) {
                setExperienceState('stage-error', 'Erreur', 'Pack introuvable.');
                return;
            }

            setButtonsDisabled(true);

            try {
                const launch = await safeJsonFetch(`/api/packs/${pack.id}/ouvrir`, { method: 'POST' });
                if (!launch?.uuid) {
                    throw new Error('Impossible de lancer le pack');
                }

                await playPackAnimation(pack.nom);
                const result = await waitForPack(launch.uuid);
                document.getElementById('packRevealGrid').innerHTML = (result.cartes || []).map(renderRevealCard).join('');
                setExperienceState('stage-open', pack.nom, `${result.cartes?.length || 0} joueur(s) obtenu(s).`);
                await refreshCredits();
            } catch (error) {
                console.error(error);
                setExperienceState('stage-error', 'Erreur', error.message || 'Erreur pendant l\'ouverture du pack.');
            } finally {
                setButtonsDisabled(false);
            }
        });
    });
})();
