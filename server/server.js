const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const cors = require('cors');
const path = require('path');
const { initDatabase } = require('./db');

// Import High Noon Hustle server
const hnhRoutes = require('./hnh-server');


const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// Session configuration
app.use(session({
  store: new SQLiteStore({ db: 'sessions.db', dir: './data' }),
  secret: process.env.SESSION_SECRET || 'retro-bbs-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// Initialize database
let db;
initDatabase().then(database => {
  db = database;
  console.log('Database initialized successfully');
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});

// API Routes
app.use('/api/hnh', hnhRoutes);

// Socket.io connection handling
const onlineUsers = new Map(); // socketId -> { userId, handle, accessLevel, lastActivity }

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('user-login', (data) => {
    const { userId, handle, accessLevel } = data;
    console.log('🔍 DEBUG: User login - userId:', userId, 'handle:', handle, 'accessLevel:', accessLevel);
    onlineUsers.set(socket.id, { userId, handle, accessLevel: accessLevel || 1, lastActivity: Date.now() });
    console.log('🔍 DEBUG: Online users after login:', Array.from(onlineUsers.values()));
    socket.broadcast.emit('user-online', { userId, handle });
    io.emit('online-users-update', Array.from(onlineUsers.values()));
  });

  socket.on('user-logout', () => {
    const user = onlineUsers.get(socket.id);
    if (user) {
      onlineUsers.delete(socket.id);
      socket.broadcast.emit('user-offline', { userId: user.userId, handle: user.handle });
      io.emit('online-users-update', Array.from(onlineUsers.values()));
    }
  });

  socket.on('get-online-users', () => {
    socket.emit('online-users-update', Array.from(onlineUsers.values()));
  });

  socket.on('chat-message', async (data) => {
    const user = onlineUsers.get(socket.id);
    if (user && data.message) {
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
      
      // Store character data for this user
      if (playerData) {
        user.characterData = {
          username: playerData.username,
          display_name: playerData.display_name,
          character_class: playerData.character_class,
          current_town: playerData.current_town,
          current_location: playerData.current_location || 'main_menu'
        };
        console.log('DEBUG: Stored character data for', user.handle, ':', user.characterData);
      } else {
        console.log('DEBUG: No playerData provided for', user.handle);
      }
      
      // Send current player list to the new player
      // Get only users who are actually in the high-noon-hustle room
      const roomSockets = io.sockets.adapter.rooms.get('high-noon-hustle');
      const roomPlayers = [];
      
      if (roomSockets) {
        roomSockets.forEach(socketId => {
          const roomUser = onlineUsers.get(socketId);
          if (roomUser) {
            const storedPlayerData = roomUser.characterData || {};
            // Only include players who are actually in the saloon
            if (storedPlayerData.current_location === 'saloon') {
              roomPlayers.push({
                id: roomUser.userId,
                name: storedPlayerData.username || roomUser.handle,
                display_name: storedPlayerData.display_name || roomUser.handle,
                character_class: storedPlayerData.character_class || 'gunslinger',
                current_town: storedPlayerData.current_town || 'tumbleweed_junction',
                socketId: socketId
              });
            }
          }
        });
      }
      
      // Send current players to the new joiner
      socket.emit('current-players', {
        game: 'high-noon-hustle',
        players: roomPlayers
      });
      
      // Only send player-joined event if the player is actually in the saloon
      const storedData = user.characterData || {};
      if (storedData.current_location === 'saloon') {
        const playerTown = storedData.current_town || 'tumbleweed_junction';
        const characterClass = storedData.character_class || 'gunslinger';
        
        io.to(room).emit('player-joined', { 
          game: 'high-noon-hustle',
          player: {
            id: user.userId,
            name: storedData.username || user.handle,
            display_name: storedData.display_name || user.handle,
            character_class: characterClass,
            current_town: playerTown,
            socketId: socket.id
          }
        });
        console.log('DEBUG: Broadcasting player-joined to all players (player in saloon)');
      } else {
        console.log('DEBUG: Player joined game but not in saloon, not broadcasting player-joined event');
      }
    } else {
      // Generic player join notification
      socket.to(room).emit('player-joined', { socketId: socket.id });
    }
  });

  socket.on('leave-game-room', (room) => {
    socket.leave(room);
    socket.to(room).emit('player-left', { socketId: socket.id });
  });

  socket.on('saloon-message', (data) => {
    if (data.game === 'high-noon-hustle') {
      socket.to('high-noon-hustle').emit('saloon-message', data);
    }
  });

  // High Noon Hustle Player Status Update
  socket.on('player-status-update', (data) => {
    if (data.game === 'high-noon-hustle') {
      const user = onlineUsers.get(socket.id);
      if (user) {
        const previousLocation = user.characterData?.current_location;
        
        // Update user's character data with current location
        if (!user.characterData) {
          user.characterData = {};
        }
        user.characterData.current_location = data.player.currentLocation;
        user.characterData.current_town = data.player.currentTown;
        user.characterData.character_class = data.player.characterClass;
        user.characterData.username = data.player.username;
        
        console.log('DEBUG: Updated player status for', user.handle, ':', {
          currentLocation: data.player.currentLocation,
          currentTown: data.player.currentTown,
          previousLocation: previousLocation
        });
        
        // If player entered saloon, broadcast to all players
        if (data.player.currentLocation === 'saloon' && previousLocation !== 'saloon') {
          const playerJoinedData = { 
            game: 'high-noon-hustle',
            player: {
              id: user.userId,
              name: user.characterData.username || user.handle,
              display_name: user.characterData.display_name || user.handle,
              character_class: user.characterData.character_class || 'gunslinger',
              current_town: user.characterData.current_town || 'tumbleweed_junction',
              socketId: socket.id
            }
          };
          console.log('DEBUG: Player entered saloon, broadcasting player-joined:', playerJoinedData);
          io.to('high-noon-hustle').emit('player-joined', playerJoinedData);
        }
        
        // If player left saloon, broadcast to all players
        if (previousLocation === 'saloon' && data.player.currentLocation !== 'saloon') {
          const playerLeftData = {
            game: 'high-noon-hustle',
            player: {
              id: user.userId,
              name: user.characterData.username || user.handle,
              socketId: socket.id
            }
          };
          console.log('DEBUG: Player left saloon, broadcasting player-left:', playerLeftData);
          io.to('high-noon-hustle').emit('player-left', playerLeftData);
        }
      }
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

  socket.on('saloon-message', (data) => {
    if (data.game === 'high-noon-hustle') {
      console.log('DEBUG: Saloon message from', data.player.name, ':', data.message);
      // Broadcast to all players in the high-noon-hustle room
      io.to('high-noon-hustle').emit('saloon-message', data);
    }
  });

  // Tournament handlers for High Noon Hustle
  socket.on('tournament-start', (data) => {
    console.log('DEBUG: Received tournament-start event on server:', data);
    if (data.game === 'high-noon-hustle') {
      console.log('DEBUG: Tournament start from', data.host, ':', data.gameType);
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
      // Broadcast tournament end to all BBS users
      io.emit('tournament-end', data);
    }
  });

  socket.on('disconnect', () => {
    const user = onlineUsers.get(socket.id);
    if (user) {
      // Notify High Noon Hustle players if they were in the game
      socket.to('high-noon-hustle').emit('player-left', {
        game: 'high-noon-hustle',
        player: {
          id: user.userId,
          name: user.handle,
          socketId: socket.id
        }
      });
      
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
            challengerStats: data.challengerStats,
            timestamp: new Date().toISOString()
          });
          break;
        }
      }
    }
  });

  // Pit PvP Challenge Response
  socket.on('pit-challenge-response', (data) => {
    const user = onlineUsers.get(socket.id);
    if (user) {
      // Find challenger's socket
      for (const [socketId, onlineUser] of onlineUsers.entries()) {
        if (onlineUser.userId === data.challengerId) {
          io.to(socketId).emit('pit-challenge-response', {
            accepted: data.accepted,
            opponentStats: data.opponentStats,
            opponentHandle: user.handle
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
            challengerStats: data.challengerStats,
            timestamp: new Date().toISOString()
          });
          break;
        }
      }
    }
  });

  // Cyber Arena Challenge Response
  socket.on('arena-challenge-response', (data) => {
    const user = onlineUsers.get(socket.id);
    if (user) {
      // Find challenger's socket
      for (const [socketId, onlineUser] of onlineUsers.entries()) {
        if (onlineUser.userId === data.challengerId) {
          io.to(socketId).emit('arena-challenge-response', {
            accepted: data.accepted,
            opponentStats: data.opponentStats,
            opponentHandle: user.handle
          });
          break;
        }
      }
    }
  });

  // Fishing Hole - Broadcast fish catches to all players
  socket.on('fish-caught', (data) => {
    const user = onlineUsers.get(socket.id);
    if (user) {
      // Broadcast to all other players
      socket.broadcast.emit('fish-caught', {
        userId: user.userId,
        handle: user.handle,
        fishName: data.fishName,
        weight: data.weight,
        location: data.location,
        value: data.value,
        experience: data.experience,
        rarity: data.rarity,
        timestamp: new Date().toISOString()
      });
    }
  });
});

