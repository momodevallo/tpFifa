let selectedBenchCardId = null;
let cachedCards = [];
let cachedTeam = null;

function renderBenchCard(carte) {
    const selectedClass = selectedBenchCardId === carte.id ? ' selected' : '';
    return `
        <div class="bench-player-card${selectedClass}" data-id="${carte.id}" data-poste="${carte.joueur.poste}">
            <div class="rating">${carte.joueur.note}</div>
            <img src="${carte.joueur.imageUrl || ''}" alt="${carte.joueur.nom}">
            <div class="info">
                <span class="name">${carte.joueur.nom}</span>
                <span class="pos">${carte.joueur.poste}</span>
            </div>
        </div>
    `;
}

function renderSlot(carte, poste) {
    if (!carte) return `<div class="slot-placeholder">${poste}</div>`;
    return `
        <div class="rating">${carte.joueur.note}</div>
        <img src="${carte.joueur.imageUrl || ''}" alt="${carte.joueur.nom}">
        <div class="info">
            <span class="name">${carte.joueur.nom}</span>
            <span class="pos">${carte.joueur.poste}</span>
        </div>
        <button class="slot-remove" data-carte-id="${carte.id}" title="Retirer de l'équipe">✕</button>
    `;
}

function getPosteFromSlot(slot) {
    return slot.dataset.position.replace(/[0-9]/g, '');
}

function fillSlots(cards, selector) {
    const slots = document.querySelectorAll(selector);
    slots.forEach((slot, index) => {
        const poste = getPosteFromSlot(slot);
        const carte = cards[index];
        slot.dataset.carteId = carte ? carte.id : '';
        slot.innerHTML = renderSlot(carte, poste);
    });
}

function bindBench() {
    document.querySelectorAll('.bench-player-card').forEach(card => {
        card.addEventListener('click', () => {
            selectedBenchCardId = Number(card.dataset.id);
            refreshBench();
        });
    });
}

function bindSlots() {
    document.querySelectorAll('.slot').forEach(slot => {
        slot.addEventListener('click', async (event) => {
            const removeBtn = event.target.closest('.slot-remove');
            if (removeBtn) {
                await removeFromTeam(Number(removeBtn.dataset.carteId));
                return;
            }

            if (!selectedBenchCardId) return;

            const poste = getPosteFromSlot(slot);
            const selectedCard = cachedCards.find(c => c.id === selectedBenchCardId);
            if (!selectedCard) return;
            if (selectedCard.joueur.poste !== poste) {
                alert(`Cette carte est ${selectedCard.joueur.poste}, elle ne peut pas aller en ${poste}`);
                return;
            }

            try {
                const res = await fetch('/api/moi/equipe/cartes', {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ carteId: selectedBenchCardId, poste })
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) {
                    alert(data.message || 'Impossible d’ajouter cette carte');
                    return;
                }
                selectedBenchCardId = null;
                await loadData();
            } catch (e) {
                console.error(e);
                alert('Erreur réseau');
            }
        });
    });
}

async function removeFromTeam(carteId) {
    try {
        const res = await fetch(`/api/moi/equipe/cartes/${carteId}`, {
            method: 'DELETE',
            credentials: 'same-origin'
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            alert(data.message || 'Impossible de retirer cette carte');
            return;
        }
        await loadData();
    } catch (e) {
        console.error(e);
        alert('Erreur réseau');
    }
}

function refreshBench() {
    const teamIds = new Set([
        ...(cachedTeam?.attaquants || []),
        ...(cachedTeam?.milieux || []),
        ...(cachedTeam?.defenseurs || []),
        ...(cachedTeam?.gardiens || [])
    ].map(c => c.id));

    const bench = cachedCards.filter(c => !teamIds.has(c.id));
    document.querySelector('.bench-players').innerHTML = bench.map(renderBenchCard).join('');
    bindBench();
}

async function loadData() {
    const [teamRes, cardsRes] = await Promise.all([
        fetch('/api/moi/equipe', { credentials: 'same-origin' }),
        fetch('/api/moi/cartes', { credentials: 'same-origin' })
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
    bindSlots();
}

(function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .bench-player-card.selected { outline: 3px solid #ffd700; transform: scale(1.03); }
      .slot { position: relative; cursor: pointer; }
      .slot-remove {
        position:absolute; top:6px; right:6px; border:none; border-radius:50%;
        width:24px; height:24px; cursor:pointer; background:#e74c3c; color:white;
      }
      .slot-placeholder { font-weight:700; opacity:.8; }
    `;
    document.head.appendChild(style);
})();

loadData().catch(err => console.error(err));
