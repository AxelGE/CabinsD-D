const express = require('express');
const router = express.Router();
const upload = require('../config/multer');
const { generateRandomNPC, generateRandomLoot } = require('../utils/characterUtils');

// Campaign list
router.get('/', ensureAuthenticated, (req, res) => {
  const query = req.user.role === 'dm' 
    ? `SELECT c.*, u.username as dm_name 
       FROM campaigns c 
       JOIN users u ON c.dm_id = u.id 
       WHERE c.dm_id = ? OR c.id IN (
         SELECT campaign_id FROM campaign_participants cp
         JOIN characters ch ON cp.character_id = ch.id
         WHERE ch.user_id = ?
       )`
    : `SELECT c.*, u.username as dm_name 
       FROM campaigns c 
       JOIN users u ON c.dm_id = u.id 
       WHERE c.id IN (
         SELECT campaign_id FROM campaign_participants cp
         JOIN characters ch ON cp.character_id = ch.id
         WHERE ch.user_id = ?
       )`;
  
  db.all(query, [req.user.id, req.user.id], (err, campaigns) => {
    if (err) return res.status(500).render('error', { error: err });
    res.render('campaigns/index', { campaigns });
  });
});

// New campaign form
router.get('/new', ensureDM, (req, res) => {
  res.render('campaigns/new');
});

// Create new campaign
router.post('/', ensureDM, upload.single('image'), (req, res) => {
  const { title, description } = req.body;
  const current_state = JSON.stringify({
    turn_order: [],
    current_turn: null,
    round: 0
  });
  
  db.run(
    `INSERT INTO campaigns (dm_id, title, description, current_state, image_path)
     VALUES (?, ?, ?, ?, ?)`,
    [req.user.id, title, description, current_state, req.file ? `/uploads/${req.file.filename}` : null],
    function(err) {
      if (err) return res.status(500).render('error', { error: err });
      res.redirect(`/campaigns/${this.lastID}`);
    }
  );
});

// Campaign details
router.get('/:id', ensureAuthenticated, (req, res) => {
  db.get(
    `SELECT c.*, u.username as dm_name 
     FROM campaigns c 
     JOIN users u ON c.dm_id = u.id 
     WHERE c.id = ?`,
    [req.params.id],
    (err, campaign) => {
      if (err) return res.status(500).render('error', { error: err });
      if (!campaign) return res.status(404).render('error', { error: 'Campaign not found' });
      
      campaign.current_state = JSON.parse(campaign.current_state);
      
      // Get participants
      db.all(
        `SELECT ch.*, u.username 
         FROM campaign_participants cp
         JOIN characters ch ON cp.character_id = ch.id
         JOIN users u ON ch.user_id = u.id
         WHERE cp.campaign_id = ?`,
        [req.params.id],
        (err, participants) => {
          if (err) return res.status(500).render('error', { error: err });
          
          // Parse JSON fields for each participant
          participants.forEach(p => {
            p.stats = JSON.parse(p.stats);
            p.skills = JSON.parse(p.skills);
          });
          
          // Get story entries
          db.all(
            `SELECT se.*, u.username 
             FROM story_entries se
             JOIN users u ON se.user_id = u.id
             WHERE se.campaign_id = ?
             ORDER BY se.created_at DESC`,
            [req.params.id],
            (err, story) => {
              if (err) return res.status(500).render('error', { error: err });
              
              // Get NPCs
              db.all(
                'SELECT * FROM npcs WHERE campaign_id = ?',
                [req.params.id],
                (err, npcs) => {
                  if (err) return res.status(500).render('error', { error: err });
                  
                  // Get player's characters not yet in campaign
                  db.all(
                    `SELECT * FROM characters 
                     WHERE user_id = ? 
                     AND id NOT IN (
                       SELECT character_id FROM campaign_participants 
                       WHERE campaign_id = ?
                     )`,
                    [req.user.id, req.params.id],
                    (err, availableChars) => {
                      if (err) return res.status(500).render('error', { error: err });
                      
                      res.render('campaigns/view', {
                        campaign,
                        participants,
                        story,
                        npcs,
                        availableChars,
                        isDM: req.user.id === campaign.dm_id,
                        isPlayer: participants.some(p => p.user_id === req.user.id)
                      });
                    }
                  );
                }
              );
            }
          );
        }
      );
    }
  );
});

