// routes/users.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const User = require('../models/User');
const { ensureAdmin } = require('../middleware/auth');

const { ensureAuthenticated, ensureGuest } = require('../middleware/auth');

// Register Page
router.get('/register', ensureGuest, (req, res) => {
  res.render('register', { title: 'Register' });
});

// Register Handle
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, password2, role } = req.body;
    
    // Validation
    if (password !== password2) {
      return res.render('register', {
        error_msg: 'Passwords do not match',
        name,
        email
      });
    }

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.render('register', {
        error_msg: 'Email already registered',
        name,
        email
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      role: role || 'player'
    });

    await newUser.save();
    res.redirect('/login');
    
  } catch (err) {
    console.error(err);
    res.render('register', {
      error_msg: 'Server error during registration'
    });
  }
});

// Admin User Management
router.get('/admin', ensureAuthenticated, ensureAdmin, async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.render('admin/users', {
      title: 'User Management',
      users
    });
  } catch (err) {
    console.error(err);
    res.redirect('/');
  }
});

module.exports = router;