let selectedBenchCardId = null;
let cachedCards = [];
let cachedTeam = null;
let draggedCardId = null;
let draggedFromTeam = false;
let benchSearchValue = '';
let benchPositionValue = 'all';
let compositionRefreshTimer = null;
let compositionRequestInFlight = false;
const COMPOSITION_REFRESH_MS = 4000;

function escapeHtml(value) {
    return String(value || '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

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

function renderBenchCard(carte) {
    const selectedClass = selectedBenchCardId === carte.id ? ' selected' : '';
    return `
        <div class="bench-player-card${selectedClass}"
             data-id="${carte.id}"
             data-poste="${carte.joueur.poste}"
             draggable="true">
            <div class="rating">${carte.joueur.note}</div>
            <img src="${getPlayerImageSrc(carte.joueur)}" alt="${escapeHtml(carte.joueur.nom)}"
                 onerror="this.onerror=null; this.src=getFallbackPlayerImageSrc();">
            <div class="info">
                <span class="name">${escapeHtml(carte.joueur.nom)}</span>
                <span class="pos">${escapeHtml(carte.joueur.poste)}</span>
            </div>
        </div>
    `;
}

function renderSlot(carte, poste) {
    if (!carte) {
        return `<div class="slot-placeholder">${escapeHtml(poste)}</div>`;
    }

    return `
        <div class="slot-card" data-carte-id="${carte.id}" data-poste="${carte.joueur.poste}" draggable="true">
            <div class="rating">${carte.joueur.note}</div>
            <img src="${getPlayerImageSrc(carte.joueur)}" alt="${escapeHtml(carte.joueur.nom)}"
                 onerror="this.onerror=null; this.src=getFallbackPlayerImageSrc();">
            <div class="info">
                <span class="name">${escapeHtml(carte.joueur.nom)}</span>
                <span class="pos">${escapeHtml(carte.joueur.poste)}</span>
            </div>
            <button class="slot-remove" data-carte-id="${carte.id}" type="button" title="Retirer de l'équipe">Retirer</button>
        </div>
    `;
}

function getPosteFromSlot(slot) {
    return String(slot.dataset.position || '').replace(/[0-9]/g, '');
}

function fillSlots(cards, selector) {
    const slots = document.querySelectorAll(selector);
    slots.forEach((slot, index) => {
        const poste = getPosteFromSlot(slot);
        const carte = cards[index];
        slot.dataset.carteId = carte ? String(carte.id) : '';
        slot.innerHTML = renderSlot(carte, poste);
    });
}

function getTeamCards() {
    return [
        ...(cachedTeam?.attaquants || []),
        ...(cachedTeam?.milieux || []),
        ...(cachedTeam?.defenseurs || []),
        ...(cachedTeam?.gardiens || [])
    ];
}

function getCardById(cardId) {
    return cachedCards.find(card => Number(card.id) === Number(cardId))
        || getTeamCards().find(card => Number(card.id) === Number(cardId))
        || null;
}

function getBenchCards() {
    const teamIds = new Set(getTeamCards().map(c => c.id));
    return cachedCards.filter(c => !teamIds.has(c.id));
}

function getFilteredBenchCards() {
    return getBenchCards().filter(card => {
        const matchesSearch = !benchSearchValue || card.joueur.nom.toLowerCase().includes(benchSearchValue);
        const matchesPosition = benchPositionValue === 'all' || card.joueur.poste === benchPositionValue;
        return matchesSearch && matchesPosition;
    });
}

function refreshBench() {
    const bench = getFilteredBenchCards();
    const benchNode = document.querySelector('.bench-players');

    if (!bench.length) {
        benchNode.innerHTML = '<div class="bench-empty">Aucun joueur ne correspond au filtre.</div>';
        return;
    }

    benchNode.innerHTML = bench.map(renderBenchCard).join('');
}

function clearDragState() {
    draggedCardId = null;
    draggedFromTeam = false;
    document.querySelectorAll('.drag-over, .drag-invalid, .drag-source').forEach(el => {
        el.classList.remove('drag-over', 'drag-invalid', 'drag-source');
    });
}

function markSlotState(slot, isValid) {
    slot.classList.remove('drag-over', 'drag-invalid');
    slot.classList.add(isValid ? 'drag-over' : 'drag-invalid');
}

function isDropValidOnSlot(slot, card) {
    if (!slot || !card) return false;
    return card.joueur.poste === getPosteFromSlot(slot);
}

async function addCardToTeam(carteId, poste) {
    const res = await fetch('/api/moi/equipe/cartes', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ carteId, poste })
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(data.message || 'Impossible d’ajouter cette carte');
    }

    return data;
}

