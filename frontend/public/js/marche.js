let utilisateurCourant = null;
let toutesLesAnnonces = [];
let rechercheMarche = '';
let filtrePosteMarche = 'all';
let timerMarche = null;
let requeteMarcheEnCours = false;
const DELAI_RAFRAICHISSEMENT_MARCHE = 2000;

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

function afficherAnnoncesMarche() {
    const liste = document.querySelector('.players-list');

    const annoncesFiltrees = toutesLesAnnonces.filter((annonce) => {
        const joueur = annonce.carte.joueur;
        const okRecherche = !rechercheMarche || joueur.nom.toLowerCase().includes(rechercheMarche);
        const okPoste = filtrePosteMarche === 'all' || joueur.poste === filtrePosteMarche;
        return okRecherche && okPoste;
    });

    if (!annoncesFiltrees.length) {
        liste.innerHTML = '<div class="market-empty">Aucun joueur trouvé sur le marché.</div>';
        return;
    }

    liste.innerHTML = annoncesFiltrees.map((annonce) => {
        const estMonAnnonce = utilisateurCourant && annonce.vendeurId === utilisateurCourant.id;

        return `
        <div class="player-card">
            <div class="player-image">
                <img src="${donnerImageJoueur(annonce.carte.joueur)}" alt="${annonce.carte.joueur.nom}"
                     onerror="this.onerror=null; this.src=creerImageJoueurParDefaut();">
                <div class="player-rating">${annonce.carte.joueur.note}</div>
            </div>
            <div class="player-details">
                <h3 class="player-name">${annonce.carte.joueur.nom}</h3>
                <div class="player-meta">
                    <span class="player-position">${annonce.carte.joueur.poste}</span>
                    <span class="player-club">${annonce.carte.joueur.club || ''}</span>
                </div>
                <div style="font-size: 0.9rem; color: #888;">Vendeur: ${annonce.vendeurPseudo}</div>
            </div>
            <div class="player-actions">
                <div class="player-price"><span>${annonce.prix} crédits</span></div>
                ${estMonAnnonce
                    ? `<button class="btn-buy-player" onclick="retirerAnnonce(${annonce.id})">Retirer</button>`
                    : `<button class="btn-buy-player" onclick="acheterAnnonce(${annonce.id}, ${annonce.prix})">Acheter</button>`}
            </div>
        </div>`;
    }).join('');
}

async function chargerAnnoncesMarche(options = {}) {
    const { silent = false } = options;

    if (requeteMarcheEnCours) return;
    requeteMarcheEnCours = true;

    try {
        const [reponseMarche, reponseMoi] = await Promise.all([
            fetch('/api/marketplace', { credentials: 'same-origin', cache: 'no-store' }),
            fetch('/api/moi', { credentials: 'same-origin', cache: 'no-store' })
        ]);

        if (!reponseMarche.ok || !reponseMoi.ok) {
            if (reponseMarche.status === 401 || reponseMoi.status === 401) {
                window.location.href = '/login';
            }
            return;
        }

        utilisateurCourant = await reponseMoi.json();
        toutesLesAnnonces = await reponseMarche.json();
        afficherAnnoncesMarche();
    } catch (erreur) {
        console.error('Erreur chargement marché :', erreur);
        if (!silent) {
            const liste = document.querySelector('.players-list');
            if (liste) liste.innerHTML = '<div class="market-empty">Impossible de charger le marché.</div>';
        }
    } finally {
        requeteMarcheEnCours = false;
    }
}

function demarrerRafraichissementMarche() {
    if (timerMarche) clearInterval(timerMarche);

    timerMarche = setInterval(() => {
        chargerAnnoncesMarche({ silent: true });
    }, DELAI_RAFRAICHISSEMENT_MARCHE);

    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            chargerAnnoncesMarche({ silent: true });
        }
    });
}

async function acheterAnnonce(idAnnonce, prix) {
    if (!confirm(`Acheter pour ${prix} crédits ?`)) return;

    const reponse = await fetch(`/api/marketplace/annonces/${idAnnonce}/acheter`, {
        method: 'POST',
        credentials: 'same-origin'
    });

    let data;
    try {
        data = await reponse.json();
    } catch (_erreurLecture) {
        data = null;
    }

    if (!reponse.ok) {
        alert(data?.message || data?.error || 'Impossible d\'acheter ce joueur');
        return;
    }

    alert(data?.message || 'Achat effectué');
    chargerAnnoncesMarche({ silent: true });

    try {
        const credits = await (await fetch('/api/moi/credits', { credentials: 'same-origin' })).json();
        document.getElementById('money').textContent = credits.credits;
    } catch (_erreurCredits) {}
}

async function retirerAnnonce(idAnnonce) {
    if (!confirm('Retirer cette annonce du marché ?')) return;

    const reponse = await fetch(`/api/marketplace/annonces/${idAnnonce}`, {
        method: 'DELETE',
        credentials: 'same-origin'
    });

    let data;
    try {
        data = await reponse.json();
    } catch (_erreurLecture) {
        data = null;
    }

    if (!reponse.ok) {
        alert(data?.message || data?.error || 'Impossible de retirer cette annonce');
        return;
    }

    alert(data?.message || 'Annonce supprimée');
    chargerAnnoncesMarche({ silent: true });
}

document.getElementById('search')?.addEventListener('input', (event) => {
    rechercheMarche = event.target.value.trim().toLowerCase();
    afficherAnnoncesMarche();
});

document.getElementById('marketPosition')?.addEventListener('change', (event) => {
    filtrePosteMarche = event.target.value;
    afficherAnnoncesMarche();
});

chargerAnnoncesMarche();
demarrerRafraichissementMarche();
