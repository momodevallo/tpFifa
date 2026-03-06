document.addEventListener('DOMContentLoaded', function() {
    // Configuration des positions valides pour chaque slot
    const positionSlots = {
        'ATT1': ['ATT'],
        'ATT2': ['ATT'],
        'MIL1': ['MIL'],
        'MIL2': ['MIL'],
        'MIL3': ['MIL'],
        'MIL4': ['MIL'],
        'DEF1': ['DEF'],
        'DEF2': ['DEF'],
        'DEF3': ['DEF'],
        'DEF4': ['DEF'],
        'GB1': ['GB']
    };

    // État actuel de la composition
    let currentComposition = {};

    // Initialiser les joueurs draggables
    function initDraggablePlayers() {
        const players = document.querySelectorAll('.bench-player-card');
        players.forEach(player => {
            player.draggable = true;
            player.addEventListener('dragstart', handleDragStart);
            player.addEventListener('dragend', handleDragEnd);
        });
    }

    // Initialiser les slots droppables
    function initDroppableSlots() {
        const slots = document.querySelectorAll('.slot');
        slots.forEach(slot => {
            slot.addEventListener('dragover', handleDragOver);
            slot.addEventListener('drop', handleDrop);
            slot.addEventListener('dragleave', handleDragLeave);
        });
    }

    // Gestionnaires d'événements pour le drag
    function handleDragStart(e) {
        const playerData = {
            id: this.dataset.id,
            name: this.querySelector('.name').textContent,
            position: this.querySelector('.pos').textContent,
            rating: this.querySelector('.rating').textContent,
            image: this.querySelector('img').src
        };
        
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', JSON.stringify(playerData));
        this.classList.add('dragging');
    }

    function handleDragEnd(e) {
        this.classList.remove('dragging');
    }

    function handleDragOver(e) {
        e.preventDefault();
        const slot = this;
        const playerData = JSON.parse(e.dataTransfer.getData('text/plain'));
        
        // Vérifier si le joueur peut être placé dans ce slot
        if (canPlayerFitSlot(playerData.position, slot.dataset.position)) {
            slot.classList.add('valid-drop');
            e.dataTransfer.dropEffect = 'move';
        } else {
            slot.classList.add('invalid-drop');
            e.dataTransfer.dropEffect = 'none';
        }
    }

    function handleDragLeave(e) {
        this.classList.remove('valid-drop', 'invalid-drop');
    }

    function handleDrop(e) {
        e.preventDefault();
        const slot = this;
        const playerData = JSON.parse(e.dataTransfer.getData('text/plain'));
        
        slot.classList.remove('valid-drop', 'invalid-drop');
        
        // Vérifier si le joueur peut être placé dans ce slot
        if (!canPlayerFitSlot(playerData.position, slot.dataset.position)) {
            showNotification('Ce joueur ne peut pas jouer à ce poste !', 'error');
            return;
        }
        
        // Si le slot est déjà occupé, remettre l'ancien joueur dans le banc
        if (slot.querySelector('.player-in-slot')) {
            const oldPlayer = slot.querySelector('.player-in-slot');
            returnPlayerToBench(oldPlayer);
        }
        
        // Placer le joueur dans le slot
        placePlayerInSlot(slot, playerData);
        
        // Retirer le joueur du banc
        const benchPlayer = document.querySelector(`.bench-player-card[data-id="${playerData.id}"]`);
        if (benchPlayer) {
            benchPlayer.style.display = 'none';
        }
        
        showNotification(`${playerData.name} placé au poste !`, 'success');
    }

    // Vérifier si un joueur peut être placé dans un slot
    function canPlayerFitSlot(playerPosition, slotPosition) {
        const validPositions = positionSlots[slotPosition];
        return validPositions && validPositions.includes(playerPosition);
    }

    // Placer un joueur dans un slot
    function placePlayerInSlot(slot, playerData) {
        slot.innerHTML = `
            <div class="player-in-slot" data-id="${playerData.id}" data-position="${playerData.position}">
                <div class="rating">${playerData.rating}</div>
                <img src="${playerData.image}" alt="${playerData.name}">
                <div class="info">
                    <span class="name">${playerData.name}</span>
                    <span class="pos">${playerData.position}</span>
                </div>
                <button class="btn-remove" onclick="removePlayerFromSlot('${slot.dataset.position}')">×</button>
            </div>
        `;
        
        currentComposition[slot.dataset.position] = playerData;
    }

    // Retirer un joueur d'un slot
    function removePlayerFromSlot(slotPosition) {
        const slot = document.querySelector(`[data-position="${slotPosition}"]`);
        const playerInSlot = slot.querySelector('.player-in-slot');
        
        if (playerInSlot) {
            returnPlayerToBench(playerInSlot);
            slot.innerHTML = slotPosition.replace(/[0-9]/, '');
            delete currentComposition[slotPosition];
        }
    }

    // Remettre un joueur dans le banc
    function returnPlayerToBench(playerElement) {
        const playerId = playerElement.dataset.id;
        const benchPlayer = document.querySelector(`.bench-player-card[data-id="${playerId}"]`);
        if (benchPlayer) {
            benchPlayer.style.display = 'flex';
        }
    }

    // Afficher une notification
    function showNotification(message, type) {
        // Créer l'élément de notification
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        // Ajouter au DOM
        document.body.appendChild(notification);
        
        // Animation d'entrée
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        // Retirer après 3 secondes
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    // Initialiser
    initDraggablePlayers();
    initDroppableSlots();
});

// Fonction globale pour retirer un joueur
window.removePlayerFromSlot = function(slotPosition) {
    const slot = document.querySelector(`[data-position="${slotPosition}"]`);
    const playerInSlot = slot.querySelector('.player-in-slot');
    
    if (playerInSlot) {
        const playerId = playerInSlot.dataset.id;
        const benchPlayer = document.querySelector(`.bench-player-card[data-id="${playerId}"]`);
        if (benchPlayer) {
            benchPlayer.style.display = 'flex';
        }
        
        slot.innerHTML = slotPosition.replace(/[0-9]/, '');
        delete currentComposition[slotPosition];
    }
};
