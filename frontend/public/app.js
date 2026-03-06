const state = {
  user: null,
  packs: [],
  cards: [],
  team: null,
  market: [],
  lastPack: []
};

const authView = document.getElementById('authView');
const appView = document.getElementById('appView');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const showLoginBtn = document.getElementById('showLoginBtn');
const showRegisterBtn = document.getElementById('showRegisterBtn');
const welcomeText = document.getElementById('welcomeText');
const creditsValue = document.getElementById('creditsValue');
const messageBox = document.getElementById('messageBox');
const packsTab = document.getElementById('packsTab');
const cardsTab = document.getElementById('cardsTab');
const teamTab = document.getElementById('teamTab');
const marketTab = document.getElementById('marketTab');

showLoginBtn.addEventListener('click', () => showAuth('login'));
showRegisterBtn.addEventListener('click', () => showAuth('register'));
loginForm.addEventListener('submit', onLogin);
registerForm.addEventListener('submit', onRegister);
document.getElementById('logoutBtn').addEventListener('click', logout);
document.getElementById('regenBtn').addEventListener('click', regenerateCredits);

document.querySelectorAll('[data-tab]').forEach((button) => {
  button.addEventListener('click', () => switchTab(button.dataset.tab));
});

boot();

async function boot() {
  try {
    const data = await fetchJSON('/api/session');
    if (data.user) {
      state.user = data.user;
      showApp();
      await loadAll();
    } else {
      showAuth('login');
    }
  } catch {
    showAuth('login');
  }
}

function showAuth(type) {
  authView.classList.remove('hidden');
  appView.classList.add('hidden');
  loginForm.classList.toggle('hidden', type !== 'login');
  registerForm.classList.toggle('hidden', type !== 'register');
  showLoginBtn.classList.toggle('active', type === 'login');
  showRegisterBtn.classList.toggle('active', type === 'register');
}

function showApp() {
  authView.classList.add('hidden');
  appView.classList.remove('hidden');
}

function switchTab(tabName) {
  document.querySelectorAll('[data-tab]').forEach((button) => {
    button.classList.toggle('active', button.dataset.tab === tabName);
  });
  packsTab.classList.toggle('hidden', tabName !== 'packs');
  cardsTab.classList.toggle('hidden', tabName !== 'cards');
  teamTab.classList.toggle('hidden', tabName !== 'team');
  marketTab.classList.toggle('hidden', tabName !== 'market');
}

async function onLogin(event) {
  event.preventDefault();
  const form = new FormData(loginForm);
  try {
    const data = await fetchJSON('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pseudo: form.get('pseudo'),
        mdp: form.get('mdp')
      })
    });
    state.user = data.user;
    loginForm.reset();
    showApp();
    await loadAll();
    showMessage(data.message, 'success');
  } catch (error) {
    showMessage(error.message, 'error');
  }
}

async function onRegister(event) {
  event.preventDefault();
  const form = new FormData(registerForm);
  try {
    const data = await fetchJSON('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pseudo: form.get('pseudo'),
        mdp: form.get('mdp')
      })
    });
    state.user = data.user;
    registerForm.reset();
    showApp();
    await loadAll();
    showMessage('Compte créé avec équipe de départ non échangeable.', 'success');
  } catch (error) {
    showMessage(error.message, 'error');
  }
}

async function logout() {
  try {
    await fetchJSON('/api/logout', { method: 'POST' });
  } catch {}
  state.user = null;
  state.packs = [];
  state.cards = [];
  state.team = null;
  state.market = [];
  state.lastPack = [];
  showAuth('login');
  showMessage('Déconnecté.', 'success');
}

async function regenerateCredits() {
  try {
    const data = await fetchJSON('/api/credits/regenerate', { method: 'POST' });
    state.user = data.user;
    renderHeader();
    showMessage(data.message, 'success');
  } catch (error) {
    showMessage(error.message, 'error');
  }
}

async function loadAll() {
  const [packs, cards, team, market, me] = await Promise.all([
    fetchJSON('/api/packs'),
    fetchJSON('/api/cards'),
    fetchJSON('/api/team'),
    fetchJSON('/api/market'),
    fetchJSON('/api/me')
  ]);
  state.packs = packs;
  state.cards = cards;
  state.team = team;
  state.market = market;
  state.user = me;
  renderAll();
}

function renderAll() {
  renderHeader();
  renderPacks();
  renderCards();
  renderTeam();
  renderMarket();
}

