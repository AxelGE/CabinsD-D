const mongoose = require('mongoose');
const { abilityScores, skills } = require('../config/constants');

const characterSchema = new mongoose.Schema({
    // Basic Info
    name: { type: String, required: true },
    race: { type: String, required: true },
    class: { type: String, required: true },
    level: { type: Number, default: 1 },
    background: String,
    alignment: String,
    experience: { type: Number, default: 0 },
    
    // Core Stats
    abilities: {
        strength: { type: Number, default: 10 },
        dexterity: { type: Number, default: 10 },
        constitution: { type: Number, default: 10 },
        intelligence: { type: Number, default: 10 },
        wisdom: { type: Number, default: 10 },
        charisma: { type: Number, default: 10 }
    },
    
    // Combat Stats
    hp: {
        current: { type: Number, required: true },
        max: { type: Number, required: true },
        temporary: { type: Number, default: 0 }
    },
    hitDice: String,
    ac: { type: Number, default: 10 },
    initiative: { type: Number, default: 0 },
    speed: { type: Number, default: 30 },
    
    // Proficiencies
    proficiencyBonus: { type: Number, default: 2 },
    savingThrows: [String],
    skills: [{
        name: String,
        proficient: Boolean,
        expertise: Boolean
    }],
    
    // Features & Traits
    features: [String],
    traits: [String],
    languages: [String],
    
    // Equipment
    inventory: [{
        item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
        quantity: { type: Number, default: 1 },
        equipped: Boolean
    }],
    currency: {
        cp: { type: Number, default: 0 },
        sp: { type: Number, default: 0 },
        ep: { type: Number, default: 0 },
        gp: { type: Number, default: 0 },
        pp: { type: Number, default: 0 }
    },
    
    // Spells
    spellcastingAbility: String,
    spells: [{
        spell: { type: mongoose.Schema.Types.ObjectId, ref: 'Spell' },
        prepared: Boolean
    }],
    spellSlots: [{
        level: Number,
        max: Number,
        remaining: Number
    }],
    
    // Meta
    description: String,
    backstory: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
});

// Calculate skill modifiers
characterSchema.methods.getSkillModifier = function(skillName) {
    const skill = skills.find(s => s.name === skillName);
    if (!skill) return 0;
    
    const abilityMod = Math.floor((this.abilities[skill.ability] - 10) / 2);
    const skillData = this.skills.find(s => s.name === skillName);
    
    let modifier = abilityMod;
    if (skillData) {
        if (skillData.expertise) modifier += this.proficiencyBonus * 2;
        else if (skillData.proficient) modifier += this.proficiencyBonus;
    }
    
    return modifier;
};

module.exports = mongoose.model('Character', characterSchema);