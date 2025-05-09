document.addEventListener('DOMContentLoaded', function() {
    // Connect to Socket.io
    const socket = io();
    const gameId = '<%= game._id %>';
    const userId = '<%= user._id %>';
    const isDM = <%= user.role === 'dm' %>;
    const currentCharacterId = '<%= character?._id %>';
    
    // Join game room
    socket.emit('join-game', gameId);
    
    // DOM Elements
    const gameLog = document.getElementById('game-log');
    const chatMessage = document.getElementById('chat-message');
    const sendMessageBtn = document.getElementById('send-message');
    const oocCheck = document.getElementById('ooc-check');
    const diceButtons = document.querySelectorAll('.dice-btn');
    const rollCustomBtn = document.getElementById('roll-custom');
    const nextTurnBtn = document.getElementById('next-turn');
    const toggleCombatBtn = document.getElementById('toggle-combat');
    const dmTools = document.getElementById('dm-tools');
    const dmToolsToggle = document.getElementById('dm-tools-toggle');
    const applyHpBtn = document.getElementById('apply-hp');
    const hpModifier = document.getElementById('hp-modifier');
    const playerSelect = document.getElementById('player-select');
    const conditionSelect = document.getElementById('condition-select');
    const applyConditionBtn = document.getElementById('apply-condition');
    
    // Helper functions
    function addToLog(message, type = 'info') {
        const entry = document.createElement('div');
        entry.className = `log-entry log-${type}`;
        
        const timestamp = new Date().toLocaleTimeString();
        entry.innerHTML = `
            <span class="log-timestamp">[${timestamp}]</span>
            <span class="log-content">${message}</span>
        `;
        
        gameLog.appendChild(entry);
        gameLog.scrollTop = gameLog.scrollHeight;
    }
    
    function rollDice(count, sides, modifier = 0, description = '') {
        const rolls = [];
        let total = 0;
        
        for (let i = 0; i < count; i++) {
            const roll = Math.floor(Math.random() * sides) + 1;
            rolls.push(roll);
            total += roll;
        }
        
        total += modifier;
        
        let message = `Rolled ${count}d${sides}: ${rolls.join(', ')}`;
        if (modifier !== 0) {
            message += ` + ${modifier} = ${total}`;
        }
        if (description) {
            message = `${description} - ${message}`;
        }
        
        addToLog(message, 'dice');
        
        // Send to server
        socket.emit('dice-roll', {
            gameId,
            userId,
            count,
            sides,
            rolls,
            modifier,
            total,
            description
        });
        
        return total;
    }
    
    // Event Listeners
    
    // Chat system
    sendMessageBtn.addEventListener('click', function() {
        const message = chatMessage.value.trim();
        if (message) {
            const isOOC = oocCheck.checked;
            
            socket.emit('chat-message', {
                gameId,
                userId,
                message,
                isOOC
            });
            
            chatMessage.value = '';
        }
    });
    
    chatMessage.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendMessageBtn.click();
        }
    });
    
    // Dice rolling
    diceButtons.forEach(button => {
        button.addEventListener('click', function() {
            const sides = parseInt(this.getAttribute('data-sides'));
            rollDice(1, sides);
        });
    });
    
    rollCustomBtn.addEventListener('click', function() {
        const count = parseInt(document.getElementById('dice-count').value) || 1;
        const sides = parseInt(document.getElementById('dice-type').value) || 20;
        const modifier = parseInt(document.getElementById('roll-modifier').value) || 0;
        const description = document.getElementById('roll-description').value.trim();
        
        rollDice(count, sides, modifier, description);
    });
    
    // DM Tools
    if (dmToolsToggle) {
        dmToolsToggle.addEventListener('click', function() {
            dmTools.style.display = dmTools.style.display === 'none' ? 'block' : 'none';
        });
    }
    
    if (nextTurnBtn) {
        nextTurnBtn.addEventListener('click', function() {
            socket.emit('next-turn', gameId);
        });
    }
    
    if (toggleCombatBtn) {
        toggleCombatBtn.addEventListener('click', function() {
            const action = toggleCombatBtn.textContent.includes('Start') ? 'start' : 'end';
            socket.emit('toggle-combat', { gameId, action });
        });
    }
    
    if (applyHpBtn) {
        applyHpBtn.addEventListener('click', function() {
            const playerId = playerSelect.value;
            const change = parseInt(hpModifier.value);
            
            if (!isNaN(change)) {
                socket.emit('modify-hp', {
                    gameId,
                    playerId,
                    change
                });
                
                hpModifier.value = '';
            }
        });
    }
    
    if (applyConditionBtn) {
        applyConditionBtn.addEventListener('click', function() {
            const playerId = playerSelect.value;
            const condition = conditionSelect.value;
            
            if (condition) {
                socket.emit('modify-condition', {
                    gameId,
                    playerId,
                    condition,
                    action: 'add'
                });
                
                conditionSelect.value = '';
            }
        });
    }
    
    // Socket.io Event Listeners
    
    // Chat messages
    socket.on('chat-message', function(data) {
        const senderClass = data.userId === userId ? 'sender-me' : 'sender-other';
        const oocClass = data.isOOC ? 'ooc-message' : '';
        
        addToLog(`<span class="${senderClass} ${oocClass}">${data.senderName}:</span> ${data.message}`, 'chat');
    });
    
    // Dice rolls
    socket.on('dice-roll', function(data) {
        let message = `${data.senderName} rolled ${data.count}d${data.sides}: ${data.rolls.join(', ')}`;
        if (data.modifier !== 0) {
            message += ` + ${data.modifier} = ${data.total}`;
        }
        if (data.description) {
            message = `${data.description} - ${message}`;
        }
        
        addToLog(message, 'dice');
    });
    
    // Combat updates
    socket.on('combat-update', function(data) {
        if (data.round) {
            document.getElementById('combat-round').textContent = data.round;
        }
        
        if (data.currentTurn) {
            document.getElementById('current-turn').textContent = data.currentTurnName;
            
            // Update active turn in initiative list
            document.querySelectorAll('#initiative-list li').forEach(li => {
                li.classList.remove('active-turn');
                if (li.textContent.includes(data.currentTurnName)) {
                    li.classList.add('active-turn');
                }
            });
        }
        
        if (data.message) {
            addToLog(data.message, 'combat');
        }
    });
    
    // HP updates
    socket.on('hp-update', function(data) {
        addToLog(`${data.characterName}'s HP changed to ${data.currentHp}/${data.maxHp}`, 'combat');
        
        // Update your character's HP if it's you
        if (data.characterId === currentCharacterId) {
            document.querySelector('.stat-value').textContent = `${data.currentHp}/${data.maxHp}`;
        }
    });
    
    // Condition updates
    socket.on('condition-update', function(data) {
        const action = data.action === 'add' ? 'gained' : 'lost';
        addToLog(`${data.characterName} ${action} condition: ${data.condition}`, 'combat');
    });
    
    // Game state updates
    socket.on('game-state', function(data) {
        if (data.status === 'paused') {
            addToLog('Game has been paused by the DM', 'system');
        } else if (data.status === 'active') {
            addToLog('Game has been resumed by the DM', 'system');
        }
    });
    
    // Error handling
    socket.on('error', function(error) {
        addToLog(`Error: ${error.message}`, 'error');
    });
});