module.exports = function(io, db) {
  io.on('connection', (socket) => {
    console.log('New client connected');
    
    // Join campaign room
    socket.on('join-campaign', (campaignId) => {
      socket.join(`campaign-${campaignId}`);
      console.log(`Client joined campaign ${campaignId}`);
    });
    
    // Leave campaign room
    socket.on('leave-campaign', (campaignId) => {
      socket.leave(`campaign-${campaignId}`);
      console.log(`Client left campaign ${campaignId}`);
    });
    
    // Dice roll
    socket.on('dice-roll', (data) => {
      db.get(
        `SELECT ch.name, u.username 
         FROM characters ch 
         JOIN users u ON ch.user_id = u.id 
         WHERE ch.id = ?`,
        [data.characterId],
        (err, character) => {
          if (err) return console.error(err);
          
          const result = {
            character: character.name,
            player: character.username,
            dice: `d${data.sides}`,
            result: data.result,
            timestamp: new Date().toISOString()
          };
          
          // Broadcast to campaign room
          io.to(`campaign-${data.campaignId}`).emit('dice-result', result);
          
          // Save to campaign story if natural 1 or 20
          if (data.sides === 20 && (data.result === 1 || data.result === 20)) {
            const message = data.result === 20 
              ? `${character.name} rolled a natural 20!`
              : `${character.name} rolled a critical failure!`;
              
            db.run(
              'INSERT INTO story_entries (campaign_id, user_id, content) VALUES (?, ?, ?)',
              [data.campaignId, null, message],
              (err) => { if (err) console.error(err); }
            );
          }
        }
      );
    });
    
    // Update health
    socket.on('update-health', (data) => {
      db.run(
        'UPDATE characters SET hp_current = ? WHERE id = ?',
        [data.newHealth, data.characterId],
        function(err) {
          if (err) return console.error(err);
          
          db.get(
            'SELECT name FROM characters WHERE id = ?',
            [data.characterId],
            (err, character) => {
              if (err) return console.error(err);
              
              const update = {
                characterId: data.characterId,
                characterName: character.name,
                newHealth: data.newHealth,
                isDamage: data.isDamage,
                amount: data.amount
              };
              
              io.to(`campaign-${data.campaignId}`).emit('health-updated', update);
              
              // Add to story if DM initiated
              if (data.addToStory && data.dmId) {
                const action = data.isDamage ? 'takes' : 'heals';
                const message = `${character.name} ${action} ${data.amount} damage!`;
                
                db.run(
                  'INSERT INTO story_entries (campaign_id, user_id, content) VALUES (?, ?, ?)',
                  [data.campaignId, data.dmId, message],
                  (err) => { if (err) console.error(err); }
                );
              }
            }
          );
        }
      );
    });
    
    // Add story entry
    socket.on('add-story-entry', (data) => {
      db.run(
        'INSERT INTO story_entries (campaign_id, user_id, content) VALUES (?, ?, ?)',
        [data.campaignId, data.userId, data.content],
        function(err) {
          if (err) return console.error(err);
          
          db.get(
            'SELECT username FROM users WHERE id = ?',
            [data.userId],
            (err, user) => {
              if (err) return console.error(err);
              
              const entry = {
                id: this.lastID,
                content: data.content,
                username: user.username,
                timestamp: new Date().toISOString()
              };
              
              io.to(`campaign-${data.campaignId}`).emit('story-entry-added', entry);
            }
          );
        }
      );
    });
    
    // Next turn
    socket.on('next-turn', (campaignId) => {
      db.get(
        'SELECT current_state FROM campaigns WHERE id = ?',
        [campaignId],
        (err, row) => {
          if (err) return console.error(err);
          
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
            [JSON.stringify(current_state), campaignId],
            function(err) {
              if (err) return console.error(err);
              
              io.to(`campaign-${campaignId}`).emit('turn-changed', {
                current_turn: current_state.current_turn,
                round: current_state.round
              });
            }
          );
        }
      );
    });
    
    // Disconnect
    socket.on('disconnect', () => {
      console.log('Client disconnected');
    });
  });
};