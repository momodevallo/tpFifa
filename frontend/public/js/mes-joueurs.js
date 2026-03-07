let allCards = [];
let currentSearch = '';
let currentPosition = 'all';
let myCardsRefreshTimer = null;
let myCardsRequestInFlight = false;
const MY_CARDS_REFRESH_MS = 4000;

function getFallbackPlayerImageSrc() {
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240">
            <defs>
                <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stop-color="#182848" />
                    <stop offset="100%" stop-color="#4b6cb7" />
                </linearGradient>
            </defs>
            <rect width="240" height="240" rx="28" fill="url(#bg)"/>
            <circle cx="120" cy="88" r="38" fill="rgba(255,255,255,0.88)"/>
            <path d="M56 206c8-34 32-54 64-54s56 20 64 54" fill="rgba(255,255,255,0.88)"/>
            <text x="120" y="224" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" fill="rgba(255,255,255,0.96)">JOUEUR</text>
        </svg>
    `)}`;
}

function getPlayerImageSrc(joueur) {
    if (!joueur) return '';
    if (joueur.id) return `/player-image/${joueur.id}`;
    return joueur.imageUrl || '';
}

function renderCards() {
    const filteredCards = allCards.filter(card => {
        const matchesSearch = !currentSearch || card.joueur.nom.toLowerCase().includes(currentSearch);
        const matchesPosition = currentPosition === 'all' || card.joueur.poste === currentPosition;
        return matchesSearch && matchesPosition;
    });

    document.getElementById('totalPlayers').textContent = allCards.length;

    const grid = document.querySelector('.players-grid');
    if (!filteredCards.length) {
        grid.innerHTML = '<div class="player-empty">Aucun joueur trouvé.</div>';
        return;
    }

    grid.innerHTML = filteredCards.map(card => `
        <div class="player-card" data-position="${card.joueur.poste}">
            <div class="rating">${card.joueur.note}</div>
            <img src="${getPlayerImageSrc(card.joueur)}" alt="${card.joueur.nom}"
                 onerror="this.onerror=null; this.src=getFallbackPlayerImageSrc();">
            <div class="player-info">
                <span class="name">${card.joueur.nom}</span>
                <span class="position">${card.joueur.poste}</span>
                <span class="club">${card.joueur.club || ''}</span>
            </div>
            ${card.nonEchangeable
                ? '<button class="btn-sell" disabled>Non échangeable</button>'
                : `<button class="btn-sell" onclick="sellCard(${card.id})">Vendre</button>`}
        </div>
    `).join('');
}

async function loadMyCards(options = {}) {
    const { silent = false } = options;
    if (myCardsRequestInFlight) return;
    myCardsRequestInFlight = true;

    try {
        const res = await fetch('/api/moi/cartes', { credentials: 'same-origin', cache: 'no-store' });
        if (!res.ok) {
            if (res.status === 401) window.location.href = '/login';
            return;
        }

        allCards = await res.json();

        try {
            const creditsRes = await fetch('/api/moi/credits', { credentials: 'same-origin', cache: 'no-store' });
            const credits = await creditsRes.json();
            document.getElementById('money').textContent = credits.credits;
        } catch (_) {}

        renderCards();
    } catch (error) {
        console.error('Erreur chargement mes joueurs :', error);
        if (!silent) {
            const grid = document.querySelector('.players-grid');
            if (grid) grid.innerHTML = '<div class="player-empty">Impossible de charger les joueurs.</div>';
        }
    } finally {
        myCardsRequestInFlight = false;
    }
}

function startMyCardsAutoRefresh() {
    if (myCardsRefreshTimer) clearInterval(myCardsRefreshTimer);
    myCardsRefreshTimer = setInterval(() => loadMyCards({ silent: true }), MY_CARDS_REFRESH_MS);
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            loadMyCards({ silent: true });
        }
    });
}

async function sellCard(carteId) {
    const prix = prompt('Prix de vente ?');
    if (!prix || Number(prix) <= 0) return;

    const res = await fetch('/api/marketplace/annonces', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ carteId, prix: parseInt(prix, 10) })
    });

    let data;
    try { data = await res.json(); } catch { data = null; }
    if (!res.ok) {
        alert(data?.message || data?.error || 'Impossible de mettre en vente');
        return;
    }

    alert('Carte mise en vente');
    loadMyCards({ silent: true });
}

document.getElementById('search')?.addEventListener('input', (event) => {
    currentSearch = event.target.value.trim().toLowerCase();
    renderCards();
});

document.getElementById('filterPosition')?.addEventListener('change', (event) => {
    currentPosition = event.target.value;
    renderCards();
});

loadMyCards();
startMyCardsAutoRefresh();