// Join campaign with character
router.post('/:id/join', ensureAuthenticated, (req, res) => {
  const { character_id } = req.body;
  
  // Verify character belongs to user
  db.get(
    'SELECT * FROM characters WHERE id = ? AND user_id = ?',
    [character_id, req.user.id],
    (err, character) => {
      if (err) return res.status(500).render('error', { error: err });
      if (!character) return res.status(403).render('error', { error: 'Character not found or not yours' });
      
      db.run(
        'INSERT INTO campaign_participants (campaign_id, character_id) VALUES (?, ?)',
        [req.params.id, character_id],
        function(err) {
          if (err) return res.status(500).render('error', { error: err });
          res.redirect(`/campaigns/${req.params.id}`);
        }
      );
    }
  );
});

// Play campaign
router.get('/:id/play', ensureAuthenticated, (req, res) => {
  db.get(
    `SELECT c.* FROM campaigns c
     WHERE c.id = ? AND (
       c.dm_id = ? OR c.id IN (
         SELECT cp.campaign_id FROM campaign_participants cp
         JOIN characters ch ON cp.character_id = ch.id
         WHERE ch.user_id = ?
       )
     )`,
    [req.params.id, req.user.id, req.user.id],
    (err, campaign) => {
      if (err) return res.status(500).render('error', { error: err });
      if (!campaign) return res.status(403).render('error', { error: 'Not part of this campaign' });
      
      campaign.current_state = JSON.parse(campaign.current_state);
      
      // Get participant characters
      db.all(
        `SELECT ch.*, u.username, cp.initiative
         FROM campaign_participants cp
         JOIN characters ch ON cp.character_id = ch.id
         JOIN users u ON ch.user_id = u.id
         WHERE cp.campaign_id = ?`,
        [req.params.id],
        (err, participants) => {
          if (err) return res.status(500).render('error', { error: err });
          
          // Parse JSON fields
          participants.forEach(p => {
            p.stats = JSON.parse(p.stats);
            p.skills = JSON.parse(p.skills);
          });
          
          // Get player's character(s) in this campaign
          db.all(
            `SELECT ch.* 
             FROM campaign_participants cp
             JOIN characters ch ON cp.character_id = ch.id
             WHERE cp.campaign_id = ? AND ch.user_id = ?`,
            [req.params.id, req.user.id],
            (err, playerCharacters) => {
              if (err) return res.status(500).render('error', { error: err });
              
              res.render('campaigns/play', {
                campaign,
                participants,
                playerCharacters,
                isDM: req.user.id === campaign.dm_id,
                currentCharacter: playerCharacters[0] // Default to first character
              });
            }
          );
        }
      );
    }
  );
});

// Add story entry
router.post('/:id/story', ensureAuthenticated, (req, res) => {
  const { content } = req.body;
  
  db.run(
    'INSERT INTO story_entries (campaign_id, user_id, content) VALUES (?, ?, ?)',
    [req.params.id, req.user.id, content],
    function(err) {
      if (err) return res.status(500).render('error', { error: err });
      res.redirect(`/campaigns/${req.params.id}`);
    }
  );
});

