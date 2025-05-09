const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
    name: { type: String, required: true },
    type: { 
        type: String, 
        enum: ['weapon', 'armor', 'potion', 'scroll', 'wand', 'wondrous item', 'gear', 'tool', 'consumable'],
        required: true
    },
    rarity: {
        type: String,
        enum: ['common', 'uncommon', 'rare', 'very rare', 'legendary', 'artifact'],
        default: 'common'
    },
    weight: { type: Number, default: 0 },
    value: { type: Number, default: 0 }, // in copper pieces
    description: String,
    
    // Weapon properties
    weaponCategory: String,
    damage: String,
    damageType: String,
    properties: [String],
    
    // Armor properties
    armorCategory: String,
    armorClass: String,
    strengthRequirement: Number,
    stealthDisadvantage: Boolean,
    
    // Magic properties
    attunement: Boolean,
    charges: Number,
    effects: [String],
    
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Item', itemSchema);