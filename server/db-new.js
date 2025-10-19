const DatabaseAdapter = require('./db-adapter');
const path = require('path');

// Initialize database
async function initDatabase() {
  const db = new DatabaseAdapter();
  await db.connect();
  await createTables(db);
  return db;
}

async function createTables(db) {
  // Check if we're using PostgreSQL
  const isPostgreSQL = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  
  if (isPostgreSQL) {
    // PostgreSQL table creation
    await db.run(`CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      handle VARCHAR(50) UNIQUE NOT NULL,
      real_name VARCHAR(100),
      location VARCHAR(100),
      password_hash VARCHAR(255) NOT NULL,
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
    )`);

    await db.run(`CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      board VARCHAR(50) NOT NULL,
      subject VARCHAR(200) NOT NULL,
      body TEXT NOT NULL,
      author_id INTEGER REFERENCES users(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      is_pinned BOOLEAN DEFAULT FALSE
    )`);

    await db.run(`CREATE TABLE IF NOT EXISTS files (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) NOT NULL,
      original_name VARCHAR(255) NOT NULL,
      description TEXT,
      size INTEGER NOT NULL,
      uploader_id INTEGER REFERENCES users(id),
      downloads INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      category VARCHAR(50) DEFAULT 'General'
    )`);

    await db.run(`CREATE TABLE IF NOT EXISTS game_states (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      game_name VARCHAR(50) NOT NULL,
      game_data TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, game_name)
    )`);

    await db.run(`CREATE TABLE IF NOT EXISTS fishing_hole_players (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      player_name VARCHAR(50) NOT NULL,
      level INTEGER DEFAULT 1,
      experience INTEGER DEFAULT 0,
      money INTEGER DEFAULT 100,
      total_caught INTEGER DEFAULT 0,
      total_weight DECIMAL(10,2) DEFAULT 0,
      biggest_catch DECIMAL(10,2) DEFAULT 0,
      biggest_catch_name VARCHAR(50),
      rare_catches TEXT,
      legendary_catches TEXT,
      trophy_catches TEXT,
      gear TEXT,
      stats TEXT,
      achievements TEXT,
      challenges TEXT,
      season_stats TEXT,
      location_unlocks TEXT,
      tackle_unlocks TEXT,
      inventory TEXT,
      current_location VARCHAR(50) DEFAULT 'Lake Shore',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, player_name)
    )`);

    await db.run(`CREATE TABLE IF NOT EXISTS sysop_chat_messages (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      from_sysop BOOLEAN DEFAULT FALSE,
      message TEXT NOT NULL,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      read_by_sysop BOOLEAN DEFAULT FALSE,
      read_by_user BOOLEAN DEFAULT FALSE
    )`);

  } else {
    // SQLite table creation (existing code)
    await db.run(`CREATE TABLE IF NOT EXISTS users (
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

    await db.run(`CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      board TEXT NOT NULL,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      author_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_pinned BOOLEAN DEFAULT 0,
      FOREIGN KEY (author_id) REFERENCES users (id)
    )`);

    await db.run(`CREATE TABLE IF NOT EXISTS files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      description TEXT,
      size INTEGER NOT NULL,
      uploader_id INTEGER,
      downloads INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      category TEXT DEFAULT 'General',
      FOREIGN KEY (uploader_id) REFERENCES users (id)
    )`);

    await db.run(`CREATE TABLE IF NOT EXISTS game_states (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      game_name TEXT NOT NULL,
      game_data TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id),
      UNIQUE(user_id, game_name)
    )`);

    await db.run(`CREATE TABLE IF NOT EXISTS fishing_hole_players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      player_name TEXT NOT NULL,
      level INTEGER DEFAULT 1,
      experience INTEGER DEFAULT 0,
      money INTEGER DEFAULT 100,
      total_caught INTEGER DEFAULT 0,
      total_weight REAL DEFAULT 0,
      biggest_catch REAL DEFAULT 0,
      biggest_catch_name TEXT,
      rare_catches TEXT,
      legendary_catches TEXT,
      trophy_catches TEXT,
      gear TEXT,
      stats TEXT,
      achievements TEXT,
      challenges TEXT,
      season_stats TEXT,
      location_unlocks TEXT,
      tackle_unlocks TEXT,
      inventory TEXT,
      current_location TEXT DEFAULT 'Lake Shore',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id),
      UNIQUE(user_id, player_name)
    )`);

    await db.run(`CREATE TABLE IF NOT EXISTS sysop_chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      from_sysop BOOLEAN DEFAULT 0,
      message TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      read_by_sysop BOOLEAN DEFAULT 0,
      read_by_user BOOLEAN DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )`);
  }

  // Create default SysOp user if it doesn't exist
  const existingUser = await db.get(
    isPostgreSQL 
      ? 'SELECT id FROM users WHERE handle = $1' 
      : 'SELECT id FROM users WHERE handle = ?', 
    ['SysOp']
  );
  
  if (!existingUser) {
    const bcrypt = require('bcrypt');
    const defaultPassword = 'admin123';
    const hashedPassword = bcrypt.hashSync(defaultPassword, 10);
    
    await db.run(
      isPostgreSQL
        ? `INSERT INTO users (handle, real_name, location, password_hash, access_level, credits, created_at) 
           VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`
        : `INSERT INTO users (handle, real_name, location, password_hash, access_level, credits, created_at) 
           VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      ['SysOp', 'System Operator', 'BBS Headquarters', hashedPassword, 100, 1000]
    );
    
    console.log('Default SysOp user created with password: admin123');
  }
}

