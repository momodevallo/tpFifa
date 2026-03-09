function creerImageJoueurParDefaut() {
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

function donnerImageJoueur(joueur) {
    if (!joueur) return '';
    if (joueur.id) return `/player-image/${joueur.id}`;
    return joueur.imageUrl || '';
}

function genererCarteJoueur(carte) {
    return `
        <div class="joueur">
            <div class="card">
                <div class="rating">${carte.joueur.note}</div>
                <img src="${donnerImageJoueur(carte.joueur)}" alt="${carte.joueur.nom}"
                     onerror="this.onerror=null; this.src=creerImageJoueurParDefaut();">
                <div class="nom">${carte.joueur.nom}</div>
                <div class="poste">${carte.joueur.poste}</div>
            </div>
        </div>
    `;
}

const DELAI_RAFRAICHISSEMENT_EQUIPE = 4000;
let timerEquipe = null;

function genererLigne(classeLigne, cartes) {
    return `<div class="ligne ${classeLigne}">${cartes.map(genererCarteJoueur).join('')}</div>`;
}

async function chargerEquipe() {
    const terrain = document.querySelector('.terrain');
    if (!terrain) return;

    try {
        const reponse = await fetch('/api/moi/equipe', { credentials: 'same-origin' });

        if (reponse.status === 401) {
            window.location.href = '/login';
            return;
        }

        if (!reponse.ok) {
            throw new Error('Impossible de charger l\'équipe');
        }

        const equipe = await reponse.json();
        const toutesLesCartes = [
            ...(equipe.attaquants || []),
            ...(equipe.milieux || []),
            ...(equipe.defenseurs || []),
            ...(equipe.gardiens || [])
        ];

        if (!toutesLesCartes.length) {
            terrain.innerHTML = '<div class="empty-team">Aucun joueur dans l\'équipe pour le moment.</div>';
            return;
        }

        terrain.innerHTML = `
            ${genererLigne('attaque', equipe.attaquants || [])}
            ${genererLigne('milieu', equipe.milieux || [])}
            ${genererLigne('defense', equipe.defenseurs || [])}
            ${genererLigne('gardien', equipe.gardiens || [])}
        `;
    } catch (erreur) {
        console.error(erreur);
        terrain.innerHTML = '<div class="empty-team">Impossible de charger l\'équipe.</div>';
    }
}

function demarrerRafraichissementEquipe() {
    if (timerEquipe) clearInterval(timerEquipe);

    timerEquipe = setInterval(() => {
        chargerEquipe().catch(erreur => console.error(erreur));
    }, DELAI_RAFRAICHISSEMENT_EQUIPE);

    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            chargerEquipe().catch(erreur => console.error(erreur));
        }
    });
}

chargerEquipe().catch(erreur => console.error(erreur));
demarrerRafraichissementEquipe();
