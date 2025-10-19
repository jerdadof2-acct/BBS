const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { getDatabasePath } = require('./railway-persistence');

const DB_PATH = getDatabasePath();

// Initialize database
function initDatabase() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Error opening database:', err.message);
        reject(err);
        return;
      }
      console.log('Connected to SQLite database');
      createTables(db).then(() => resolve(db)).catch(reject);
    });
  });
}

function createTables(db) {
  return new Promise((resolve, reject) => {
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

      // Messages table
      db.run(`CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        board TEXT NOT NULL,
        subject TEXT NOT NULL,
        body TEXT NOT NULL,
        author_id INTEGER NOT NULL,
        reply_to INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (author_id) REFERENCES users(id),
        FOREIGN KEY (reply_to) REFERENCES messages(id)
      )`);

      // Files table
      db.run(`CREATE TABLE IF NOT EXISTS files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT NOT NULL,
        description TEXT,
        area TEXT NOT NULL,
        size INTEGER,
        uploader_id INTEGER NOT NULL,
        downloads INTEGER DEFAULT 0,
        rating INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (uploader_id) REFERENCES users(id)
      )`);

      // Game states table
      db.run(`CREATE TABLE IF NOT EXISTS game_states (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        game_name TEXT NOT NULL,
        game_data TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        UNIQUE(user_id, game_name)
      )`);

      // SysOp chat messages table
      db.run(`CREATE TABLE IF NOT EXISTS sysop_chat_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        from_sysop BOOLEAN DEFAULT 0,
        message TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        read_by_sysop BOOLEAN DEFAULT 0,
        read_by_user BOOLEAN DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )`);

      // Fishing Hole players table
      db.run(`CREATE TABLE IF NOT EXISTS fishing_hole_players (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        player_name TEXT NOT NULL,
        level INTEGER DEFAULT 1,
        experience INTEGER DEFAULT 0,
        money INTEGER DEFAULT 100,
        total_caught INTEGER DEFAULT 0,
        total_weight REAL DEFAULT 0,
        biggest_catch REAL DEFAULT 0,
        biggest_catch_name TEXT DEFAULT 'None',
        rare_catches INTEGER DEFAULT 0,
        legendary_catches INTEGER DEFAULT 0,
        trophy_catches INTEGER DEFAULT 0,
        gear TEXT DEFAULT '{}',
        stats TEXT DEFAULT '{}',
        achievements TEXT DEFAULT '[]',
        challenges TEXT DEFAULT '[]',
        season_stats TEXT DEFAULT '{}',
        location_unlocks TEXT DEFAULT '[0,1]',
        current_location TEXT DEFAULT 'Lake Shore',
        tackle_unlocks TEXT DEFAULT '{}',
        inventory TEXT DEFAULT '[]',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        UNIQUE(user_id, player_name)
      )`);

      // Add current_location column if it doesn't exist (migration)
      db.run(`ALTER TABLE fishing_hole_players ADD COLUMN current_location TEXT DEFAULT 'Lake Shore'`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.error('Error adding current_location column:', err);
        } else if (!err) {
          console.log('Added current_location column to fishing_hole_players table');
        }
      });


      // LORD players table
      db.run(`CREATE TABLE IF NOT EXISTS lord_players (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        player_name TEXT NOT NULL,
        login_username TEXT NOT NULL,
        class TEXT NOT NULL,
        gender TEXT NOT NULL,
        alignment TEXT NOT NULL,
        level INTEGER DEFAULT 1,
        experience INTEGER DEFAULT 0,
        gold INTEGER DEFAULT 100,
        hp INTEGER DEFAULT 100,
        max_hp INTEGER DEFAULT 100,
        strength INTEGER DEFAULT 10,
        defense INTEGER DEFAULT 10,
        charisma INTEGER DEFAULT 10,
        bank_gold INTEGER DEFAULT 0,
        days_played INTEGER DEFAULT 0,
        monsters_killed INTEGER DEFAULT 0,
        deaths INTEGER DEFAULT 0,
        quests_completed INTEGER DEFAULT 0,
        violet_romance INTEGER DEFAULT 0,
        red_dragon_defeated INTEGER DEFAULT 0,
        red_dragon_defeated_at DATETIME,
        equipment TEXT DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        UNIQUE(user_id, player_name)
      )`);

      // Chat logs table
      db.run(`CREATE TABLE IF NOT EXISTS chat_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sender_id INTEGER NOT NULL,
        recipient_id INTEGER,
        message TEXT NOT NULL,
        is_private INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sender_id) REFERENCES users(id),
        FOREIGN KEY (recipient_id) REFERENCES users(id)
      )`);

      // One-liners table
      db.run(`CREATE TABLE IF NOT EXISTS oneliners (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        message TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )`);

      // High scores table
      db.run(`CREATE TABLE IF NOT EXISTS high_scores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        game_name TEXT NOT NULL,
        score INTEGER NOT NULL,
        details TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )`);

      // Email table
      db.run(`CREATE TABLE IF NOT EXISTS emails (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sender_id INTEGER NOT NULL,
        recipient_id INTEGER NOT NULL,
        subject TEXT NOT NULL,
        body TEXT NOT NULL,
        is_read INTEGER DEFAULT 0,
        is_deleted_by_sender INTEGER DEFAULT 0,
        is_deleted_by_recipient INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        read_at DATETIME,
        FOREIGN KEY (sender_id) REFERENCES users(id),
        FOREIGN KEY (recipient_id) REFERENCES users(id)
      )`);

      // Bulletins table
      db.run(`CREATE TABLE IF NOT EXISTS bulletins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        author_id INTEGER NOT NULL,
        is_active INTEGER DEFAULT 1,
        priority INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (author_id) REFERENCES users(id)
      )`);

      // Activity logs table
      db.run(`CREATE TABLE IF NOT EXISTS activity_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        action TEXT NOT NULL,
        details TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )`);

      db.run(`CREATE INDEX IF NOT EXISTS idx_messages_board ON messages(board)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_messages_author ON messages(author_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_chat_sender ON chat_logs(sender_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_chat_recipient ON chat_logs(recipient_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_high_scores_game ON high_scores(game_name)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_emails_sender ON emails(sender_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_emails_recipient ON emails(recipient_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_bulletins_active ON bulletins(is_active)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp ON activity_logs(timestamp)`);

      // Create default SysOp user if it doesn't exist
      db.get('SELECT id FROM users WHERE handle = ?', ['SysOp'], (err, row) => {
        if (err) {
          console.error('Error checking for SysOp user:', err);
          resolve();
          return;
        }
        
        if (!row) {
          // Create default SysOp user
          const bcrypt = require('bcrypt');
          const defaultPassword = 'admin123'; // Default password
          const hashedPassword = bcrypt.hashSync(defaultPassword, 10);
          
          db.run(`INSERT INTO users (handle, real_name, location, password_hash, access_level, credits, created_at) 
                  VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
            ['SysOp', 'System Operator', 'BBS Headquarters', hashedPassword, 100, 1000],
            (err) => {
              if (err) {
                console.error('Error creating SysOp user:', err);
              } else {
                console.log('Default SysOp user created with password: admin123');
              }
              resolve();
            }
          );
        } else {
          resolve();
        }
      });
    });
  });
}

// User queries
function getUserByHandle(db, handle) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM users WHERE handle = ?', [handle], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function getUserById(db, id) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM users WHERE id = ?', [id], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function createUser(db, userData) {
  return new Promise((resolve, reject) => {
    const { handle, real_name, location, password_hash, signature } = userData;
    db.run(
      'INSERT INTO users (handle, real_name, location, password_hash, signature) VALUES (?, ?, ?, ?, ?)',
      [handle, real_name, location, password_hash, signature || ''],
      function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });
}

function updateUserLastSeen(db, userId) {
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE users SET last_seen = CURRENT_TIMESTAMP, calls = calls + 1 WHERE id = ?',
      [userId],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

function getAllUsers(db) {
  return new Promise((resolve, reject) => {
    db.all('SELECT id, handle, real_name, location, calls, time_online, messages_posted, last_seen FROM users ORDER BY handle', (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// Message queries
function getMessagesByBoard(db, board) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT m.*, u.handle as author_handle 
       FROM messages m 
       JOIN users u ON m.author_id = u.id 
       WHERE m.board = ? 
       ORDER BY m.created_at DESC`,
      [board],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
}

function getMessageById(db, id) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT m.*, u.handle as author_handle 
       FROM messages m 
       JOIN users u ON m.author_id = u.id 
       WHERE m.id = ?`,
      [id],
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });
}

function createMessage(db, messageData) {
  return new Promise((resolve, reject) => {
    const { board, subject, body, author_id, reply_to } = messageData;
    db.run(
      'INSERT INTO messages (board, subject, body, author_id, reply_to) VALUES (?, ?, ?, ?, ?)',
      [board, subject, body, author_id, reply_to || null],
      function(err) {
        if (err) reject(err);
        else {
          db.run('UPDATE users SET messages_posted = messages_posted + 1 WHERE id = ?', [author_id]);
          resolve(this.lastID);
        }
      }
    );
  });
}

// File queries
function getFilesByArea(db, area) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT f.*, u.handle as uploader_handle 
       FROM files f 
       JOIN users u ON f.uploader_id = u.id 
       WHERE f.area = ? 
       ORDER BY f.created_at DESC`,
      [area],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
}

function createFile(db, fileData) {
  return new Promise((resolve, reject) => {
    const { filename, description, area, size, uploader_id } = fileData;
    db.run(
      'INSERT INTO files (filename, description, area, size, uploader_id) VALUES (?, ?, ?, ?, ?)',
      [filename, description, area, size, uploader_id],
      function(err) {
        if (err) reject(err);
        else {
          db.run('UPDATE users SET files_uploaded = files_uploaded + 1 WHERE id = ?', [uploader_id]);
          resolve(this.lastID);
        }
      }
    );
  });
}

// Chat queries
function getChatHistory(db, limit = 50) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT c.*, u1.handle as sender_handle, u2.handle as recipient_handle
       FROM chat_logs c
       JOIN users u1 ON c.sender_id = u1.id
       LEFT JOIN users u2 ON c.recipient_id = u2.id
       WHERE c.is_private = 0
       ORDER BY c.created_at DESC
       LIMIT ?`,
      [limit],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows.reverse());
      }
    );
  });
}

function createChatMessage(db, chatData) {
  return new Promise((resolve, reject) => {
    const { sender_id, recipient_id, message, is_private } = chatData;
    db.run(
      'INSERT INTO chat_logs (sender_id, recipient_id, message, is_private) VALUES (?, ?, ?, ?)',
      [sender_id, recipient_id || null, message, is_private ? 1 : 0],
      function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });
}

// One-liners queries
function getOneLiners(db, limit = 50) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT o.*, u.handle as user_handle
       FROM oneliners o
       JOIN users u ON o.user_id = u.id
       ORDER BY o.created_at DESC
       LIMIT ?`,
      [limit],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows.reverse());
      }
    );
  });
}

