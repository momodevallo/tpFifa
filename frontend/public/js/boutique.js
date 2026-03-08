const MAX_TENTATIVES_PACK = 30;
const DELAI_VERIFICATION_PACK_MS = 1000;

function attendre(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

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

function determinerTypeReponse(reponse) {
    const typeContenu = (reponse.headers.get('content-type') || '').toLowerCase();
    if (reponse.status === 401 || reponse.status === 403) return 'non-auth';
    if (reponse.redirected || reponse.url.includes('/login')) return 'page-login';
    if (typeContenu.includes('application/json')) return 'json';
    if (typeContenu.includes('text/html')) return 'html';
    return 'autre';
}

async function recupererJsonSecurise(url, options = {}) {
    const reponse = await fetch(url, { credentials: 'same-origin', ...options });
    const typeReponse = determinerTypeReponse(reponse);

    if (typeReponse === 'non-auth' || typeReponse === 'page-login') {
        window.location.href = '/login';
        return null;
    }

    const data = typeReponse === 'json' ? await reponse.json().catch(() => ({})) : {};

    if (!reponse.ok) {
        throw new Error(data?.message || data?.error || `Erreur ${reponse.status}`);
    }

    return data;
}

function bloquerBoutonsAchat(estBloque) {
    document.querySelectorAll('.btn-buy').forEach((bouton) => {
        bouton.disabled = estBloque;
        bouton.classList.toggle('is-loading', estBloque);
    });
}

function changerEtatExperience(classeEtat, titre, texte = '') {
    const section = document.getElementById('packExperience');
    const zonePack = document.getElementById('packStage');
    const titreNode = document.getElementById('packExperienceTitle');
    const texteNode = document.getElementById('packExperienceText');

    section.classList.remove('hidden');
    zonePack.className = `pack-stage ${classeEtat}`;
    titreNode.textContent = titre;
    texteNode.textContent = texte;
}

function genererCarteReveal(carte) {
    const joueur = carte?.joueur || {};
    return `
        <article class="reveal-card">
            <div class="reveal-card__top">
                <span class="reveal-note">${joueur.note ?? '-'}</span>
                <span class="reveal-position">${joueur.poste || '-'}</span>
            </div>
            <div class="reveal-avatar-wrap">
                <img class="reveal-avatar" src="${donnerImageJoueur(joueur)}" alt="${joueur.nom || 'Joueur'}"
                     onerror="this.onerror=null; this.src=creerImageJoueurParDefaut();">
            </div>
            <div class="reveal-card__body">
                <h3>${joueur.nom || 'Joueur'}</h3>
                <p>${joueur.club || 'Club inconnu'}</p>
                <p>${joueur.nationalite || 'Nationalité inconnue'}</p>
            </div>
        </article>
    `;
}

async function rafraichirCredits() {
    const data = await recupererJsonSecurise('/api/moi/credits');
    if (!data) return;

    const zoneArgent = document.getElementById('money');
    if (zoneArgent) zoneArgent.textContent = data.credits;
}

async function chargerCorrespondancePacks() {
    const packs = await recupererJsonSecurise('/api/packs');
    const correspondance = {};

    for (const pack of packs || []) {
        const nomPack = String(pack.nom || '').toLowerCase();

        if (nomPack.includes('bronze')) correspondance.bronze = pack;
        else if (nomPack.includes('argent') || nomPack.includes('silver')) correspondance.silver = pack;
        else if (nomPack.includes('or') || nomPack.includes('gold')) correspondance.gold = pack;
    }

    if (!correspondance.bronze && packs?.[0]) correspondance.bronze = packs[0];
    if (!correspondance.silver && packs?.[1]) correspondance.silver = packs[1];
    if (!correspondance.gold && packs?.[2]) correspondance.gold = packs[2];

    return correspondance;
}

async function attendrePackPret(uuid) {
    for (let tentative = 0; tentative < MAX_TENTATIVES_PACK; tentative++) {
        const resultat = await recupererJsonSecurise(`/api/packs/${uuid}`);
        if (!resultat) return null;

        if (resultat.statut === 'READY') return resultat;
        if (resultat.statut === 'FAILED') {
            throw new Error(resultat.message || 'Échec du pack');
        }

        await attendre(DELAI_VERIFICATION_PACK_MS);
    }

    throw new Error('Le pack met trop de temps à arriver');
}

async function jouerAnimationPack(nomPack) {
    const grille = document.getElementById('packRevealGrid');
    grille.innerHTML = '';

    changerEtatExperience('stage-start', nomPack, 'Le pack arrive...');
    await attendre(450);

    changerEtatExperience('stage-spin', nomPack, 'Ouverture en cours...');
    await attendre(1400);

    changerEtatExperience('stage-open', nomPack, 'Révélation des joueurs...');
    await attendre(700);
}

(async () => {
    let correspondancePacks = {};

    try {
        correspondancePacks = await chargerCorrespondancePacks();
        await rafraichirCredits();
    } catch (erreur) {
        console.error(erreur);
        changerEtatExperience('stage-error', 'Boutique indisponible', erreur.message || 'Impossible de charger les packs.');
    }

    document.querySelectorAll('.btn-buy').forEach((bouton) => {
        bouton.addEventListener('click', async (event) => {
            const clePack = event.currentTarget.dataset.pack;
            const pack = correspondancePacks[clePack];

            if (!pack) {
                changerEtatExperience('stage-error', 'Erreur', 'Pack introuvable.');
                return;
            }

            bloquerBoutonsAchat(true);

            try {
                const lancement = await recupererJsonSecurise(`/api/packs/${pack.id}/ouvrir`, { method: 'POST' });
                if (!lancement?.uuid) {
                    throw new Error('Impossible de lancer le pack');
                }

                await jouerAnimationPack(pack.nom);

                const resultat = await attendrePackPret(lancement.uuid);
                document.getElementById('packRevealGrid').innerHTML = (resultat.cartes || []).map(genererCarteReveal).join('');
                changerEtatExperience('stage-open', pack.nom, `${resultat.cartes?.length || 0} joueur(s) obtenu(s).`);
                await rafraichirCredits();
            } catch (erreur) {
                console.error(erreur);
                changerEtatExperience('stage-error', 'Erreur', erreur.message || 'Erreur pendant l\'ouverture du pack.');
            } finally {
                bloquerBoutonsAchat(false);
            }
        });
    });
})();
