let allCards = [];
let currentSearch = '';
let currentPosition = 'all';

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
                 onerror="this.onerror=null; this.src='https://placehold.co/120x120?text=J';">
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

    renderCards();
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

document.getElementById('search')?.addEventListener('input', (event) => {
    currentSearch = event.target.value.trim().toLowerCase();
    renderCards();
});

document.getElementById('filterPosition')?.addEventListener('change', (event) => {
    currentPosition = event.target.value;
    renderCards();
});

loadMyCards();