function createOneLiner(db, user_id, message) {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO oneliners (user_id, message) VALUES (?, ?)',
      [user_id, message],
      function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });
}

// Game state queries
function getGameState(db, user_id, game_name) {
  return new Promise((resolve, reject) => {
    console.log('🔍 DEBUG: getGameState called with:', { user_id, game_name });
    
    db.get(
      'SELECT * FROM game_states WHERE user_id = ? AND game_name = ?',
      [user_id, game_name],
      (err, row) => {
        if (err) {
          console.log('🔍 DEBUG: Database error in getGameState:', err);
          reject(err);
        } else {
          console.log('🔍 DEBUG: Retrieved game state row:', row);
          resolve(row);
        }
      }
    );
  });
}

function saveGameState(db, user_id, game_name, game_data) {
  return new Promise((resolve, reject) => {
    console.log('🔍 DEBUG: saveGameState called with:', { user_id, game_name, game_data });
    
    db.run(
      `INSERT INTO game_states (user_id, game_name, game_data) 
       VALUES (?, ?, ?) 
       ON CONFLICT(user_id, game_name) 
       DO UPDATE SET game_data = ?, updated_at = CURRENT_TIMESTAMP`,
      [user_id, game_name, game_data, game_data],
      function(err) {
        if (err) {
          console.log('🔍 DEBUG: Database error in saveGameState:', err);
          reject(err);
        } else {
          console.log('🔍 DEBUG: Database save successful, lastID:', this.lastID);
          resolve(this.lastID);
        }
      }
    );
  });
}

