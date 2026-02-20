let userId = localStorage.getItem('userId');

async function ensureUserId() {
    if (userId) return userId;
    const meRes = await fetch('/auth/me', { credentials: 'include' });
    if (!meRes.ok) {
        window.location.href = '/auth/login';
        return null;
    }
    const me = await meRes.json();
    userId = me.userId;
    localStorage.setItem('userId', me.userId);
    localStorage.setItem('pseudo', me.pseudo);
    return userId;
}

async function loadMyCards() {
    const ok = await ensureUserId();
    if (!ok) return;

    const res = await fetch(`/api/cards/my-cards?userId=${userId}`, { credentials: 'include' });
    const data = await res.json();
    
    document.getElementById('money').textContent = data.credits;
    document.getElementById('totalPlayers').textContent = data.cards.length;
    
    const grid = document.querySelector('.players-grid');
    grid.innerHTML = data.cards.map(card => `
        <div class="player-card" data-position="${card.poste}">
            <div class="rating">${card.note}</div>
            <img src="/player-image/${card.joueur_id}" alt="${card.nom}">
            <div class="player-info">
                <span class="name">${card.nom}</span>
                <span class="position">${card.poste}</span>
                <span class="club">${card.club || ''}</span>
            </div>
            <button class="btn-sell" onclick="sellCard(${card.carte_id})">Vendre</button>
        </div>
    `).join('');
}

async function sellCard(carteId) {
    const prix = prompt('Prix de vente ?');
    if (!prix || prix <= 0) return;

    const ok = await ensureUserId();
    if (!ok) return;

    const res = await fetch('/api/marketplace/sell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userId, carteId, prix: parseInt(prix) })
    });

    const data = await res.json();
    alert(data.message);
    if (res.ok) loadMyCards();
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
