function renderCard(carte) {
    return `
        <div class="joueur">
            <div class="card">
                <div class="rating">${carte.joueur.note}</div>
                <img src="${carte.joueur.imageUrl || ''}" alt="joueur">
                <div class="nom">${carte.joueur.nom}</div>
                <div class="poste">${carte.joueur.poste}</div>
            </div>
        </div>
    `;
}

(async () => {
    try {
        const res = await fetch('/api/moi/equipe', { credentials: 'same-origin' });
        if (!res.ok) return;
        const team = await res.json();

        const terrain = document.querySelector('.terrain');
        if (!terrain) return;

        terrain.innerHTML = `
            <div class="ligne attaque">${(team.attaquants || []).map(renderCard).join('')}</div>
            <div class="ligne milieu">${(team.milieux || []).map(renderCard).join('')}</div>
            <div class="ligne defense">${(team.defenseurs || []).map(renderCard).join('')}</div>
            <div class="ligne gardien">${(team.gardiens || []).map(renderCard).join('')}</div>
        `;
    } catch (e) {
        console.error(e);
    }
})();
