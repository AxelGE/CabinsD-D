// Calculate ability modifiers
function calculateModifiers(stats) {
  return {
    strength: Math.floor((stats.strength - 10) / 2),
    dexterity: Math.floor((stats.dexterity - 10) / 2),
    constitution: Math.floor((stats.constitution - 10) / 2),
    intelligence: Math.floor((stats.intelligence - 10) / 2),
    wisdom: Math.floor((stats.wisdom - 10) / 2),
    charisma: Math.floor((stats.charisma - 10) / 2)
  };
}

// Generate skills based on class and modifiers
function generateSkills(charClass, modifiers) {
  const allSkills = {
    acrobatics: { ability: 'dexterity', proficient: false },
    animalHandling: { ability: 'wisdom', proficient: false },
    arcana: { ability: 'intelligence', proficient: false },
    athletics: { ability: 'strength', proficient: false },
    deception: { ability: 'charisma', proficient: false },
    history: { ability: 'intelligence', proficient: false },
    insight: { ability: 'wisdom', proficient: false },
    intimidation: { ability: 'charisma', proficient: false },
    investigation: { ability: 'intelligence', proficient: false },
    medicine: { ability: 'wisdom', proficient: false },
    nature: { ability: 'intelligence', proficient: false },
    perception: { ability: 'wisdom', proficient: false },
    performance: { ability: 'charisma', proficient: false },
    persuasion: { ability: 'charisma', proficient: false },
    religion: { ability: 'intelligence', proficient: false },
    sleightOfHand: { ability: 'dexterity', proficient: false },
    stealth: { ability: 'dexterity', proficient: false },
    survival: { ability: 'wisdom', proficient: false }
  };

  // Set class-specific proficiencies
  switch (charClass.toLowerCase()) {
    case 'rogue':
      allSkills.acrobatics.proficient = true;
      allSkills.stealth.proficient = true;
      allSkills.sleightOfHand.proficient = true;
      break;
    case 'wizard':
      allSkills.arcana.proficient = true;
      allSkills.history.proficient = true;
      break;
    case 'cleric':
      allSkills.insight.proficient = true;
      allSkills.religion.proficient = true;
      break;
    // Add other class cases
  }

  return allSkills;
}

// Generate random NPC
function generateRandomNPC(type = 'commoner') {
  const npcTypes = {
    commoner: {
      stats: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
      hp: 4,
      features: []
    },
    guard: {
      stats: { str: 13, dex: 12, con: 12, int: 10, wis: 11, cha: 10 },
      hp: 11,
      features: ['Martial Training']
    },
    // Add more NPC types
  };

  const npc = npcTypes[type] || npcTypes.commoner;
  const races = ['Human', 'Elf', 'Dwarf', 'Halfling'];
  const genders = ['Male', 'Female', 'Non-binary'];
  
  return {
    name: `${races[Math.floor(Math.random() * races.length)]} ${type}`,
    race: races[Math.floor(Math.random() * races.length)],
    gender: genders[Math.floor(Math.random() * genders.length)],
    stats: npc.stats,
    hp: npc.hp,
    features: npc.features,
    description: `A ${type} going about their business.`
  };
}

// Generate random loot
function generateRandomLoot(cr = 0) {
  const lootTables = {
    0: ['1d6 cp', '1d6 sp', 'Simple weapon'],
    1: ['1d6 sp', '1d6 ep', 'Potion of healing'],
    // Add more loot tables
  };

  const table = lootTables[Math.min(cr, 5)] || lootTables[0];
  return table[Math.floor(Math.random() * table.length)];
}

module.exports = {
  calculateModifiers,
  generateSkills,
  generateRandomNPC,
  generateRandomLoot
};