function getFallbackPlayerImageSrc() {
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240">
            <defs>
                <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stop-color="#182848" />
                    <stop offset="100%" stop-color="#4b6cb7" />
                </linearGradient>
            </defs>
            <rect width="240" height="240" rx="28" fill="url(#bg)"/>
            <circle cx="120" cy="88" r="38" fill="rgba(255,255,255,0.88)"/>
            <path d="M56 206c8-34 32-54 64-54s56 20 64 54" fill="rgba(255,255,255,0.88)"/>
            <text x="120" y="224" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" fill="rgba(255,255,255,0.96)">JOUEUR</text>
        </svg>
    `)}`;
}

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
                     onerror="this.onerror=null; this.src=getFallbackPlayerImageSrc();">
                <div class="nom">${carte.joueur.nom}</div>
                <div class="poste">${carte.joueur.poste}</div>
            </div>
        </div>
    `;
}

const TEAM_REFRESH_MS = 4000;
let teamRefreshTimer = null;

function renderLine(className, cards) {
    return `<div class="ligne ${className}">${cards.map(renderCard).join('')}</div>`;
}

async function loadTeam() {
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
}

function startTeamAutoRefresh() {
    if (teamRefreshTimer) clearInterval(teamRefreshTimer);
    teamRefreshTimer = setInterval(() => loadTeam().catch(error => console.error(error)), TEAM_REFRESH_MS);
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            loadTeam().catch(error => console.error(error));
        }
    });
}

loadTeam().catch(error => console.error(error));
startTeamAutoRefresh();
