let toutesLesCartes = [];
let rechercheCourante = '';
let filtrePosteCourant = 'all';
let timerMesJoueurs = null;
let requeteMesJoueursEnCours = false;
const DELAI_RAFRAICHISSEMENT_MES_JOUEURS = 4000;

// Image locale de secours quand un portrait joueur manque.
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

// Retourne l'image à afficher pour le joueur.
function donnerImageJoueur(joueur) {
    if (!joueur) return '';
    if (joueur.id) return `/player-image/${joueur.id}`;
    return joueur.imageUrl || '';
}

// Affiche les cartes possédées avec filtres recherche + poste.
function afficherCartes() {
    const cartesFiltrees = toutesLesCartes.filter((carte) => {
        const okRecherche = !rechercheCourante || carte.joueur.nom.toLowerCase().includes(rechercheCourante);
        const okPoste = filtrePosteCourant === 'all' || carte.joueur.poste === filtrePosteCourant;
        return okRecherche && okPoste;
    });

    document.getElementById('totalPlayers').textContent = toutesLesCartes.length;

    const grille = document.querySelector('.players-grid');
    if (!cartesFiltrees.length) {
        grille.innerHTML = '<div class="player-empty">Aucun joueur trouvé.</div>';
        return;
    }

    grille.innerHTML = cartesFiltrees.map((carte) => `
        <div class="player-card" data-position="${carte.joueur.poste}">
            <div class="rating">${carte.joueur.note}</div>
            <img src="${donnerImageJoueur(carte.joueur)}" alt="${carte.joueur.nom}"
                 onerror="this.onerror=null; this.src=creerImageJoueurParDefaut();">
            <div class="player-info">
                <span class="name">${carte.joueur.nom}</span>
                <span class="position">${carte.joueur.poste}</span>
                <span class="club">${carte.joueur.club || ''}</span>
            </div>
            ${carte.nonEchangeable
                ? '<button class="btn-sell" disabled>Non échangeable</button>'
                : `<button class="btn-sell" onclick="mettreCarteEnVente(${carte.id})">Vendre</button>`}
        </div>
    `).join('');
}

// Charge les cartes de l'utilisateur et son solde.
async function chargerMesCartes(options = {}) {
    const { silent = false } = options;

    if (requeteMesJoueursEnCours) return;
    requeteMesJoueursEnCours = true;

    try {
        const reponse = await fetch('/api/moi/cartes', { credentials: 'same-origin', cache: 'no-store' });
        if (!reponse.ok) {
            if (reponse.status === 401) window.location.href = '/login';
            return;
        }

        toutesLesCartes = await reponse.json();

        try {
            const reponseCredits = await fetch('/api/moi/credits', { credentials: 'same-origin', cache: 'no-store' });
            const credits = await reponseCredits.json();
            document.getElementById('money').textContent = credits.credits;
        } catch (_erreurCredits) {}

        afficherCartes();
    } catch (erreur) {
        console.error('Erreur chargement mes joueurs :', erreur);
        if (!silent) {
            const grille = document.querySelector('.players-grid');
            if (grille) grille.innerHTML = '<div class="player-empty">Impossible de charger les joueurs.</div>';
        }
    } finally {
        requeteMesJoueursEnCours = false;
    }
}

// Lance le rafraîchissement auto de la page "Mes joueurs".
function demarrerRafraichissementMesCartes() {
    if (timerMesJoueurs) clearInterval(timerMesJoueurs);

    timerMesJoueurs = setInterval(() => {
        chargerMesCartes({ silent: true });
    }, DELAI_RAFRAICHISSEMENT_MES_JOUEURS);

    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            chargerMesCartes({ silent: true });
        }
    });
}

// Envoie une carte vers le marché avec le prix choisi par l'utilisateur.
async function mettreCarteEnVente(idCarte) {
    const prix = prompt('Prix de vente ?');
    if (!prix || Number(prix) <= 0) return;

    const reponse = await fetch('/api/marketplace/annonces', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ carteId: idCarte, prix: parseInt(prix, 10) })
    });

    let data;
    try {
        data = await reponse.json();
    } catch (_erreurLecture) {
        data = null;
    }

    if (!reponse.ok) {
        alert(data?.message || data?.error || 'Impossible de mettre en vente');
        return;
    }

    alert('Carte mise en vente');
    chargerMesCartes({ silent: true });
}

document.getElementById('search')?.addEventListener('input', (event) => {
    rechercheCourante = event.target.value.trim().toLowerCase();
    afficherCartes();
});

document.getElementById('filterPosition')?.addEventListener('change', (event) => {
    filtrePosteCourant = event.target.value;
    afficherCartes();
});

chargerMesCartes();
demarrerRafraichissementMesCartes();
