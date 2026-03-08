let idCarteBancSelectionnee = null;
let cartesCachees = [];
let equipeCachee = null;
let idCarteGlissee = null;
let glisseDepuisEquipe = false;
let rechercheBanc = '';
let filtrePosteBanc = 'all';
let timerComposition = null;
let requeteCompositionEnCours = false;
const DELAI_RAFRAICHISSEMENT_COMPOSITION = 4000;

// Échappe les caractères HTML pour éviter d'injecter du texte brut dans la page.
function echapperHtml(valeur) {
    return String(valeur || '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

// Crée une image locale si une vraie image joueur n'est pas disponible.
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

// Retourne la bonne image à afficher pour le joueur.
function donnerImageJoueur(joueur) {
    if (!joueur) return '';
    if (joueur.id) return `/player-image/${joueur.id}`;
    return joueur.imageUrl || '';
}

// Génère la carte d'un joueur dans la zone banc.
function genererCarteBanc(carte) {
    const classeSelection = idCarteBancSelectionnee === carte.id ? ' selected' : '';

    return `
        <div class="bench-player-card${classeSelection}"
             data-id="${carte.id}"
             data-poste="${carte.joueur.poste}"
             draggable="true">
            <div class="rating">${carte.joueur.note}</div>
            <img src="${donnerImageJoueur(carte.joueur)}" alt="${echapperHtml(carte.joueur.nom)}"
                 onerror="this.onerror=null; this.src=creerImageJoueurParDefaut();">
            <div class="info">
                <span class="name">${echapperHtml(carte.joueur.nom)}</span>
                <span class="pos">${echapperHtml(carte.joueur.poste)}</span>
            </div>
        </div>
    `;
}

// Génère le contenu d'une case du terrain.
function genererCaseTerrain(carte, poste) {
    if (!carte) {
        return `<div class="slot-placeholder">${echapperHtml(poste)}</div>`;
    }

    return `
        <div class="slot-card" data-carte-id="${carte.id}" data-poste="${carte.joueur.poste}" draggable="true">
            <div class="rating">${carte.joueur.note}</div>
            <img src="${donnerImageJoueur(carte.joueur)}" alt="${echapperHtml(carte.joueur.nom)}"
                 onerror="this.onerror=null; this.src=creerImageJoueurParDefaut();">
            <div class="info">
                <span class="name">${echapperHtml(carte.joueur.nom)}</span>
                <span class="pos">${echapperHtml(carte.joueur.poste)}</span>
            </div>
            <button class="slot-remove" data-carte-id="${carte.id}" type="button" title="Retirer de l'équipe">Retirer</button>
        </div>
    `;
}

// Extrait le poste attendu à partir du dataset de la case.
function extrairePosteDepuisCase(caseTerrain) {
    return String(caseTerrain.dataset.position || '').replace(/[0-9]/g, '');
}

// Remplit une série de cases avec les cartes passées en paramètre.
function remplirCases(cartes, selecteur) {
    const cases = document.querySelectorAll(selecteur);

    cases.forEach((caseTerrain, index) => {
        const poste = extrairePosteDepuisCase(caseTerrain);
        const carte = cartes[index];

        caseTerrain.dataset.carteId = carte ? String(carte.id) : '';
        caseTerrain.innerHTML = genererCaseTerrain(carte, poste);
    });
}

// Regroupe toutes les cartes actuellement présentes dans l'équipe.
function recupererCartesEquipe() {
    return [
        ...(equipeCachee?.attaquants || []),
        ...(equipeCachee?.milieux || []),
        ...(equipeCachee?.defenseurs || []),
        ...(equipeCachee?.gardiens || [])
    ];
}

// Cherche une carte par son identifiant dans le banc puis dans l'équipe.
function trouverCarteParId(idCarte) {
    return cartesCachees.find(carte => Number(carte.id) === Number(idCarte))
        || recupererCartesEquipe().find(carte => Number(carte.id) === Number(idCarte))
        || null;
}

// Retourne uniquement les cartes qui ne sont pas encore sur le terrain.
function recupererCartesBanc() {
    const idsEquipe = new Set(recupererCartesEquipe().map(carte => carte.id));
    return cartesCachees.filter(carte => !idsEquipe.has(carte.id));
}

// Applique la recherche et le filtre de poste sur le banc.
function recupererCartesBancFiltrees() {
    return recupererCartesBanc().filter((carte) => {
        const okRecherche = !rechercheBanc || carte.joueur.nom.toLowerCase().includes(rechercheBanc);
        const okPoste = filtrePosteBanc === 'all' || carte.joueur.poste === filtrePosteBanc;
        return okRecherche && okPoste;
    });
}

// Réaffiche complètement la zone du banc.
function rafraichirBanc() {
    const banc = recupererCartesBancFiltrees();
    const zoneBanc = document.querySelector('.bench-players');

    if (!banc.length) {
        zoneBanc.innerHTML = '<div class="bench-empty">Aucun joueur ne correspond au filtre.</div>';
        return;
    }

    zoneBanc.innerHTML = banc.map(genererCarteBanc).join('');
}

// Nettoie l'état visuel et logique du drag & drop.
function reinitialiserDrag() {
    idCarteGlissee = null;
    glisseDepuisEquipe = false;

    document.querySelectorAll('.drag-over, .drag-invalid, .drag-source').forEach((element) => {
        element.classList.remove('drag-over', 'drag-invalid', 'drag-source');
    });
}

// Colore une case selon que le dépôt soit valide ou non.
function marquerEtatCase(caseTerrain, estValide) {
    caseTerrain.classList.remove('drag-over', 'drag-invalid');
    caseTerrain.classList.add(estValide ? 'drag-over' : 'drag-invalid');
}

// Vérifie si la carte peut être posée sur cette case.
function depotValideSurCase(caseTerrain, carte) {
    if (!caseTerrain || !carte) return false;
    return carte.joueur.poste === extrairePosteDepuisCase(caseTerrain);
}

// Ajoute une carte dans l'équipe via l'API.
async function ajouterCarteEquipe(idCarte, poste) {
    const reponse = await fetch('/api/moi/equipe/cartes', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ carteId: idCarte, poste })
    });

    const data = await reponse.json().catch(() => ({}));
    if (!reponse.ok) {
        throw new Error(data.message || 'Impossible d’ajouter cette carte');
    }

    return data;
}