// High score queries
function getHighScores(db, game_name, limit = 10) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT h.*, u.handle as user_handle
       FROM high_scores h
       JOIN users u ON h.user_id = u.id
       WHERE h.game_name = ?
       ORDER BY h.score DESC
       LIMIT ?`,
      [game_name, limit],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
}

function createHighScore(db, user_id, game_name, score, details) {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO high_scores (user_id, game_name, score, details) VALUES (?, ?, ?, ?)',
      [user_id, game_name, score, details || null],
      function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });
}

// Sysop queries
function updateUserAccessLevel(db, user_id, access_level) {
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE users SET access_level = ? WHERE id = ?',
      [access_level, user_id],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

function deleteMessage(db, message_id) {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM messages WHERE id = ?', [message_id], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function deleteFile(db, file_id) {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM files WHERE id = ?', [file_id], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function deleteUser(db, user_id) {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM users WHERE id = ?', [user_id], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function getAllGameStates(db) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT gs.*, u.handle as user_handle
       FROM game_states gs
       JOIN users u ON gs.user_id = u.id
       ORDER BY gs.updated_at DESC`,
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
}

function getGameStatesByUser(db, user_id) {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT * FROM game_states WHERE user_id = ?',
      [user_id],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
}

function getSystemStats(db) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT 
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM messages) as total_messages,
        (SELECT COUNT(*) FROM files) as total_files,
        (SELECT COUNT(*) FROM chat_logs) as total_chat_messages,
        (SELECT COUNT(*) FROM game_states) as total_game_saves,
        (SELECT COUNT(*) FROM users WHERE last_seen > datetime('now', '-1 day')) as users_today`,
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });
}

// Email queries
function getInboxEmails(db, userId) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT e.*, u.handle as sender_handle
       FROM emails e
       JOIN users u ON e.sender_id = u.id
       WHERE e.recipient_id = ? AND e.is_deleted_by_recipient = 0
       ORDER BY e.created_at DESC`,
      [userId],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
}