// Fishing Hole Game API
app.post('/api/fishing-hole/player', async (req, res) => {
  try {
    const { playerName, userId } = req.body;
    
    // Get or create fishing hole player data
    // If no userId (not logged in), use -1 for anonymous players
    const searchUserId = userId || -1;
    console.log(`Searching for player: userId=${searchUserId}, playerName=${playerName}`);
    
    let player = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM fishing_hole_players WHERE user_id = ? AND player_name = ?',
        [searchUserId, playerName],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
    
    if (player) {
      console.log('Raw player data from database:', player);
      // Store the raw current_location before processing
      const currentLocation = player.current_location || 'Lake Shore';
      
      // Parse JSON data and map database columns to frontend format
      player = {
        name: player.player_name,
        level: player.level,
        experience: player.experience,
        money: player.money,
        totalCaught: player.total_caught,
        totalWeight: player.total_weight,
        biggestCatch: player.biggest_catch,
        biggestCatchName: player.biggest_catch_name,
        rareCatches: player.rare_catches,
        legendaryCatches: player.legendary_catches,
        trophyCatches: player.trophy_catches,
        gear: JSON.parse(player.gear || '{}'),
        stats: JSON.parse(player.stats || '{}'),
        achievements: JSON.parse(player.achievements || '[]'),
        challenges: JSON.parse(player.challenges || '[]'),
        seasonStats: JSON.parse(player.season_stats || '{}'),
        locationUnlocks: JSON.parse(player.location_unlocks || '[0,1]'),
        tackleUnlocks: JSON.parse(player.tackle_unlocks || '{}'),
        inventory: JSON.parse(player.inventory || '[]')
      };
      console.log('Processed player data:', player);
      res.json({ 
        player,
        location: { name: currentLocation }
      });
    } else {
      console.log('No player found in database');
      res.json({ player: null });
    }
  } catch (error) {
    console.error('Error loading fishing hole player:', error);
    res.status(500).json({ error: 'Failed to load player data' });
  }
});

