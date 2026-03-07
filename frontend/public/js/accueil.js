function getPlayerImageSrc(joueur) {
    if (!joueur) return '';
    if (joueur.id) return `/player-image/${joueur.id}`;
    return joueur.imageUrl || '';
}

function renderCard(carte) {
    return `
        <div class="joueur">
            <div class="card">
                <div class="rating">${carte.joueur.note}</div>
                <img src="${getPlayerImageSrc(carte.joueur)}" alt="${carte.joueur.nom}"
                     onerror="this.onerror=null; this.src='https://placehold.co/80x80?text=J';">
                <div class="nom">${carte.joueur.nom}</div>
                <div class="poste">${carte.joueur.poste}</div>
            </div>
        </div>
    `;
}

function renderLine(className, cards) {
    return `<div class="ligne ${className}">${cards.map(renderCard).join('')}</div>`;
}

(async () => {
    const terrain = document.querySelector('.terrain');
    if (!terrain) return;

    try {
        const res = await fetch('/api/moi/equipe', { credentials: 'same-origin' });

        if (res.status === 401) {
            window.location.href = '/login';
            return;
        }

        if (!res.ok) {
            throw new Error('Impossible de charger l\'équipe');
        }

        const team = await res.json();
        const allCards = [
            ...(team.attaquants || []),
            ...(team.milieux || []),
            ...(team.defenseurs || []),
            ...(team.gardiens || [])
        ];

        if (!allCards.length) {
            terrain.innerHTML = '<div class="empty-team">Aucun joueur dans l\'équipe pour le moment.</div>';
            return;
        }

        terrain.innerHTML = `
            ${renderLine('attaque', team.attaquants || [])}
            ${renderLine('milieu', team.milieux || [])}
            ${renderLine('defense', team.defenseurs || [])}
            ${renderLine('gardien', team.gardiens || [])}
        `;
    } catch (error) {
        console.error(error);
        terrain.innerHTML = '<div class="empty-team">Impossible de charger l\'équipe.</div>';
    }
})();
