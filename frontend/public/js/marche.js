let currentUser = null;

function applyMarketFilters() {
    const query = String(document.getElementById('search')?.value || '').trim().toLowerCase();
    const position = String(document.getElementById('marketFilterPosition')?.value || 'all');

    document.querySelectorAll('.player-card').forEach(card => {
        const name = String(card.querySelector('.player-name')?.textContent || '').toLowerCase();
        const club = String(card.querySelector('.player-club')?.textContent || '').toLowerCase();
        const cardPosition = String(card.querySelector('.player-position')?.textContent || '');
        const matchesSearch = !query || name.includes(query) || club.includes(query);
        const matchesPosition = position === 'all' || cardPosition === position;
        card.style.display = matchesSearch && matchesPosition ? '' : 'none';
    });
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
    const data = await marketRes.json();

    const list = document.querySelector('.players-list');

    if (!data.length) {
        list.innerHTML = '<div class="player-card" style="justify-content:center; align-items:center; min-height: 180px;">Aucune annonce disponible.</div>';
        return;
    }

    list.innerHTML = data.map(l => {
        const ownListing = currentUser && l.vendeurId === currentUser.id;
        return `
        <div class="player-card">
            <div class="player-image">
                <img src="${l.carte.joueur.imageUrl || ''}" alt="${l.carte.joueur.nom}" onerror="this.style.display='none'">
                <div class="player-rating">${l.carte.joueur.note}</div>
            </div>
            <div class="player-details">
                <h3 class="player-name">${l.carte.joueur.nom}</h3>
                <div class="player-meta">
                    <span class="player-position">${l.carte.joueur.poste}</span>
                    <span class="player-club">${l.carte.joueur.club || ''}</span>
                </div>
                <div style="font-size: 0.9rem; color: #888;">Vendeur : ${l.vendeurPseudo}</div>
            </div>
            <div class="player-actions">
                <div class="player-price">
                    <span>${l.prix} crédits</span>
                </div>
                ${ownListing
                    ? `<button class="btn-buy-player" onclick="removeListing(${l.id})">Retirer</button>`
                    : `<button class="btn-buy-player" onclick="buyPlayer(${l.id}, ${l.prix})">Acheter</button>`}
            </div>
        </div>`;
    }).join('');

    applyMarketFilters();
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

document.getElementById('search')?.addEventListener('input', applyMarketFilters);
document.getElementById('marketFilterPosition')?.addEventListener('change', applyMarketFilters);

loadMarketListings();
