const API = '';

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
  if (!joueur) return getFallbackPlayerImageSrc();
  if (joueur.id) return `/player-image/${joueur.id}`;
  if (joueur.imageUrl) return joueur.imageUrl;
  return getFallbackPlayerImageSrc();
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

async function apiFetch(url, options = {}) {
  const response = await fetch(`${API}${url}`, {
    credentials: 'same-origin',
    headers: {
      ...(options.body && !(options.body instanceof FormData)
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...(options.headers || {})
    },
    ...options
  });

  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  if (!response.ok) {
    let message = `Erreur ${response.status}`;
    if (isJson) {
      const data = await response.json().catch(() => null);
      message = data?.message || data?.error || message;
    } else {
      const text = await response.text().catch(() => '');
      if (response.redirected || text.toLowerCase().includes('<html')) {
        window.location.href = '/login';
        return;
      }
      if (text) message = text;
    }
    throw new Error(message);
  }

  if (response.status === 204) return null;
  if (isJson) return response.json();

  const text = await response.text();
  if (response.redirected || text.toLowerCase().includes('<html')) {
    window.location.href = '/login';
    return;
  }
  return text;
}

async function loadSessionInfo() {
  try {
    const [user, credits] = await Promise.all([
      apiFetch('/api/moi'),
      apiFetch('/api/moi/credits')
    ]);

    const pseudoNode = document.querySelector('[data-user-pseudo]');
    const creditsNode = document.querySelector('[data-user-credits]');

    if (pseudoNode) pseudoNode.textContent = user.pseudo;
    if (creditsNode) creditsNode.textContent = `${credits.credits} crédits`;

    window.currentUser = user;
    window.currentCredits = credits;
    return { user, credits };
  } catch (error) {
    if (!location.pathname.endsWith('/login')) {
      window.location.href = '/login';
    }
    throw error;
  }
}

function setActiveNav() {
  const file = location.pathname.split('/').pop() || 'dashboard.html';
  document.querySelectorAll('.nav a').forEach(link => {
    if (link.getAttribute('href') === `/${file}` || link.getAttribute('href') === file) {
      link.classList.add('active');
    }
  });
}

async function logout() {
  await fetch('/logout', { method: 'POST', credentials: 'same-origin' });
  window.location.href = '/login?logout';
}

function renderPlayerCard(carte, extraActions = '') {
  const j = carte.joueur;
  const qualiteClass = `qualite-${j.qualite}`;
  return `
    <article class="player-card">
      <div class="player-top">
        <div>
          <span class="badge ${qualiteClass}">${escapeHtml(j.qualite)}</span>
          <div class="player-name">${escapeHtml(j.nom)}</div>
          <div class="player-meta">
            <span>${escapeHtml(j.club || 'Club inconnu')}</span>
            <span>${escapeHtml(j.nationalite || 'Nationalité inconnue')}</span>
          </div>
        </div>
        <div class="player-rating">
          <div class="note">${escapeHtml(j.note)}</div>
          <div class="small">${escapeHtml(j.poste)}</div>
        </div>
      </div>
      <div class="player-body">
        <img class="player-avatar" src="${escapeHtml(getPlayerImageSrc(j))}" alt="${escapeHtml(j.nom)}" onerror="this.onerror=null; this.src=getFallbackPlayerImageSrc();" />
        <div class="player-actions">
          ${carte.nonEchangeable ? '<span class="badge locked">Non échangeable</span>' : ''}
          ${carte.enEquipe ? '<span class="badge equipe">Dans l\'équipe</span>' : ''}
          ${extraActions}
        </div>
      </div>
    </article>
  `;
}

function renderMarketplaceCard(annonce, mePseudo) {
  const own = annonce.vendeurPseudo === mePseudo;
  const carte = annonce.carte;
  const buyAction = own
    ? `<button class="btn-danger" onclick="removeListing(${annonce.id})">Retirer</button>`
    : `<button class="btn" onclick="buyListing(${annonce.id})">Acheter</button>`;

  return `
    <article class="player-card">
      <div class="player-top">
        <div>
          <span class="badge qualite-${escapeHtml(carte.joueur.qualite)}">${escapeHtml(carte.joueur.qualite)}</span>
          <div class="player-name">${escapeHtml(carte.joueur.nom)}</div>
          <div class="player-meta">
            <span>Vendeur : ${escapeHtml(annonce.vendeurPseudo)}</span>
            <span>${escapeHtml(carte.joueur.club || 'Club inconnu')}</span>
          </div>
        </div>
        <div class="player-rating">
          <div class="note">${escapeHtml(carte.joueur.note)}</div>
          <div class="small">${escapeHtml(carte.joueur.poste)}</div>
        </div>
      </div>
      <div class="player-body">
        <img class="player-avatar" src="${escapeHtml(getPlayerImageSrc(carte.joueur))}" alt="${escapeHtml(carte.joueur.nom)}" onerror="this.onerror=null; this.src=getFallbackPlayerImageSrc();" />
        <div class="player-actions">
          <span class="badge">${annonce.prix} crédits</span>
          ${buyAction}
        </div>
      </div>
    </article>
  `;
}

function showMessage(selector, type, message) {
  const box = document.querySelector(selector);
  if (!box) return;
  box.className = type;
  box.textContent = message;
  box.classList.remove('hidden');
}

function hideMessage(selector) {
  const box = document.querySelector(selector);
  if (!box) return;
  box.classList.add('hidden');
}
