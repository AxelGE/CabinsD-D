// middleware/auth.js
const User = require('../models/User');

// Authentication middleware
const ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  req.session.returnTo = req.originalUrl;
  res.redirect('/login');
};

const ensureGuest = (req, res, next) => {
  if (req.isAuthenticated()) {
    return res.redirect('/dashboard');
  }
  next();
};

const ensureAdmin = (req, res, next) => {
  if (req.isAuthenticated() && req.user.role === 'admin') {
    return next();
  }
  res.status(403).render('error', { 
    message: 'Admin access required' 
  });
};

const ensureDM = (req, res, next) => {
  if (req.isAuthenticated() && (req.user.role === 'dm' || req.user.role === 'admin')) {
    return next();
  }
  res.status(403).render('error', {
    message: 'Dungeon Master access required'
  });
};

module.exports = {
  ensureAuthenticated,
  ensureGuest,
  ensureAdmin,
  ensureDM
};