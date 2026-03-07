let currentUser = null;
let allListings = [];
let marketSearch = '';
let marketPosition = 'all';
let marketRefreshTimer = null;
let marketRequestInFlight = false;
const MARKET_REFRESH_MS = 2000;

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

function renderMarketListings() {
    const list = document.querySelector('.players-list');

    const filteredListings = allListings.filter(l => {
        const joueur = l.carte.joueur;
        const matchesSearch = !marketSearch || joueur.nom.toLowerCase().includes(marketSearch);
        const matchesPosition = marketPosition === 'all' || joueur.poste === marketPosition;
        return matchesSearch && matchesPosition;
    });

    if (!filteredListings.length) {
        list.innerHTML = '<div class="market-empty">Aucun joueur trouvé sur le marché.</div>';
        return;
    }

    list.innerHTML = filteredListings.map(l => {
        const ownListing = currentUser && l.vendeurId === currentUser.id;
        return `
        <div class="player-card">
            <div class="player-image">
                <img src="${getPlayerImageSrc(l.carte.joueur)}" alt="${l.carte.joueur.nom}"
                     onerror="this.onerror=null; this.src=getFallbackPlayerImageSrc();">
                <div class="player-rating">${l.carte.joueur.note}</div>
            </div>
            <div class="player-details">
                <h3 class="player-name">${l.carte.joueur.nom}</h3>
                <div class="player-meta">
                    <span class="player-position">${l.carte.joueur.poste}</span>
                    <span class="player-club">${l.carte.joueur.club || ''}</span>
                </div>
                <div style="font-size: 0.9rem; color: #888;">Vendeur: ${l.vendeurPseudo}</div>
            </div>
            <div class="player-actions">
                <div class="player-price"><span>${l.prix} crédits</span></div>
                ${ownListing
                    ? `<button class="btn-buy-player" onclick="removeListing(${l.id})">Retirer</button>`
                    : `<button class="btn-buy-player" onclick="buyPlayer(${l.id}, ${l.prix})">Acheter</button>`}
            </div>
        </div>`;
    }).join('');
}

async function loadMarketListings(options = {}) {
    const { silent = false } = options;

    if (marketRequestInFlight) return;
    marketRequestInFlight = true;

    try {
        const [marketRes, meRes] = await Promise.all([
            fetch('/api/marketplace', { credentials: 'same-origin', cache: 'no-store' }),
            fetch('/api/moi', { credentials: 'same-origin', cache: 'no-store' })
        ]);

        if (!marketRes.ok || !meRes.ok) {
            if (marketRes.status === 401 || meRes.status === 401) window.location.href = '/login';
            return;
        }

        currentUser = await meRes.json();
        allListings = await marketRes.json();
        renderMarketListings();
    } catch (error) {
        console.error('Erreur chargement marché :', error);
        if (!silent) {
            const list = document.querySelector('.players-list');
            if (list) list.innerHTML = '<div class="market-empty">Impossible de charger le marché.</div>';
        }
    } finally {
        marketRequestInFlight = false;
    }
}

function startMarketAutoRefresh() {
    if (marketRefreshTimer) clearInterval(marketRefreshTimer);
    marketRefreshTimer = setInterval(() => loadMarketListings({ silent: true }), MARKET_REFRESH_MS);

    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            loadMarketListings({ silent: true });
        }
    });
}

async function buyPlayer(annonceId, price) {
    if (!confirm(`Acheter pour ${price} crédits ?`)) return;

    const res = await fetch(`/api/marketplace/annonces/${annonceId}/acheter`, {
        method: 'POST',
        credentials: 'same-origin'
    });

    let data;
    try { data = await res.json(); } catch { data = null; }
    if (!res.ok) {
        alert(data?.message || data?.error || 'Impossible d\'acheter ce joueur');
        return;
    }

    alert(data?.message || 'Achat effectué');
    loadMarketListings({ silent: true });
    try {
        const credits = await (await fetch('/api/moi/credits', { credentials: 'same-origin' })).json();
        document.getElementById('money').textContent = credits.credits;
    } catch (_) {}
}

async function removeListing(annonceId) {
    if (!confirm('Retirer cette annonce du marché ?')) return;

    const res = await fetch(`/api/marketplace/annonces/${annonceId}`, {
        method: 'DELETE',
        credentials: 'same-origin'
    });

    let data;
    try { data = await res.json(); } catch { data = null; }
    if (!res.ok) {
        alert(data?.message || data?.error || 'Impossible de retirer cette annonce');
        return;
    }

    alert(data?.message || 'Annonce supprimée');
    loadMarketListings({ silent: true });
}

document.getElementById('search')?.addEventListener('input', (event) => {
    marketSearch = event.target.value.trim().toLowerCase();
    renderMarketListings();
});

document.getElementById('marketPosition')?.addEventListener('change', (event) => {
    marketPosition = event.target.value;
    renderMarketListings();
});

loadMarketListings();
startMarketAutoRefresh();
