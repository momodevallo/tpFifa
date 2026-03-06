const userId = localStorage.getItem('userId');
if (!userId) window.location.href = '/auth/login';

document.querySelectorAll('.btn-buy').forEach(btn => {
    btn.addEventListener('click', async (e) => {
        const packType = e.target.dataset.pack;
        const packId = { bronze: 1, silver: 2, gold: 3 }[packType];
        const price = e.target.dataset.price;
        
        if (!confirm(`Acheter ce pack pour ${price} crédits ?`)) return;

        // Désactiver le bouton pendant le chargement
        btn.disabled = true;
        btn.textContent = 'Achat en cours...';

        const res = await fetch('/api/packs/open-pack', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, packId })
        });

        const data = await res.json();
        
        // Réactiver le bouton
        btn.disabled = false;
        btn.textContent = 'Acheter';

        if (!res.ok) {
            alert(data.message);
            return;
        }

        // Mettre à jour les crédits
        document.getElementById('money').textContent = data.credits;

        // Lancer l'animation d'ouverture du pack
        openPackAnimation(data.cards, packType);
    });
});

function openPackAnimation(cards, packType) {
    const modal = document.getElementById('packOpeningModal');
    const pack3d = document.getElementById('pack3d');
    const cardsReveal = document.getElementById('cardsReveal');

    // Afficher le modal
    modal.classList.add('show');
    
    // Réinitialiser l'état
    pack3d.style.display = 'block';
    cardsReveal.innerHTML = '';
    cardsReveal.classList.remove('show');

    // Personnaliser le pack 3D selon le type
    const packColors = {
        bronze: 'linear-gradient(135deg, #cd7f32 0%, #8b4513 100%)',
        silver: 'linear-gradient(135deg, #c0c0c0 0%, #808080 100%)',
        gold: 'linear-gradient(135deg, #ffd700 0%, #ffb300 100%)'
    };

    document.querySelectorAll('.pack-face').forEach(face => {
        face.style.background = packColors[packType];
    });

    // Après l'animation du pack (2 secondes), afficher les cartes
    setTimeout(() => {
        pack3d.style.display = 'none';
        
        // Créer les cartes des joueurs
        cards.forEach((card, index) => {
            const cardElement = document.createElement('div');
            cardElement.className = 'revealed-card';
            cardElement.innerHTML = `
                <div class="rating">${card.note}</div>
                <img src="/player-image/${card.joueur_id}" alt="${card.nom}">
                <div class="info">
                    <span class="name">${card.nom}</span>
                    <span class="position">${card.poste}</span>
                </div>
            `;
            cardsReveal.appendChild(cardElement);
        });

        // Afficher les cartes avec animation
        setTimeout(() => {
            cardsReveal.classList.add('show');
        }, 100);
    }, 2000);
}

function closePackModal() {
    const modal = document.getElementById('packOpeningModal');
    modal.classList.remove('show');
    
    // Optionnel: recharger la page pour mettre à jour les crédits
    setTimeout(() => {
        location.reload();
    }, 300);
}

// Fermer le modal en cliquant à l'extérieur
document.getElementById('packOpeningModal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
        closePackModal();
    }
});