function getSentEmails(db, userId) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT e.*, u.handle as recipient_handle
       FROM emails e
       JOIN users u ON e.recipient_id = u.id
       WHERE e.sender_id = ? AND e.is_deleted_by_sender = 0
       ORDER BY e.created_at DESC`,
      [userId],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
}

function getEmailById(db, emailId, userId) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT e.*, 
              u1.handle as sender_handle,
              u2.handle as recipient_handle
       FROM emails e
       JOIN users u1 ON e.sender_id = u1.id
       JOIN users u2 ON e.recipient_id = u2.id
       WHERE e.id = ? AND (e.sender_id = ? OR e.recipient_id = ?)`,
      [emailId, userId, userId],
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });
}

function createEmail(db, emailData) {
  return new Promise((resolve, reject) => {
    const { sender_id, recipient_id, subject, body } = emailData;
    db.run(
      'INSERT INTO emails (sender_id, recipient_id, subject, body) VALUES (?, ?, ?, ?)',
      [sender_id, recipient_id, subject, body],
      function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });
}

function markEmailAsRead(db, emailId, userId) {
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE emails SET is_read = 1, read_at = CURRENT_TIMESTAMP WHERE id = ? AND recipient_id = ?',
      [emailId, userId],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

function deleteEmail(db, emailId, userId) {
  return new Promise((resolve, reject) => {
    // Check if user is sender or recipient
    db.get('SELECT sender_id, recipient_id FROM emails WHERE id = ?', [emailId], (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      
      if (!row) {
        reject(new Error('Email not found'));
        return;
      }
      
      // Mark as deleted by sender or recipient
      if (row.sender_id === userId) {
        db.run('UPDATE emails SET is_deleted_by_sender = 1 WHERE id = ?', [emailId], (err) => {
          if (err) reject(err);
          else resolve();
        });
      } else if (row.recipient_id === userId) {
        db.run('UPDATE emails SET is_deleted_by_recipient = 1 WHERE id = ?', [emailId], (err) => {
          if (err) reject(err);
          else resolve();
        });
      } else {
        reject(new Error('Unauthorized'));
      }
    });
  });
}

function getUnreadEmailCount(db, userId) {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT COUNT(*) as count FROM emails WHERE recipient_id = ? AND is_read = 0 AND is_deleted_by_recipient = 0',
      [userId],
      (err, row) => {
        if (err) reject(err);
        else resolve(row ? row.count : 0);
      }
    );
  });
}