// Retire une carte de l'équipe via l'API.
async function retirerCarteEquipe(idCarte) {
    const reponse = await fetch(`/api/moi/equipe/cartes/${idCarte}`, {
        method: 'DELETE',
        credentials: 'same-origin'
    });

    const data = await reponse.json().catch(() => ({}));
    if (!reponse.ok) {
        throw new Error(data.message || 'Impossible de retirer cette carte');
    }

    return data;
}

// Place une carte dans une case, avec échange si une autre carte occupe déjà la place.
async function placerCarteDansCase(idCarte, caseTerrain) {
    const poste = extrairePosteDepuisCase(caseTerrain);
    const carteChoisie = trouverCarteParId(idCarte);

    if (!carteChoisie) {
        alert('Carte introuvable');
        return;
    }

    if (!depotValideSurCase(caseTerrain, carteChoisie)) {
        alert(`Cette carte est ${carteChoisie.joueur.poste}, elle ne peut pas aller en ${poste}`);
        return;
    }

    const idOccupant = Number(caseTerrain.dataset.carteId || 0);

    try {
        if (!idOccupant) {
            await ajouterCarteEquipe(idCarte, poste);
        } else if (idOccupant === Number(idCarte)) {
            return;
        } else {
            const carteOccupante = trouverCarteParId(idOccupant);

            await retirerCarteEquipe(idOccupant);

            try {
                await ajouterCarteEquipe(idCarte, poste);
            } catch (erreur) {
                if (carteOccupante) {
                    try {
                        await ajouterCarteEquipe(carteOccupante.id, carteOccupante.joueur.poste);
                    } catch (erreurRollback) {
                        console.error('Rollback impossible après échec du swap :', erreurRollback);
                    }
                }
                throw erreur;
            }
        }

        idCarteBancSelectionnee = null;
        await chargerComposition();
    } catch (erreur) {
        console.error(erreur);
        alert(erreur.message || 'Erreur réseau');
    }
}

