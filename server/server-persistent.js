const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const session = require('express-session');
const cors = require('cors');
const bcrypt = require('bcrypt');

// Try PostgreSQL first, fall back to SQLite
let db, dbType;

async function initDatabase() {
  try {
    // Try PostgreSQL first (Railway)
    const { Pool } = require('pg');
    const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    
    if (connectionString) {
      console.log('Using PostgreSQL database');
      const pool = new Pool({
        connectionString: connectionString,
        ssl: {
          rejectUnauthorized: false
        }
      });
      
      // Test connection
      await pool.query('SELECT NOW()');
      
      db = {
        query: (text, params) => pool.query(text, params),
        get: async (text, params) => {
          const result = await pool.query(text, params);
          return result.rows[0] || null;
        },
        run: async (text, params) => {
          const result = await pool.query(text, params);
          return { lastID: result.insertId || result.rows?.[0]?.id || 0 };
        }
      };
      
      dbType = 'postgresql';
      
      // Create tables
      await db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          handle VARCHAR(50) UNIQUE NOT NULL,
          real_name VARCHAR(100),
          location VARCHAR(100),
          password_hash TEXT NOT NULL,
          signature TEXT,
          tagline VARCHAR(200),
          access_level INTEGER DEFAULT 1,
          calls INTEGER DEFAULT 0,
          time_online INTEGER DEFAULT 0,
          messages_posted INTEGER DEFAULT 0,
          files_uploaded INTEGER DEFAULT 0,
          games_played INTEGER DEFAULT 0,
          credits INTEGER DEFAULT 100,
          avatar TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          last_seen TIMESTAMP
        )
      `);
      
      await db.run(`
        CREATE TABLE IF NOT EXISTS game_states (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          game_name VARCHAR(50) NOT NULL,
          game_data TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id),
          UNIQUE(user_id, game_name)
        )
      `);
      
      await db.run(`
        CREATE TABLE IF NOT EXISTS fishing_hole_players (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          player_name TEXT NOT NULL,
          level INTEGER DEFAULT 1,
          experience INTEGER DEFAULT 0,
          credits INTEGER DEFAULT 100,
          current_location TEXT DEFAULT 'Lake Shore',
          inventory TEXT DEFAULT '[]',
          trophy_catches TEXT DEFAULT '[]',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id),
          UNIQUE(user_id)
        )
      `);

      // Add missing columns if they don't exist (migration for existing tables)
      try {
        await db.run(`ALTER TABLE fishing_hole_players ADD COLUMN IF NOT EXISTS credits INTEGER DEFAULT 100;`);
        await db.run(`ALTER TABLE fishing_hole_players ADD COLUMN IF NOT EXISTS current_location TEXT DEFAULT 'Lake Shore';`);
        await db.run(`ALTER TABLE fishing_hole_players ADD COLUMN IF NOT EXISTS inventory TEXT DEFAULT '[]';`);
        await db.run(`ALTER TABLE fishing_hole_players ADD COLUMN IF NOT EXISTS trophy_catches TEXT DEFAULT '[]';`);
        await db.run(`ALTER TABLE fishing_hole_players ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`);
        
        // Add unique constraint on user_id if it doesn't exist
        await db.run(`ALTER TABLE fishing_hole_players ADD CONSTRAINT fishing_hole_players_user_id_unique UNIQUE (user_id);`);
        
        // Add missing columns to users table
        await db.run(`ALTER TABLE users ADD COLUMN IF NOT EXISTS calls INTEGER DEFAULT 0;`);
        await db.run(`ALTER TABLE users ADD COLUMN IF NOT EXISTS messages_posted INTEGER DEFAULT 0;`);
        await db.run(`ALTER TABLE users ADD COLUMN IF NOT EXISTS files_uploaded INTEGER DEFAULT 0;`);
        await db.run(`ALTER TABLE users ADD COLUMN IF NOT EXISTS games_played INTEGER DEFAULT 0;`);
        await db.run(`ALTER TABLE users ADD COLUMN IF NOT EXISTS time_online INTEGER DEFAULT 0;`);
        await db.run(`ALTER TABLE users ADD COLUMN IF NOT EXISTS signature TEXT DEFAULT '';`);
        await db.run(`ALTER TABLE users ADD COLUMN IF NOT EXISTS tagline VARCHAR(200) DEFAULT '';`);
        await db.run(`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT DEFAULT '';`);
      } catch (migrationError) {
        console.log('Migration completed or not needed:', migrationError.message);
      }
      
      // Create sessions table for connect-pg-simple
      try {
        await db.run(`
          CREATE TABLE IF NOT EXISTS "session" (
            "sid" varchar NOT NULL,
            "sess" json NOT NULL,
            "expire" timestamp NOT NULL
          );
        `);

        await db.run(`
          ALTER TABLE "session" DROP CONSTRAINT IF EXISTS "session_pkey";
        `);

        await db.run(`
          ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid");
        `);

        await db.run(`
          CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
        `);
      } catch (sessionError) {
        console.log('Sessions table creation failed, using memory store:', sessionError.message);
      }

      // Create default SysOp user
      const existingUser = await db.get('SELECT id FROM users WHERE handle = $1', ['SysOp']);
      if (!existingUser) {
        const hashedPassword = bcrypt.hashSync('admin123', 10);
        await db.run(
          `INSERT INTO users (handle, real_name, location, password_hash, access_level, credits, created_at) 
           VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
          ['SysOp', 'System Operator', 'BBS Headquarters', hashedPassword, 100, 1000]
        );
        console.log('Default SysOp user created');
      }
      
      console.log('PostgreSQL database initialized successfully');
      return;
    }
  } catch (error) {
    console.log('PostgreSQL not available, falling back to SQLite:', error.message);
    console.log('PostgreSQL error details:', error);
  }
  
  // Fallback to SQLite
  console.log('Using SQLite database');
  const sqlite3 = require('sqlite3').verbose();
  const DB_PATH = './data/bbs.db';
  db = new sqlite3.Database(DB_PATH);
  dbType = 'sqlite';
  
  // Create tables
  db.serialize(() => {
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
    
    // Create default SysOp user
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
}

// Track online users
const onlineUsers = new Map(); // socketId -> { userId, handle, accessLevel, lastActivity }

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// Helper functions for database operations
function query(text, params = []) {
  if (dbType === 'postgresql') {
    return db.query(text, params);
  } else {
    return new Promise((resolve, reject) => {
      db.all(text, params, (err, rows) => {
        if (err) reject(err);
        else resolve({ rows });
      });
    });
  }
}

function getOne(text, params = []) {
  if (dbType === 'postgresql') {
    return db.get(text, params);
  } else {
    return new Promise((resolve, reject) => {
      db.get(text, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }
}

function runQuery(text, params = []) {
  if (dbType === 'postgresql') {
    return db.run(text, params);
  } else {
    return new Promise((resolve, reject) => {
      db.run(text, params, function(err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID });
      });
    });
  }
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Basic route that works without database
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Function to set up all database-dependent routes
function setupRoutes() {
  // Test endpoint to verify database connection
  app.get('/api/test-db', async (req, res) => {
    try {
      if (dbType === 'postgresql') {
        const result = await db.query('SELECT NOW() as current_time');
        res.json({
          success: true,
          message: 'PostgreSQL database connected successfully',
          time: result.rows[0].current_time
        });
      } else {
        const result = await db.query('SELECT datetime(\'now\') as current_time');
        res.json({
          success: true,
          message: 'SQLite database connected successfully',
          time: result.rows[0].current_time
        });
      }
    } catch (error) {
      console.error('Database test error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

// Login endpoint
app.post('/api/login', async (req, res) => {
  try {
    const { handle, password } = req.body;
    
    const user = await getOne(
      dbType === 'postgresql' 
        ? 'SELECT * FROM users WHERE handle = $1' 
        : 'SELECT * FROM users WHERE handle = ?',
      [handle]
    );
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    if (!bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    req.session.userId = user.id;
    req.session.userHandle = user.handle;
    req.session.user = {
      id: user.id,
      handle: user.handle,
      real_name: user.real_name,
      access_level: user.access_level,
      credits: user.credits
    };
    
    // Update last_seen timestamp
    await runQuery(
      dbType === 'postgresql' 
        ? 'UPDATE users SET last_seen = CURRENT_TIMESTAMP WHERE id = $1'
        : 'UPDATE users SET last_seen = CURRENT_TIMESTAMP WHERE id = ?',
      [user.id]
    );
    
    console.log('Login successful - Session set:', { userId: user.id, handle: user.handle });
    console.log('Session data after login:', req.session);
    
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
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get current user
app.get('/api/me', async (req, res) => {
  try {
    console.log('GET /api/me - Session data:', req.session);
    if (!req.session.userId) {
      console.log('GET /api/me - No userId in session');
      return res.status(401).json({ error: 'Not logged in' });
    }
    
    const user = await getOne(
      dbType === 'postgresql' 
        ? 'SELECT * FROM users WHERE id = $1' 
        : 'SELECT * FROM users WHERE id = ?',
      [req.session.userId]
    );
    
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
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Game state endpoints
app.get('/api/game-state/:gameName', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not logged in' });
    }
    
    const gameState = await getOne(
      dbType === 'postgresql' 
        ? 'SELECT * FROM game_states WHERE user_id = $1 AND game_name = $2'
        : 'SELECT * FROM game_states WHERE user_id = ? AND game_name = ?',
      [req.session.userId, req.params.gameName]
    );
    
    if (gameState) {
      res.json(JSON.parse(gameState.game_data));
    } else {
      res.json(null);
    }
  } catch (error) {
    console.error('Get game state error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/game-state/:gameName', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not logged in' });
    }
    
    const gameData = JSON.stringify(req.body);
    
    if (dbType === 'postgresql') {
      await runQuery(
        `INSERT INTO game_states (user_id, game_name, game_data, updated_at) 
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
         ON CONFLICT (user_id, game_name) 
         DO UPDATE SET game_data = $3, updated_at = CURRENT_TIMESTAMP`,
        [req.session.userId, req.params.gameName, gameData]
      );
    } else {
      await runQuery(
        'INSERT OR REPLACE INTO game_states (user_id, game_name, game_data, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
        [req.session.userId, req.params.gameName, gameData]
      );
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Save game state error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Fishing Hole endpoints
app.post('/api/fishing-hole/player', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not logged in' });
    }
    
    const row = await getOne(
      dbType === 'postgresql' 
        ? 'SELECT * FROM fishing_hole_players WHERE user_id = $1'
        : 'SELECT * FROM fishing_hole_players WHERE user_id = ?',
      [req.session.userId]
    );
    
    if (row) {
      const inventory = JSON.parse(row.inventory || '[]');
      const trophyCatches = JSON.parse(row.trophy_catches || '[]');
      
      res.json({
        player: {
          name: row.player_name,
          level: row.level,
          experience: row.experience,
          money: row.credits,
          totalCaught: inventory.length,
          totalWeight: inventory.reduce((sum, fish) => sum + (fish.weight || 0), 0),
          biggestCatch: inventory.length > 0 ? Math.max(...inventory.map(f => f.weight || 0)) : 0,
          biggestCatchName: inventory.length > 0 ? 
            inventory.reduce((biggest, fish) => 
              (fish.weight || 0) > (biggest.weight || 0) ? fish : biggest, {weight: 0, name: 'None'}).name : 'None',
          inventory: inventory,
          trophyCatches: trophyCatches,
          location: { name: row.current_location || 'Lake Shore' },
          locationUnlocks: [0, 1],
          tackleUnlocks: { rods: [0], reels: [0], lines: [0], hooks: [0], bait: [0] },
          stats: { accuracy: 50, luck: 50, patience: 50, strength: 50 },
          gear: { rod: "Basic Rod", reel: "Basic Reel", line: "Monofilament", hook: "Basic Hook", bait: "Basic Bait" },
          achievements: [], challenges: [],
          seasonStats: { spring: { caught: 0, biggest: 0 }, summer: { caught: 0, biggest: 0 }, fall: { caught: 0, biggest: 0 }, winter: { caught: 0, biggest: 0 } }
        }
      });
    } else {
      res.json({ player: null });
    }
  } catch (error) {
    console.error('Get fishing player error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/fishing-hole/save', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not logged in' });
    }
    
    const { player, location } = req.body;
    
    if (dbType === 'postgresql') {
      await runQuery(
        `INSERT INTO fishing_hole_players (user_id, player_name, level, experience, credits, current_location, inventory, trophy_catches, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
         ON CONFLICT (user_id) 
         DO UPDATE SET player_name = $2, level = $3, experience = $4, credits = $5, current_location = $6, inventory = $7, trophy_catches = $8, updated_at = CURRENT_TIMESTAMP`,
        [
          req.session.userId, player.name, player.level, player.experience, player.money,
          location?.name || 'Lake Shore', JSON.stringify(player.inventory || []),
          JSON.stringify(player.trophyCatches || [])
        ]
      );
    } else {
      await runQuery(
        `INSERT OR REPLACE INTO fishing_hole_players (user_id, player_name, level, experience, credits, current_location, inventory, trophy_catches, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [
          req.session.userId, player.name, player.level, player.experience, player.money,
          location?.name || 'Lake Shore', JSON.stringify(player.inventory || []),
          JSON.stringify(player.trophyCatches || [])
        ]
      );
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Save fishing player error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Additional endpoints for compatibility
app.get('/api/bulletins', (req, res) => {
  res.json([{ id: 1, title: "Welcome to Retro-BBS", content: "Welcome to our BBS! Have fun exploring.", created_at: new Date() }]);
});

app.get('/api/sysop/check', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not logged in' });
    }
    
    const user = await getOne(
      dbType === 'postgresql' ? 'SELECT * FROM users WHERE id = $1' : 'SELECT * FROM users WHERE id = ?',
      [req.session.userId]
    );
    
    const isSysOp = user && user.access_level >= 100;
    res.json({ isSysOp });
  } catch (error) {
    console.error('SysOp check error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/sysop-chat/unread', (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Not logged in' });
  res.json([]);
});

app.get('/api/users/online', (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Not logged in' });
  res.json([]);
});

// Change password endpoint
app.post('/api/change-password', async (req, res) => {
  try {
    if (!req.session.userId) return res.status(401).json({ error: 'Not logged in' });
    
    const { currentPassword, newPassword } = req.body;
    
    const user = await getOne(
      dbType === 'postgresql' ? 'SELECT password_hash FROM users WHERE id = $1' : 'SELECT password_hash FROM users WHERE id = ?',
      [req.session.userId]
    );
    
    if (!user) return res.status(401).json({ error: 'User not found' });
    if (!bcrypt.compareSync(currentPassword, user.password_hash)) return res.status(401).json({ error: 'Current password is incorrect' });
    
    const newPasswordHash = bcrypt.hashSync(newPassword, 10);
    
    await runQuery(
      dbType === 'postgresql' ? 'UPDATE users SET password_hash = $1 WHERE id = $2' : 'UPDATE users SET password_hash = ? WHERE id = ?',
      [newPasswordHash, req.session.userId]
    );
    
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Users endpoint - get all registered users
app.get('/api/users', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not logged in' });
    }
    
    const result = await query(
      dbType === 'postgresql' 
        ? 'SELECT id, handle, real_name, location, access_level, credits, calls, messages_posted, created_at, last_seen FROM users ORDER BY created_at DESC'
        : 'SELECT id, handle, real_name, location, access_level, credits, calls, messages_posted, created_at, last_seen FROM users ORDER BY created_at DESC'
    );
    
    const users = result.rows.map(user => ({
      id: user.id,
      handle: user.handle,
      real_name: user.real_name,
      location: user.location,
      access_level: user.access_level,
      credits: user.credits,
      calls: user.calls || 0,
      messages_posted: user.messages_posted || 0,
      created_at: user.created_at,
      last_seen: user.last_seen
    }));
    
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Online users endpoint
app.get('/api/users/online', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not logged in' });
    }
    
    // Get users who have been active in the last 30 minutes
    const result = await query(
      dbType === 'postgresql' 
        ? 'SELECT id, handle, real_name, access_level, last_seen FROM users WHERE last_seen > NOW() - INTERVAL \'30 minutes\' ORDER BY last_seen DESC'
        : 'SELECT id, handle, real_name, access_level, last_seen FROM users WHERE last_seen > datetime(\'now\', \'-30 minutes\') ORDER BY last_seen DESC'
    );
    
    const onlineUsers = result.rows.map(user => ({
      id: user.id,
      handle: user.handle,
      real_name: user.real_name,
      access_level: user.access_level,
      last_seen: user.last_seen
    }));
    
    res.json(onlineUsers);
  } catch (error) {
    console.error('Get online users error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// User profile endpoints
app.get('/api/user/profile', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not logged in' });
    }
    
    const user = await getOne(
      dbType === 'postgresql' 
        ? 'SELECT * FROM users WHERE id = $1'
        : 'SELECT * FROM users WHERE id = ?',
      [req.session.userId]
    );
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      id: user.id,
      handle: user.handle,
      real_name: user.real_name,
      location: user.location,
      signature: user.signature || '',
      tagline: user.tagline || '',
      access_level: user.access_level,
      credits: user.credits,
      calls: user.calls || 0,
      time_online: user.time_online || 0,
      messages_posted: user.messages_posted || 0,
      files_uploaded: user.files_uploaded || 0,
      games_played: user.games_played || 0,
      avatar: user.avatar || '',
      created_at: user.created_at,
      last_seen: user.last_seen,
      // Add level for display
      level: user.access_level
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/user/profile', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not logged in' });
    }
    
    const { real_name, location, signature, tagline, avatar } = req.body;
    
    await runQuery(
      dbType === 'postgresql' 
        ? 'UPDATE users SET real_name = $1, location = $2, signature = $3, tagline = $4, avatar = $5 WHERE id = $6'
        : 'UPDATE users SET real_name = ?, location = ?, signature = ?, tagline = ?, avatar = ? WHERE id = ?',
      [real_name, location, signature, tagline, avatar, req.session.userId]
    );
    
    res.json({ success: true, message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Update user profile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// General leaderboard endpoint
app.get('/api/leaderboard', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not logged in' });
    }
    
    const result = await query(
      dbType === 'postgresql' 
        ? 'SELECT id, handle, access_level, credits, calls, messages_posted, games_played FROM users ORDER BY access_level DESC, credits DESC LIMIT 10'
        : 'SELECT id, handle, access_level, credits, calls, messages_posted, games_played FROM users ORDER BY access_level DESC, credits DESC LIMIT 10'
    );
    
    const leaderboard = result.rows.map((user, index) => ({
      id: user.id,
      handle: user.handle,
      level: user.access_level,
      credits: user.credits,
      calls: user.calls || 0,
      messages_posted: user.messages_posted || 0,
      games_played: user.games_played || 0
    }));
    
    res.json(leaderboard);
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Activity feed endpoint
app.get('/api/activity-feed', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not logged in' });
    }
    
    // Return empty array directly, not wrapped in object
    res.json([]);
  } catch (error) {
    console.error('Activity feed error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Bulletins endpoint
app.get('/api/bulletins', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not logged in' });
    }
    
    // For now, return sample bulletins
    res.json([
      { 
        id: 1, 
        title: "Welcome to Retro-BBS", 
        message: "Welcome to our BBS! Have fun exploring all the features.", 
        created_at: new Date().toISOString(),
        author_handle: "SysOp"
      },
      { 
        id: 2, 
        title: "Fishing Hole Game Available", 
        message: "Try out our new fishing hole game! Catch fish, level up, and compete on the leaderboard.", 
        created_at: new Date().toISOString(),
        author_handle: "SysOp"
      }
    ]);
  } catch (error) {
    console.error('Bulletins error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Messages endpoints
app.get('/api/messages/general', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not logged in' });
    }
    
    // For now, return sample messages
    res.json([
      {
        id: 1,
        subject: "Welcome to Retro-BBS!",
        author_handle: "SysOp",
        body: "Welcome to our BBS! Feel free to explore all the features and games available.",
        created_at: new Date().toISOString(),
        board: "general"
      },
      {
        id: 2,
        subject: "Fishing Hole Game Tips",
        author_handle: "SysOp", 
        body: "Try different locations and upgrade your gear to catch better fish!",
        created_at: new Date().toISOString(),
        board: "general"
      }
    ]);
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/messages/general', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not logged in' });
    }
    
    const { subject, content } = req.body;
    
    // For now, just return success (would save to database in full implementation)
    res.json({ success: true, message: 'Message posted successfully' });
  } catch (error) {
    console.error('Post message error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Message boards endpoints (all boards)
const messageBoards = ['general', 'gaming', 'tech', 'trading', 'offtopic'];

messageBoards.forEach(boardId => {
  app.get(`/api/messages/${boardId}`, async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: 'Not logged in' });
      }
      
      // Return sample messages for each board
      const sampleMessages = [
        {
          id: 1,
          subject: `Welcome to ${boardId.charAt(0).toUpperCase() + boardId.slice(1)} Board!`,
          author_handle: "SysOp",
          body: `This is the ${boardId} message board. Feel free to post here!`,
          created_at: new Date().toISOString(),
          board: boardId
        }
      ];
      
      res.json(sampleMessages);
    } catch (error) {
      console.error(`Get ${boardId} messages error:`, error);
      res.status(500).json({ error: 'Server error' });
    }
  });
});

// General messages endpoint
app.get('/api/messages', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not logged in' });
    }
    
    res.json({ message: 'Messages API working' });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Email endpoints
app.get('/api/emails/inbox', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not logged in' });
    }
    res.json([]);
  } catch (error) {
    console.error('Get inbox error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/emails/sent', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not logged in' });
    }
    res.json([]);
  } catch (error) {
    console.error('Get sent emails error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/emails/unread/count', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not logged in' });
    }
    res.json({ count: 0 });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/emails', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not logged in' });
    }
    res.json({ success: true, message: 'Email sent successfully' });
  } catch (error) {
    console.error('Send email error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Chat endpoints
app.get('/api/chat', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not logged in' });
    }
    res.json({ messages: [] });
  } catch (error) {
    console.error('Get chat error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Files endpoints
app.get('/api/files/:areaId', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not logged in' });
    }
    res.json({ files: [] });
  } catch (error) {
    console.error('Get files error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// One-liners endpoint
app.get('/api/oneliners', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not logged in' });
    }
    res.json([]);
  } catch (error) {
    console.error('Get oneliners error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// High scores endpoints
app.get('/api/high-scores/number-guess', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not logged in' });
    }
    res.json([]);
  } catch (error) {
    console.error('Get high scores error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/high-scores', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not logged in' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Save high score error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Registration endpoint
app.post('/api/register', async (req, res) => {
  try {
    const { handle, real_name, location, password } = req.body;
    
    // Check if user already exists
    const existingUser = await getOne(
      dbType === 'postgresql' 
        ? 'SELECT id FROM users WHERE handle = $1'
        : 'SELECT id FROM users WHERE handle = ?',
      [handle]
    );
    
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    
    // Create new user
    const hashedPassword = bcrypt.hashSync(password, 10);
    const newUser = await createUser(handle, real_name, location, hashedPassword);
    
    res.json({ success: true, user: newUser });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Logout endpoint
app.post('/api/logout', async (req, res) => {
  try {
    req.session.destroy();
    res.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// SysOp check endpoint
app.get('/api/sysop/check', (req, res) => {
  try {
    console.log('SysOp check - Session data:', req.session);
    
    if (!req.session.userId) {
      console.log('SysOp check - No userId in session');
      return res.status(401).json({ isSysop: false });
    }
    
    // Check if user has SysOp privileges (access level >= 100)
    const user = req.session.user;
    console.log('SysOp check - User object:', user);
    const isSysop = user && user.access_level >= 100;
    console.log('SysOp check - isSysop:', isSysop);
    
    res.json({ isSysOp: isSysop });
  } catch (error) {
    console.error('SysOp check error:', error);
    res.status(500).json({ isSysOp: false });
  }
});

// SysOp API endpoints
app.get('/api/sysop/users', async (req, res) => {
  try {
    if (!req.session.userId || !req.session.user || req.session.user.access_level < 100) {
      return res.status(403).json({ error: 'SysOp privileges required' });
    }
    
    const result = await query(
      dbType === 'postgresql' 
        ? 'SELECT id, handle, real_name, location, access_level, credits, calls, messages_posted, files_uploaded, games_played, time_online, created_at, last_seen FROM users ORDER BY created_at DESC'
        : 'SELECT id, handle, real_name, location, access_level, credits, calls, messages_posted, files_uploaded, games_played, time_online, created_at, last_seen FROM users ORDER BY created_at DESC'
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('SysOp users error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/sysop/stats', async (req, res) => {
  try {
    if (!req.session.userId || !req.session.user || req.session.user.access_level < 100) {
      return res.status(403).json({ error: 'SysOp privileges required' });
    }
    
    // Get basic stats
    const userCount = await query(
      dbType === 'postgresql' 
        ? 'SELECT COUNT(*) as count FROM users'
        : 'SELECT COUNT(*) as count FROM users'
    );
    
    const gameCount = await query(
      dbType === 'postgresql' 
        ? 'SELECT COUNT(*) as count FROM fishing_hole_players'
        : 'SELECT COUNT(*) as count FROM fishing_hole_players'
    );
    
    res.json({
      totalUsers: userCount.rows[0].count,
      totalGames: gameCount.rows[0].count,
      onlineUsers: onlineUsers.size,
      serverUptime: process.uptime()
    });
  } catch (error) {
    console.error('SysOp stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/sysop-chat/all', async (req, res) => {
  try {
    if (!req.session.userId || !req.session.user || req.session.user.access_level < 100) {
      return res.status(403).json({ error: 'SysOp privileges required' });
    }
    
    // For now, return empty chat history
    res.json([]);
  } catch (error) {
    console.error('SysOp chat all error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/sysop-chat/respond', async (req, res) => {
  try {
    if (!req.session.userId || !req.session.user || req.session.user.access_level < 100) {
      return res.status(403).json({ error: 'SysOp privileges required' });
    }
    
    const { message, recipientId } = req.body;
    
    // Broadcast SysOp response to all users
    io.emit('sysop-chat-message', {
      sender: 'SysOp',
      message: message,
      timestamp: new Date().toISOString(),
      isResponse: true
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('SysOp chat respond error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/sysop/activity-logs', async (req, res) => {
  try {
    if (!req.session.userId || !req.session.user || req.session.user.access_level < 100) {
      return res.status(403).json({ error: 'SysOp privileges required' });
    }
    
    // For now, return sample activity logs
    res.json([
      {
        id: 1,
        user: 'SysOp',
        action: 'System Started',
        timestamp: new Date().toISOString(),
        details: 'BBS server initialized'
      }
    ]);
  } catch (error) {
    console.error('SysOp activity logs error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/sysop/database-stats', async (req, res) => {
  try {
    if (!req.session.userId || !req.session.user || req.session.user.access_level < 100) {
      return res.status(403).json({ error: 'SysOp privileges required' });
    }
    
    // Get database statistics
    const userCount = await query(
      dbType === 'postgresql' 
        ? 'SELECT COUNT(*) as count FROM users'
        : 'SELECT COUNT(*) as count FROM users'
    );
    
    const gameCount = await query(
      dbType === 'postgresql' 
        ? 'SELECT COUNT(*) as count FROM fishing_hole_players'
        : 'SELECT COUNT(*) as count FROM fishing_hole_players'
    );
    
    res.json({
      databaseType: dbType,
      totalUsers: userCount.rows[0].count,
      totalGamePlayers: gameCount.rows[0].count,
      onlineUsers: onlineUsers.size
    });
  } catch (error) {
    console.error('SysOp database stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Additional SysOp endpoints
app.get('/api/sysop/game-states', async (req, res) => {
  try {
    if (!req.session.userId || !req.session.user || req.session.user.access_level < 100) {
      return res.status(403).json({ error: 'SysOp privileges required' });
    }
    
    // Return game states for all users
    const result = await query(
      dbType === 'postgresql' 
        ? 'SELECT user_id, game_name, game_data, created_at, updated_at FROM game_states ORDER BY updated_at DESC'
        : 'SELECT user_id, game_name, game_data, created_at, updated_at FROM game_states ORDER BY updated_at DESC'
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('SysOp game states error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/sysop/users/search', async (req, res) => {
  try {
    if (!req.session.userId || !req.session.user || req.session.user.access_level < 100) {
      return res.status(403).json({ error: 'SysOp privileges required' });
    }
    
    const { q } = req.query;
    if (!q) {
      return res.json([]);
    }
    
    const result = await query(
      dbType === 'postgresql' 
        ? 'SELECT id, handle, real_name, location, access_level, credits, created_at FROM users WHERE handle ILIKE $1 OR real_name ILIKE $1 ORDER BY handle'
        : 'SELECT id, handle, real_name, location, access_level, credits, created_at FROM users WHERE handle LIKE ? OR real_name LIKE ? ORDER BY handle',
      dbType === 'postgresql' ? [`%${q}%`] : [`%${q}%`, `%${q}%`]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('SysOp user search error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/sysop/users/:userId', async (req, res) => {
  try {
    if (!req.session.userId || !req.session.user || req.session.user.access_level < 100) {
      return res.status(403).json({ error: 'SysOp privileges required' });
    }
    
    const { userId } = req.params;
    
    const result = await query(
      dbType === 'postgresql' 
        ? 'SELECT id, handle, real_name, location, access_level, credits, calls, messages_posted, files_uploaded, games_played, time_online, created_at, last_seen FROM users WHERE id = $1'
        : 'SELECT id, handle, real_name, location, access_level, credits, calls, messages_posted, files_uploaded, games_played, time_online, created_at, last_seen FROM users WHERE id = ?',
      [userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('SysOp user details error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/sysop/users/:userId', async (req, res) => {
  try {
    if (!req.session.userId || !req.session.user || req.session.user.access_level < 100) {
      return res.status(403).json({ error: 'SysOp privileges required' });
    }
    
    const { userId } = req.params;
    const { access_level, credits } = req.body;
    
    await query(
      dbType === 'postgresql' 
        ? 'UPDATE users SET access_level = $1, credits = $2 WHERE id = $3'
        : 'UPDATE users SET access_level = ?, credits = ? WHERE id = ?',
      [access_level, credits, userId]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('SysOp user update error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/sysop/users/:userId', async (req, res) => {
  try {
    if (!req.session.userId || !req.session.user || req.session.user.access_level < 100) {
      return res.status(403).json({ error: 'SysOp privileges required' });
    }
    
    const { userId } = req.params;
    
    // Don't allow deleting the SysOp user
    if (parseInt(userId) === 1) {
      return res.status(400).json({ error: 'Cannot delete SysOp user' });
    }
    
    await query(
      dbType === 'postgresql' 
        ? 'DELETE FROM users WHERE id = $1'
        : 'DELETE FROM users WHERE id = ?',
      [userId]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('SysOp user delete error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Fishing hole leaderboard endpoint
app.get('/api/game-state/fishing-hole/leaderboard', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not logged in' });
    }
    
    const result = await query(
      dbType === 'postgresql' 
        ? 'SELECT player_name, level, experience, credits, totalCaught, biggestCatch FROM fishing_hole_players ORDER BY level DESC, experience DESC LIMIT 10'
        : 'SELECT player_name, level, experience, credits, totalCaught, biggestCatch FROM fishing_hole_players ORDER BY level DESC, experience DESC LIMIT 10'
    );
    
    const leaderboard = result.rows.map((row, index) => ({
      rank: index + 1,
      name: row.player_name,
      level: row.level,
      experience: row.experience,
      money: row.credits,
      totalCaught: row.totalCaught || 0,
      biggestCatch: row.biggestCatch || 0
    }));
    
    res.json({ leaderboard });
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

} // End of setupRoutes function

// Socket.IO
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

  // SysOp chat handlers
  socket.on('get-sysop-status', () => {
    // Check if SysOp is online (any user with access level >= 100)
    const sysopOnline = Array.from(onlineUsers.values()).some(user => user.accessLevel >= 100);
    socket.emit('sysop-status', { online: sysopOnline });
  });

  socket.on('get-sysop-chat-history', async () => {
    try {
      // For now, return empty history - can be enhanced later
      const messages = [];
      socket.emit('sysop-chat-history', { messages });
    } catch (error) {
      console.error('Error getting SysOp chat history:', error);
      socket.emit('sysop-chat-history', { messages: [] });
    }
  });

  socket.on('sysop-chat-message', (data) => {
    // Broadcast SysOp chat message to all users
    io.emit('sysop-chat-message', {
      sender: data.sender || 'SysOp',
      message: data.message,
      timestamp: new Date().toISOString()
    });
  });
});

// Initialize database and start server
async function startServer() {
  try {
    await initDatabase();
    console.log('Database initialization completed');
    
    // Set up session middleware now that we know the database type
    let sessionStore;
    try {
      if (dbType === 'postgresql') {
        const PostgreSQLStore = require('connect-pg-simple')(session);
        sessionStore = new PostgreSQLStore({
          conString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
        });
        console.log('Using PostgreSQL session store');
      } else {
        // For SQLite fallback, use memory store
        sessionStore = undefined;
        console.log('Using memory session store');
      }
    } catch (error) {
      console.error('Failed to initialize session store:', error);
      sessionStore = undefined;
    }

    app.use(session({
      store: sessionStore,
      secret: 'bbs-secret-key',
      resave: false,
      saveUninitialized: false,
      cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
    }));

    // Set up all routes now that database is initialized
    setupRoutes();

    // Start server
    server.listen(PORT, () => {
      console.log(`Retro-BBS Server (${dbType}) running on port ${PORT}`);
      console.log(`Visit http://localhost:${PORT} to connect`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
