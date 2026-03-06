async function refreshCredits() {
    const res = await fetch('/api/moi/credits', { credentials: 'same-origin' });
    if (!res.ok) return;
    const data = await res.json();
    const money = document.getElementById('money');
    if (money) money.textContent = data.credits;
}

async function fetchPackMap() {
    const res = await fetch('/api/packs', { credentials: 'same-origin' });
    if (!res.ok) throw new Error('Impossible de charger les packs');
    const packs = await res.json();
    const map = {};
    for (const pack of packs) {
        const nom = (pack.nom || '').toLowerCase();
        if (nom.includes('bronze')) map.bronze = pack;
        else if (nom.includes('argent') || nom.includes('silver')) map.silver = pack;
        else if (nom.includes('or') || nom.includes('gold')) map.gold = pack;
    }
    if (!map.bronze && packs[0]) map.bronze = packs[0];
    if (!map.silver && packs[1]) map.silver = packs[1];
    if (!map.gold && packs[2]) map.gold = packs[2];
    return map;
}

async function waitForPack(uuid) {
    for (let i = 0; i < 25; i++) {
        const res = await fetch(`/api/packs/${uuid}`, { credentials: 'same-origin' });
        if (res.ok) {
            const data = await res.json();
            if (data.statut === 'READY') return data;
            if (data.statut === 'FAILED') throw new Error(data.message || 'Échec du pack');
        }
        await new Promise(r => setTimeout(r, 1000));
    }
    throw new Error('Le pack prend trop de temps');
}

(async () => {
    let packMap = {};
    try {
        packMap = await fetchPackMap();
        await refreshCredits();
    } catch (e) {
        console.error(e);
    }

    document.querySelectorAll('.btn-buy').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const key = e.target.dataset.pack;
            const pack = packMap[key];
            if (!pack) {
                alert('Pack introuvable côté serveur');
                return;
            }
            if (!confirm(`Acheter ce pack pour ${pack.prix} crédits ?`)) return;

            try {
                const res = await fetch(`/api/packs/${pack.id}/ouvrir`, {
                    method: 'POST',
                    credentials: 'same-origin'
                });
                const data = await res.json();
                if (!res.ok) {
                    alert(data.message || data.error || 'Impossible d\'ouvrir le pack');
                    return;
                }

                const result = await waitForPack(data.uuid);
                await refreshCredits();
                alert(`${result.message || 'Pack ouvert !'}\nJoueurs reçus : ${result.cartes?.length || 0}`);
            } catch (err) {
                console.error(err);
                alert(err.message || 'Erreur pendant l\'ouverture du pack');
            }
        });
    });
})();
