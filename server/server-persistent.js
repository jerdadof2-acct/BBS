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
          return { lastID: result.rows[0]?.id || 0 };
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
      
      // Create sessions table for connect-pg-simple
      await db.run(`
        CREATE TABLE IF NOT EXISTS "session" (
          "sid" varchar NOT NULL COLLATE "default",
          "sess" json NOT NULL,
          "expire" timestamp(6) NOT NULL
        )
        WITH (OIDS=FALSE);
      `);

      await db.run(`
        ALTER TABLE "session" DROP CONSTRAINT IF EXISTS "session_pkey";
        ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;
      `);

      await db.run(`
        CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
      `);

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

} // End of setupRoutes function

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
