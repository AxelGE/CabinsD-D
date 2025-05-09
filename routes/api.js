const express = require('express');
const router = express.Router();
const { generateRandomNPC, generateRandomLoot } = require('../utils/characterUtils');

// Get character data
router.get('/characters/:id', (req, res) => {
  db.get(
    `SELECT c.*, u.username 
     FROM characters c 
     JOIN users u ON c.user_id = u.id 
     WHERE c.id = ?`,
    [req.params.id],
    (err, character) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!character) return res.status(404).json({ error: 'Character not found' });
      
      // Parse JSON fields
      character.stats = JSON.parse(character.stats);
      character.skills = JSON.parse(character.skills);
      character.inventory = JSON.parse(character.inventory);
      character.abilities = JSON.parse(character.abilities);
      character.spells = JSON.parse(character.spells);
      character.features = JSON.parse(character.features);
      
      res.json(character);
    }
  );
});

// Get campaign data
router.get('/campaigns/:id', (req, res) => {
  db.get(
    `SELECT c.*, u.username as dm_name 
     FROM campaigns c 
     JOIN users u ON c.dm_id = u.id 
     WHERE c.id = ?`,
    [req.params.id],
    (err, campaign) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
      
      campaign.current_state = JSON.parse(campaign.current_state);
      res.json(campaign);
    }
  );
});

// Get spell data
router.get('/spells/:name', (req, res) => {
  // In a real app, you'd query a spells database
  // Here's a mock response
  const mockSpells = {
    'fireball': {
      name: 'Fireball',
      level: 3,
      school: 'Evocation',
      castingTime: '1 action',
      range: '150 feet',
      components: 'V, S, M (a tiny ball of bat guano and sulfur)',
      duration: 'Instantaneous',
      description: 'A bright streak flashes from your pointing finger...',
      classes: ['Wizard', 'Sorcerer']
    }
    // Add more spells
  };
  
  const spell = mockSpells[req.params.name.toLowerCase()];
  if (!spell) return res.status(404).json({ error: 'Spell not found' });
  res.json(spell);
});

// Generate random NPC
router.get('/npcs/random', (req, res) => {
  const { type } = req.query;
  const npc = generateRandomNPC(type);
  res.json(npc);
});

// Generate random loot
router.get('/loot/random', (req, res) => {
  const { cr } = req.query;
  const loot = generateRandomLoot(parseInt(cr) || 0);
  res.json({ loot });
});

// Search rules
router.get('/rules', (req, res) => {
  const { q } = req.query;
  // In a real app, you'd search a rules database
  // Here's a mock response
  const mockRules = {
    'grapple': {
      title: 'Grappling',
      content: 'When you want to grab a creature or wrestle with it...',
      source: 'PHB p.195'
    }
    // Add more rules
  };
  
  if (!q) return res.status(400).json({ error: 'Search query required' });
  
  const rule = mockRules[q.toLowerCase()];
  if (!rule) return res.status(404).json({ error: 'Rule not found' });
  res.json(rule);
});

module.exports = router;