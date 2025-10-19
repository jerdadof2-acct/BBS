const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const session = require('express-session');
const cors = require('cors');
const bcrypt = require('bcrypt');
const { initDatabase, query, getUserByHandle, getUserById, getGameState, saveGameState } = require('./db-pg');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// Initialize database
initDatabase().catch(console.error);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Session middleware (in-memory for now, can be upgraded later)
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

// Login endpoint
app.post('/api/login', async (req, res) => {
  try {
    const { handle, password } = req.body;
    
    const user = await getUserByHandle(handle);
    
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
    
    const user = await getUserById(req.session.userId);
    
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
    
    const gameState = await getGameState(req.session.userId, req.params.gameName);
    
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
    
    await saveGameState(req.session.userId, req.params.gameName, req.body);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Save game state error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Fishing Hole specific endpoints
app.post('/api/fishing-hole/player', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not logged in' });
    }
    
    const result = await query('SELECT * FROM fishing_hole_players WHERE user_id = $1', [req.session.userId]);
    
    if (result.rows.length > 0) {
      const player = result.rows[0];
      res.json({
        player_name: player.player_name,
        level: player.level,
        experience: player.experience,
        credits: player.credits,
        inventory: player.inventory ? JSON.parse(player.inventory) : [],
        trophy_catches: player.trophy_catches ? JSON.parse(player.trophy_catches) : [],
        location: { name: player.current_location || 'Lake Shore' }
      });
    } else {
      res.json(null);
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
    
    const { player_name, level, experience, credits, inventory, trophy_catches, location } = req.body;
    
    await query(
      `INSERT INTO fishing_hole_players (user_id, player_name, level, experience, credits, current_location, inventory, trophy_catches, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id) 
       DO UPDATE SET 
         player_name = $2, level = $3, experience = $4, credits = $5, 
         current_location = $6, inventory = $7, trophy_catches = $8, updated_at = CURRENT_TIMESTAMP`,
      [
        req.session.userId, 
        player_name, 
        level, 
        experience, 
        credits, 
        location?.name || 'Lake Shore',
        JSON.stringify(inventory || []),
        JSON.stringify(trophy_catches || [])
      ]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Save fishing player error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Additional API endpoints for full BBS functionality

// Bulletins endpoint
app.get('/api/bulletins', async (req, res) => {
  try {
    // Simple bulletins for now - can be expanded later
    res.json([
      { id: 1, title: "Welcome to Retro-BBS", content: "Welcome to our BBS! Have fun exploring.", created_at: new Date() }
    ]);
  } catch (error) {
    console.error('Get bulletins error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// SysOp check endpoint
app.get('/api/sysop/check', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not logged in' });
    }
    
    const user = await getUserById(req.session.userId);
    const isSysOp = user && user.access_level >= 100;
    
    res.json({ isSysOp });
  } catch (error) {
    console.error('SysOp check error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// SysOp chat endpoints
app.get('/api/sysop-chat/unread', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not logged in' });
    }
    
    const result = await query(
      'SELECT * FROM sysop_chat_messages WHERE user_id = $1 AND from_sysop = true AND read_by_user = false ORDER BY timestamp DESC',
      [req.session.userId]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Get unread sysop messages error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/sysop-chat/mark-read', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not logged in' });
    }
    
    await query(
      'UPDATE sysop_chat_messages SET read_by_user = true WHERE user_id = $1 AND from_sysop = true',
      [req.session.userId]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Mark sysop messages read error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/sysop-chat/send', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not logged in' });
    }
    
    const { message } = req.body;
    
    await query(
      'INSERT INTO sysop_chat_messages (user_id, from_sysop, message, timestamp) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)',
      [req.session.userId, false, message]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Send sysop message error:', error);
    res.status(500).json({ error: 'Server error' });
  }
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
  console.log(`Retro-BBS Server running on port ${PORT}`);
  console.log(`Visit http://localhost:${PORT} to connect`);
});
