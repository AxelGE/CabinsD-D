const express = require('express');
const router = express.Router();
const upload = require('../config/multer');
const { calculateModifiers, generateSkills } = require('../utils/characterUtils');

// Character creation form
router.get('/new', ensureAuthenticated, (req, res) => {
  res.render('characters/new', { 
    races: ['Human', 'Elf', 'Dwarf', 'Halfling', 'Dragonborn', 'Gnome', 'Half-Elf', 'Half-Orc', 'Tiefling'],
    classes: ['Barbarian', 'Bard', 'Cleric', 'Druid', 'Fighter', 'Monk', 'Paladin', 'Ranger', 'Rogue', 'Sorcerer', 'Warlock', 'Wizard']
  });
});

// Create new character
router.post('/', ensureAuthenticated, upload.single('portrait'), (req, res) => {
  const { name, race, class: charClass, level, description } = req.body;
  const stats = {
    strength: parseInt(req.body.strength),
    dexterity: parseInt(req.body.dexterity),
    constitution: parseInt(req.body.constitution),
    intelligence: parseInt(req.body.intelligence),
    wisdom: parseInt(req.body.wisdom),
    charisma: parseInt(req.body.charisma)
  };
  
  const modifiers = calculateModifiers(stats);
  const skills = generateSkills(charClass, modifiers);
  
  const character = {
    user_id: req.user.id,
    name,
    race,
    class: charClass,
    level: parseInt(level) || 1,
    stats: JSON.stringify(stats),
    skills: JSON.stringify(skills),
    hp_current: parseInt(req.body.hp_max) || 10,
    hp_max: parseInt(req.body.hp_max) || 10,
    ac: parseInt(req.body.ac) || 10,
    speed: parseInt(req.body.speed) || 30,
    inventory: JSON.stringify([]),
    abilities: JSON.stringify([]),
    spells: JSON.stringify([]),
    features: JSON.stringify([]),
    description,
    portrait: req.file ? `/uploads/${req.file.filename}` : null
  };
  
  db.run(
    `INSERT INTO characters (
      user_id, name, race, class, level, stats, skills, hp_current, hp_max, ac, speed, 
      inventory, abilities, spells, features, description, portrait
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    Object.values(character),
    function(err) {
      if (err) return res.status(500).render('error', { error: err });
      res.redirect('/characters');
    }
  );
});

// Character sheet
router.get('/:id', ensureAuthenticated, (req, res) => {
  db.get(
    `SELECT c.*, u.username 
     FROM characters c 
     JOIN users u ON c.user_id = u.id 
     WHERE c.id = ?`,
    [req.params.id],
    (err, character) => {
      if (err) return res.status(500).render('error', { error: err });
      if (!character) return res.status(404).render('error', { error: 'Character not found' });
      
      // Parse JSON fields
      character.stats = JSON.parse(character.stats);
      character.skills = JSON.parse(character.skills);
      character.inventory = JSON.parse(character.inventory);
      character.abilities = JSON.parse(character.abilities);
      character.spells = JSON.parse(character.spells);
      character.features = JSON.parse(character.features);
      
      // Calculate modifiers
      character.modifiers = calculateModifiers(character.stats);
      
      res.render('characters/sheet', { 
        character,
        isOwner: character.user_id === req.user.id,
        isDM: req.user.role === 'dm'
      });
    }
  );
});

// Edit character
router.get('/:id/edit', ensureAuthenticated, (req, res) => {
  db.get(
    'SELECT * FROM characters WHERE id = ? AND user_id = ?',
    [req.params.id, req.user.id],
    (err, character) => {
      if (err) return res.status(500).render('error', { error: err });
      if (!character) return res.status(404).render('error', { error: 'Character not found' });
      
      // Parse JSON fields
      character.stats = JSON.parse(character.stats);
      
      res.render('characters/edit', { 
        character,
        races: ['Human', 'Elf', 'Dwarf', 'Halfling', 'Dragonborn', 'Gnome', 'Half-Elf', 'Half-Orc', 'Tiefling'],
        classes: ['Barbarian', 'Bard', 'Cleric', 'Druid', 'Fighter', 'Monk', 'Paladin', 'Ranger', 'Rogue', 'Sorcerer', 'Warlock', 'Wizard']
      });
    }
  );
});

// Update character
router.post('/:id', ensureAuthenticated, upload.single('portrait'), (req, res) => {
  const { name, race, class: charClass, level, description } = req.body;
  const stats = {
    strength: parseInt(req.body.strength),
    dexterity: parseInt(req.body.dexterity),
    constitution: parseInt(req.body.constitution),
    intelligence: parseInt(req.body.intelligence),
    wisdom: parseInt(req.body.wisdom),
    charisma: parseInt(req.body.charisma)
  };
  
  const modifiers = calculateModifiers(stats);
  const skills = generateSkills(charClass, modifiers);
  
  const character = {
    name,
    race,
    class: charClass,
    level: parseInt(level) || 1,
    stats: JSON.stringify(stats),
    skills: JSON.stringify(skills),
    hp_current: parseInt(req.body.hp_current),
    hp_max: parseInt(req.body.hp_max),
    ac: parseInt(req.body.ac) || 10,
    speed: parseInt(req.body.speed) || 30,
    description
  };
  
  // Handle portrait update
  if (req.file) {
    character.portrait = `/uploads/${req.file.filename}`;
    // Delete old portrait if exists
    db.get('SELECT portrait FROM characters WHERE id = ?', [req.params.id], (err, row) => {
      if (row.portrait) {
        fs.unlink(`./public${row.portrait}`, (err) => { if (err) console.error(err); });
      }
    });
  }
  
  const fields = [];
  const values = [];
  for (const [key, value] of Object.entries(character)) {
    fields.push(`${key} = ?`);
    values.push(value);
  }
  values.push(req.params.id);
  values.push(req.user.id);
  
  db.run(
    `UPDATE characters SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`,
    values,
    function(err) {
      if (err) return res.status(500).render('error', { error: err });
      res.redirect(`/characters/${req.params.id}`);
    }
  );
});

// Delete character
router.post('/:id/delete', ensureAuthenticated, (req, res) => {
  db.get('SELECT portrait FROM characters WHERE id = ? AND user_id = ?', [req.params.id, req.user.id], (err, row) => {
    if (err) return res.status(500).render('error', { error: err });
    if (!row) return res.status(404).render('error', { error: 'Character not found' });
    
    // Delete portrait if exists
    if (row.portrait) {
      fs.unlink(`./public${row.portrait}`, (err) => { if (err) console.error(err); });
    }
    
    db.run('DELETE FROM characters WHERE id = ? AND user_id = ?', [req.params.id, req.user.id], function(err) {
      if (err) return res.status(500).render('error', { error: err });
      res.redirect('/characters');
    });
  });
});

// Character list
router.get('/', ensureAuthenticated, (req, res) => {
  db.all(
    'SELECT * FROM characters WHERE user_id = ? ORDER BY name',
    [req.user.id],
    (err, characters) => {
      if (err) return res.status(500).render('error', { error: err });
      res.render('characters/index', { characters });
    }
  );
});

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect('/auth/login');
}

module.exports = router;