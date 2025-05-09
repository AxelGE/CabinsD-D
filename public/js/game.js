document.addEventListener('DOMContentLoaded', () => {
  // Initialize tooltips
  const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
  tooltipTriggerList.map((el) => new bootstrap.Tooltip(el));
  
  // Dice roller functionality
  document.querySelectorAll('.dice-roller button').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const sides = parseInt(e.target.dataset.sides);
      const result = Math.floor(Math.random() * sides) + 1;
      document.getElementById('dice-result').textContent = result;
      
      if (window.currentCampaignId) {
        socket.emit('dice-roll', {
          characterId: window.currentCharacterId,
          campaignId: window.currentCampaignId,
          sides,
          result
        });
      }
    });
  });
  
  // Health management
  document.getElementById('modify-health').addEventListener('click', () => {
    const amount = parseInt(document.getElementById('health-amount').value);
    const isDamage = document.getElementById('health-type').value === 'damage';
    const newHealth = isDamage 
      ? window.currentHP - amount 
      : window.currentHP + amount;
    
    // Update locally first for responsiveness
    document.getElementById('current-hp').textContent = Math.max(0, newHealth);
    const percent = (newHealth / window.maxHP) * 100;
    document.querySelector('.health-bar .progress-bar').style.width = `${percent}%`;
    
    // Send to server
    if (window.currentCampaignId) {
      socket.emit('update-health', {
        characterId: window.currentCharacterId,
        campaignId: window.currentCampaignId,
        newHealth: Math.max(0, newHealth),
        isDamage,
        amount,
        addToStory: document.getElementById('add-to-story').checked,
        dmId: window.isDM ? window.userId : null
      });
    }
  });
  
  // Inventory management
  document.getElementById('add-item').addEventListener('click', () => {
    const name = document.getElementById('item-name').value;
    const quantity = parseInt(document.getElementById('item-quantity').value) || 1;
    const description = document.getElementById('item-description').value;
    
    if (!name) return;
    
    const item = { name, quantity, description };
    const inventory = [...window.currentInventory, item];
    
    // Update locally
    renderInventory(inventory);
    
    // Send to server
    fetch(`/api/characters/${window.currentCharacterId}/inventory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inventory })
    }).then(res => res.json())
      .then(data => {
        if (data.error) console.error(data.error);
      });
  });
});

function renderInventory(inventory) {
  const container = document.getElementById('inventory-items');
  container.innerHTML = inventory.map(item => `
    <div class="inventory-item card mb-2">
      <div class="card-body">
        <h5 class="card-title">${item.name} <span class="badge bg-secondary">x${item.quantity}</span></h5>
        ${item.description ? `<p class="card-text">${item.description}</p>` : ''}
        <button class="btn btn-sm btn-danger" data-id="${item.name}">Remove</button>
      </div>
    </div>
  `).join('');
  
  // Add event listeners to remove buttons
  document.querySelectorAll('.inventory-item button').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const name = e.target.dataset.id;
      const inventory = window.currentInventory.filter(item => item.name !== name);
      renderInventory(inventory);
      
      // Send to server
      fetch(`/api/characters/${window.currentCharacterId}/inventory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inventory })
      }).then(res => res.json())
        .then(data => {
          if (data.error) console.error(data.error);
        });
    });
  });
  
  window.currentInventory = inventory;
}

// Socket.io listeners
if (typeof io !== 'undefined') {
  const socket = io();
  
  socket.on('dice-result', (data) => {
    const resultEl = document.createElement('div');
    resultEl.className = 'alert alert-info';
    resultEl.innerHTML = `
      <strong>${data.player}</strong> rolled a <strong>${data.dice}</strong>: 
      <span class="fw-bold">${data.result}</span>
      <small class="text-muted float-end">${new Date(data.timestamp).toLocaleTimeString()}</small>
    `;
    document.getElementById('dice-results').prepend(resultEl);
  });
  
  socket.on('health-updated', (data) => {
    if (data.characterId === window.currentCharacterId) {
      window.currentHP = data.newHealth;
      document.getElementById('current-hp').textContent = data.newHealth;
      const percent = (data.newHealth / window.maxHP) * 100;
      document.querySelector('.health-bar .progress-bar').style.width = `${percent}%`;
    }
    
    // Show notification
    const action = data.isDamage ? 'took' : 'healed';
    const notifEl = document.createElement('div');
    notifEl.className = 'alert alert-warning';
    notifEl.innerHTML = `
      <strong>${data.characterName}</strong> ${action} <strong>${data.amount}</strong> damage
      <small class="text-muted float-end">just now</small>
    `;
    document.getElementById('notifications').prepend(notifEl);
  });
  
  socket.on('story-entry-added', (entry) => {
    const entryEl = document.createElement('div');
    entryEl.className = 'story-entry card mb-3';
    entryEl.innerHTML = `
      <div class="card-body">
        <p class="card-text">${entry.content}</p>
        <p class="card-text">
          <small class="text-muted">
            Posted by <strong>${entry.username}</strong> 
            at ${new Date(entry.timestamp).toLocaleString()}
          </small>
        </p>
      </div>
    `;
    document.getElementById('story-container').prepend(entryEl);
  });
  
  socket.on('turn-changed', (data) => {
    // Highlight current turn
    document.querySelectorAll('.initiative-item').forEach(el => {
      el.classList.remove('bg-primary', 'text-white');
    });
    
    const currentTurnEl = document.querySelector(`.initiative-item[data-character-id="${data.current_turn}"]`);
    if (currentTurnEl) {
      currentTurnEl.classList.add('bg-primary', 'text-white');
    }
    
    // Update round counter
    document.getElementById('round-counter').textContent = data.round;
  });
}