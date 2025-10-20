const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const session = require('express-session');
const cors = require('cors');
const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// Database setup - use persistent path for Railway
const DB_PATH = process.env.RAILWAY_ENVIRONMENT ? '/tmp/bbs.db' : './data/bbs.db';
const db = new sqlite3.Database(DB_PATH);

// Create tables
db.serialize(() => {
  // Users table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    handle TEXT UNIQUE NOT NULL,
    real_name TEXT,
    location TEXT,
    password_hash TEXT NOT NULL,
    signature TEXT,
    tagline TEXT,
    access_level INTEGER DEFAULT 1,
    calls INTEGER DEFAULT 0,
    time_online INTEGER DEFAULT 0,
    messages_posted INTEGER DEFAULT 0,
    files_uploaded INTEGER DEFAULT 0,
    games_played INTEGER DEFAULT 0,
    credits INTEGER DEFAULT 100,
    avatar TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_seen DATETIME
  )`);

  // Game states table
  db.run(`CREATE TABLE IF NOT EXISTS game_states (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    game_name TEXT NOT NULL,
    game_data TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id),
    UNIQUE(user_id, game_name)
  )`);

  // Fishing hole players table
  db.run(`CREATE TABLE IF NOT EXISTS fishing_hole_players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    player_name TEXT NOT NULL,
    level INTEGER DEFAULT 1,
    experience INTEGER DEFAULT 0,
    credits INTEGER DEFAULT 100,
    current_location TEXT DEFAULT 'Lake Shore',
    inventory TEXT DEFAULT '[]',
    trophy_catches TEXT DEFAULT '[]',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id),
    UNIQUE(user_id)
  )`);

  // Create default SysOp user if it doesn't exist
  db.get('SELECT id FROM users WHERE handle = ?', ['SysOp'], (err, row) => {
    if (!row) {
      const hashedPassword = bcrypt.hashSync('admin123', 10);
      db.run(`INSERT INTO users (handle, real_name, location, password_hash, access_level, credits, created_at) 
              VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        ['SysOp', 'System Operator', 'BBS Headquarters', hashedPassword, 100, 1000]
      );
      console.log('Default SysOp user created');
    }
  });

  console.log('SQLite database initialized');
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Session middleware (in-memory for now)
app.use(session({
  secret: 'bbs-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Server is working',
    timestamp: new Date().toISOString()
  });
});

// Login endpoint
app.post('/api/login', (req, res) => {
  const { handle, password } = req.body;
  
  db.get('SELECT * FROM users WHERE handle = ?', [handle], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    if (!bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    req.session.userId = user.id;
    req.session.userHandle = user.handle;
    
    res.json({
      success: true,
      user: {
        id: user.id,
        handle: user.handle,
        real_name: user.real_name,
        access_level: user.access_level,
        credits: user.credits
      }
    });
  });
});

// Get current user
app.get('/api/me', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not logged in' });
  }
  
  db.get('SELECT * FROM users WHERE id = ?', [req.session.userId], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    res.json({
      id: user.id,
      handle: user.handle,
      real_name: user.real_name,
      access_level: user.access_level,
      credits: user.credits
    });
  });
});

// Game state endpoints
app.get('/api/game-state/:gameName', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not logged in' });
  }
  
  db.get('SELECT * FROM game_states WHERE user_id = ? AND game_name = ?', 
    [req.session.userId, req.params.gameName], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (row) {
      res.json(JSON.parse(row.game_data));
    } else {
      res.json(null);
    }
  });
});

app.post('/api/game-state/:gameName', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not logged in' });
  }
  
  const gameData = JSON.stringify(req.body);
  
  db.run('INSERT OR REPLACE INTO game_states (user_id, game_name, game_data, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
    [req.session.userId, req.params.gameName, gameData], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    res.json({ success: true });
  });
});

// Fishing Hole endpoints
app.post('/api/fishing-hole/player', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not logged in' });
  }
  
  db.get('SELECT * FROM fishing_hole_players WHERE user_id = ?', [req.session.userId], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (row) {
      res.json({
        player: {
          name: row.player_name,
          level: row.level,
          experience: row.experience,
          money: row.credits,
          totalCaught: JSON.parse(row.inventory || '[]').length,
          totalWeight: JSON.parse(row.inventory || '[]').reduce((sum, fish) => sum + (fish.weight || 0), 0),
          biggestCatch: Math.max(...JSON.parse(row.inventory || '[]').map(f => f.weight || 0), 0),
          biggestCatchName: JSON.parse(row.inventory || '[]').length > 0 ? 
            JSON.parse(row.inventory || '[]').reduce((biggest, fish) => 
              (fish.weight || 0) > (biggest.weight || 0) ? fish : biggest, {weight: 0, name: 'None'}).name : 'None',
          inventory: JSON.parse(row.inventory || '[]'),
          trophyCatches: JSON.parse(row.trophy_catches || '[]'),
          location: { name: row.current_location || 'Lake Shore' }
        }
      });
    } else {
      res.json({ player: null });
    }
  });
});

app.post('/api/fishing-hole/save', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not logged in' });
  }
  
  const { player, location } = req.body;
  
  db.run(`INSERT OR REPLACE INTO fishing_hole_players 
          (user_id, player_name, level, experience, credits, current_location, inventory, trophy_catches, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    [
      req.session.userId,
      player.name,
      player.level,
      player.experience,
      player.money,
      location?.name || 'Lake Shore',
      JSON.stringify(player.inventory || []),
      JSON.stringify(player.trophyCatches || [])
    ], function(err) {
    if (err) {
      console.error('Save fishing player error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    res.json({ success: true });
  });
});

// Additional endpoints for compatibility
app.get('/api/bulletins', (req, res) => {
  res.json([
    { id: 1, title: "Welcome to Retro-BBS", content: "Welcome to our BBS! Have fun exploring.", created_at: new Date() }
  ]);
});

app.get('/api/sysop/check', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not logged in' });
  }
  
  db.get('SELECT * FROM users WHERE id = ?', [req.session.userId], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    const isSysOp = user && user.access_level >= 100;
    res.json({ isSysOp });
  });
});

// SysOp chat endpoints
app.get('/api/sysop-chat/unread', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not logged in' });
  }
  res.json([]); // Return empty array for now
});

// Online users endpoint
app.get('/api/users/online', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not logged in' });
  }
  res.json([]); // Return empty array for now
});

// Change password endpoint
app.post('/api/change-password', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not logged in' });
  }
  
  const { currentPassword, newPassword } = req.body;
  
  // First verify current password
  db.get('SELECT password_hash FROM users WHERE id = ?', [req.session.userId], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    if (!bcrypt.compareSync(currentPassword, user.password_hash)) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    
    // Hash new password and update
    const newPasswordHash = bcrypt.hashSync(newPassword, 10);
    
    db.run('UPDATE users SET password_hash = ? WHERE id = ?', 
      [newPasswordHash, req.session.userId], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to update password' });
      }
      
      res.json({ success: true, message: 'Password updated successfully' });
    });
  });
});

// Socket.IO
const onlineUsers = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('user-login', (data) => {
    onlineUsers.set(socket.id, {
      userId: data.userId,
      handle: data.handle,
      accessLevel: data.accessLevel,
      lastActivity: Date.now()
    });
    console.log('User logged in:', data.handle);
  });
  
  socket.on('disconnect', () => {
    onlineUsers.delete(socket.id);
    console.log('User disconnected:', socket.id);
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`Retro-BBS Server (SQLite) running on port ${PORT}`);
  console.log(`Database: ${DB_PATH}`);
  console.log(`Visit http://localhost:${PORT} to connect`);
});
