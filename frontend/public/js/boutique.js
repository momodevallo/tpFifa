async function recupererOuInitialiserUtilisateur() {
    let userId = localStorage.getItem('userId');

    if (!userId) {
        const reponse = await fetch('/auth/me', { credentials: 'include' });

        if (!reponse.ok) {
            window.location.href = '/auth/login';
            return null;
        }

        const me = await reponse.json();
        userId = me.userId;

        localStorage.setItem('userId', me.userId);
        localStorage.setItem('pseudo', me.pseudo);
    }

    return userId;
}

async function ouvrirPack(userId, typePack, prix) {
    const mappingPackId = {
        bronze: 1,
        silver: 2,
        gold: 3
    };

    const packId = mappingPackId[typePack];

    if (!packId) {
        throw new Error('Type de pack inconnu : ' + typePack);
    }

    const confirmation = confirm(`Acheter ce pack pour ${prix} crédits ?`);
    if (!confirmation) {
        return null;
    }

    const reponse = await fetch('/api/packs/open-pack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userId, packId })
    });

    const data = await reponse.json();

    if (!reponse.ok) {
        throw new Error(data.message || 'Erreur lors de l’ouverture du pack');
    }
    return data;
}
function mettreAJourAffichageApresPack(data) {
    const moneyElement = document.getElementById('money');
    if (moneyElement) {
        moneyElement.textContent = data.credits;
    }
    alert(`Pack ouvert ! Tu as reçu ${data.cards.length} joueurs.`);
}

(async () => {
    const userId = await recupererOuInitialiserUtilisateur();
    if (!userId) return; // au cas où

    const boutons = document.querySelectorAll('.btn-buy');

    boutons.forEach(btn => {
        btn.addEventListener('click', async (event) => {
            const typePack = event.target.dataset.pack;
            const prix = event.target.dataset.price;

            try {
                const data = await ouvrirPack(userId, typePack, prix);
                if (!data) {
                    return;
                }
                mettreAJourAffichageApresPack(data);
            } catch (erreur) {
                alert(erreur.message);
            }
        });
    });
})();