// Gère les clics sur le document pour le banc et les boutons retirer.
function gererClicDocument(event) {
    const boutonRetrait = event.target.closest('.slot-remove');
    if (boutonRetrait) {
        retirerCarteEquipe(Number(boutonRetrait.dataset.carteId))
            .then(() => chargerComposition())
            .catch((erreur) => {
                console.error(erreur);
                alert(erreur.message || 'Erreur réseau');
            });
        return;
    }

    const carteBanc = event.target.closest('.bench-player-card');
    if (carteBanc) {
        idCarteBancSelectionnee = Number(carteBanc.dataset.id);
        rafraichirBanc();
        return;
    }

    const caseTerrain = event.target.closest('.slot');
    if (caseTerrain && idCarteBancSelectionnee) {
        placerCarteDansCase(idCarteBancSelectionnee, caseTerrain);
    }
}

// Démarre le glisser-déposer en mémorisant la carte concernée.
function gererDebutDrag(event) {
    const carteBanc = event.target.closest('.bench-player-card');
    if (carteBanc) {
        idCarteGlissee = Number(carteBanc.dataset.id);
        glisseDepuisEquipe = false;
        idCarteBancSelectionnee = idCarteGlissee;
        carteBanc.classList.add('drag-source', 'selected');
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', String(idCarteGlissee));
        return;
    }

    const carteTerrain = event.target.closest('.slot-card');
    if (carteTerrain) {
        idCarteGlissee = Number(carteTerrain.dataset.carteId);
        glisseDepuisEquipe = true;
        carteTerrain.classList.add('drag-source');
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', String(idCarteGlissee));
    }
}

// Affiche visuellement les zones de drop autorisées.
function gererSurvolDrag(event) {
    const caseTerrain = event.target.closest('.slot');
    if (caseTerrain) {
        event.preventDefault();
        const carte = trouverCarteParId(idCarteGlissee);
        const estValide = depotValideSurCase(caseTerrain, carte);
        event.dataTransfer.dropEffect = estValide ? 'move' : 'none';
        marquerEtatCase(caseTerrain, estValide);
        return;
    }

    const zoneBanc = event.target.closest('.bench-players');
    if (zoneBanc && glisseDepuisEquipe) {
        event.preventDefault();
        zoneBanc.classList.add('drag-over');
    }
}

// Nettoie l'effet visuel quand la souris sort d'une zone.
function gererSortieDrag(event) {
    const caseTerrain = event.target.closest('.slot');
    if (caseTerrain && !caseTerrain.contains(event.relatedTarget)) {
        caseTerrain.classList.remove('drag-over', 'drag-invalid');
        return;
    }

    const zoneBanc = event.target.closest('.bench-players');
    if (zoneBanc && !zoneBanc.contains(event.relatedTarget)) {
        zoneBanc.classList.remove('drag-over');
    }
}

// Finalise le drop soit sur le terrain, soit dans le banc.
async function gererDepot(event) {
    const caseTerrain = event.target.closest('.slot');
    if (caseTerrain) {
        event.preventDefault();
        const idCarte = Number(event.dataTransfer.getData('text/plain') || idCarteGlissee || 0);
        reinitialiserDrag();
        if (!idCarte) return;
        await placerCarteDansCase(idCarte, caseTerrain);
        return;
    }

    const zoneBanc = event.target.closest('.bench-players');
    if (zoneBanc && glisseDepuisEquipe) {
        event.preventDefault();
        const idCarte = Number(event.dataTransfer.getData('text/plain') || idCarteGlissee || 0);
        reinitialiserDrag();

        if (!idCarte) return;

        try {
            await retirerCarteEquipe(idCarte);
            await chargerComposition();
        } catch (erreur) {
            console.error(erreur);
            alert(erreur.message || 'Erreur réseau');
        }
    }
}

// Appelé en fin de drag pour nettoyer l'interface.
function gererFinDrag() {
    reinitialiserDrag();
}