function renderHeader() {
  welcomeText.textContent = state.user ? `Connecté en tant que ${state.user.pseudo}` : '';
  creditsValue.textContent = state.user ? state.user.credits : '0';
}

function renderPacks() {
  packsTab.innerHTML = `
    <h2 class="section-title">Boutique</h2>
    <div class="grid">
      ${state.packs.map(pack => `
        <article class="card">
          <h3>${pack.nom}</h3>
          <p class="muted">${pack.nbCartes} cartes</p>
          <div class="tags">
            <span class="tag">Bronze ${pack.pctBronze}%</span>
            <span class="tag">Argent ${pack.pctArgent}%</span>
            <span class="tag">Or ${pack.pctOr}%</span>
          </div>
          <div class="market-price">${pack.prix} crédits</div>
          <div class="actions">
            <button data-open-pack="${pack.id}">Ouvrir</button>
          </div>
        </article>
      `).join('')}
    </div>
    <div class="new-pack">
      <h3>Dernier pack ouvert</h3>
      ${state.lastPack.length ? `<div class="grid">${state.lastPack.map(renderCardHtml).join('')}</div>` : `<div class="empty">Aucun pack ouvert pour le moment.</div>`}
    </div>
  `;

  packsTab.querySelectorAll('[data-open-pack]').forEach((button) => {
    button.addEventListener('click', () => openPack(Number(button.dataset.openPack)));
  });
}

function renderCards() {
  cardsTab.innerHTML = `
    <h2 class="section-title">Mes cartes (${state.cards.length})</h2>
    ${state.cards.length ? `<div class="grid">${state.cards.map(card => renderOwnedCardHtml(card)).join('')}</div>` : `<div class="empty">Aucune carte.</div>`}
  `;

  cardsTab.querySelectorAll('[data-add-team]').forEach((button) => {
    button.addEventListener('click', () => addToTeam(Number(button.dataset.addTeam), button.dataset.poste));
  });

  cardsTab.querySelectorAll('[data-sell-card]').forEach((button) => {
    button.addEventListener('click', () => sellCard(Number(button.dataset.sellCard)));
  });
}

function renderTeam() {
  if (!state.team) {
    teamTab.innerHTML = '<div class="empty">Équipe indisponible.</div>';
    return;
  }

  teamTab.innerHTML = `
    <h2 class="section-title">Mon équipe (${state.team.formation})</h2>
    <div class="team-columns">
      ${renderTeamColumn('Gardien', state.team.gardiens)}
      ${renderTeamColumn('Défense', state.team.defenseurs)}
      ${renderTeamColumn('Milieu', state.team.milieux)}
      ${renderTeamColumn('Attaque', state.team.attaquants)}
    </div>
  `;

  teamTab.querySelectorAll('[data-remove-team]').forEach((button) => {
    button.addEventListener('click', () => removeFromTeam(Number(button.dataset.removeTeam)));
  });
}

function renderMarket() {
  marketTab.innerHTML = `
    <h2 class="section-title">Marché</h2>
    ${state.market.length ? `<div class="grid">${state.market.map(listing => renderMarketHtml(listing)).join('')}</div>` : `<div class="empty">Aucune carte en vente.</div>`}
  `;

  marketTab.querySelectorAll('[data-buy]').forEach((button) => {
    button.addEventListener('click', () => buyListing(Number(button.dataset.buy)));
  });

  marketTab.querySelectorAll('[data-cancel-listing]').forEach((button) => {
    button.addEventListener('click', () => cancelListing(Number(button.dataset.cancelListing)));
  });
}

function renderCardHtml(card) {
  return `
    <article class="card">
      <div class="player-top">
        <img src="${card.joueur.imageUrl}" alt="${escapeHtml(card.joueur.nom)}" onerror="this.src='https://placehold.co/72x72?text=Player'" />
        <div>
          <strong>${escapeHtml(card.joueur.nom)}</strong>
          <div class="small muted">${card.joueur.club || ''}</div>
        </div>
      </div>
      <div class="tags">
        <span class="tag">${card.joueur.poste}</span>
        <span class="tag">${card.joueur.qualite}</span>
        <span class="tag">${card.joueur.note}</span>
      </div>
      <div class="small muted">${card.joueur.nationalite || ''}</div>
    </article>
  `;
}