// Add NPC
router.post('/:id/npcs', ensureDM, upload.single('portrait'), (req, res) => {
  const { name, description } = req.body;
  const stats = {
    str: parseInt(req.body.str),
    dex: parseInt(req.body.dex),
    con: parseInt(req.body.con),
    int: parseInt(req.body.int),
    wis: parseInt(req.body.wis),
    cha: parseInt(req.body.cha)
  };
  
  db.run(
    `INSERT INTO npcs (campaign_id, name, stats, description, portrait)
     VALUES (?, ?, ?, ?, ?)`,
    [req.params.id, name, JSON.stringify(stats), description, req.file ? `/uploads/${req.file.filename}` : null],
    function(err) {
      if (err) return res.status(500).render('error', { error: err });
      res.redirect(`/campaigns/${req.params.id}`);
    }
  );
});

// Generate random NPC
router.post('/:id/npcs/random', ensureDM, (req, res) => {
  const { type } = req.body;
  const npc = generateRandomNPC(type);
  
  db.run(
    `INSERT INTO npcs (campaign_id, name, stats, description)
     VALUES (?, ?, ?, ?)`,
    [req.params.id, npc.name, JSON.stringify(npc.stats), npc.description],
    function(err) {
      if (err) return res.status(500).render('error', { error: err });
      res.redirect(`/campaigns/${req.params.id}`);
    }
  );
});

// Generate random loot
router.post('/:id/loot', ensureDM, (req, res) => {
  const { cr } = req.body;
  const loot = generateRandomLoot(parseInt(cr) || 0);
  
  // Add to campaign story
  db.run(
    'INSERT INTO story_entries (campaign_id, user_id, content) VALUES (?, ?, ?)',
    [req.params.id, req.user.id, `The party finds: ${loot}`],
    function(err) {
      if (err) return res.status(500).render('error', { error: err });
      res.redirect(`/campaigns/${req.params.id}`);
    }
  );
});

// Update initiative order
router.post('/:id/initiative', ensureDM, (req, res) => {
  const { order } = req.body; // Array of character IDs in order
  
  // Get current state
  db.get(
    'SELECT current_state FROM campaigns WHERE id = ?',
    [req.params.id],
    (err, row) => {
      if (err) return res.status(500).json({ error: err });
      
      const current_state = JSON.parse(row.current_state);
      current_state.turn_order = order.split(',');
      current_state.current_turn = order.split(',')[0];
      current_state.round = 1;
      
      // Update all participants' initiative
      const stmt = db.prepare('UPDATE campaign_participants SET initiative = ? WHERE character_id = ? AND campaign_id = ?');
      order.split(',').forEach((charId, index) => {
        stmt.run(index + 1, charId, req.params.id);
      });
      stmt.finalize();
      
      // Update campaign state
      db.run(
        'UPDATE campaigns SET current_state = ? WHERE id = ?',
        [JSON.stringify(current_state), req.params.id],
        function(err) {
          if (err) return res.status(500).json({ error: err });
          res.json({ success: true });
        }
      );
    }
  );
});

// Next turn
router.post('/:id/turn/next', ensureDM, (req, res) => {
  // Get current state
  db.get(
    'SELECT current_state FROM campaigns WHERE id = ?',
    [req.params.id],
    (err, row) => {
      if (err) return res.status(500).json({ error: err });
      
      const current_state = JSON.parse(row.current_state);
      const currentIndex = current_state.turn_order.indexOf(current_state.current_turn);
      let nextIndex = currentIndex + 1;
      
      if (nextIndex >= current_state.turn_order.length) {
        nextIndex = 0;
        current_state.round += 1;
      }
      
      current_state.current_turn = current_state.turn_order[nextIndex];
      
      // Update campaign state
      db.run(
        'UPDATE campaigns SET current_state = ? WHERE id = ?',
        [JSON.stringify(current_state), req.params.id],
        function(err) {
          if (err) return res.status(500).json({ error: err });
          res.json({ 
            success: true,
            current_turn: current_state.current_turn,
            round: current_state.round
          });
        }
      );
    }
  );
});

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect('/auth/login');
}

function ensureDM(req, res, next) {
  if (req.isAuthenticated() && req.user.role === 'dm') return next();
  res.status(403).render('error', { error: 'DM privileges required' });
}

module.exports = router;