async function removeFromTeam(carteId) {
    const res = await fetch(`/api/moi/equipe/cartes/${carteId}`, {
        method: 'DELETE',
        credentials: 'same-origin'
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(data.message || 'Impossible de retirer cette carte');
    }

    return data;
}

async function assignCardToSlot(carteId, slot) {
    const poste = getPosteFromSlot(slot);
    const selectedCard = getCardById(carteId);

    if (!selectedCard) {
        alert('Carte introuvable');
        return;
    }

    if (!isDropValidOnSlot(slot, selectedCard)) {
        alert(`Cette carte est ${selectedCard.joueur.poste}, elle ne peut pas aller en ${poste}`);
        return;
    }

    const occupantId = Number(slot.dataset.carteId || 0);

    try {
        if (!occupantId) {
            await addCardToTeam(carteId, poste);
        } else if (occupantId === Number(carteId)) {
            return;
        } else {
            const occupantCard = getCardById(occupantId);
            await removeFromTeam(occupantId);
            try {
                await addCardToTeam(carteId, poste);
            } catch (error) {
                if (occupantCard) {
                    try {
                        await addCardToTeam(occupantCard.id, occupantCard.joueur.poste);
                    } catch (rollbackError) {
                        console.error('Rollback impossible après échec du swap :', rollbackError);
                    }
                }
                throw error;
            }
        }

        selectedBenchCardId = null;
        await loadData();
    } catch (error) {
        console.error(error);
        alert(error.message || 'Erreur réseau');
    }
}

function handleDocumentClick(event) {
    const removeBtn = event.target.closest('.slot-remove');
    if (removeBtn) {
        removeFromTeam(Number(removeBtn.dataset.carteId))
            .then(() => loadData())
            .catch(error => {
                console.error(error);
                alert(error.message || 'Erreur réseau');
            });
        return;
    }

    const benchCard = event.target.closest('.bench-player-card');
    if (benchCard) {
        selectedBenchCardId = Number(benchCard.dataset.id);
        refreshBench();
        return;
    }

    const slot = event.target.closest('.slot');
    if (slot && selectedBenchCardId) {
        assignCardToSlot(selectedBenchCardId, slot);
    }
}

function handleDragStart(event) {
    const benchCard = event.target.closest('.bench-player-card');
    if (benchCard) {
        draggedCardId = Number(benchCard.dataset.id);
        draggedFromTeam = false;
        selectedBenchCardId = draggedCardId;
        benchCard.classList.add('drag-source', 'selected');
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', String(draggedCardId));
        return;
    }

    const slotCard = event.target.closest('.slot-card');
    if (slotCard) {
        draggedCardId = Number(slotCard.dataset.carteId);
        draggedFromTeam = true;
        slotCard.classList.add('drag-source');
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', String(draggedCardId));
    }
}

function handleDragOver(event) {
    const slot = event.target.closest('.slot');
    if (slot) {
        event.preventDefault();
        const card = getCardById(draggedCardId);
        const isValid = isDropValidOnSlot(slot, card);
        event.dataTransfer.dropEffect = isValid ? 'move' : 'none';
        markSlotState(slot, isValid);
        return;
    }

    const benchPlayers = event.target.closest('.bench-players');
    if (benchPlayers && draggedFromTeam) {
        event.preventDefault();
        benchPlayers.classList.add('drag-over');
    }
}

function handleDragLeave(event) {
    const slot = event.target.closest('.slot');
    if (slot && !slot.contains(event.relatedTarget)) {
        slot.classList.remove('drag-over', 'drag-invalid');
        return;
    }

    const benchPlayers = event.target.closest('.bench-players');
    if (benchPlayers && !benchPlayers.contains(event.relatedTarget)) {
        benchPlayers.classList.remove('drag-over');
    }
}

async function handleDrop(event) {
    const slot = event.target.closest('.slot');
    if (slot) {
        event.preventDefault();
        const cardId = Number(event.dataTransfer.getData('text/plain') || draggedCardId || 0);
        clearDragState();
        if (!cardId) return;
        await assignCardToSlot(cardId, slot);
        return;
    }

    const benchPlayers = event.target.closest('.bench-players');
    if (benchPlayers && draggedFromTeam) {
        event.preventDefault();
        const cardId = Number(event.dataTransfer.getData('text/plain') || draggedCardId || 0);
        clearDragState();
        if (!cardId) return;
        try {
            await removeFromTeam(cardId);
            await loadData();
        } catch (error) {
            console.error(error);
            alert(error.message || 'Erreur réseau');
        }
    }
}

function handleDragEnd() {
    clearDragState();
}

async function loadData(options = {}) {
    const { silent = false } = options;
    if (compositionRequestInFlight || draggedCardId) return;
    compositionRequestInFlight = true;

    try {
        const [teamRes, cardsRes] = await Promise.all([
            fetch('/api/moi/equipe', { credentials: 'same-origin', cache: 'no-store' }),
            fetch('/api/moi/cartes', { credentials: 'same-origin', cache: 'no-store' })
        ]);

        if (!teamRes.ok || !cardsRes.ok) {
            if (teamRes.status === 401 || cardsRes.status === 401) {
                window.location.href = '/login';
            }
            return;
        }

        cachedTeam = await teamRes.json();
        cachedCards = await cardsRes.json();

        fillSlots(cachedTeam.attaquants || [], '.ligne.attaque .slot');
        fillSlots(cachedTeam.milieux || [], '.ligne.milieu .slot');
        fillSlots(cachedTeam.defenseurs || [], '.ligne.defense .slot');
        fillSlots(cachedTeam.gardiens || [], '.ligne.gardien .slot');
        refreshBench();
    } catch (error) {
        console.error('Erreur chargement composition :', error);
        if (!silent) alert('Impossible de charger la composition');
    } finally {
        compositionRequestInFlight = false;
    }
}

function startCompositionAutoRefresh() {
    if (compositionRefreshTimer) clearInterval(compositionRefreshTimer);
    compositionRefreshTimer = setInterval(() => loadData({ silent: true }), COMPOSITION_REFRESH_MS);
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            loadData({ silent: true });
        }
    });
}

(function injectStyles() {
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
    benchSearchValue = event.target.value.trim().toLowerCase();
    refreshBench();
});

document.getElementById('benchPosition')?.addEventListener('change', (event) => {
    benchPositionValue = event.target.value;
    refreshBench();
});

document.addEventListener('click', handleDocumentClick);
document.addEventListener('dragstart', handleDragStart);
document.addEventListener('dragover', handleDragOver);
document.addEventListener('dragleave', handleDragLeave);
document.addEventListener('drop', handleDrop);
document.addEventListener('dragend', handleDragEnd);

loadData().catch(err => console.error(err));
startCompositionAutoRefresh();