function renderOwnedCardHtml(card) {
  const sellDisabled = card.nonEchangeable || card.enEquipe || card.enVente;
  let sellReason = '';
  if (card.nonEchangeable) sellReason = 'Non échangeable';
  else if (card.enEquipe) sellReason = 'Déjà dans l’équipe';
  else if (card.enVente) sellReason = 'Déjà en vente';

  return `
    <article class="card">
      ${renderCardHtml(card)}
      <div class="tags">
        ${card.nonEchangeable ? '<span class="tag">Starter</span>' : ''}
        ${card.enEquipe ? '<span class="tag">En équipe</span>' : ''}
        ${card.enVente ? '<span class="tag">En vente</span>' : ''}
      </div>
      <div class="actions">
        <button data-add-team="${card.id}" data-poste="${card.joueur.poste}" ${card.enEquipe || card.enVente ? 'disabled' : ''}>Ajouter à l’équipe</button>
        <button class="warning" data-sell-card="${card.id}" ${sellDisabled ? 'disabled' : ''}>Vendre</button>
      </div>
      ${sellReason ? `<div class="small muted">${sellReason}</div>` : ''}
    </article>
  `;
}

function renderTeamColumn(title, cards) {
  return `
    <div class="column">
      <h3>${title}</h3>
      ${cards.length ? cards.map(card => `
        <div class="card">
          ${renderCardHtml(card)}
          <div class="actions">
            <button class="danger" data-remove-team="${card.id}">Retirer</button>
          </div>
        </div>
      `).join('') : '<div class="empty">Aucun joueur</div>'}
    </div>
  `;
}

function renderMarketHtml(listing) {
  const mine = state.user && listing.vendeurId === state.user.id;
  return `
    <article class="card">
      ${renderCardHtml(listing.carte)}
      <div class="small muted">Vendeur : ${escapeHtml(listing.vendeurPseudo)}</div>
      <div class="market-price">${listing.prix} crédits</div>
      <div class="actions">
        ${mine
          ? `<button class="secondary" data-cancel-listing="${listing.id}">Retirer l’annonce</button>`
          : `<button class="success" data-buy="${listing.id}">Acheter</button>`}
      </div>
    </article>
  `;
}

async function openPack(packId) {
  try {
    const data = await fetchJSON(`/api/packs/${packId}/open`, { method: 'POST' });
    state.lastPack = data.cards;
    await loadAll();
    switchTab('packs');
    showMessage(data.message, 'success');
  } catch (error) {
    showMessage(error.message, 'error');
  }
}

async function addToTeam(cardId, poste) {
  try {
    state.team = await fetchJSON('/api/team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ carteId: cardId, poste })
    });
    state.cards = await fetchJSON('/api/cards');
    renderCards();
    renderTeam();
    showMessage('Carte ajoutée à l’équipe.', 'success');
  } catch (error) {
    showMessage(error.message, 'error');
  }
}

async function removeFromTeam(cardId) {
  try {
    state.team = await fetchJSON(`/api/team/${cardId}`, { method: 'DELETE' });
    state.cards = await fetchJSON('/api/cards');
    renderCards();
    renderTeam();
    showMessage('Carte retirée de l’équipe.', 'success');
  } catch (error) {
    showMessage(error.message, 'error');
  }
}

async function sellCard(cardId) {
  const price = prompt('Prix de vente ?');
  if (!price) return;

  try {
    const data = await fetchJSON('/api/market', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ carteId: cardId, prix: Number(price) })
    });
    await loadAll();
    switchTab('market');
    showMessage(data.message, 'success');
  } catch (error) {
    showMessage(error.message, 'error');
  }
}

async function cancelListing(id) {
  try {
    const data = await fetchJSON(`/api/market/${id}`, { method: 'DELETE' });
    await loadAll();
    showMessage(data.message, 'success');
  } catch (error) {
    showMessage(error.message, 'error');
  }
}

async function buyListing(id) {
  try {
    const data = await fetchJSON(`/api/market/${id}/buy`, { method: 'POST' });
    await loadAll();
    showMessage(data.message, 'success');
  } catch (error) {
    showMessage(error.message, 'error');
  }
}

async function fetchJSON(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'Erreur');
  }
  return data;
}

function showMessage(text, type) {
  messageBox.textContent = text;
  messageBox.className = `message ${type}`;
  messageBox.classList.remove('hidden');
  clearTimeout(showMessage.timer);
  showMessage.timer = setTimeout(() => {
    messageBox.classList.add('hidden');
  }, 3000);
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
