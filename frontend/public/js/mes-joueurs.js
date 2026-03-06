async function loadMyCards() {
    const res = await fetch('/api/moi/cartes', { credentials: 'same-origin' });
    if (!res.ok) {
        if (res.status === 401) window.location.href = '/login';
        return;
    }
    const cards = await res.json();

    try {
        const creditsRes = await fetch('/api/moi/credits', { credentials: 'same-origin' });
        const credits = await creditsRes.json();
        document.getElementById('money').textContent = credits.credits;
    } catch (_) {}

    document.getElementById('totalPlayers').textContent = cards.length;

    const grid = document.querySelector('.players-grid');
    grid.innerHTML = cards.map(card => `
        <div class="player-card" data-position="${card.joueur.poste}">
            <div class="rating">${card.joueur.note}</div>
            <img src="${card.joueur.imageUrl || ''}" alt="${card.joueur.nom}">
            <div class="player-info">
                <span class="name">${card.joueur.nom}</span>
                <span class="position">${card.joueur.poste}</span>
                <span class="club">${card.joueur.club || ''}</span>
            </div>
            ${card.nonEchangeable ? '<button class="btn-sell" disabled>Non échangeable</button>' : `<button class="btn-sell" onclick="sellCard(${card.id})">Vendre</button>`}
        </div>
    `).join('');
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

document.getElementById('search')?.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    document.querySelectorAll('.player-card').forEach(card => {
        card.style.display = card.querySelector('.name').textContent.toLowerCase().includes(query) ? '' : 'none';
    });
});

document.getElementById('filterPosition')?.addEventListener('change', (e) => {
    document.querySelectorAll('.player-card').forEach(card => {
        card.style.display = e.target.value === 'all' || card.dataset.position === e.target.value ? '' : 'none';
    });
});

loadMyCards();
