const express = require('express');
const router = express.Router();
const Character = require('../models/Character');
const { skills } = require('../config/constants');
const ensureAuthenticated = require('../middleware/auth');

// Create new character
router.post('/', ensureAuthenticated, async (req, res) => {
    try {
        const { name, race, class: charClass, background, alignment } = req.body;
        
        // Calculate HP based on class and constitution
        const conMod = Math.floor((parseInt(req.body.constitution) - 10) / 2;
        const baseHP = getBaseHP(charClass);
        const hp = baseHP + conMod;
        
        // Build skills array
        const characterSkills = skills.map(skill => ({
            name: skill.name,
            proficient: req.body.skills?.includes(skill.name) || false,
            expertise: false
        }));
        
        const newCharacter = new Character({
            name,
            race,
            class: charClass,
            level: 1,
            background,
            alignment,
            abilities: {
                strength: parseInt(req.body.strength),
                dexterity: parseInt(req.body.dexterity),
                constitution: parseInt(req.body.constitution),
                intelligence: parseInt(req.body.intelligence),
                wisdom: parseInt(req.body.wisdom),
                charisma: parseInt(req.body.charisma)
            },
            hp: {
                current: hp,
                max: hp
            },
            ac: 10 + Math.floor((parseInt(req.body.dexterity) - 10) / 2),
            skills: characterSkills,
            savingThrows: req.body.savingThrows || [],
            createdBy: req.user._id
        });
        
        await newCharacter.save();
        res.redirect('/characters');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// Helper function to get base HP by class
function getBaseHP(charClass) {
    const hpByClass = {
        'Barbarian': 12,
        'Fighter': 10,
        'Paladin': 10,
        'Ranger': 10,
        'Cleric': 8,
        'Druid': 8,
        'Monk': 8,
        'Rogue': 8,
        'Bard': 8,
        'Warlock': 8,
        'Sorcerer': 6,
        'Wizard': 6
    };
    return hpByClass[charClass] || 8;
}

module.exports = router;