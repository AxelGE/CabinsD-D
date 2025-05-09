const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../middleware/auth');

// Home Page
router.get('/', (req, res) => {
  res.render('index', { 
    title: 'D&D Simulator',
    user: req.user 
  });
});

// Dashboard
router.get('/dashboard', ensureAuthenticated, (req, res) => {
  res.render('dashboard', {
    title: 'Dashboard',
    user: req.user
  });
});

module.exports = router;