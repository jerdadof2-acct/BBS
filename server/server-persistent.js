const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const session = require('express-session');
const cors = require('cors');
const bcrypt = require('bcrypt');

// Import High Noon Hustle server
const hnhRoutes = require('./hnh-server-simple');

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
      
      // Helper function to convert SQLite syntax to PostgreSQL
      const convertQuery = (text, params) => {
        if (!params || params.length === 0) return { text, params };
        
        let paramIndex = 1;
        const convertedText = text.replace(/\?/g, () => `$${paramIndex++}`);
        return { text: convertedText, params };
      };

      db = {
        query: (text, params) => {
          const { text: convertedText, params: convertedParams } = convertQuery(text, params);
          return pool.query(convertedText, convertedParams);
        },
        get: async (text, params) => {
          const { text: convertedText, params: convertedParams } = convertQuery(text, params);
          const result = await pool.query(convertedText, convertedParams);
          return result.rows[0] || null;
        },
        run: async (text, params) => {
          const { text: convertedText, params: convertedParams } = convertQuery(text, params);
          const result = await pool.query(convertedText, convertedParams);
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
          gear TEXT DEFAULT '{"rod":"Basic Rod","reel":"Basic Reel","line":"Monofilament","hook":"Basic Hook","bait":"Basic Bait"}',
          tackle_unlocks TEXT DEFAULT '{"rods":[0],"reels":[0],"lines":[0],"hooks":[0],"bait":[0]}',
          location_unlocks TEXT DEFAULT '[0]',
          stats TEXT DEFAULT '{"accuracy":50,"luck":50,"patience":50,"strength":50}',
          tournament_stats TEXT DEFAULT '{"tournamentsPlayed":0,"tournamentsWon":0,"biggestTournamentFish":0,"biggestTournamentBag":0,"totalTournamentWeight":0,"totalTournamentFish":0}',
          total_caught INTEGER DEFAULT 0,
          total_weight REAL DEFAULT 0,
          biggest_catch REAL DEFAULT 0,
          biggest_catch_name TEXT DEFAULT 'None',
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
        
        // Add fishing statistics columns
        await db.run(`ALTER TABLE fishing_hole_players ADD COLUMN IF NOT EXISTS total_caught INTEGER DEFAULT 0;`);
        await db.run(`ALTER TABLE fishing_hole_players ADD COLUMN IF NOT EXISTS total_weight REAL DEFAULT 0.0;`);
        await db.run(`ALTER TABLE fishing_hole_players ADD COLUMN IF NOT EXISTS biggest_catch REAL DEFAULT 0.0;`);
        await db.run(`ALTER TABLE fishing_hole_players ADD COLUMN IF NOT EXISTS biggest_catch_name TEXT DEFAULT 'None';`);
        
        // Add new fishing game columns
        await db.run(`ALTER TABLE fishing_hole_players ADD COLUMN IF NOT EXISTS gear TEXT DEFAULT '{"rod":"Basic Rod","reel":"Basic Reel","line":"Monofilament","hook":"Basic Hook","bait":"Basic Bait"}';`);
        await db.run(`ALTER TABLE fishing_hole_players ADD COLUMN IF NOT EXISTS tackle_unlocks TEXT DEFAULT '{"rods":[0],"reels":[0],"lines":[0],"hooks":[0],"bait":[0]}';`);
        await db.run(`ALTER TABLE fishing_hole_players ADD COLUMN IF NOT EXISTS location_unlocks TEXT DEFAULT '[0]';`);
        await db.run(`ALTER TABLE fishing_hole_players ADD COLUMN IF NOT EXISTS stats TEXT DEFAULT '{"accuracy":50,"luck":50,"patience":50,"strength":50}';`);
        await db.run(`ALTER TABLE fishing_hole_players ADD COLUMN IF NOT EXISTS tournament_stats TEXT DEFAULT '{"tournamentsPlayed":0,"tournamentsWon":0,"biggestTournamentFish":0,"biggestTournamentBag":0,"totalTournamentWeight":0,"totalTournamentFish":0}';`);
        
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
      gear TEXT DEFAULT '{"rod":"Basic Rod","reel":"Basic Reel","line":"Monofilament","hook":"Basic Hook","bait":"Basic Bait"}',
      tackle_unlocks TEXT DEFAULT '{"rods":[0],"reels":[0],"lines":[0],"hooks":[0],"bait":[0]}',
      location_unlocks TEXT DEFAULT '[0]',
      stats TEXT DEFAULT '{"accuracy":50,"luck":50,"patience":50,"strength":50}',
      tournament_stats TEXT DEFAULT '{"tournamentsPlayed":0,"tournamentsWon":0,"biggestTournamentFish":0,"biggestTournamentBag":0,"totalTournamentWeight":0,"totalTournamentFish":0}',
      total_caught INTEGER DEFAULT 0,
      total_weight REAL DEFAULT 0,
      biggest_catch REAL DEFAULT 0,
      biggest_catch_name TEXT DEFAULT 'None',
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
const onlineUsers = new Map(); // socketId -> { userId, handle, accessLevel, lastActivity, currentLocation }

// Tournament state management
const activeTournaments = new Map(); // tournamentId -> { game, host, gameType, participants, phase, startTime, etc. }

// Server-side card generation for tournaments
function generateTournamentCards(tournament, roundNumber) {
  // Create a standard 52-card deck
  const suits = ['♠', '♥', '♦', '♣'];
  const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const deck = [];
  
  for (let suit of suits) {
    for (let rank of ranks) {
      deck.push({ rank, suit });
    }
  }
  
  // Shuffle deck with deterministic seed
  const seed = tournament.tournamentId + roundNumber;
  let currentSeed = seed;
  for (let i = deck.length - 1; i > 0; i--) {
    currentSeed = (currentSeed * 9301 + 49297) % 233280;
    const j = Math.floor((currentSeed / 233280) * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  
  // Sort participants by ID for consistent dealing
  const sortedParticipants = [...tournament.participants].sort((a, b) => a.id.localeCompare(b.id));
  
  // Deal 5 cards to each participant
  const playerHands = [];
  let cardIndex = 0;
  
  for (let participant of sortedParticipants) {
    const hand = deck.slice(cardIndex, cardIndex + 5);
    cardIndex += 5;
    
    playerHands.push({
      participantId: participant.id,
      participantName: participant.name,
      cards: hand
    });
  }
  
  return playerHands;
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
  // Initialize High Noon Hustle database connection
  hnhRoutes.initDatabase(db, dbType);
  
  // High Noon Hustle API routes
  app.use('/api/hnh', hnhRoutes);
  
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
    
    // Update last_seen timestamp and increment calls
    await runQuery(
      dbType === 'postgresql' 
        ? 'UPDATE users SET last_seen = CURRENT_TIMESTAMP, calls = calls + 1 WHERE id = $1'
        : 'UPDATE users SET last_seen = CURRENT_TIMESTAMP, calls = calls + 1 WHERE id = ?',
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
        credits: user.credits,
        calls: user.calls || 0,
        messages_posted: user.messages_posted || 0,
        files_uploaded: user.files_uploaded || 0,
        games_played: user.games_played || 0,
        time_online: user.time_online || 0,
        location: user.location || 'Unknown',
        signature: user.signature || '',
        tagline: user.tagline || '',
        avatar: user.avatar || ''
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
      credits: user.credits,
      calls: user.calls || 0,
      messages_posted: user.messages_posted || 0,
      files_uploaded: user.files_uploaded || 0,
      games_played: user.games_played || 0,
      time_online: user.time_online || 0,
      location: user.location || 'Unknown',
      signature: user.signature || '',
      tagline: user.tagline || '',
      avatar: user.avatar || ''
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
      const gear = JSON.parse(row.gear || '{"rod":"Basic Rod","reel":"Basic Reel","line":"Monofilament","hook":"Basic Hook","bait":"Basic Bait"}');
      const tackleUnlocks = JSON.parse(row.tackle_unlocks || '{"rods":[0],"reels":[0],"lines":[0],"hooks":[0],"bait":[0]}');
      const locationUnlocks = JSON.parse(row.location_unlocks || '[0]');
      const stats = JSON.parse(row.stats || '{"accuracy":50,"luck":50,"patience":50,"strength":50}');
      const tournamentStats = JSON.parse(row.tournament_stats || '{"tournamentsPlayed":0,"tournamentsWon":0,"biggestTournamentFish":0,"biggestTournamentBag":0,"totalTournamentWeight":0,"totalTournamentFish":0}');
      
      res.json({
        player: {
          name: row.player_name,
          level: row.level,
          experience: row.experience,
          money: row.credits,
          totalCaught: row.total_caught || 0,
          totalWeight: row.total_weight || 0,
          biggestCatch: row.biggest_catch || 0,
          biggestCatchName: row.biggest_catch_name || 'None',
          inventory: inventory,
          trophyCatches: trophyCatches,
          location: { name: row.current_location || 'Lake Shore' },
          locationUnlocks: locationUnlocks,
          tackleUnlocks: tackleUnlocks,
          stats: stats,
          gear: gear,
          achievements: [], challenges: [],
          seasonStats: { spring: { caught: 0, biggest: 0 }, summer: { caught: 0, biggest: 0 }, fall: { caught: 0, biggest: 0 }, winter: { caught: 0, biggest: 0 } }
        },
        tournament: {
          stats: tournamentStats
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
        `INSERT INTO fishing_hole_players (user_id, player_name, level, experience, credits, current_location, inventory, trophy_catches, gear, tackle_unlocks, location_unlocks, stats, tournament_stats, total_caught, total_weight, biggest_catch, biggest_catch_name, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, CURRENT_TIMESTAMP)
         ON CONFLICT (user_id) 
         DO UPDATE SET player_name = $2, level = $3, experience = $4, credits = $5, current_location = $6, inventory = $7, trophy_catches = $8, gear = $9, tackle_unlocks = $10, location_unlocks = $11, stats = $12, tournament_stats = $13, total_caught = $14, total_weight = $15, biggest_catch = $16, biggest_catch_name = $17, updated_at = CURRENT_TIMESTAMP`,
        [
          req.session.userId, player.name, player.level, player.experience, player.money,
          location?.name || 'Lake Shore', JSON.stringify(player.inventory || []),
          JSON.stringify(player.trophyCatches || []), JSON.stringify(player.gear || {}),
          JSON.stringify(player.tackleUnlocks || {}), JSON.stringify(player.locationUnlocks || []),
          JSON.stringify(player.stats || {}), JSON.stringify(player.tournamentStats || {}),
          player.totalCaught || 0, player.totalWeight || 0, player.biggestCatch || 0, player.biggestCatchName || 'None'
        ]
      );
    } else {
      await runQuery(
        `INSERT OR REPLACE INTO fishing_hole_players (user_id, player_name, level, experience, credits, current_location, inventory, trophy_catches, gear, tackle_unlocks, location_unlocks, stats, tournament_stats, total_caught, total_weight, biggest_catch, biggest_catch_name, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [
          req.session.userId, player.name, player.level, player.experience, player.money,
          location?.name || 'Lake Shore', JSON.stringify(player.inventory || []),
          JSON.stringify(player.trophyCatches || []), JSON.stringify(player.gear || {}),
          JSON.stringify(player.tackleUnlocks || {}), JSON.stringify(player.locationUnlocks || []),
          JSON.stringify(player.stats || {}), JSON.stringify(player.tournamentStats || {}),
          player.totalCaught || 0, player.totalWeight || 0, player.biggestCatch || 0, player.biggestCatchName || 'None'
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

app.post('/api/chat', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not logged in' });
    }
    
    const { message, recipient_id } = req.body;
    const user = await db.get('SELECT handle FROM users WHERE id = ?', [req.session.userId]);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Store message in database
    await db.run(
      'INSERT INTO chat_messages (sender_id, sender_handle, message, recipient_id, created_at) VALUES (?, ?, ?, ?, ?)',
      [req.session.userId, user.handle, message, recipient_id, new Date().toISOString()]
    );
    
    // Broadcast to all connected users
    io.emit('chat-message', {
      sender: user.handle,
      message: message,
      timestamp: new Date().toISOString()
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Post chat error:', error);
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
    const existingUser = await db.get(
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
    const result = await db.run(
      dbType === 'postgresql'
        ? 'INSERT INTO users (handle, real_name, location, password_hash, access_level, credits, calls, messages_posted, files_uploaded, games_played, time_online, signature, tagline, avatar, created_at, last_seen) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) RETURNING *'
        : 'INSERT INTO users (handle, real_name, location, password_hash, access_level, credits, calls, messages_posted, files_uploaded, games_played, time_online, signature, tagline, avatar, created_at, last_seen) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      dbType === 'postgresql'
        ? [handle, real_name, location, hashedPassword, 1, 100, 0, 0, 0, 0, 0, '', '', '', new Date().toISOString(), new Date().toISOString()]
        : [handle, real_name, location, hashedPassword, 1, 100, 0, 0, 0, 0, 0, '', '', '', new Date().toISOString(), new Date().toISOString()]
    );
    
    console.log('Registration result:', result);
    console.log('Result rows:', result.rows);
    
    const newUser = dbType === 'postgresql' 
      ? (result.rows && result.rows[0] ? result.rows[0] : { id: result.insertId || 0, handle, real_name, location, access_level: 1, credits: 100 })
      : { id: result.lastID, handle, real_name, location, access_level: 1, credits: 100 };
    
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
    
    console.log('Fetching fishing hole leaderboard...');
    
    // First try with the new columns, fall back to basic columns if they don't exist
    let result;
    try {
      result = await query(
        dbType === 'postgresql' 
          ? 'SELECT player_name, level, experience, credits, total_caught, total_weight, biggest_catch, biggest_catch_name, inventory FROM fishing_hole_players ORDER BY biggest_catch DESC, level DESC LIMIT 10'
          : 'SELECT player_name, level, experience, credits, total_caught, total_weight, biggest_catch, biggest_catch_name, inventory FROM fishing_hole_players ORDER BY biggest_catch DESC, level DESC LIMIT 10'
      );
    } catch (columnError) {
      console.log('New columns not available, using basic query:', columnError.message);
      // Fallback to basic columns if the new ones don't exist yet
      result = await query(
        dbType === 'postgresql' 
          ? 'SELECT player_name, level, experience, credits, inventory FROM fishing_hole_players ORDER BY level DESC, experience DESC LIMIT 10'
          : 'SELECT player_name, level, experience, credits, inventory FROM fishing_hole_players ORDER BY level DESC, experience DESC LIMIT 10'
      );
    }
    
    console.log('Leaderboard query result:', result.rows.length, 'players');
    
    // Create leaderboard data in the format expected by frontend
    const topCatches = result.rows.map((row, index) => ({
      playerName: row.player_name,
      level: row.level,
      biggestCatch: row.biggest_catch || 0,
      biggestCatchName: row.biggest_catch_name || "None"
    }));
    
    // Sort topCatches by biggest catch weight (descending)
    topCatches.sort((a, b) => b.biggestCatch - a.biggestCatch);
    
    const topBags = result.rows.map((row, index) => {
      let top10Weight = 0;
      let totalCaught = row.total_caught || 0;
      
      // Calculate top 10 fish by weight from inventory
      if (row.inventory) {
        try {
          const inventory = JSON.parse(row.inventory);
          if (Array.isArray(inventory)) {
            // Sort fish by weight (descending) and take top 10
            const sortedFish = inventory
              .filter(fish => fish && typeof fish.weight === 'number')
              .sort((a, b) => b.weight - a.weight)
              .slice(0, 10);
            
            top10Weight = sortedFish.reduce((sum, fish) => sum + fish.weight, 0);
          }
        } catch (error) {
          console.log('Error parsing inventory for player', row.player_name, ':', error.message);
        }
      }
      
      return {
        playerName: row.player_name,
        level: row.level,
        top10Weight: top10Weight,
        totalCaught: totalCaught
      };
    });
    
    // Sort topBags by top10Weight (descending)
    topBags.sort((a, b) => b.top10Weight - a.top10Weight);
    
    console.log('Returning leaderboard data:', { topCatches: topCatches.length, topBags: topBags.length });
    
    res.json({
      topCatches: topCatches,
      topBags: topBags
    });
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Word Race leaderboard endpoint
app.get('/api/word-race/leaderboard', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not logged in' });
    }
    
    const result = await query(
      'SELECT player_name, best_wpm, total_races, wins FROM word_race_stats ORDER BY best_wpm DESC LIMIT 10'
    );
    
    const leaderboard = result.rows.map((row, index) => ({
      rank: index + 1,
      playerName: row.player_name,
      bestWPM: row.best_wpm || 0,
      totalRaces: row.total_races || 0,
      wins: row.wins || 0
    }));
    
    res.json(leaderboard);
  } catch (error) {
    console.error('Word Race leaderboard error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Trivia Battle leaderboard endpoint
app.get('/api/trivia-battle/leaderboard', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not logged in' });
    }
    
    const result = await query(
      'SELECT player_name, total_games, total_wins, total_correct, total_questions FROM trivia_battle_stats ORDER BY total_wins DESC, (total_correct::float / NULLIF(total_questions, 0)) DESC LIMIT 10'
    );
    
    const leaderboard = result.rows.map((row, index) => ({
      rank: index + 1,
      playerName: row.player_name,
      totalGames: row.total_games || 0,
      totalWins: row.total_wins || 0,
      accuracy: row.total_questions > 0 ? ((row.total_correct / row.total_questions) * 100).toFixed(1) : 0
    }));
    
    res.json(leaderboard);
  } catch (error) {
    console.error('Trivia Battle leaderboard error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

} // End of setupRoutes function

// Socket.IO
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('user-login', async (data) => {
    const { userId, handle, accessLevel } = data;
    console.log('🔍 DEBUG: User login - userId:', userId, 'handle:', handle, 'accessLevel:', accessLevel);
    
    // Increment user calls counter
    try {
      await db.run('UPDATE users SET last_seen = CURRENT_TIMESTAMP, calls = calls + 1 WHERE id = ?', [userId]);
      console.log('✅ User calls incremented for user:', handle);
    } catch (error) {
      console.error('❌ Error incrementing user calls:', error);
    }
    
    onlineUsers.set(socket.id, { userId, handle, accessLevel: accessLevel || 1, lastActivity: Date.now(), currentLocation: 'Main Menu' });
    console.log('🔍 DEBUG: Online users after login:', Array.from(onlineUsers.values()));
    
    // Broadcast user login to ALL users (including the person who just logged in)
    io.emit('user-online', { userId, handle });
    
    // Send BBS-wide login announcement
    io.emit('bbs-announcement', {
      type: 'user-login',
      message: `🌟 ${handle} has logged on to the BBS!`,
      user: handle,
      timestamp: new Date().toISOString()
    });
    
    io.emit('online-users-update', Array.from(onlineUsers.values()));
  });

  socket.on('user-logout', () => {
    const user = onlineUsers.get(socket.id);
    if (user) {
      onlineUsers.delete(socket.id);
      
      // Broadcast user logout to ALL users
      io.emit('user-offline', { userId: user.userId, handle: user.handle });
      
      // Send BBS-wide logout announcement
      io.emit('bbs-announcement', {
        type: 'user-logout',
        message: `👋 ${user.handle} has logged off the BBS.`,
        user: user.handle,
        timestamp: new Date().toISOString()
      });
      
      io.emit('online-users-update', Array.from(onlineUsers.values()));
    }
  });

  socket.on('get-online-users', () => {
    socket.emit('online-users-update', Array.from(onlineUsers.values()));
  });

  socket.on('chat-message', async (data) => {
    const user = onlineUsers.get(socket.id);
    if (user && data.message) {
      try {
        const { createChatMessage } = require('./db');
        await createChatMessage(db, {
          sender_id: user.userId,
          recipient_id: data.recipientId || null,
          message: data.message,
          is_private: data.isPrivate || false
        });
        
        if (data.isPrivate && data.recipientId) {
          // Send to specific recipient
          socket.to(data.recipientSocketId).emit('chat-message', {
            sender: user.handle,
            message: data.message,
            isPrivate: true
          });
        } else {
          // Broadcast to all
          io.emit('chat-message', {
            sender: user.handle,
            message: data.message,
            isPrivate: false
          });
        }
      } catch (error) {
        console.error('Chat message error:', error);
      }
    }
  });

  socket.on('game-action', (data) => {
    // Broadcast game actions to other players
    socket.broadcast.to(data.room).emit('game-update', data);
  });

  socket.on('join-game-room', (data) => {
    // Handle both old string format and new object format
    const room = typeof data === 'string' ? data : data.game;
    const playerData = typeof data === 'object' ? data.player : null;
    
    console.log('DEBUG: User joining room:', room, 'socketId:', socket.id);
    console.log('DEBUG: Player data:', playerData);
    socket.join(room);
    const user = onlineUsers.get(socket.id);
    console.log('DEBUG: User data:', user);
    
    if (user && room === 'high-noon-hustle') {
      // High Noon Hustle specific player join notification
      console.log('DEBUG: Emitting player-joined for high-noon-hustle:', user.handle);
      
      // Store the player's character data in the onlineUsers map FIRST
      if (playerData) {
        user.characterData = {
          username: playerData.username || user.handle, // Store game username
          display_name: playerData.display_name || user.handle, // Store game display name
          character_class: playerData.character_class || 'gunslinger',
          current_town: playerData.current_town || 'tumbleweed_junction'
        };
        console.log('DEBUG: Stored character data for', user.handle, ':', user.characterData);
      } else {
        console.log('DEBUG: No playerData provided for', user.handle);
      }
      
      // Send current player list to the new player (after storing the new player's data)
      const currentPlayers = Array.from(onlineUsers.values()).map(u => {
        // Get the actual character data for each player from their stored data
        const storedPlayerData = u.characterData || {};
        console.log('DEBUG: Building current players list for', u.handle, 'stored data:', storedPlayerData);
        return {
          id: u.userId,
          name: storedPlayerData.username || u.handle,
          display_name: storedPlayerData.display_name || u.handle,
          character_class: storedPlayerData.character_class || 'gunslinger',
          current_town: storedPlayerData.current_town || 'tumbleweed_junction',
          socketId: u.socketId
        };
      });
      
      // Send current players to the new joiner
      console.log('DEBUG: Sending current-players to', user.handle, ':', currentPlayers);
      socket.emit('current-players', {
        game: 'high-noon-hustle',
        players: currentPlayers
      });
      
      // Send to all players in the room (including the one who just joined)
      // Use the stored character data
      const storedData = user.characterData || {};
      const playerTown = storedData.current_town || 'tumbleweed_junction';
      const characterClass = storedData.character_class || 'gunslinger';
      
      const playerJoinedData = { 
        game: 'high-noon-hustle',
        player: {
          id: user.userId,
          name: storedData.username || user.handle,
          display_name: storedData.display_name || user.handle,
          character_class: characterClass,
          current_town: playerTown,
          socketId: socket.id
        }
      };
      console.log('DEBUG: Broadcasting player-joined to all players:', playerJoinedData);
      io.to(room).emit('player-joined', playerJoinedData);
    } else {
      // Generic player join notification
      socket.to(room).emit('player-joined', { socketId: socket.id });
    }
  });

  socket.on('leave-game-room', (room) => {
    socket.leave(room);
    socket.to(room).emit('player-left', { socketId: socket.id });
  });

  // Tournament handlers for High Noon Hustle
  socket.on('tournament-start', (data) => {
    console.log('DEBUG: Received tournament-start event on server:', data);
    if (data.game === 'high-noon-hustle') {
      console.log('DEBUG: Tournament start from', data.host, ':', data.gameType);
      
      // Store tournament state on server
      const tournamentId = data.tournamentId;
      const user = onlineUsers.get(socket.id);
      if (user) {
        activeTournaments.set(tournamentId, {
          game: data.game,
          host: data.host,
          hostUserId: user.userId,
          gameType: data.gameType,
          tournamentId: tournamentId,
          rounds: data.rounds || 10, // Store selected rounds or default to 10
          participants: [{
            id: user.characterData?.username || user.handle, // Use game username if available
            name: user.characterData?.display_name || user.handle, // Use game display name
            display_name: user.characterData?.display_name || user.handle, // Use game display name
            score: 0,
            gold: 0
          }],
          phase: 'joining',
          joinEndTime: Date.now() + (data.joinPeriod * 1000),
          startTime: null,
          duration: (data.rounds || 10) * 10 * 1000, // Calculate duration based on rounds (10 seconds per round)
          active: false
        });
        console.log('DEBUG: Stored tournament state:', activeTournaments.get(tournamentId));
        
        // Schedule tournament to start after joining period, but only if participants are ready
        setTimeout(() => {
          const tournament = activeTournaments.get(tournamentId);
          if (tournament && tournament.phase === 'joining') {
            // Check if all participants are actually in the game room
            const participantsInRoom = tournament.participants.filter(participant => {
              // Find the socket for this participant
              const participantSocket = Array.from(onlineUsers.entries()).find(([socketId, user]) => 
                user.characterData?.username === participant.id
              );
              return participantSocket && participantSocket[1].currentLocation === 'Door Games';
            });
            
            console.log('DEBUG: Tournament join period ended. Participants in room:', participantsInRoom.length, 'of', tournament.participants.length);
            
            // Only start if all participants are in the game room
            if (participantsInRoom.length === tournament.participants.length && tournament.participants.length > 1) {
              tournament.phase = 'active';
              tournament.active = true;
              tournament.startTime = Date.now();
              console.log('DEBUG: Tournament starting - all participants ready:', tournament);
              
              // Broadcast tournament start to all players
              io.emit('tournament-state', {
                game: 'high-noon-hustle',
                tournaments: [tournament]
              });
              console.log('DEBUG: Broadcasted tournament start to all players');
              
              // Also broadcast a specific tournament-start event for phase change
              io.emit('tournament-phase-change', {
                game: 'high-noon-hustle',
                tournamentId: tournamentId,
                phase: 'active',
                active: true
              });
              console.log('DEBUG: Broadcasted tournament phase change to active');
            } else {
              console.log('DEBUG: Tournament not starting - not all participants ready or not enough players');
              // Extend the joining period or cancel tournament
              if (tournament.participants.length < 2) {
                console.log('DEBUG: Not enough participants, cancelling tournament');
                activeTournaments.delete(tournamentId);
                io.emit('tournament-cancelled', {
                  game: 'high-noon-hustle',
                  tournamentId: tournamentId,
                  reason: 'Not enough participants'
                });
              } else {
                console.log('DEBUG: Extending join period - not all participants in game room');
                // Extend join period by another 30 seconds
                tournament.joinEndTime = Date.now() + 30000;
                io.emit('tournament-state', {
                  game: 'high-noon-hustle',
                  tournaments: [tournament]
                });
              }
            }
          }
        }, data.joinPeriod * 1000);
      }
      
      console.log('DEBUG: Broadcasting to all BBS users...');
      // Broadcast tournament start to all BBS users
      io.emit('tournament-start', data);
      console.log('DEBUG: Tournament broadcast sent to', io.engine.clientsCount, 'clients');
    } else {
      console.log('DEBUG: Tournament event not for high-noon-hustle, game:', data.game);
    }
  });

  socket.on('tournament-join', (data) => {
    if (data.game === 'high-noon-hustle') {
      console.log('DEBUG: Tournament join from', data.participant.name);
      
      // Update server-side tournament state
      const tournamentId = data.tournamentId;
      const tournament = activeTournaments.get(tournamentId);
      if (tournament) {
        const user = onlineUsers.get(socket.id);
        if (user) {
          // Check if player already in tournament
          const gameUsername = user.characterData?.username || user.handle;
          const existingParticipant = tournament.participants.find(p => p.id === gameUsername);
          if (!existingParticipant) {
            tournament.participants.push({
              id: gameUsername, // Use game username if available
              name: user.characterData?.display_name || user.handle, // Use game display name
              display_name: user.characterData?.display_name || user.handle, // Use game display name
              score: 0,
              gold: 0
            });
            console.log('DEBUG: Added participant to tournament:', tournament.participants);
          }
        }
      }
      
      // Broadcast tournament join to all players in the room
      io.to('high-noon-hustle').emit('tournament-join', data);
    }
  });

  socket.on('tournament-update', (data) => {
    if (data.game === 'high-noon-hustle') {
      console.log('DEBUG: Tournament update');
      // Broadcast tournament update to all players in the room
      io.to('high-noon-hustle').emit('tournament-update', data);
    }
  });

  socket.on('tournament-end', (data) => {
    if (data.game === 'high-noon-hustle') {
      console.log('DEBUG: Tournament end, winner:', data.winner);
      // Remove tournament from active tournaments
      const tournamentId = data.tournamentId;
      if (tournamentId) {
        activeTournaments.delete(tournamentId);
        console.log('DEBUG: Removed tournament from active tournaments');
      }
      // Broadcast tournament end to all BBS users
      io.emit('tournament-end', data);
    }
  });

  socket.on('tournament-score-update', (data) => {
    if (data.game === 'high-noon-hustle') {
      console.log('DEBUG: Received tournament score update:', data);
      
      // Update server-side tournament state
      const tournament = activeTournaments.get(data.tournamentId);
      if (tournament) {
        const participant = tournament.participants.find(p => p.id === data.participantId);
        if (participant) {
          participant.score = data.score;
          console.log('DEBUG: Updated server-side score for', data.participantId, 'to', data.score);
        }
      }
      
      // Broadcast score update to all players
      io.to('high-noon-hustle').emit('tournament-score-update', data);
      console.log('DEBUG: Broadcasted score update to all players');
    }
  });

  // New event: Server generates and broadcasts tournament round cards
  socket.on('tournament-round-request', (data) => {
    if (data.game === 'high-noon-hustle') {
      console.log('DEBUG: Tournament round request for round', data.roundNumber);
      
      const tournament = activeTournaments.get(data.tournamentId);
      if (tournament) {
        // Generate cards server-side
        const roundCards = generateTournamentCards(tournament, data.roundNumber);
        
        // Broadcast cards to all players in the tournament
        io.to('high-noon-hustle').emit('tournament-round-cards', {
          game: 'high-noon-hustle',
          tournamentId: data.tournamentId,
          roundNumber: data.roundNumber,
          cards: roundCards
        });
        
        console.log('DEBUG: Broadcasted tournament round cards to all players');
      }
    }
  });

  // Get current tournament state
  socket.on('get-tournament-state', (data) => {
    if (data.game === 'high-noon-hustle') {
      console.log('DEBUG: Getting tournament state for', data.game);
      // Send all active tournaments
      const tournaments = Array.from(activeTournaments.values());
      socket.emit('tournament-state', {
        game: 'high-noon-hustle',
        tournaments: tournaments
      });
      console.log('DEBUG: Sent tournament state:', tournaments);
    }
  });

  // High Noon Hustle Saloon Chat
  socket.on('saloon-message', (data) => {
    if (data.game === 'high-noon-hustle') {
      console.log('DEBUG: Saloon message from', data.player.name, ':', data.message);
      // Broadcast to all players in the high-noon-hustle room
      io.to('high-noon-hustle').emit('saloon-message', data);
    }
  });

  // High Noon Hustle Duel System
  socket.on('duel-challenge', (data) => {
    if (data.game === 'high-noon-hustle') {
      console.log('DEBUG: Duel challenge from', data.challenger.name, 'to player', data.targetPlayer);
      socket.to('high-noon-hustle').emit('duel-challenge', data);
    }
  });

  socket.on('duel-response', (data) => {
    if (data.game === 'high-noon-hustle') {
      console.log('DEBUG: Duel response from player', data.targetPlayer, 'accepted:', data.accepted);
      socket.to('high-noon-hustle').emit('duel-response', data);
    }
  });

  socket.on('disconnect', () => {
    const user = onlineUsers.get(socket.id);
    if (user) {
      onlineUsers.delete(socket.id);
      socket.broadcast.emit('user-offline', { userId: user.userId, handle: user.handle });
      io.emit('online-users-update', Array.from(onlineUsers.values()));
    }
    console.log('User disconnected:', socket.id);
  });

  // Update last activity
  socket.on('activity', () => {
    const user = onlineUsers.get(socket.id);
    if (user) {
      user.lastActivity = Date.now();
    }
  });

  // Fishing Hole - Track when users enter/leave the game
  socket.on('enter-fishing-game', () => {
    const user = onlineUsers.get(socket.id);
    if (user) {
      user.currentGame = 'fishing-hole';
      console.log('User entered fishing game:', user.handle);
    }
  });

  socket.on('leave-fishing-game', () => {
    const user = onlineUsers.get(socket.id);
    if (user) {
      user.currentGame = null;
      console.log('User left fishing game:', user.handle);
    }
  });

  // Fishing Hole - Broadcast fish catches only to fishing game players
  socket.on('fish-caught', (data) => {
    const user = onlineUsers.get(socket.id);
    console.log('fish-caught received from socket', socket.id, 'user:', user, 'data:', data);
    if (user) {
      const payload = {
        userId: user.userId,
        handle: user.handle,
        fishName: data.fishName,
        weight: data.weight,
        location: data.location,
        value: data.value,
        experience: data.experience,
        rarity: data.rarity,
        timestamp: new Date().toISOString()
      };
      console.log('Broadcasting fish-caught to fishing game players only:', payload);
      
      // Only broadcast to users who are currently in the fishing game
      onlineUsers.forEach((userData, socketId) => {
        if (userData.currentGame === 'fishing-hole' && socketId !== socket.id) {
          const targetSocket = io.sockets.sockets.get(socketId);
          if (targetSocket) {
            targetSocket.emit('fish-caught', payload);
          }
        }
      });
    }
  });

  // SysOp chat handlers
  socket.on('get-sysop-status', () => {
    // Check if any sysop is online (access_level >= 10)
    const onlineUsersList = Array.from(onlineUsers.values());
    console.log('🔍 DEBUG: Checking SysOp status - online users:', onlineUsersList);
    const sysopOnline = onlineUsersList.some(u => u.accessLevel >= 10);
    console.log('🔍 DEBUG: SysOp online status:', sysopOnline);
    socket.emit('sysop-status', { online: sysopOnline });
  });

  socket.on('get-sysop-chat-history', async () => {
    const user = onlineUsers.get(socket.id);
    if (user) {
      try {
        const { getSysopChatHistory } = require('./db');
        const messages = await getSysopChatHistory(db, user.userId);
        socket.emit('sysop-chat-history', { messages });
      } catch (error) {
        console.error('Get SysOp chat history error:', error);
        socket.emit('sysop-chat-history', { messages: [] });
      }
    }
  });

  socket.on('send-sysop-message', async (data) => {
    const user = onlineUsers.get(socket.id);
    if (user && data.message) {
      try {
        const { saveSysopChatMessage } = require('./db');
        await saveSysopChatMessage(db, user.userId, false, data.message);
        
        // Emit to all connected clients
        io.emit('sysop-chat-message', {
          from_sysop: false,
          message: data.message,
          timestamp: data.timestamp || new Date().toISOString(),
          user_handle: user.handle,
          user_id: user.userId
        });
      } catch (error) {
        console.error('Send SysOp message error:', error);
      }
    }
  });

  // SysOp broadcast message to all users
  socket.on('sysop-broadcast', (data) => {
    const user = onlineUsers.get(socket.id);
    if (user) {
      // Check if user is sysop
      db.get('SELECT access_level FROM users WHERE id = ?', [user.userId], (err, row) => {
        if (row && row.access_level >= 100) {
          // Broadcast to all connected users
          io.emit('sysop-broadcast-message', {
            from: user.handle,
            message: data.message,
            timestamp: new Date().toISOString()
          });
        }
      });
    }
  });

  // SysOp direct message to specific user
  socket.on('sysop-direct-message', (data) => {
    const user = onlineUsers.get(socket.id);
    if (user) {
      // Check if user is sysop
      db.get('SELECT access_level FROM users WHERE id = ?', [user.userId], (err, row) => {
        if (row && row.access_level >= 100) {
          // Find target user's socket
          for (const [socketId, onlineUser] of onlineUsers.entries()) {
            if (onlineUser.userId === data.targetUserId) {
              io.to(socketId).emit('sysop-direct-message', {
                from: user.handle,
                message: data.message,
                timestamp: new Date().toISOString()
              });
              break;
            }
          }
        }
      });
    }
  });

  // User-to-user direct message
  socket.on('user-direct-message', (data) => {
    const user = onlineUsers.get(socket.id);
    if (user) {
      // Find target user's socket
      for (const [socketId, onlineUser] of onlineUsers.entries()) {
        if (onlineUser.userId === data.targetUserId) {
          io.to(socketId).emit('user-direct-message', {
            from: user.handle,
            fromId: user.userId,
            message: data.message,
            timestamp: new Date().toISOString()
          });
          break;
        }
      }
    }
  });

  // Pit PvP Challenge
  socket.on('pit-challenge', (data) => {
    const user = onlineUsers.get(socket.id);
    if (user) {
      // Find target user's socket
      for (const [socketId, onlineUser] of onlineUsers.entries()) {
        if (onlineUser.userId === data.targetUserId) {
          io.to(socketId).emit('pit-challenge-received', {
            from: data.challengerHandle,
            fromId: user.userId,
            message: data.message,
            timestamp: new Date().toISOString()
          });
          break;
        }
      }
    }
  });

  socket.on('pit-challenge-response', (data) => {
    const user = onlineUsers.get(socket.id);
    if (user) {
      // Find challenger's socket
      for (const [socketId, onlineUser] of onlineUsers.entries()) {
        if (onlineUser.userId === data.challengerId) {
          io.to(socketId).emit('pit-challenge-response', {
            from: user.handle,
            fromId: user.userId,
            accepted: data.accepted,
            message: data.message,
            timestamp: new Date().toISOString()
          });
          break;
        }
      }
    }
  });

  // Cyber Arena Challenge
  socket.on('arena-challenge', (data) => {
    const user = onlineUsers.get(socket.id);
    if (user) {
      // Find target user's socket
      for (const [socketId, onlineUser] of onlineUsers.entries()) {
        if (onlineUser.userId === data.targetUserId) {
          io.to(socketId).emit('arena-challenge-received', {
            from: data.challengerHandle,
            fromId: user.userId,
            message: data.message,
            timestamp: new Date().toISOString()
          });
          break;
        }
      }
    }
  });

  socket.on('arena-challenge-response', (data) => {
    const user = onlineUsers.get(socket.id);
    if (user) {
      // Find challenger's socket
      for (const [socketId, onlineUser] of onlineUsers.entries()) {
        if (onlineUser.userId === data.challengerId) {
          io.to(socketId).emit('arena-challenge-response', {
            from: user.handle,
            fromId: user.userId,
            accepted: data.accepted,
            message: data.message,
            timestamp: new Date().toISOString()
          });
          break;
        }
      }
    }
  });

  // Fishing Tournament Events
  socket.on('fishing-tournament-start', (data) => {
    const user = onlineUsers.get(socket.id);
    if (user) {
      console.log('Fishing tournament started by:', user.handle, 'Duration:', data.durationText);
      
      // Broadcast tournament start to ALL BBS users
      io.emit('fishing-tournament-announcement', {
        type: 'tournament-start',
        host: user.handle,
        duration: data.duration,
        durationText: data.durationText,
        tournamentId: data.tournamentId,
        joinPeriod: data.joinPeriod,
        message: `🎣 FISHING TOURNAMENT STARTED! ${user.handle} is hosting a ${data.durationText} tournament! Join now! (${data.joinPeriod}s to join)`,
        timestamp: new Date().toISOString()
      });
    }
  });

  socket.on('fishing-tournament-join', (data) => {
    const user = onlineUsers.get(socket.id);
    if (user) {
      console.log('User joined fishing tournament:', user.handle);
      
      // Broadcast join notification to all users
      io.emit('fishing-tournament-announcement', {
        type: 'tournament-join',
        player: user.handle,
        tournamentId: data.tournamentId,
        message: `🎣 ${user.handle} joined the fishing tournament!`,
        timestamp: new Date().toISOString()
      });
    }
  });

  socket.on('fishing-tournament-update', (data) => {
    const user = onlineUsers.get(socket.id);
    if (user) {
      console.log('Tournament update from:', user.handle, 'Weight:', data.totalWeight);
      
      // Broadcast tournament update to all users in the same tournament
      io.emit('fishing-tournament-update', {
        tournamentId: data.tournamentId,
        player: user.handle,
        totalWeight: data.totalWeight,
        fishCount: data.fishCount,
        biggestCatch: data.biggestCatch,
        fishName: data.fishName,
        fishWeight: data.fishWeight,
        fishRarity: data.fishRarity,
        timestamp: new Date().toISOString()
      });
    }
  });

  socket.on('fishing-tournament-end', (data) => {
    const user = onlineUsers.get(socket.id);
    if (user) {
      console.log('Tournament ended by:', user.handle);
      
      // Broadcast tournament results to all users
      io.emit('fishing-tournament-announcement', {
        type: 'tournament-end',
        host: user.handle,
        results: data.results,
        tournamentId: data.tournamentId,
        message: `🏆 TOURNAMENT OVER! Winner: ${data.results[0]?.player || 'Unknown'} with ${data.results[0]?.weight?.toFixed(2) || '0'} lbs!`,
        timestamp: new Date().toISOString()
      });
    }
  });

  socket.on('fishing-tournament-sync', (data) => {
    const user = onlineUsers.get(socket.id);
    if (user) {
      console.log('Tournament sync requested by:', user.handle);
      
      // Get all online users in the fishing game
      const fishingPlayers = Array.from(onlineUsers.values()).filter(u => u.currentGame === 'fishing-hole');
      
      // Create participants list with game usernames
      const participants = fishingPlayers.map(player => ({
        name: player.handle === 'SysOp' ? 'Halley66' : player.handle, // Map SysOp to Halley66
        totalWeight: 0,
        fishCount: 0,
        biggestCatch: 0
      }));
      
      socket.emit('fishing-tournament-sync', {
        tournamentId: data.tournamentId,
        participants: participants
      });
    }
  });

  // Duel Tournament Events
  socket.on('duel-tournament-start', (data) => {
    const user = onlineUsers.get(socket.id);
    if (user) {
      console.log('Duel tournament started by:', user.handle, 'Tournament ID:', data.tournamentId);
      
      // Broadcast tournament start to ALL BBS users
      io.emit('duel-tournament-announcement', {
        type: 'tournament-start',
        tournamentId: data.tournamentId,
        host: user.handle,
        joinPeriod: data.joinPeriod,
        message: `🤠 DUEL TOURNAMENT! ${user.handle} is hosting a gunslinger tournament! Join now! (${data.joinPeriod}s to join)`,
        timestamp: new Date().toISOString()
      });
    }
  });

  socket.on('duel-tournament-join', (data) => {
    const user = onlineUsers.get(socket.id);
    if (user) {
      console.log('User joined duel tournament:', user.handle, 'Tournament ID:', data.tournamentId);
      
      // Broadcast join notification to all users
      io.emit('duel-tournament-announcement', {
        type: 'tournament-join',
        tournamentId: data.tournamentId,
        player: user.handle,
        message: `🎯 ${user.handle} joined the duel tournament!`,
        timestamp: new Date().toISOString()
      });
    }
  });

  socket.on('duel-tournament-update', (data) => {
    const user = onlineUsers.get(socket.id);
    if (user) {
      console.log('Duel tournament update from:', user.handle, 'Tournament ID:', data.tournamentId);
      
      // Broadcast tournament update to all users
      io.emit('duel-tournament-announcement', {
        type: 'tournament-update',
        tournamentId: data.tournamentId,
        player: user.handle,
        message: data.message || `⚔️ ${user.handle} advanced in the tournament!`,
        timestamp: new Date().toISOString()
      });
    }
  });

  socket.on('duel-tournament-end', (data) => {
    const user = onlineUsers.get(socket.id);
    if (user) {
      console.log('Duel tournament ended by:', user.handle, 'Winner:', data.winner);
      
      // Broadcast tournament results to all users
      io.emit('duel-tournament-announcement', {
        type: 'tournament-end',
        tournamentId: data.tournamentId,
        winner: data.winner,
        message: `🏆 TOURNAMENT OVER! ${data.winner} is the fastest gun in the west!`,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Trivia Tournament Events
  socket.on('trivia-tournament-start', (data) => {
    const user = onlineUsers.get(socket.id);
    if (user) {
      console.log('Trivia tournament started by:', user.handle, 'Tournament ID:', data.tournamentId);
      
      // Broadcast tournament start to ALL BBS users
      io.emit('trivia-tournament-announcement', {
        type: 'tournament-start',
        tournamentId: data.tournamentId,
        host: user.handle,
        joinPeriod: data.joinPeriod,
        message: `🧠 TRIVIA TOURNAMENT! ${user.handle} is hosting a brain battle tournament! Join now! (${data.joinPeriod}s to join)`,
        timestamp: new Date().toISOString()
      });
    }
  });

  socket.on('trivia-tournament-join', (data) => {
    const user = onlineUsers.get(socket.id);
    if (user) {
      console.log('User joined trivia tournament:', user.handle, 'Tournament ID:', data.tournamentId);
      
      // Broadcast join notification to all users
      io.emit('trivia-tournament-announcement', {
        type: 'tournament-join',
        tournamentId: data.tournamentId,
        player: user.handle,
        message: `🎯 ${user.handle} joined the trivia tournament!`,
        timestamp: new Date().toISOString()
      });
    }
  });

  socket.on('trivia-tournament-update', (data) => {
    const user = onlineUsers.get(socket.id);
    if (user) {
      console.log('Trivia tournament update from:', user.handle, 'Tournament ID:', data.tournamentId);
      
      // Broadcast tournament update to all users
      io.emit('trivia-tournament-announcement', {
        type: 'tournament-update',
        tournamentId: data.tournamentId,
        player: user.handle,
        message: data.message || `🧠 ${user.handle} advanced in the tournament!`,
        timestamp: new Date().toISOString()
      });
    }
  });

  socket.on('trivia-tournament-end', (data) => {
    const user = onlineUsers.get(socket.id);
    if (user) {
      console.log('Trivia tournament ended by:', user.handle, 'Winner:', data.winner);
      
      // Broadcast tournament results to all users
      io.emit('trivia-tournament-announcement', {
        type: 'tournament-end',
        tournamentId: data.tournamentId,
        winner: data.winner,
        message: `🏆 TOURNAMENT OVER! ${data.winner} is the smartest brain in the west!`,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Track user location changes
  socket.on('user-location-change', (data) => {
    const user = onlineUsers.get(socket.id);
    if (user) {
      user.currentLocation = data.location;
      console.log(`User ${user.handle} is now in: ${data.location}`);
      // Broadcast updated user list to all clients
      io.emit('online-users-update', Array.from(onlineUsers.values()));
    }
  });

  // Chat room join/leave events
  socket.on('join-chat', () => {
    const user = onlineUsers.get(socket.id);
    if (user) {
      console.log(`User ${user.handle} joined chat`);
      socket.broadcast.emit('user-joined-chat', { handle: user.handle });
    }
  });

  socket.on('leave-chat', () => {
    const user = onlineUsers.get(socket.id);
    if (user) {
      console.log(`User ${user.handle} left chat`);
      socket.broadcast.emit('user-left-chat', { handle: user.handle });
    }
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
