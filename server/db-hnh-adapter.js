// High Noon Hustle Database Adapter
// Handles both PostgreSQL and SQLite with caching and performance optimization

const Database = require('better-sqlite3');
const { Pool } = require('pg');

class HNHDatabaseAdapter {
    constructor(config) {
        this.config = config;
        this.dbType = config.type || 'sqlite';
        this.cache = new Map();
        this.cacheTimeout = 30000; // 30 seconds
        this.connectionPool = null;
        
        if (this.dbType === 'postgresql') {
            this.connectionPool = new Pool({
                host: config.host || 'localhost',
                port: config.port || 5432,
                database: config.database || 'high_noon_hustle',
                user: config.user || 'postgres',
                password: config.password || '',
                max: 20,
                idleTimeoutMillis: 30000,
                connectionTimeoutMillis: 2000,
            });
        } else {
            this.db = new Database(config.database || './data/hnh.db');
            this.db.pragma('journal_mode = WAL');
            this.db.pragma('synchronous = NORMAL');
            this.db.pragma('cache_size = 10000');
            this.db.pragma('temp_store = MEMORY');
        }
        
        this.initializeDatabase();
    }

    async initializeDatabase() {
        try {
            if (this.dbType === 'postgresql') {
                await this.runQuery(`
                    CREATE TABLE IF NOT EXISTS players (
                        id SERIAL PRIMARY KEY,
                        username VARCHAR(50) UNIQUE NOT NULL,
                        display_name VARCHAR(50) NOT NULL,
                        character_class VARCHAR(20) NOT NULL CHECK (character_class IN ('gunslinger', 'outlaw', 'sheriff', 'prospector', 'rancher', 'tracker', 'gambler')),
                        gender VARCHAR(10) NOT NULL CHECK (gender IN ('male', 'female')),
                        current_town VARCHAR(30) NOT NULL DEFAULT 'dusty_gulch',
                        current_energy INTEGER NOT NULL DEFAULT 100,
                        max_energy INTEGER NOT NULL DEFAULT 100,
                        gold INTEGER NOT NULL DEFAULT 100,
                        experience INTEGER NOT NULL DEFAULT 0,
                        level INTEGER NOT NULL DEFAULT 1,
                        honor_score INTEGER NOT NULL DEFAULT 0,
                        total_playtime INTEGER NOT NULL DEFAULT 0,
                        last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        is_online BOOLEAN DEFAULT FALSE,
                        current_activity VARCHAR(100),
                        current_location VARCHAR(50) DEFAULT 'saloon'
                    );
                `);
                // Add other tables as needed...
            } else {
                // SQLite initialization
                this.db.exec(`
                    CREATE TABLE IF NOT EXISTS players (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        username TEXT UNIQUE NOT NULL,
                        display_name TEXT NOT NULL,
                        character_class TEXT NOT NULL CHECK (character_class IN ('gunslinger', 'outlaw', 'sheriff', 'prospector', 'rancher', 'tracker', 'gambler')),
                        gender TEXT NOT NULL CHECK (gender IN ('male', 'female')),
                        current_town TEXT NOT NULL DEFAULT 'dusty_gulch',
                        current_energy INTEGER NOT NULL DEFAULT 100,
                        max_energy INTEGER NOT NULL DEFAULT 100,
                        gold INTEGER NOT NULL DEFAULT 100,
                        experience INTEGER NOT NULL DEFAULT 0,
                        level INTEGER NOT NULL DEFAULT 1,
                        honor_score INTEGER NOT NULL DEFAULT 0,
                        total_playtime INTEGER NOT NULL DEFAULT 0,
                        last_active DATETIME DEFAULT CURRENT_TIMESTAMP,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        is_online BOOLEAN DEFAULT FALSE,
                        current_activity TEXT,
                        current_location TEXT DEFAULT 'saloon'
                    );
                `);
            }
            console.log('High Noon Hustle database initialized successfully');
        } catch (error) {
            console.error('Database initialization failed:', error);
            throw error;
        }
    }

    // Cache management
    getCacheKey(operation, params = {}) {
        return `${operation}_${JSON.stringify(params)}`;
    }