// Credits functions
function addCredits(db, userId, amount) {
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE users SET credits = credits + ? WHERE id = ?',
      [amount, userId],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

function getLeaderboard(db, limit = 10) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT id, handle, credits, calls, messages_posted, time_online 
       FROM users 
       ORDER BY credits DESC 
       LIMIT ?`,
      [limit],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
}

function updateUserSignature(db, userId, signature) {
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE users SET signature = ? WHERE id = ?',
      [signature, userId],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

function updateUserAvatar(db, userId, avatar) {
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE users SET avatar = ? WHERE id = ?',
      [avatar, userId],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

function updateUserProfile(db, userId, profileData) {
  return new Promise((resolve, reject) => {
    const { real_name, location } = profileData;
    db.run(
      'UPDATE users SET real_name = ?, location = ? WHERE id = ?',
      [real_name, location, userId],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

function updateUserPassword(db, userId, passwordHash) {
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE users SET password_hash = ? WHERE id = ?',
      [passwordHash, userId],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

// Bulletins functions
function getAllBulletins(db) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT b.*, u.handle as author_handle
       FROM bulletins b
       JOIN users u ON b.author_id = u.id
       WHERE b.is_active = 1
       ORDER BY b.priority DESC, b.created_at DESC`,
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
}

function createBulletin(db, bulletinData) {
  return new Promise((resolve, reject) => {
    const { title, message, author_id, priority } = bulletinData;
    db.run(
      'INSERT INTO bulletins (title, message, author_id, priority) VALUES (?, ?, ?, ?)',
      [title, message, author_id, priority || 0],
      function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });
}

function deleteBulletin(db, bulletinId) {
  return new Promise((resolve, reject) => {
    db.run('UPDATE bulletins SET is_active = 0 WHERE id = ?', [bulletinId], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function getActivityLogs(db) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT al.*, u.handle as user_handle
       FROM activity_logs al
       LEFT JOIN users u ON al.user_id = u.id
       ORDER BY al.timestamp DESC
       LIMIT 100`,
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
}

// SysOp chat functions
function saveSysopChatMessage(db, user_id, from_sysop, message) {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO sysop_chat_messages (user_id, from_sysop, message) VALUES (?, ?, ?)',
      [user_id, from_sysop ? 1 : 0, message],
      function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });
}

function getSysopChatHistory(db, user_id, limit = 50) {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT * FROM sysop_chat_messages WHERE user_id = ? ORDER BY timestamp DESC LIMIT ?',
      [user_id, limit],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows.reverse()); // Return in chronological order
      }
    );
  });
}

function getUnreadSysopMessages(db, user_id) {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT * FROM sysop_chat_messages WHERE user_id = ? AND from_sysop = 1 AND read_by_user = 0 ORDER BY timestamp',
      [user_id],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
}

function markSysopMessagesAsRead(db, user_id) {
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE sysop_chat_messages SET read_by_user = 1 WHERE user_id = ? AND from_sysop = 1',
      [user_id],
      function(err) {
        if (err) reject(err);
        else resolve(this.changes);
      }
    );
  });
}

function getAllSysopChatMessages(db, limit = 100) {
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT scm.*, u.handle as user_handle 
      FROM sysop_chat_messages scm 
      JOIN users u ON scm.user_id = u.id 
      ORDER BY scm.timestamp DESC 
      LIMIT ?
    `, [limit], (err, rows) => {
      if (err) reject(err);
      else resolve(rows.reverse()); // Return in chronological order
    });
  });
}

module.exports = {
  initDatabase,
  getUserByHandle,
  getUserById,
  createUser,
  updateUserLastSeen,
  getAllUsers,
  getMessagesByBoard,
  getMessageById,
  createMessage,
  getFilesByArea,
  createFile,
  getChatHistory,
  createChatMessage,
  getOneLiners,
  createOneLiner,
  getGameState,
  saveGameState,
  getHighScores,
  createHighScore,
  updateUserAccessLevel,
  deleteMessage,
  deleteFile,
  deleteUser,
  getAllGameStates,
  getGameStatesByUser,
  getSystemStats,
  getInboxEmails,
  getSentEmails,
  getEmailById,
  createEmail,
  markEmailAsRead,
  deleteEmail,
  getUnreadEmailCount,
  addCredits,
  getLeaderboard,
  updateUserSignature,
  updateUserAvatar,
  updateUserProfile,
  updateUserPassword,
  getAllBulletins,
  createBulletin,
  deleteBulletin,
  getActivityLogs,
  saveSysopChatMessage,
  getSysopChatHistory,
  getUnreadSysopMessages,
  markSysopMessagesAsRead,
  getAllSysopChatMessages
};



