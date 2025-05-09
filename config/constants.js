module.exports = {
    abilityScores: ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'],
    
    skills: [
        { name: 'Acrobatics', ability: 'dexterity' },
        { name: 'Animal Handling', ability: 'wisdom' },
        { name: 'Arcana', ability: 'intelligence' },
        { name: 'Athletics', ability: 'strength' },
        { name: 'Deception', ability: 'charisma' },
        { name: 'History', ability: 'intelligence' },
        { name: 'Insight', ability: 'wisdom' },
        { name: 'Intimidation', ability: 'charisma' },
        { name: 'Investigation', ability: 'intelligence' },
        { name: 'Medicine', ability: 'wisdom' },
        { name: 'Nature', ability: 'intelligence' },
        { name: 'Perception', ability: 'wisdom' },
        { name: 'Performance', ability: 'charisma' },
        { name: 'Persuasion', ability: 'charisma' },
        { name: 'Religion', ability: 'intelligence' },
        { name: 'Sleight of Hand', ability: 'dexterity' },
        { name: 'Stealth', ability: 'dexterity' },
        { name: 'Survival', ability: 'wisdom' }
    ],
    
    conditions: [
        'Blinded', 'Charmed', 'Deafened', 'Exhaustion', 'Frightened',
        'Grappled', 'Incapacitated', 'Invisible', 'Paralyzed', 'Petrified',
        'Poisoned', 'Prone', 'Restrained', 'Stunned', 'Unconscious'
    ],
    
    weaponProperties: [
        'Ammunition', 'Finesse', 'Heavy', 'Light', 'Loading',
        'Range', 'Reach', 'Special', 'Thrown', 'Two-Handed', 'Versatile'
    ],
    
    damageTypes: [
        'Acid', 'Bludgeoning', 'Cold', 'Fire', 'Force',
        'Lightning', 'Necrotic', 'Piercing', 'Poison',
        'Psychic', 'Radiant', 'Slashing', 'Thunder'
    ]
};