app.post('/api/fishing-hole/save', async (req, res) => {
  try {
    const { player, location, userId } = req.body;
    
    // Save fishing hole player data
    // If no userId (not logged in), use -1 for anonymous players
    const saveUserId = userId || -1;
    console.log(`Saving player: userId=${saveUserId}, playerName=${player.name}`);
    // Check if player already exists
    const existingPlayer = await new Promise((resolve, reject) => {
      db.get(`
        SELECT id FROM fishing_hole_players 
        WHERE user_id = ? AND player_name = ?
      `, [saveUserId, player.name], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    if (existingPlayer) {
      // Update existing player
      await db.run(`
        UPDATE fishing_hole_players SET
          level = ?, experience = ?, money = ?, total_caught = ?, total_weight = ?,
          biggest_catch = ?, biggest_catch_name = ?, rare_catches = ?, legendary_catches = ?, trophy_catches = ?,
          gear = ?, stats = ?, achievements = ?, challenges = ?, season_stats = ?,
          location_unlocks = ?, current_location = ?, tackle_unlocks = ?, inventory = ?, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ? AND player_name = ?
      `, [
        player.level,
        player.experience,
        player.money,
        player.totalCaught,
        player.totalWeight,
        player.biggestCatch,
        player.biggestCatchName,
        player.rareCatches,
        player.legendaryCatches,
        player.trophyCatches,
        JSON.stringify(player.gear),
        JSON.stringify(player.stats),
        JSON.stringify(player.achievements),
        JSON.stringify(player.challenges),
        JSON.stringify(player.seasonStats),
        JSON.stringify(player.locationUnlocks),
        location ? location.name : 'Lake Shore',
        JSON.stringify(player.tackleUnlocks),
        JSON.stringify(player.inventory),
        saveUserId,
        player.name
      ]);
    } else {
      // Insert new player
      await db.run(`
        INSERT INTO fishing_hole_players 
        (user_id, player_name, level, experience, money, total_caught, total_weight, 
         biggest_catch, biggest_catch_name, rare_catches, legendary_catches, trophy_catches,
         gear, stats, achievements, challenges, season_stats, location_unlocks, current_location, tackle_unlocks, inventory)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        saveUserId,
        player.name,
        player.level,
        player.experience,
        player.money,
        player.totalCaught,
        player.totalWeight,
        player.biggestCatch,
        player.biggestCatchName,
        player.rareCatches,
        player.legendaryCatches,
        player.trophyCatches,
        JSON.stringify(player.gear),
        JSON.stringify(player.stats),
        JSON.stringify(player.achievements),
        JSON.stringify(player.challenges),
        JSON.stringify(player.seasonStats),
        JSON.stringify(player.locationUnlocks),
        location ? location.name : 'Lake Shore',
        JSON.stringify(player.tackleUnlocks),
        JSON.stringify(player.inventory)
      ]);
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving fishing hole player:', error);
    res.status(500).json({ error: 'Failed to save player data' });
  }
});

// Fishing Hole Leaderboard API
app.get('/api/game-state/fishing-hole/leaderboard', async (req, res) => {
  try {
    // Get top 10 anglers by biggest catch
    const topCatches = await new Promise((resolve, reject) => {
      db.all(`
        SELECT player_name, level, total_caught, biggest_catch, biggest_catch_name
        FROM fishing_hole_players 
        WHERE biggest_catch > 0
        ORDER BY biggest_catch DESC 
        LIMIT 10
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    // Get top 10 anglers by top 10 fish weight (biggest "bag")
    const allPlayers = await new Promise((resolve, reject) => {
      db.all(`
        SELECT player_name, level, total_caught, inventory
        FROM fishing_hole_players 
        WHERE inventory IS NOT NULL AND inventory != '[]'
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    // Calculate top 10 fish weight for each player
    const topBags = allPlayers.map(player => {
      try {
        const inventory = JSON.parse(player.inventory || '[]');
        // Sort fish by weight (descending) and take top 10
        const top10Fish = inventory
          .sort((a, b) => b.weight - a.weight)
          .slice(0, 10);
        
        const top10Weight = top10Fish.reduce((sum, fish) => sum + fish.weight, 0);
        
        return {
          player_name: player.player_name,
          level: player.level,
          total_caught: player.total_caught,
          top10_weight: top10Weight,
          biggest_catch_name: top10Fish.length > 0 ? top10Fish[0].name : 'None'
        };
      } catch (error) {
        console.error('Error parsing inventory for player:', player.player_name, error);
        return {
          player_name: player.player_name,
          level: player.level,
          total_caught: player.total_caught,
          top10_weight: 0,
          biggest_catch_name: 'None'
        };
      }
    })
    .filter(player => player.top10_weight > 0)
    .sort((a, b) => b.top10_weight - a.top10_weight)
    .slice(0, 10);

    res.json({
      topCatches: topCatches.map(row => ({
        playerName: row.player_name,
        level: row.level,
        totalCaught: row.total_caught,
        biggestCatch: row.biggest_catch,
        biggestCatchName: row.biggest_catch_name
      })),
      topBags: topBags.map(row => ({
        playerName: row.player_name,
        level: row.level,
        totalCaught: row.total_caught,
        totalWeight: row.top10_weight,
        biggestCatchName: row.biggest_catch_name
      }))
    });
  } catch (error) {
    console.error('Error loading fishing hole leaderboard:', error);
    res.status(500).json({ error: 'Failed to load leaderboard' });
  }
});

// LORD Player API
app.post('/api/lord/player', async (req, res) => {
  try {
    const { playerName, userId } = req.body;
    
    // Use -1 for anonymous players (not logged in)
    const searchUserId = userId || -1;
    console.log(`Searching for LORD player: userId=${searchUserId}, playerName=${playerName}`);
    
    // Get player data
    const player = await new Promise((resolve, reject) => {
      db.get(`
        SELECT * FROM lord_players 
        WHERE user_id = ? AND player_name = ?
      `, [searchUserId, playerName], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    if (player) {
      // Process the data to match frontend expectations
      const processedPlayer = {
        name: player.player_name,
        loginUsername: player.login_username,
        class: player.class,
        gender: player.gender,
        alignment: player.alignment,
        level: player.level,
        experience: player.experience,
        gold: player.gold,
        hp: player.hp,
        maxHp: player.max_hp,
        strength: player.strength,
        defense: player.defense,
        charisma: player.charisma,
        bankGold: player.bank_gold,
        daysPlayed: player.days_played,
        monstersKilled: player.monsters_killed,
        deaths: player.deaths,
        questsCompleted: player.quests_completed,
        violetRomance: player.violet_romance,
        redDragonDefeated: player.red_dragon_defeated,
        redDragonDefeatedAt: player.red_dragon_defeated_at,
        equipment: JSON.parse(player.equipment || '{}')
      };
      
      console.log('Found LORD player:', processedPlayer.name);
      res.json({ player: processedPlayer });
    } else {
      console.log('No LORD player found, creating new one');
      res.json({ player: null });
    }
  } catch (error) {
    console.error('Error loading LORD player:', error);
    res.status(500).json({ error: 'Failed to load player data' });
  }
});

app.post('/api/lord/save', async (req, res) => {
  try {
    const { player, userId } = req.body;
    
    // Use -1 for anonymous players (not logged in)
    const saveUserId = userId || -1;
    console.log(`Saving LORD player: userId=${saveUserId}, playerName=${player.name}`);
    
    // Ensure loginUsername is not null/undefined
    const loginUsername = player.loginUsername || 'Guest';
    
    // Check if player already exists
    const existingPlayer = await new Promise((resolve, reject) => {
      db.get(`
        SELECT id FROM lord_players 
        WHERE user_id = ? AND player_name = ?
      `, [saveUserId, player.name], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    if (existingPlayer) {
      // Update existing player
      await db.run(`
        UPDATE lord_players SET
          login_username = ?, class = ?, gender = ?, alignment = ?, level = ?, experience = ?,
          gold = ?, hp = ?, max_hp = ?, strength = ?, defense = ?, charisma = ?, bank_gold = ?,
          days_played = ?, monsters_killed = ?, deaths = ?, quests_completed = ?, violet_romance = ?,
          red_dragon_defeated = ?, red_dragon_defeated_at = ?, equipment = ?, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ? AND player_name = ?
      `, [
        loginUsername,
        player.class,
        player.gender,
        player.alignment,
        player.level,
        player.experience,
        player.gold,
        player.hp,
        player.maxHp,
        player.strength,
        player.defense,
        player.charisma,
        player.bankGold,
        player.daysPlayed,
        player.monstersKilled,
        player.deaths,
        player.questsCompleted,
        player.violetRomance,
        player.redDragonDefeated,
        player.redDragonDefeatedAt,
        JSON.stringify(player.equipment),
        saveUserId,
        player.name
      ]);
    } else {
      // Insert new player
      await db.run(`
        INSERT INTO lord_players 
        (user_id, player_name, login_username, class, gender, alignment, level, experience, gold, 
         hp, max_hp, strength, defense, charisma, bank_gold, days_played, monsters_killed, deaths, 
         quests_completed, violet_romance, red_dragon_defeated, red_dragon_defeated_at, equipment)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        saveUserId,
        player.name,
        loginUsername,
        player.class,
        player.gender,
        player.alignment,
        player.level,
        player.experience,
        player.gold,
        player.hp,
        player.maxHp,
        player.strength,
        player.defense,
        player.charisma,
        player.bankGold,
        player.daysPlayed,
        player.monstersKilled,
        player.deaths,
        player.questsCompleted,
        player.violetRomance,
        player.redDragonDefeated,
        player.redDragonDefeatedAt,
        JSON.stringify(player.equipment)
      ]);
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving LORD player:', error);
    res.status(500).json({ error: 'Failed to save player data' });
  }
});

// LORD Leaderboard API
app.get('/api/game-state/lord/leaderboard', async (req, res) => {
  try {
    // Get top 10 players by level
    const topLevels = await new Promise((resolve, reject) => {
      db.all(`
        SELECT player_name, class, level, experience, gold, red_dragon_defeated
        FROM lord_players 
        ORDER BY level DESC, experience DESC 
        LIMIT 10
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    // Get top 10 players by gold
    const topGold = await new Promise((resolve, reject) => {
      db.all(`
        SELECT player_name, class, level, experience, gold, red_dragon_defeated
        FROM lord_players 
        ORDER BY gold DESC 
        LIMIT 10
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    // Get Red Dragon slayers
    const dragonSlayers = await new Promise((resolve, reject) => {
      db.all(`
        SELECT player_name, class, level, experience, gold, red_dragon_defeated_at
        FROM lord_players 
        WHERE red_dragon_defeated = 1
        ORDER BY red_dragon_defeated_at ASC
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    res.json({
      topLevels: topLevels.map(row => ({
        playerName: row.player_name,
        class: row.class,
        level: row.level,
        experience: row.experience,
        gold: row.gold,
        redDragonDefeated: row.red_dragon_defeated
      })),
      topGold: topGold.map(row => ({
        playerName: row.player_name,
        class: row.class,
        level: row.level,
        experience: row.experience,
        gold: row.gold,
        redDragonDefeated: row.red_dragon_defeated
      })),
      dragonSlayers: dragonSlayers.map(row => ({
        playerName: row.player_name,
        class: row.class,
        level: row.level,
        experience: row.experience,
        gold: row.gold,
        defeatedAt: row.red_dragon_defeated_at
      }))
    });
  } catch (error) {
    console.error('Error loading LORD leaderboard:', error);
    res.status(500).json({ error: 'Failed to load leaderboard' });
  }
});

// Auth routes
app.post('/api/register', async (req, res) => {
  try {
    const { handle, real_name, location, password } = req.body;
    const bcrypt = require('bcrypt');
    const { getUserByHandle, createUser } = require('./db');

    // Check if handle exists
    const existing = await getUserByHandle(db, handle);
    if (existing) {
      return res.status(400).json({ error: 'Handle already taken' });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Create user
    const userId = await createUser(db, {
      handle,
      real_name,
      location,
      password_hash,
      signature: ''
    });

    res.json({ success: true, userId });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { handle, password } = req.body;
    const bcrypt = require('bcrypt');
    const { getUserByHandle, updateUserLastSeen } = require('./db');

    const user = await getUserByHandle(db, handle);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update session
    req.session.userId = user.id;
    req.session.handle = user.handle;

    // Update last seen
    await updateUserLastSeen(db, user.id);

    res.json({ 
      success: true, 
      user: {
        id: user.id,
        handle: user.handle,
        real_name: user.real_name,
        location: user.location,
        signature: user.signature,
        calls: user.calls,
        access_level: user.access_level
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

app.get('/api/me', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  try {
    const { getUserById } = require('./db');
    const user = await getUserById(db, req.session.userId);
    
    res.json({ 
      userId: req.session.userId, 
      handle: req.session.handle,
      access_level: user ? user.access_level : 1
    });
  } catch (error) {
    console.error('Get user info error:', error);
    res.json({ userId: req.session.userId, handle: req.session.handle, access_level: 1 });
  }
});

// Message routes
app.get('/api/messages/:board', async (req, res) => {
  try {
    const { getMessagesByBoard } = require('./db');
    const messages = await getMessagesByBoard(db, req.params.board);
    res.json(messages);
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Failed to get messages' });
  }
});

app.post('/api/messages', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { board, subject, body, reply_to } = req.body;
    const { createMessage } = require('./db');

    const messageId = await createMessage(db, {
      board,
      subject,
      body,
      author_id: req.session.userId,
      reply_to
    });

    // Award credits for posting
    const { addCredits } = require('./db');
    await addCredits(db, req.session.userId, 5);

    // Notify all connected users
    io.emit('new-message', { board, messageId });

    res.json({ success: true, messageId });
  } catch (error) {
    console.error('Create message error:', error);
    res.status(500).json({ error: 'Failed to create message' });
  }
});

// File routes
app.get('/api/files/:area', async (req, res) => {
  try {
    const { getFilesByArea } = require('./db');
    const files = await getFilesByArea(db, req.params.area);
    res.json(files);
  } catch (error) {
    console.error('Get files error:', error);
    res.status(500).json({ error: 'Failed to get files' });
  }
});

// Chat routes
app.get('/api/chat', async (req, res) => {
  try {
    const { getChatHistory } = require('./db');
    const messages = await getChatHistory(db);
    res.json(messages);
  } catch (error) {
    console.error('Get chat error:', error);
    res.status(500).json({ error: 'Failed to get chat history' });
  }
});

// One-liners routes
app.get('/api/oneliners', async (req, res) => {
  try {
    const { getOneLiners } = require('./db');
    const oneliners = await getOneLiners(db);
    res.json(oneliners);
  } catch (error) {
    console.error('Get oneliners error:', error);
    res.status(500).json({ error: 'Failed to get one-liners' });
  }
});

app.post('/api/oneliners', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { message } = req.body;
    const { createOneLiner } = require('./db');

    const id = await createOneLiner(db, req.session.userId, message);
    
    // Award credits for one-liner
    const { addCredits } = require('./db');
    await addCredits(db, req.session.userId, 1);
    
    res.json({ success: true, id });
  } catch (error) {
    console.error('Create oneliner error:', error);
    res.status(500).json({ error: 'Failed to create one-liner' });
  }
});

// Users routes
app.get('/api/users', async (req, res) => {
  try {
    const { getAllUsers } = require('./db');
    const users = await getAllUsers(db);
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});


// Test endpoint to check game_states table
app.get('/api/debug/game-states-table', async (req, res) => {
  try {
    console.log('🔍 DEBUG: Checking game_states table structure');
    
    // Check if table exists and get its structure
    const tableInfo = await new Promise((resolve, reject) => {
      db.all("PRAGMA table_info(game_states)", (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    console.log('🔍 DEBUG: game_states table structure:', tableInfo);
    
    // Get count of records
    const count = await new Promise((resolve, reject) => {
      db.get("SELECT COUNT(*) as count FROM game_states", (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    });
    
    console.log('🔍 DEBUG: game_states record count:', count);
    
    res.json({
      tableExists: tableInfo.length > 0,
      tableStructure: tableInfo,
      recordCount: count
    });
  } catch (error) {
    console.error('🔍 DEBUG: Error checking game_states table:', error);
    res.status(500).json({ error: 'Failed to check table' });
  }
});

// Game state routes
app.get('/api/game-state/:gameName', async (req, res) => {
  try {
    console.log('🔍 DEBUG: Game state load request received');
    console.log('🔍 DEBUG: Game name:', req.params.gameName);
    console.log('🔍 DEBUG: User ID:', req.session.userId);
    
    if (!req.session.userId) {
      console.log('🔍 DEBUG: No user session, returning 401');
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { getGameState } = require('./db');
    console.log('🔍 DEBUG: Calling getGameState with userId:', req.session.userId, 'gameName:', req.params.gameName);
    
    const state = await getGameState(db, req.session.userId, req.params.gameName);
    console.log('🔍 DEBUG: Retrieved state:', state);
    
    res.json(state);
  } catch (error) {
    console.error('🔍 DEBUG: Get game state error:', error);
    res.status(500).json({ error: 'Failed to get game state' });
  }
});

app.post('/api/game-state/:gameName', async (req, res) => {
  try {
    console.log('🔍 DEBUG: Game state save request received');
    console.log('🔍 DEBUG: Game name:', req.params.gameName);
    console.log('🔍 DEBUG: User ID:', req.session.userId);
    console.log('🔍 DEBUG: Request body:', req.body);
    
    if (!req.session.userId) {
      console.log('🔍 DEBUG: No user session, returning 401');
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { saveGameState } = require('./db');
    console.log('🔍 DEBUG: Calling saveGameState with userId:', req.session.userId, 'gameName:', req.params.gameName);
    
    const result = await saveGameState(db, req.session.userId, req.params.gameName, JSON.stringify(req.body));
    console.log('🔍 DEBUG: saveGameState result:', result);
    
    res.json({ success: true });
    console.log('🔍 DEBUG: Save completed successfully');
  } catch (error) {
    console.error('🔍 DEBUG: Save game state error:', error);
    res.status(500).json({ error: 'Failed to save game state' });
  }
});

// High scores routes
app.get('/api/high-scores/:gameName', async (req, res) => {
  try {
    const { getHighScores } = require('./db');
    const scores = await getHighScores(db, req.params.gameName);
    res.json(scores);
  } catch (error) {
    console.error('Get high scores error:', error);
    res.status(500).json({ error: 'Failed to get high scores' });
  }
});

app.post('/api/high-scores', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { game_name, score, details } = req.body;
    const { createHighScore } = require('./db');

    const id = await createHighScore(db, req.session.userId, game_name, score, details);
    res.json({ success: true, id });
  } catch (error) {
    console.error('Create high score error:', error);
    res.status(500).json({ error: 'Failed to create high score' });
  }
});

// Helper function to check if user is sysop
function isSysop(req) {
  return req.session.handle === 'SysOp' || (req.session.accessLevel && req.session.accessLevel >= 100);
}

// Sysop routes - require authentication
app.get('/api/sysop/check', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  res.json({ isSysop: isSysop(req) });
});

app.get('/api/sysop/users', async (req, res) => {
  try {
    if (!isSysop(req)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { getAllUsers } = require('./db');
    const users = await getAllUsers(db);
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

app.post('/api/sysop/user/:userId/access', async (req, res) => {
  try {
    if (!isSysop(req)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { updateUserAccessLevel } = require('./db');
    const { access_level } = req.body;
    await updateUserAccessLevel(db, req.params.userId, access_level);
    res.json({ success: true });
  } catch (error) {
    console.error('Update access level error:', error);
    res.status(500).json({ error: 'Failed to update access level' });
  }
});

app.delete('/api/sysop/user/:userId', async (req, res) => {
  try {
    if (!isSysop(req)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { deleteUser } = require('./db');
    await deleteUser(db, req.params.userId);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

app.get('/api/sysop/game-states', async (req, res) => {
  try {
    if (!isSysop(req)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { getAllGameStates } = require('./db');
    const gameStates = await getAllGameStates(db);
    res.json(gameStates);
  } catch (error) {
    console.error('Get game states error:', error);
    res.status(500).json({ error: 'Failed to get game states' });
  }
});

app.get('/api/sysop/game-state/:userId/:gameName', async (req, res) => {
  try {
    if (!isSysop(req)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { getGameState } = require('./db');
    const state = await getGameState(db, req.params.userId, req.params.gameName);
    res.json(state);
  } catch (error) {
    console.error('Get game state error:', error);
    res.status(500).json({ error: 'Failed to get game state' });
  }
});

app.post('/api/sysop/game-state/:userId/:gameName', async (req, res) => {
  try {
    if (!isSysop(req)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { saveGameState } = require('./db');
    await saveGameState(db, req.params.userId, req.params.gameName, JSON.stringify(req.body));
    res.json({ success: true });
  } catch (error) {
    console.error('Save game state error:', error);
    res.status(500).json({ error: 'Failed to save game state' });
  }
});

app.delete('/api/sysop/message/:messageId', async (req, res) => {
  try {
    if (!isSysop(req)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { deleteMessage } = require('./db');
    await deleteMessage(db, req.params.messageId);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

app.delete('/api/sysop/file/:fileId', async (req, res) => {
  try {
    if (!isSysop(req)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { deleteFile } = require('./db');
    await deleteFile(db, req.params.fileId);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

app.get('/api/sysop/stats', async (req, res) => {
  try {
    if (!isSysop(req)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { getSystemStats } = require('./db');
    const stats = await getSystemStats(db);
    res.json(stats);
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// Email routes
app.get('/api/emails/inbox', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { getInboxEmails } = require('./db');
    const emails = await getInboxEmails(db, req.session.userId);
    res.json(emails);
  } catch (error) {
    console.error('Get inbox error:', error);
    res.status(500).json({ error: 'Failed to get inbox' });
  }
});

app.get('/api/emails/sent', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { getSentEmails } = require('./db');
    const emails = await getSentEmails(db, req.session.userId);
    res.json(emails);
  } catch (error) {
    console.error('Get sent emails error:', error);
    res.status(500).json({ error: 'Failed to get sent emails' });
  }
});

app.get('/api/emails/:id', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { getEmailById, markEmailAsRead } = require('./db');
    const email = await getEmailById(db, req.params.id, req.session.userId);
    
    if (!email) {
      return res.status(404).json({ error: 'Email not found' });
    }

    // Mark as read if user is recipient
    if (email.recipient_id === req.session.userId && !email.is_read) {
      await markEmailAsRead(db, req.params.id, req.session.userId);
    }

    res.json(email);
  } catch (error) {
    console.error('Get email error:', error);
    res.status(500).json({ error: 'Failed to get email' });
  }
});

app.post('/api/emails', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { recipient_handle, subject, body } = req.body;
    
    // Get recipient user
    const { getUserByHandle, createEmail } = require('./db');
    const recipient = await getUserByHandle(db, recipient_handle);
    
    if (!recipient) {
      return res.status(404).json({ error: 'Recipient not found' });
    }

    if (recipient.id === req.session.userId) {
      return res.status(400).json({ error: 'Cannot send email to yourself' });
    }

    const emailId = await createEmail(db, {
      sender_id: req.session.userId,
      recipient_id: recipient.id,
      subject,
      body
    });

    // Award credits for sending email
    const { addCredits } = require('./db');
    await addCredits(db, req.session.userId, 3);

    res.json({ success: true, emailId });
  } catch (error) {
    console.error('Send email error:', error);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

app.delete('/api/emails/:id', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { deleteEmail } = require('./db');
    await deleteEmail(db, req.params.id, req.session.userId);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete email error:', error);
    res.status(500).json({ error: 'Failed to delete email' });
  }
});

app.get('/api/emails/unread/count', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { getUnreadEmailCount } = require('./db');
    const count = await getUnreadEmailCount(db, req.session.userId);
    res.json({ count });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ error: 'Failed to get unread count' });
  }
});

// Credits routes
app.get('/api/leaderboard', async (req, res) => {
  try {
    const { getLeaderboard } = require('./db');
    const leaderboard = await getLeaderboard(db, 10);
    res.json(leaderboard);
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({ error: 'Failed to get leaderboard' });
  }
});

// Bulletins routes
app.get('/api/bulletins', async (req, res) => {
  try {
    const { getAllBulletins } = require('./db');
    const bulletins = await getAllBulletins(db);
    res.json(bulletins);
  } catch (error) {
    console.error('Get bulletins error:', error);
    res.status(500).json({ error: 'Failed to get bulletins' });
  }
});

app.post('/api/bulletins', async (req, res) => {
  try {
    if (!isSysop(req)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { title, message, priority } = req.body;
    const { createBulletin } = require('./db');

    const bulletinId = await createBulletin(db, {
      title,
      message,
      author_id: req.session.userId,
      priority: priority || 0
    });

    res.json({ success: true, bulletinId });
  } catch (error) {
    console.error('Create bulletin error:', error);
    res.status(500).json({ error: 'Failed to create bulletin' });
  }
});

app.delete('/api/bulletins/:id', async (req, res) => {
  try {
    if (!isSysop(req)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { deleteBulletin } = require('./db');
    await deleteBulletin(db, req.params.id);

    res.json({ success: true });
  } catch (error) {
    console.error('Delete bulletin error:', error);
    res.status(500).json({ error: 'Failed to delete bulletin' });
  }
});

// Online users route
app.get('/api/users/online', async (req, res) => {
  try {
    const onlineUserList = Array.from(onlineUsers.values()).map(user => ({
      id: user.userId,
      handle: user.handle
    }));
    res.json(onlineUserList);
  } catch (error) {
    console.error('Get online users error:', error);
    res.status(500).json({ error: 'Failed to get online users' });
  }
});

// Activity logs route
app.get('/api/sysop/activity-logs', async (req, res) => {
  try {
    if (!isSysop(req)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { getActivityLogs } = require('./db');
    const logs = await getActivityLogs(db);
    res.json(logs);
  } catch (error) {
    console.error('Get activity logs error:', error);
    res.status(500).json({ error: 'Failed to get activity logs' });
  }
});

// Activity feed route (public)
app.get('/api/activity-feed', async (req, res) => {
  try {
    const { getActivityLogs } = require('./db');
    const logs = await getActivityLogs(db);
    res.json(logs.slice(0, 20)); // Return last 20 activities
  } catch (error) {
    console.error('Get activity feed error:', error);
    res.status(500).json({ error: 'Failed to get activity feed' });
  }
});

// SysOp chat routes
app.get('/api/sysop-chat/history', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { getSysopChatHistory } = require('./db');
    const messages = await getSysopChatHistory(db, req.session.userId);
    res.json({ messages });
  } catch (error) {
    console.error('Get SysOp chat history error:', error);
    res.status(500).json({ error: 'Failed to get chat history' });
  }
});

app.get('/api/sysop-chat/unread', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { getUnreadSysopMessages } = require('./db');
    const messages = await getUnreadSysopMessages(db, req.session.userId);
    res.json({ messages });
  } catch (error) {
    console.error('Get unread SysOp messages error:', error);
    res.status(500).json({ error: 'Failed to get unread messages' });
  }
});

app.post('/api/sysop-chat/send', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const { saveSysopChatMessage } = require('./db');
    await saveSysopChatMessage(db, req.session.userId, false, message.trim());

    // Emit to all connected clients
    io.emit('sysop-chat-message', {
      from_sysop: false,
      message: message.trim(),
      timestamp: new Date().toISOString(),
      user_handle: req.session.user?.handle || 'Unknown'
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Send SysOp chat message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

app.get('/api/sysop-chat/all', async (req, res) => {
  try {
    if (!isSysop(req)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { getAllSysopChatMessages } = require('./db');
    const messages = await getAllSysopChatMessages(db);
    res.json({ messages });
  } catch (error) {
    console.error('Get all SysOp chat messages error:', error);
    res.status(500).json({ error: 'Failed to get messages' });
  }
});

app.post('/api/sysop-chat/respond', async (req, res) => {
  try {
    if (!isSysop(req)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { user_id, message } = req.body;
    if (!user_id || !message || !message.trim()) {
      return res.status(400).json({ error: 'User ID and message are required' });
    }

    const { saveSysopChatMessage } = require('./db');
    await saveSysopChatMessage(db, user_id, true, message.trim());

    // Emit to the specific user
    const userSocket = Array.from(onlineUsers.values()).find(u => u.userId === user_id);
    if (userSocket) {
      io.to(userSocket.socketId).emit('sysop-chat-message', {
        from_sysop: true,
        message: message.trim(),
        timestamp: new Date().toISOString()
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Send SysOp response error:', error);
    res.status(500).json({ error: 'Failed to send response' });
  }
});

app.post('/api/sysop-chat/mark-read', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { markSysopMessagesAsRead } = require('./db');
    await markSysopMessagesAsRead(db, req.session.userId);
    res.json({ success: true });
  } catch (error) {
    console.error('Mark messages as read error:', error);
    res.status(500).json({ error: 'Failed to mark messages as read' });
  }
});

// User profile routes
app.post('/api/user/signature', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { signature } = req.body;
    const { updateUserSignature } = require('./db');

    await updateUserSignature(db, req.session.userId, signature);
    res.json({ success: true });
  } catch (error) {
    console.error('Update signature error:', error);
    res.status(500).json({ error: 'Failed to update signature' });
  }
});

app.post('/api/user/avatar', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { avatar } = req.body;
    const { updateUserAvatar } = require('./db');

    await updateUserAvatar(db, req.session.userId, avatar);
    res.json({ success: true });
  } catch (error) {
    console.error('Update avatar error:', error);
    res.status(500).json({ error: 'Failed to update avatar' });
  }
});

// Update user personal information
app.post('/api/user/profile', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { real_name, location } = req.body;
    const { updateUserProfile } = require('./db');

    await updateUserProfile(db, req.session.userId, { real_name, location });
    res.json({ success: true });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Change user password
app.post('/api/user/password', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { currentPassword, newPassword } = req.body;
    const bcrypt = require('bcrypt');
    const { getUserById, updateUserPassword } = require('./db');

    // Verify current password
    const user = await getUserById(db, req.session.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const validPassword = await bcrypt.compare(currentPassword, user.password_hash);
    if (!validPassword) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    await updateUserPassword(db, req.session.userId, newPasswordHash);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Database statistics endpoint for sysop
app.get('/api/sysop/database-stats', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Check if user is sysop
    const { getUserById } = require('./db');
    const user = await getUserById(db, req.session.userId);
    if (!user || user.level < 10) {
      return res.status(403).json({ error: 'Sysop access required' });
    }

    // Get database statistics
    const stats = await new Promise((resolve, reject) => {
      db.all(`
        SELECT 
          (SELECT COUNT(*) FROM users) as totalUsers,
          (SELECT COUNT(*) FROM messages) as totalMessages,
          (SELECT COUNT(*) FROM files) as totalFiles,
          (SELECT COUNT(*) FROM users WHERE last_seen > datetime('now', '-1 day')) as usersOnline,
          (SELECT COUNT(*) FROM messages WHERE created_at > datetime('now', '-1 day')) as messagesToday,
          0 as filesDownloaded
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows[0]);
      });
    });

    // Get database file size
    const fs = require('fs');
    const path = require('path');
    const dbPath = path.join(__dirname, '..', 'data', 'bbs.db');
    let dbSize = 'Unknown';
    try {
      const stats = fs.statSync(dbPath);
      dbSize = (stats.size / 1024).toFixed(2) + ' KB';
    } catch (e) {
      // Ignore error
    }

    res.json({
      ...stats,
      databaseSize: dbSize,
      lastBackup: null // TODO: Implement backup tracking
    });

  } catch (error) {
    console.error('Database stats error:', error);
    res.status(500).json({ error: 'Failed to get database statistics' });
  }
});

// Advanced User Management endpoints
app.get('/api/sysop/users', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { getUserById, getAllUsers } = require('./db');
    const user = await getUserById(db, req.session.userId);
    if (!user || user.access_level < 10) {
      return res.status(403).json({ error: 'Sysop access required' });
    }

    const users = await getAllUsers(db);
    res.json(users);

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

app.get('/api/sysop/users/search', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { getUserById } = require('./db');
    const user = await getUserById(db, req.session.userId);
    if (!user || user.access_level < 10) {
      return res.status(403).json({ error: 'Sysop access required' });
    }

    const searchTerm = req.query.q;
    if (!searchTerm) {
      return res.status(400).json({ error: 'Search term required' });
    }

    const users = await new Promise((resolve, reject) => {
      db.all(`
        SELECT id, handle, real_name, location, access_level, calls, messages_posted, last_seen
        FROM users 
        WHERE handle LIKE ? OR real_name LIKE ? OR location LIKE ?
        ORDER BY handle
      `, [`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    res.json(users);

  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ error: 'Failed to search users' });
  }
});

app.get('/api/sysop/users/:id', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { getUserById } = require('./db');
    const user = await getUserById(db, req.session.userId);
    if (!user || user.access_level < 10) {
      return res.status(403).json({ error: 'Sysop access required' });
    }

    const targetUserId = parseInt(req.params.id);
    const targetUser = await getUserById(db, targetUserId);
    
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(targetUser);

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

app.put('/api/sysop/users/:id', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { getUserById } = require('./db');
    const user = await getUserById(db, req.session.userId);
    if (!user || user.access_level < 10) {
      return res.status(403).json({ error: 'Sysop access required' });
    }

    const targetUserId = parseInt(req.params.id);
    const updates = req.body;

    // Build dynamic update query
    const fields = [];
    const values = [];
    
    if (updates.real_name !== undefined) {
      fields.push('real_name = ?');
      values.push(updates.real_name);
    }
    if (updates.location !== undefined) {
      fields.push('location = ?');
      values.push(updates.location);
    }
    if (updates.access_level !== undefined) {
      fields.push('access_level = ?');
      values.push(updates.access_level);
    }
    if (updates.credits !== undefined) {
      fields.push('credits = ?');
      values.push(updates.credits);
    }
    if (updates.signature !== undefined) {
      fields.push('signature = ?');
      values.push(updates.signature);
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    values.push(targetUserId);

    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
        values,
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    res.json({ success: true });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

app.delete('/api/sysop/users/:id', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { getUserById } = require('./db');
    const user = await getUserById(db, req.session.userId);
    if (!user || user.access_level < 10) {
      return res.status(403).json({ error: 'Sysop access required' });
    }

    const targetUserId = parseInt(req.params.id);
    
    // Don't allow deleting yourself
    if (targetUserId === user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    await new Promise((resolve, reject) => {
      db.run('DELETE FROM users WHERE id = ?', [targetUserId], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    res.json({ success: true });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Emergency SysOp creation endpoint (remove after use)
app.post('/api/create-sysop', async (req, res) => {
  try {
    const bcrypt = require('bcrypt');
    const password = 'admin123';
    const hashedPassword = bcrypt.hashSync(password, 10);
    
    // Check if SysOp already exists
    const existingUser = await new Promise((resolve, reject) => {
      db.get('SELECT id FROM users WHERE handle = ?', ['SysOp'], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    if (existingUser) {
      return res.json({ message: 'SysOp user already exists' });
    }
    
    // Create SysOp user
    await new Promise((resolve, reject) => {
      db.run(`INSERT INTO users (handle, real_name, location, password_hash, access_level, credits, created_at) 
              VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        ['SysOp', 'System Operator', 'BBS Headquarters', hashedPassword, 100, 1000],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
    
    res.json({ message: 'SysOp user created successfully', username: 'SysOp', password: 'admin123' });
  } catch (error) {
    console.error('Create SysOp error:', error);
    res.status(500).json({ error: 'Failed to create SysOp user' });
  }
});

// Start server
server.listen(PORT, () => {
  console.log(`Retro-BBS Server running on port ${PORT}`);
  console.log(`Visit http://localhost:${PORT} to connect`);
});



