const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const ejs = require('ejs');
const bcrypt = require('bcrypt');
const path = require('path');
const passport = require('./middleware/auth-helpers');
const { ensureAuthenticated } = require('./middleware/auth');
const { ensureAdmin } = require('./middleware/auth');
const app = express();
const flash = require('express-flash');
app.use(flash());
const authRoutes = require('./routes/auth');
app.use('/', authRoutes);
const usersRouter = require('./routes/users');
// Database connection (MongoDB)
mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://axelgarnica:<Ax311396!>@cluster0.vv2n5wz.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0');

// Middleware
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use('/users', usersRouter);
app.use(express.json());
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true
}));


// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes
app.use('/', require('./routes/index'));
app.use('/users', require('./routes/users'));
app.use('/characters', require('./routes/characters'));
app.use('/game', require('./routes/game'));

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));