// Recharge équipe + cartes puis redessine le terrain et le banc.
async function chargerComposition(options = {}) {
    const { silent = false } = options;

    if (requeteCompositionEnCours || idCarteGlissee) return;
    requeteCompositionEnCours = true;

    try {
        const [reponseEquipe, reponseCartes] = await Promise.all([
            fetch('/api/moi/equipe', { credentials: 'same-origin', cache: 'no-store' }),
            fetch('/api/moi/cartes', { credentials: 'same-origin', cache: 'no-store' })
        ]);

        if (!reponseEquipe.ok || !reponseCartes.ok) {
            if (reponseEquipe.status === 401 || reponseCartes.status === 401) {
                window.location.href = '/login';
            }
            return;
        }

        equipeCachee = await reponseEquipe.json();
        cartesCachees = await reponseCartes.json();

        remplirCases(equipeCachee.attaquants || [], '.ligne.attaque .slot');
        remplirCases(equipeCachee.milieux || [], '.ligne.milieu .slot');
        remplirCases(equipeCachee.defenseurs || [], '.ligne.defense .slot');
        remplirCases(equipeCachee.gardiens || [], '.ligne.gardien .slot');

        rafraichirBanc();
    } catch (erreur) {
        console.error('Erreur chargement composition :', erreur);
        if (!silent) alert('Impossible de charger la composition');
    } finally {
        requeteCompositionEnCours = false;
    }
}

// Lance le rafraîchissement automatique de la composition.
function demarrerRafraichissementComposition() {
    if (timerComposition) clearInterval(timerComposition);

    timerComposition = setInterval(() => {
        chargerComposition({ silent: true });
    }, DELAI_RAFRAICHISSEMENT_COMPOSITION);

    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            chargerComposition({ silent: true });
        }
    });
}

// Injecte les petits styles nécessaires au drag & drop.
(function injecterStylesComposition() {
    const style = document.createElement('style');
    style.textContent = `
      .bench-player-card.selected { outline: 3px solid #ffd700; transform: scale(1.03); }
      .slot { position: relative; cursor: pointer; }
      .slot.drag-over { border-color: #2ecc71; background: rgba(46, 204, 113, 0.25); }
      .slot.drag-invalid { border-color: #e74c3c; background: rgba(231, 76, 60, 0.2); }
      .bench-players.drag-over { outline: 3px dashed #ffd700; outline-offset: 8px; border-radius: 12px; }
      .drag-source { opacity: 0.6; }
      .slot-card {
        position: relative;
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 2px;
        cursor: grab;
        padding: 0.4rem;
      }
      .slot-card img {
        width: 42px;
        height: 42px;
        border-radius: 50%;
        object-fit: cover;
      }
      .slot-card .name {
        display: block;
        font-size: 0.68rem;
        max-width: 72px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .slot-card .pos { font-size: 0.65rem; opacity: .9; }
      .slot-card .rating {
        position: absolute;
        top: 4px;
        left: 4px;
        background: rgba(255, 193, 7, 0.95);
        color: #000;
        font-weight: 700;
        font-size: 0.72rem;
        line-height: 1;
        padding: 4px 6px;
        border-radius: 999px;
      }
      .slot-remove {
        position: absolute;
        bottom: 4px;
        left: 50%;
        transform: translateX(-50%);
        border: none;
        border-radius: 999px;
        padding: 0.2rem 0.45rem;
        cursor: pointer;
        background: #e74c3c;
        color: white;
        font-size: 0.62rem;
      }
      .slot-placeholder { font-weight: 700; opacity: .8; }
      .bench-empty {
        width: 100%;
        text-align: center;
        padding: 1rem;
        background: rgba(255,255,255,0.08);
        border-radius: 12px;
      }
    `;
    document.head.appendChild(style);
})();

document.getElementById('benchSearch')?.addEventListener('input', (event) => {
    rechercheBanc = event.target.value.trim().toLowerCase();
    rafraichirBanc();
});

document.getElementById('benchPosition')?.addEventListener('change', (event) => {
    filtrePosteBanc = event.target.value;
    rafraichirBanc();
});

document.addEventListener('click', gererClicDocument);
document.addEventListener('dragstart', gererDebutDrag);
document.addEventListener('dragover', gererSurvolDrag);
document.addEventListener('dragleave', gererSortieDrag);
document.addEventListener('drop', gererDepot);
document.addEventListener('dragend', gererFinDrag);

chargerComposition().catch(err => console.error(err));
demarrerRafraichissementComposition();
