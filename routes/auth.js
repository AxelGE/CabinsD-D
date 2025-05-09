// routes/auth.js
const express = require('express');
const router = express.Router();
const passport = require('../middleware/auth-helpers');
const { ensureAuthenticated, ensureGuest } = require('../middleware/auth');

// Login Page
router.get('/login', ensureGuest, (req, res) => {
  res.render('login', { title: 'Login' });
});

// Login Handle
router.post('/login', (req, res, next) => {
  passport.authenticate('local', {
    successRedirect: '/dashboard',
    failureRedirect: '/login',
    failureFlash: true
  })(req, res, next);
});

// Logout Handle
router.get('/logout', (req, res) => {
  req.logout();
  res.redirect('/login');
});

module.exports = router;