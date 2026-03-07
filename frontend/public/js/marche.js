let currentUser = null;
let allListings = [];
let marketSearch = '';
let marketPosition = 'all';

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
                     onerror="this.onerror=null; this.src='https://placehold.co/110x110?text=J';">
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

async function loadMarketListings() {
    const [marketRes, meRes] = await Promise.all([
        fetch('/api/marketplace', { credentials: 'same-origin' }),
        fetch('/api/moi', { credentials: 'same-origin' })
    ]);

    if (!marketRes.ok || !meRes.ok) {
        if (marketRes.status === 401 || meRes.status === 401) window.location.href = '/login';
        return;
    }

    currentUser = await meRes.json();
    allListings = await marketRes.json();
    renderMarketListings();
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
    loadMarketListings();
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
    loadMarketListings();
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
