const userId = localStorage.getItem('userId');
if (!userId) window.location.href = '/auth/login';

async function loadMarketListings() {
    const res = await fetch('/api/marketplace/listings');
    const data = await res.json();
    
    const list = document.querySelector('.players-list');
    list.innerHTML = data.listings.map(l => `
        <div class="player-card">
            <div class="player-image">
                <img src="/player-image/${l.joueur_id}" alt="${l.nom}">
                <div class="player-rating">${l.note}</div>
            </div>
            <div class="player-details">
                <h3 class="player-name">${l.nom}</h3>
                <div class="player-meta">
                    <span class="player-position">${l.poste}</span>
                    <span class="player-club">${l.club || ''}</span>
                </div>
                <div style="font-size: 0.9rem; color: #888;">Vendeur: ${l.vendeur_pseudo}</div>
            </div>
            <div class="player-actions">
                <div class="player-price">
                    <img class="coin-small" src="https://gmedia.playstation.com/is/image/SIEPDC/fifa-ultimate-team-coins-01-ps4-ps5-en-09sep21?$native--t$" alt="coins">
                    <span>${l.prix}</span>
                </div>
                <button class="btn-buy-player" onclick="buyPlayer(${l.annonce_id}, ${l.prix})">Acheter</button>
            </div>
        </div>
    `).join('');
}

async function buyPlayer(annonceId, price) {
    if (!confirm(`Acheter pour ${price} crédits ?`)) return;

    const res = await fetch('/api/marketplace/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, annonceId })
    });

    const data = await res.json();
    alert(data.message);
    if (res.ok) {
        document.getElementById('money').textContent = data.credits;
        loadMarketListings();
    }
}

document.getElementById('search')?.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    document.querySelectorAll('.player-card').forEach(card => {
        card.style.display = card.querySelector('.player-name').textContent.toLowerCase().includes(query) ? '' : 'none';
    });
});

document.querySelector('.filter-select')?.addEventListener('change', (e) => {
    document.querySelectorAll('.player-card').forEach(card => {
        card.style.display = e.target.value === 'all' || card.querySelector('.player-position').textContent === e.target.value ? '' : 'none';
    });
});

loadMarketListings();
