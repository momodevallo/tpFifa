let allCards = [];
let currentSearch = '';
let currentPosition = 'all';
let selectedSellCardId = null;

function getPlayerImageSrc(joueur) {
    if (!joueur) return '';
    if (joueur.id) return `/player-image/${joueur.id}`;
    return joueur.imageUrl || '';
}

function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function renderCards() {
    const filteredCards = allCards.filter(card => {
        const matchesSearch = !currentSearch || card.joueur.nom.toLowerCase().includes(currentSearch);
        const matchesPosition = currentPosition === 'all' || card.joueur.poste === currentPosition;
        return matchesSearch && matchesPosition;
    });

    document.getElementById('totalPlayers').textContent = allCards.length;

    const grid = document.querySelector('.players-grid');
    if (!filteredCards.length) {
        grid.innerHTML = '<div class="player-empty">Aucun joueur trouvé.</div>';
        return;
    }

    grid.innerHTML = filteredCards.map(card => `
        <div class="player-card" data-position="${card.joueur.poste}">
            <div class="rating">${card.joueur.note}</div>
            <img src="${getPlayerImageSrc(card.joueur)}" alt="${escapeHtml(card.joueur.nom)}"
                 onerror="this.onerror=null; this.src='https://placehold.co/120x120?text=J';">
            <div class="player-info">
                <span class="name">${escapeHtml(card.joueur.nom)}</span>
                <span class="position">${escapeHtml(card.joueur.poste)}</span>
                <span class="club">${escapeHtml(card.joueur.club || '')}</span>
            </div>
            ${card.nonEchangeable
                ? '<button class="btn-sell" disabled>Non échangeable</button>'
                : `<button class="btn-sell" onclick="openSellModal(${card.id})">Vendre</button>`}
        </div>
    `).join('');
}

async function loadMyCards() {
    const res = await fetch('/api/moi/cartes', { credentials: 'same-origin' });
    if (!res.ok) {
        if (res.status === 401) window.location.href = '/login';
        return;
    }

    allCards = await res.json();

    try {
        const creditsRes = await fetch('/api/moi/credits', { credentials: 'same-origin' });
        const credits = await creditsRes.json();
        const moneyNode = document.getElementById('money');
        if (moneyNode) {
            moneyNode.textContent = credits.credits;
        }
    } catch (_) {}

    renderCards();
}

function getSellModalElements() {
    return {
        modal: document.getElementById('sellModal'),
        playerBox: document.getElementById('sellModalPlayer'),
        priceInput: document.getElementById('sellPriceInput'),
        errorBox: document.getElementById('sellModalError'),
        confirmBtn: document.getElementById('sellModalConfirm'),
        cancelBtn: document.getElementById('sellModalCancel')
    };
}

function closeSellModal() {
    const { modal, playerBox, priceInput, errorBox, confirmBtn, cancelBtn } = getSellModalElements();

    selectedSellCardId = null;
    modal.classList.add('hidden');
    document.body.classList.remove('modal-open');
    playerBox.innerHTML = '';
    priceInput.value = '';
    errorBox.textContent = '';
    confirmBtn.disabled = false;
    cancelBtn.disabled = false;
}

function openSellModal(carteId) {
    const card = allCards.find(c => c.id === carteId);
    if (!card) return;

    const { modal, playerBox, priceInput, errorBox } = getSellModalElements();
    selectedSellCardId = carteId;

    const suggestedPrice = Math.max(100, Number(card.joueur.note || 0) * 10);

    playerBox.innerHTML = `
        <img src="${getPlayerImageSrc(card.joueur)}" alt="${escapeHtml(card.joueur.nom)}"
             onerror="this.onerror=null; this.src='https://placehold.co/64x64?text=J';">
        <div class="sell-modal__player-main">
            <span class="sell-modal__player-name">${escapeHtml(card.joueur.nom)}</span>
            <span class="sell-modal__player-meta">
                ${escapeHtml(card.joueur.poste || '-')} • ${escapeHtml(card.joueur.club || 'Club inconnu')} • Note ${escapeHtml(card.joueur.note ?? '-')}
            </span>
        </div>
    `;

    priceInput.value = suggestedPrice;
    errorBox.textContent = '';
    modal.classList.remove('hidden');
    document.body.classList.add('modal-open');

    setTimeout(() => {
        priceInput.focus();
        priceInput.select();
    }, 30);
}

async function confirmSell() {
    const { priceInput, errorBox, confirmBtn, cancelBtn } = getSellModalElements();

    if (!selectedSellCardId) return;

    const prix = Number(priceInput.value);

    if (!Number.isInteger(prix) || prix <= 0) {
        errorBox.textContent = 'Entre un prix entier supérieur à 0.';
        return;
    }

    confirmBtn.disabled = true;
    cancelBtn.disabled = true;
    errorBox.textContent = 'Mise en vente en cours...';

    try {
        const res = await fetch('/api/marketplace/annonces', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                carteId: selectedSellCardId,
                prix: prix
            })
        });

        let data;
        try {
            data = await res.json();
        } catch {
            data = null;
        }

        if (!res.ok) {
            throw new Error(data?.message || data?.error || 'Impossible de mettre en vente');
        }

        closeSellModal();
        await loadMyCards();
    } catch (error) {
        errorBox.textContent = error.message || 'Impossible de mettre en vente';
    } finally {
        confirmBtn.disabled = false;
        cancelBtn.disabled = false;
    }
}

window.openSellModal = openSellModal;

document.getElementById('search')?.addEventListener('input', (event) => {
    currentSearch = event.target.value.trim().toLowerCase();
    renderCards();
});

document.getElementById('filterPosition')?.addEventListener('change', (event) => {
    currentPosition = event.target.value;
    renderCards();
});

document.getElementById('sellModalConfirm')?.addEventListener('click', confirmSell);
document.getElementById('sellModalCancel')?.addEventListener('click', closeSellModal);

document.querySelectorAll('[data-close-sell-modal]').forEach(node => {
    node.addEventListener('click', closeSellModal);
});

document.getElementById('sellPriceInput')?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        confirmSell();
    }
});

document.addEventListener('keydown', (event) => {
    const modal = document.getElementById('sellModal');
    if (event.key === 'Escape' && modal && !modal.classList.contains('hidden')) {
        closeSellModal();
    }
});

loadMyCards();