const { Pool } = require('pg');

let pool = null;

function getPool() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    
    if (!connectionString) {
      throw new Error('No database connection string found. Set DATABASE_URL or POSTGRES_URL environment variable.');
    }

    pool = new Pool({
      connectionString: connectionString,
      ssl: {
        rejectUnauthorized: false
      }
    });
  }
  return pool;
}

async function initDatabase() {
  const pool = getPool();
  
  try {
    // Create users table
    await pool.query(`
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

    // Create game_states table
    await pool.query(`
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

    // Create fishing_hole_players table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS fishing_hole_players (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        player_name VARCHAR(50) NOT NULL,
        level INTEGER DEFAULT 1,
        experience INTEGER DEFAULT 0,
        credits INTEGER DEFAULT 100,
        current_location VARCHAR(50) DEFAULT 'Lake Shore',
        inventory TEXT DEFAULT '[]',
        trophy_catches TEXT DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id),
        UNIQUE(user_id)
      )
    `);

    // Create sysop_chat_messages table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sysop_chat_messages (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        from_sysop BOOLEAN DEFAULT FALSE,
        message TEXT NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        read_by_sysop BOOLEAN DEFAULT FALSE,
        read_by_user BOOLEAN DEFAULT FALSE,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    // Create default SysOp user if it doesn't exist
    const result = await pool.query('SELECT id FROM users WHERE handle = $1', ['SysOp']);
    
    if (result.rows.length === 0) {
      const bcrypt = require('bcrypt');
      const hashedPassword = bcrypt.hashSync('admin123', 10);
      
      await pool.query(
        `INSERT INTO users (handle, real_name, location, password_hash, access_level, credits, created_at) 
         VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
        ['SysOp', 'System Operator', 'BBS Headquarters', hashedPassword, 100, 1000]
      );
      console.log('Default SysOp user created with password: admin123');
    }

    console.log('PostgreSQL database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}

async function query(text, params = []) {
  const pool = getPool();
  return await pool.query(text, params);
}

async function getUserByHandle(handle) {
  const result = await query('SELECT * FROM users WHERE handle = $1', [handle]);
  return result.rows[0] || null;
}

async function getUserById(id) {
  const result = await query('SELECT * FROM users WHERE id = $1', [id]);
  return result.rows[0] || null;
}

async function getGameState(userId, gameName) {
  const result = await query(
    'SELECT * FROM game_states WHERE user_id = $1 AND game_name = $2',
    [userId, gameName]
  );
  return result.rows[0] || null;
}

async function saveGameState(userId, gameName, gameData) {
  const dataString = JSON.stringify(gameData);
  await query(
    `INSERT INTO game_states (user_id, game_name, game_data, updated_at) 
     VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
     ON CONFLICT (user_id, game_name) 
     DO UPDATE SET game_data = $3, updated_at = CURRENT_TIMESTAMP`,
    [userId, gameName, dataString]
  );
}

module.exports = {
  initDatabase,
  query,
  getUserByHandle,
  getUserById,
  getGameState,
  saveGameState
};
