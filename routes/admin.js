const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');

// Admin dashboard
router.get('/', ensureAdmin, (req, res) => {
  db.all('SELECT * FROM users ORDER BY username', (err, users) => {
    if (err) return res.status(500).render('error', { error: err });
    res.render('admin/dashboard', { users });
  });
});

// Create new user form
router.get('/users/new', ensureAdmin, (req, res) => {
  res.render('admin/new-user');
});

// Create new user
router.post('/users', ensureAdmin, (req, res) => {
  const { username, password, email, role } = req.body;
  
  bcrypt.hash(password, 10, (err, hash) => {
    if (err) return res.status(500).render('error', { error: err });
    
    db.run(
      'INSERT INTO users (username, password_hash, email, role) VALUES (?, ?, ?, ?)',
      [username, hash, email, role],
      function(err) {
        if (err) return res.status(500).render('error', { error: err });
        res.redirect('/admin');
      }
    );
  });
});

// Edit user form
router.get('/users/:id/edit', ensureAdmin, (req, res) => {
  db.get('SELECT * FROM users WHERE id = ?', [req.params.id], (err, user) => {
    if (err) return res.status(500).render('error', { error: err });
    if (!user) return res.status(404).render('error', { error: 'User not found' });
    res.render('admin/edit-user', { user });
  });
});

// Update user
router.post('/users/:id', ensureAdmin, (req, res) => {
  const { username, email, role } = req.body;
  
  db.run(
    'UPDATE users SET username = ?, email = ?, role = ? WHERE id = ?',
    [username, email, role, req.params.id],
    function(err) {
      if (err) return res.status(500).render('error', { error: err });
      res.redirect('/admin');
    }
  );
});

// Delete user
router.post('/users/:id/delete', ensureAdmin, (req, res) => {
  db.run('DELETE FROM users WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).render('error', { error: err });
    res.redirect('/admin');
  });
});

// System settings
router.get('/settings', ensureAdmin, (req, res) => {
  res.render('admin/settings');
});

function ensureAdmin(req, res, next) {
  if (req.isAuthenticated() && req.user.role === 'admin') return next();
  res.status(403).render('error', { error: 'Admin privileges required' });
}

module.exports = router;