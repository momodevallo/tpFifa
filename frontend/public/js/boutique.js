(async () => {
    let userId = localStorage.getItem('userId');

    // Si on a perdu le localStorage, on récupère l'utilisateur via la session
    if (!userId) {
        const meRes = await fetch('/auth/me', { credentials: 'include' });
        if (!meRes.ok) {
            window.location.href = '/auth/login';
            return;
        }
        const me = await meRes.json();
        userId = me.userId;
        localStorage.setItem('userId', me.userId);
        localStorage.setItem('pseudo', me.pseudo);
    }

    document.querySelectorAll('.btn-buy').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const packId = { bronze: 1, silver: 2, gold: 3 }[e.target.dataset.pack];
            if (!confirm(`Acheter ce pack pour ${e.target.dataset.price} crédits ?`)) return;

            const res = await fetch('/api/packs/open-pack', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ userId, packId })
            });

            const data = await res.json();
            if (!res.ok) return alert(data.message);

            document.getElementById('money').textContent = data.credits;
            alert(`Pack ouvert ! Vous avez reçu ${data.cards.length} joueurs.`);
            location.reload();
        });
    });
})();
