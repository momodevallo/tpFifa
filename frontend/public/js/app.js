const API = '';

// Image de secours utilisée dans les pages legacy du projet.
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

// Retourne la bonne source d'image pour un joueur.
function donnerImageJoueur(joueur) {
  if (!joueur) return creerImageJoueurParDefaut();
  if (joueur.id) return `/player-image/${joueur.id}`;
  if (joueur.imageUrl) return joueur.imageUrl;
  return creerImageJoueurParDefaut();
}

// Échappe les caractères HTML pour un affichage sûr.
function echapperHtml(valeur) {
  return String(valeur ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

// Petit wrapper fetch pour les anciennes pages du projet.
async function recupererDepuisApi(url, options = {}) {
  const reponse = await fetch(`${API}${url}`, {
    credentials: 'same-origin',
    headers: {
      ...(options.body && !(options.body instanceof FormData)
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...(options.headers || {})
    },
    ...options
  });

  const typeContenu = reponse.headers.get('content-type') || '';
  const estJson = typeContenu.includes('application/json');

  if (!reponse.ok) {
    let message = `Erreur ${reponse.status}`;

    if (estJson) {
      const data = await reponse.json().catch(() => null);
      message = data?.message || data?.error || message;
    } else {
      const texte = await reponse.text().catch(() => '');
      if (reponse.redirected || texte.toLowerCase().includes('<html')) {
        window.location.href = '/login';
        return;
      }
      if (texte) message = texte;
    }

    throw new Error(message);
  }

  if (reponse.status === 204) return null;
  if (estJson) return reponse.json();

  const texte = await reponse.text();
  if (reponse.redirected || texte.toLowerCase().includes('<html')) {
    window.location.href = '/login';
    return;
  }

  return texte;
}

// Charge le pseudo et les crédits dans les pages legacy.
async function chargerInfosSession() {
  try {
    const [user, credits] = await Promise.all([
      recupererDepuisApi('/api/moi'),
      recupererDepuisApi('/api/moi/credits')
    ]);

    const zonePseudo = document.querySelector('[data-user-pseudo]');
    const zoneCredits = document.querySelector('[data-user-credits]');

    if (zonePseudo) zonePseudo.textContent = user.pseudo;
    if (zoneCredits) zoneCredits.textContent = `${credits.credits} crédits`;

    window.currentUser = user;
    window.currentCredits = credits;

    return { user, credits };
  } catch (erreur) {
    if (!location.pathname.endsWith('/login')) {
      window.location.href = '/login';
    }
    throw erreur;
  }
}

// Active le bon lien de navigation selon la page courante.
function activerLienNavigation() {
  const fichier = location.pathname.split('/').pop() || 'dashboard.html';

  document.querySelectorAll('.nav a').forEach((lien) => {
    if (lien.getAttribute('href') === `/${fichier}` || lien.getAttribute('href') === fichier) {
      lien.classList.add('active');
    }
  });
}

// Déconnecte proprement l'utilisateur.
async function deconnecterUtilisateur() {
  await fetch('/logout', { method: 'POST', credentials: 'same-origin' });
  window.location.href = '/login?logout';
}

// Génère la carte HTML d'un joueur.
function genererCarteJoueur(carte, actionsSupp = '') {
  const joueur = carte.joueur;
  const classeQualite = `qualite-${joueur.qualite}`;

  return `
    <article class="player-card">
      <div class="player-top">
        <div>
          <span class="badge ${classeQualite}">${echapperHtml(joueur.qualite)}</span>
          <div class="player-name">${echapperHtml(joueur.nom)}</div>
          <div class="player-meta">
            <span>${echapperHtml(joueur.club || 'Club inconnu')}</span>
            <span>${echapperHtml(joueur.nationalite || 'Nationalité inconnue')}</span>
          </div>
        </div>
        <div class="player-rating">
          <div class="note">${echapperHtml(joueur.note)}</div>
          <div class="small">${echapperHtml(joueur.poste)}</div>
        </div>
      </div>
      <div class="player-body">
        <img class="player-avatar" src="${echapperHtml(donnerImageJoueur(joueur))}" alt="${echapperHtml(joueur.nom)}" onerror="this.onerror=null; this.src=creerImageJoueurParDefaut();" />
        <div class="player-actions">
          ${carte.nonEchangeable ? '<span class="badge locked">Non échangeable</span>' : ''}
          ${carte.enEquipe ? '<span class="badge equipe">Dans l\'équipe</span>' : ''}
          ${actionsSupp}
        </div>
      </div>
    </article>
  `;
}

// Génère une carte d'annonce pour la vieille page marketplace.
function genererCarteAnnonce(annonce, monPseudo) {
  const estMonAnnonce = annonce.vendeurPseudo === monPseudo;
  const carte = annonce.carte;
  const actionAchat = estMonAnnonce
    ? `<button class="btn-danger" onclick="removeListing(${annonce.id})">Retirer</button>`
    : `<button class="btn" onclick="buyListing(${annonce.id})">Acheter</button>`;

  return `
    <article class="player-card">
      <div class="player-top">
        <div>
          <span class="badge qualite-${echapperHtml(carte.joueur.qualite)}">${echapperHtml(carte.joueur.qualite)}</span>
          <div class="player-name">${echapperHtml(carte.joueur.nom)}</div>
          <div class="player-meta">
            <span>Vendeur : ${echapperHtml(annonce.vendeurPseudo)}</span>
            <span>${echapperHtml(carte.joueur.club || 'Club inconnu')}</span>
          </div>
        </div>
        <div class="player-rating">
          <div class="note">${echapperHtml(carte.joueur.note)}</div>
          <div class="small">${echapperHtml(carte.joueur.poste)}</div>
        </div>
      </div>
      <div class="player-body">
        <img class="player-avatar" src="${echapperHtml(donnerImageJoueur(carte.joueur))}" alt="${echapperHtml(carte.joueur.nom)}" onerror="this.onerror=null; this.src=creerImageJoueurParDefaut();" />
        <div class="player-actions">
          <span class="badge">${annonce.prix} crédits</span>
          ${actionAchat}
        </div>
      </div>
    </article>
  `;
}

// Affiche un message simple dans une zone.
function afficherMessage(selecteur, type, message) {
  const box = document.querySelector(selecteur);
  if (!box) return;

  box.className = type;
  box.textContent = message;
  box.classList.remove('hidden');
}

// Cache une zone de message.
function masquerMessage(selecteur) {
  const box = document.querySelector(selecteur);
  if (!box) return;

  box.classList.add('hidden');
}