// Database helper functions
async function getUserById(db, userId) {
  const isPostgreSQL = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  return await db.get(
    isPostgreSQL 
      ? 'SELECT * FROM users WHERE id = $1' 
      : 'SELECT * FROM users WHERE id = ?', 
    [userId]
  );
}

async function getUserByHandle(db, handle) {
  const isPostgreSQL = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  return await db.get(
    isPostgreSQL 
      ? 'SELECT * FROM users WHERE handle = $1' 
      : 'SELECT * FROM users WHERE handle = ?', 
    [handle]
  );
}

async function createUser(db, userData) {
  const bcrypt = require('bcrypt');
  const hashedPassword = bcrypt.hashSync(userData.password, 10);
  const isPostgreSQL = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  
  const result = await db.run(
    isPostgreSQL
      ? `INSERT INTO users (handle, real_name, location, password_hash, access_level, credits) 
         VALUES ($1, $2, $3, $4, $5, $6)`
      : `INSERT INTO users (handle, real_name, location, password_hash, access_level, credits) 
         VALUES (?, ?, ?, ?, ?, ?)`,
    [userData.handle, userData.real_name, userData.location, hashedPassword, userData.access_level || 1, userData.credits || 100]
  );
  
  return result.lastID;
}

async function getGameState(db, userId, gameName) {
  const isPostgreSQL = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  return await db.get(
    isPostgreSQL 
      ? 'SELECT * FROM game_states WHERE user_id = $1 AND game_name = $2' 
      : 'SELECT * FROM game_states WHERE user_id = ? AND game_name = ?', 
    [userId, gameName]
  );
}

async function saveGameState(db, userId, gameName, gameData) {
  const existing = await getGameState(db, userId, gameName);
  const isPostgreSQL = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  
  if (existing) {
    await db.run(
      isPostgreSQL
        ? 'UPDATE game_states SET game_data = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2 AND game_name = $3'
        : 'UPDATE game_states SET game_data = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND game_name = ?',
      [gameData, userId, gameName]
    );
  } else {
    await db.run(
      isPostgreSQL
        ? 'INSERT INTO game_states (user_id, game_name, game_data) VALUES ($1, $2, $3)'
        : 'INSERT INTO game_states (user_id, game_name, game_data) VALUES (?, ?, ?)',
      [userId, gameName, gameData]
    );
  }
}

// SysOp chat functions
async function saveSysopChatMessage(db, user_id, from_sysop, message) {
  const isPostgreSQL = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  const result = await db.run(
    isPostgreSQL
      ? 'INSERT INTO sysop_chat_messages (user_id, from_sysop, message) VALUES ($1, $2, $3)'
      : 'INSERT INTO sysop_chat_messages (user_id, from_sysop, message) VALUES (?, ?, ?)',
    [user_id, from_sysop, message]
  );
  return result.lastID;
}

async function getSysopChatHistory(db, user_id, limit = 50) {
  const isPostgreSQL = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  return await db.query(
    isPostgreSQL
      ? 'SELECT * FROM sysop_chat_messages WHERE user_id = $1 ORDER BY timestamp DESC LIMIT $2'
      : 'SELECT * FROM sysop_chat_messages WHERE user_id = ? ORDER BY timestamp DESC LIMIT ?',
    [user_id, limit]
  );
}

async function getUnreadSysopMessages(db, user_id) {
  const isPostgreSQL = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  return await db.query(
    isPostgreSQL
      ? 'SELECT * FROM sysop_chat_messages WHERE user_id = $1 AND from_sysop = true AND read_by_user = false ORDER BY timestamp DESC'
      : 'SELECT * FROM sysop_chat_messages WHERE user_id = ? AND from_sysop = true AND read_by_user = false ORDER BY timestamp DESC',
    [user_id]
  );
}

async function markSysopMessagesAsRead(db, user_id) {
  const isPostgreSQL = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  await db.run(
    isPostgreSQL
      ? 'UPDATE sysop_chat_messages SET read_by_user = true WHERE user_id = $1 AND from_sysop = true'
      : 'UPDATE sysop_chat_messages SET read_by_user = true WHERE user_id = ? AND from_sysop = true',
    [user_id]
  );
}

async function getAllSysopChatMessages(db, limit = 100) {
  const isPostgreSQL = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  return await db.query(
    isPostgreSQL
      ? 'SELECT * FROM sysop_chat_messages ORDER BY timestamp DESC LIMIT $1'
      : 'SELECT * FROM sysop_chat_messages ORDER BY timestamp DESC LIMIT ?',
    [limit]
  );
}

module.exports = {
  initDatabase,
  getUserById,
  getUserByHandle,
  createUser,
  getGameState,
  saveGameState,
  saveSysopChatMessage,
  getSysopChatHistory,
  getUnreadSysopMessages,
  markSysopMessagesAsRead,
  getAllSysopChatMessages
};
