require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const socketio = require('socket.io');
const multer = require('multer');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const db = new sqlite3.Database('./dnd-game.db');

// Initialize database tables
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password_hash TEXT,
    email TEXT,
    role TEXT CHECK(role IN ('admin', 'dm', 'player')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS characters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    name TEXT,
    race TEXT,
    class TEXT,
    level INTEGER DEFAULT 1,
    stats TEXT, -- JSON string
    skills TEXT, -- JSON string
    hp_current INTEGER,
    hp_max INTEGER,
    ac INTEGER,
    speed INTEGER,
    inventory TEXT, -- JSON string
    abilities TEXT, -- JSON string
    spells TEXT, -- JSON string
    features TEXT, -- JSON string
    description TEXT,
    portrait TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS campaigns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dm_id INTEGER REFERENCES users(id),
    title TEXT,
    description TEXT,
    current_state TEXT, -- JSON string
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    active BOOLEAN DEFAULT 1,
    image_path TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS campaign_participants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id INTEGER REFERENCES campaigns(id),
    character_id INTEGER REFERENCES characters(id),
    initiative INTEGER,
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS story_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id INTEGER REFERENCES campaigns(id),
    user_id INTEGER REFERENCES users(id),
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS npcs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id INTEGER REFERENCES campaigns(id),
    name TEXT,
    stats TEXT, -- JSON string
    description TEXT,
    portrait TEXT
  )`);
});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = './public/uploads';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${uuidv4()}${path.extname(file.originalname)}`);
  }
});
const upload = multer({ storage });

// Middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production' }
}));
app.use(passport.initialize());
app.use(passport.session());

// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Passport configuration
passport.use(new LocalStrategy(
  async (username, password, done) => {
    try {
      db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
        if (err) return done(err);
        if (!user) return done(null, false, { message: 'Incorrect username.' });
        
        bcrypt.compare(password, user.password_hash, (err, res) => {
          if (err) return done(err);
          if (!res) return done(null, false, { message: 'Incorrect password.' });
          return done(null, user);
        });
      });
    } catch (err) {
      return done(err);
    }
  }
));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  db.get('SELECT * FROM users WHERE id = ?', [id], (err, user) => {
    done(err, user);
  });
});

// Routes
app.use('/', require('./routes/index'));
app.use('/auth', require('./routes/auth'));
app.use('/characters', require('./routes/characters'));
app.use('/campaigns', require('./routes/campaigns'));
app.use('/admin', require('./routes/admin'));
app.use('/api', require('./routes/api'));

// Socket.io setup
const server = app.listen(process.env.PORT || 3000, () => {
  console.log(`Server running on port ${process.env.PORT || 3000}`);
});

const io = socketio(server);
require('./sockets/game')(io, db);

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', { error: err });
});

module.exports = app;