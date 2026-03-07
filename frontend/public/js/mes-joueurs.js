let allCards = [];

function applyFilters() {
    const query = String(document.getElementById('search')?.value || '').trim().toLowerCase();
    const position = String(document.getElementById('filterPosition')?.value || 'all');

    document.querySelectorAll('.player-card').forEach(card => {
        const name = String(card.querySelector('.name')?.textContent || '').toLowerCase();
        const club = String(card.querySelector('.club')?.textContent || '').toLowerCase();
        const cardPosition = String(card.dataset.position || '');
        const matchesSearch = !query || name.includes(query) || club.includes(query);
        const matchesPosition = position === 'all' || cardPosition === position;
        card.style.display = matchesSearch && matchesPosition ? '' : 'none';
    });
}

function renderCards(cards) {
    const grid = document.querySelector('.players-grid');

    if (!cards.length) {
        grid.innerHTML = '<div class="player-card" style="grid-column: 1 / -1; text-align:center;">Aucun joueur dans ton club.</div>';
        return;
    }

    grid.innerHTML = cards.map(card => `
        <div class="player-card" data-position="${card.joueur.poste}">
            <div class="rating">${card.joueur.note}</div>
            <img src="${card.joueur.imageUrl || ''}" alt="${card.joueur.nom}" onerror="this.style.display='none'">
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

    applyFilters();
}

async function loadMyCards() {
    const res = await fetch('/api/moi/cartes', { credentials: 'same-origin' });
    if (!res.ok) {
        if (res.status === 401) window.location.href = '/login';
        return;
    }

    allCards = await res.json();

    try {
        const creditsRes = await fetch('/api/moi/credits', { credentials: 'same-origin' });
        const credits = await creditsRes.json();
        document.getElementById('money').textContent = credits.credits;
    } catch (_) {}

    document.getElementById('totalPlayers').textContent = allCards.length;
    renderCards(allCards);
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
    loadMyCards();
}

document.getElementById('search')?.addEventListener('input', applyFilters);
document.getElementById('filterPosition')?.addEventListener('change', applyFilters);

loadMyCards();
