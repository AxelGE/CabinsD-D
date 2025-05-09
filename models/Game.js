const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: String,
    dm: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    players: [{ 
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        character: { type: mongoose.Schema.Types.ObjectId, ref: 'Character' },
        initiative: { type: Number, default: 0 },
        statusEffects: [String]
    }],
    currentTurn: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    round: { type: Number, default: 0 },
    combat: {
        active: { type: Boolean, default: false },
        turnOrder: [{ 
            playerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            characterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Character' },
            initiative: Number
        }]
    },
    status: { 
        type: String, 
        enum: ['preparing', 'active', 'paused', 'completed'], 
        default: 'preparing' 
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Start combat and set initiative order
gameSchema.methods.startCombat = function() {
    this.combat.active = true;
    this.combat.turnOrder = this.players
        .map(player => ({
            playerId: player.user,
            characterId: player.character,
            initiative: player.initiative
        }))
        .sort((a, b) => b.initiative - a.initiative);
    
    this.currentTurn = this.combat.turnOrder[0].playerId;
    this.round = 1;
    return this.save();
};

// Advance to next turn
gameSchema.methods.nextTurn = function() {
    if (!this.combat.active) return Promise.resolve(this);
    
    const currentIndex = this.combat.turnOrder.findIndex(
        turn => turn.playerId.equals(this.currentTurn)
    );
    
    let nextIndex = currentIndex + 1;
    if (nextIndex >= this.combat.turnOrder.length) {
        nextIndex = 0;
        this.round += 1;
    }
    
    this.currentTurn = this.combat.turnOrder[nextIndex].playerId;
    return this.save();
};

module.exports = mongoose.model('Game', gameSchema);