    getFromCache(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }
        this.cache.delete(key);
        return null;
    }

    setCache(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    clearCache(pattern = null) {
        if (pattern) {
            for (const key of this.cache.keys()) {
                if (key.includes(pattern)) {
                    this.cache.delete(key);
                }
            }
        } else {
            this.cache.clear();
        }
    }

    // Query execution
    async runQuery(query, params = []) {
        if (this.dbType === 'postgresql') {
            const client = await this.connectionPool.connect();
            try {
                const result = await client.query(query, params);
                return result.rows;
            } finally {
                client.release();
            }
        } else {
            const stmt = this.db.prepare(query);
            if (query.trim().toUpperCase().startsWith('SELECT')) {
                return stmt.all(params);
            } else {
                return stmt.run(params);
            }
        }
    }

    // Player operations
    async createPlayer(playerData) {
        const query = `
            INSERT INTO players (username, display_name, character_class, gender, current_town)
            VALUES (?, ?, ?, ?, ?)
        `;
        const params = [
            playerData.username,
            playerData.display_name,
            playerData.character_class,
            playerData.gender,
            playerData.current_town || 'dusty_gulch'
        ];
        
        const result = await this.runQuery(query, params);
        const playerId = this.dbType === 'postgresql' ? result[0].id : result.lastInsertRowid;
        
        // Create player stats
        await this.runQuery(`
            INSERT INTO player_stats (player_id) VALUES (?)
        `, [playerId]);
        
        this.clearCache('player');
        return playerId;
    }

    async getPlayer(username) {
        const cacheKey = this.getCacheKey('getPlayer', { username });
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        const query = `
            SELECT p.*, ps.* FROM players p
            LEFT JOIN player_stats ps ON p.id = ps.player_id
            WHERE p.username = ?
        `;
        const result = await this.runQuery(query, [username]);
        
        if (result.length > 0) {
            this.setCache(cacheKey, result[0]);
            return result[0];
        }
        return null;
    }

    async updatePlayer(playerId, updates) {
        const fields = Object.keys(updates);
        const values = Object.values(updates);
        const setClause = fields.map(field => `${field} = ?`).join(', ');
        
        const query = `UPDATE players SET ${setClause} WHERE id = ?`;
        await this.runQuery(query, [...values, playerId]);
        
        this.clearCache('player');
    }

    async getOnlinePlayers() {
        const cacheKey = this.getCacheKey('getOnlinePlayers');
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        const query = `
            SELECT id, username, display_name, current_town, current_activity, current_location
            FROM players 
            WHERE is_online = true
            ORDER BY last_active DESC
        `;
        const result = await this.runQuery(query);
        
        this.setCache(cacheKey, result);
        return result;
    }

    // Saloon message operations
    async addSaloonMessage(messageData) {
        const query = `
            INSERT INTO saloon_messages (player_id, message_type, target_player_id, town, content, is_private)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        const params = [
            messageData.player_id,
            messageData.message_type,
            messageData.target_player_id,
            messageData.town,
            messageData.content,
            messageData.is_private || false
        ];
        
        await this.runQuery(query, params);
        this.clearCache('saloon_messages');
    }

    async getSaloonMessages(limit = 50, offset = 0, town = null) {
        const cacheKey = this.getCacheKey('getSaloonMessages', { limit, offset, town });
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        let query = `
            SELECT sm.*, p.username, p.display_name, p.character_class
            FROM saloon_messages sm
            LEFT JOIN players p ON sm.player_id = p.id
            WHERE sm.message_type IN ('global', 'town', 'system', 'event', 'emote')
        `;
        
        const params = [];
        if (town) {
            query += ` AND (sm.town = ? OR sm.town IS NULL)`;
            params.push(town);
        }
        
        query += ` ORDER BY sm.created_at DESC LIMIT ? OFFSET ?`;
        params.push(limit, offset);
        
        const result = await this.runQuery(query, params);
        this.setCache(cacheKey, result);
        return result;
    }

    // Energy management
    async updatePlayerEnergy(playerId, energyChange, reason) {
        // Get current energy
        const player = await this.runQuery('SELECT current_energy, max_energy FROM players WHERE id = ?', [playerId]);
        if (player.length === 0) return false;
        
        const currentEnergy = player[0].current_energy;
        const maxEnergy = player[0].max_energy;
        const newEnergy = Math.max(0, Math.min(maxEnergy, currentEnergy + energyChange));
        
        // Update energy
        await this.runQuery('UPDATE players SET current_energy = ? WHERE id = ?', [newEnergy, playerId]);
        
        // Log energy transaction
        await this.runQuery(`
            INSERT INTO energy_transactions (player_id, transaction_type, amount, reason)
            VALUES (?, 'energy_change', ?, ?)
        `, [playerId, energyChange, reason]);
        
        this.clearCache('player');
        return newEnergy;
    }

    // Duel operations
    async createDuel(duelData) {
        const query = `
            INSERT INTO duels (challenger_id, challenged_id, wager_amount, duel_type)
            VALUES (?, ?, ?, ?)
        `;
        const params = [
            duelData.challenger_id,
            duelData.challenged_id,
            duelData.wager_amount || 0,
            duelData.duel_type || 'quick_draw'
        ];
        
        const result = await this.runQuery(query, params);
        const duelId = this.dbType === 'postgresql' ? result[0].id : result.lastInsertRowid;
        
        this.clearCache('duels');
        return duelId;
    }

    async completeDuel(duelId, winnerId, challengerTime, challengedTime) {
        const query = `
            UPDATE duels 
            SET winner_id = ?, challenger_time_ms = ?, challenged_time_ms = ?, 
                status = 'completed', completed_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `;
        await this.runQuery(query, [winnerId, challengerTime, challengedTime, duelId]);
        
        this.clearCache('duels');
    }

    // Mini-game operations
    async createMiniGame(gameData) {
        const query = `
            INSERT INTO mini_games (game_type, game_name, host_player_id, max_players, game_data)
            VALUES (?, ?, ?, ?, ?)
        `;
        const params = [
            gameData.game_type,
            gameData.game_name,
            gameData.host_player_id,
            gameData.max_players || 1,
            JSON.stringify(gameData.game_data || {})
        ];
        
        const result = await this.runQuery(query, params);
        const gameId = this.dbType === 'postgresql' ? result[0].id : result.lastInsertRowid;
        
        this.clearCache('mini_games');
        return gameId;
    }

    async joinMiniGame(gameId, playerId) {
        const query = `
            INSERT INTO mini_game_participants (game_id, player_id)
            VALUES (?, ?)
        `;
        await this.runQuery(query, [gameId, playerId]);
        
        // Update current players count
        await this.runQuery(`
            UPDATE mini_games 
            SET current_players = current_players + 1
            WHERE id = ?
        `, [gameId]);
        
        this.clearCache('mini_games');
    }

    // Trading operations
    async createTradeOffer(tradeData) {
        const query = `
            INSERT INTO trading (seller_id, item_type, item_name, quantity, price, expires_at)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        const params = [
            tradeData.seller_id,
            tradeData.item_type,
            tradeData.item_name,
            tradeData.quantity,
            tradeData.price,
            tradeData.expires_at
        ];
        
        const result = await this.runQuery(query, params);
        const tradeId = this.dbType === 'postgresql' ? result[0].id : result.lastInsertRowid;
        
        this.clearCache('trading');
        return tradeId;
    }

    // Activity logging
    async logActivity(activityData) {
        const query = `
            INSERT INTO player_activities (player_id, activity_type, activity_name, energy_cost, energy_gained, gold_gained, experience_gained, success, activity_data)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const params = [
            activityData.player_id,
            activityData.activity_type,
            activityData.activity_name,
            activityData.energy_cost || 0,
            activityData.energy_gained || 0,
            activityData.gold_gained || 0,
            activityData.experience_gained || 0,
            activityData.success !== false,
            JSON.stringify(activityData.activity_data || {})
        ];
        
        await this.runQuery(query, params);
        this.clearCache('activities');
    }

    // Performance monitoring
    async getPerformanceStats() {
        const stats = {
            cacheSize: this.cache.size,
            dbType: this.dbType,
            timestamp: new Date().toISOString()
        };
        
        if (this.dbType === 'postgresql') {
            const poolStats = this.connectionPool;
            stats.connectionCount = poolStats.totalCount;
            stats.idleConnections = poolStats.idleCount;
            stats.waitingClients = poolStats.waitingCount;
        }
        
        return stats;
    }

    // Player management methods
    async getPlayerByUsername(username) {
        const query = 'SELECT * FROM players WHERE username = ?';
        const params = [username];
        const result = await this.runQuery(query, params);
        return result.rows ? result.rows[0] : result[0];
    }

    async createPlayer(playerData) {
        const query = `
            INSERT INTO players (username, display_name, character_class, gender, current_town, current_energy, max_energy, gold, experience, level, honor_score, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
            RETURNING *
        `;
        const params = [
            playerData.username,
            playerData.display_name,
            playerData.character_class,
            playerData.gender,
            playerData.current_town || 'dusty_gulch',
            playerData.current_energy || 100,
            playerData.max_energy || 100,
            playerData.gold || 100,
            playerData.experience || 0,
            playerData.level || 1,
            playerData.honor_score || 0
        ];
        
        const result = await this.runQuery(query, params);
        return result.rows ? result.rows[0] : result[0];
    }

    async updatePlayer(playerId, playerData) {
        const query = `
            UPDATE players 
            SET display_name = ?, character_class = ?, gender = ?, current_town = ?, updated_at = NOW()
            WHERE id = ?
        `;
        const params = [
            playerData.display_name,
            playerData.character_class,
            playerData.gender,
            playerData.current_town,
            playerId
        ];
        
        await this.runQuery(query, params);
        this.clearCache('players');
    }

    async getPlayerGameState(playerId) {
        const query = 'SELECT * FROM player_stats WHERE player_id = ?';
        const params = [playerId];
        const result = await this.runQuery(query, params);
        const stats = result.rows ? result.rows[0] : result[0];
        
        if (stats) {
            return {
                energy: stats.current_energy,
                maxEnergy: stats.max_energy,
                gold: stats.gold,
                experience: stats.experience,
                level: stats.level,
                honorScore: stats.honor_score,
                currentActivity: stats.current_activity,
                currentLocation: stats.current_location
            };
        }
        
        return null;
    }

    async createPlayerGameState(playerId, gameState) {
        const query = `
            INSERT INTO player_stats (player_id, current_energy, max_energy, gold, experience, level, honor_score, current_activity, current_location, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `;
        const params = [
            playerId,
            gameState.energy || 100,
            gameState.maxEnergy || 100,
            gameState.gold || 100,
            gameState.experience || 0,
            gameState.level || 1,
            gameState.honorScore || 0,
            gameState.currentActivity || null,
            gameState.currentLocation || 'saloon'
        ];
        
        await this.runQuery(query, params);
        this.clearCache('player_stats');
    }

    async updatePlayerGameState(playerId, gameState) {
        const query = `
            UPDATE player_stats 
            SET current_energy = ?, max_energy = ?, gold = ?, experience = ?, level = ?, honor_score = ?, current_activity = ?, current_location = ?, updated_at = NOW()
            WHERE player_id = ?
        `;
        const params = [
            gameState.energy,
            gameState.maxEnergy,
            gameState.gold,
            gameState.experience,
            gameState.level,
            gameState.honorScore,
            gameState.currentActivity,
            gameState.currentLocation,
            playerId
        ];
        
        await this.runQuery(query, params);
        this.clearCache('player_stats');
    }

    async getPlayerCurrentTown(playerId) {
        const query = 'SELECT current_town FROM players WHERE id = ?';
        const params = [playerId];
        const result = await this.runQuery(query, params);
        const player = result.rows ? result.rows[0] : result[0];
        return player ? player.current_town : 'dusty_gulch';
    }

    async updatePlayerCurrentTown(playerId, currentTown) {
        const query = 'UPDATE players SET current_town = ?, updated_at = NOW() WHERE id = ?';
        const params = [currentTown, playerId];
        await this.runQuery(query, params);
        this.clearCache('players');
    }

    // Cleanup
    async close() {
        if (this.dbType === 'postgresql') {
            await this.connectionPool.end();
        } else {
            this.db.close();
        }
        this.cache.clear();
    }
}

module.exports = HNHDatabaseAdapter;
