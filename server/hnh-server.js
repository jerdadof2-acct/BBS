// High Noon Hustle Server API
// Handles database operations for the game

const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');

const router = express.Router();

// Database will be passed from the main server
let db = null;
let dbType = 'sqlite';
let usePostgreSQL = false;

// Initialize database connection
function initDatabase(database, databaseType) {
    db = database;
    dbType = databaseType;
    usePostgreSQL = (databaseType === 'postgresql');
    console.log('High Noon Hustle: Database initialized, type:', databaseType);
}

// SQLite fallback
let sqliteDb = null;
if (!usePostgreSQL) {
    sqliteDb = new Database(path.join(__dirname, '../data/bbs.db'));
}

// Player data endpoints
router.post('/player/load', async (req, res) => {
    try {
        const { username } = req.body;
        
        if (!username) {
            return res.status(400).json({ error: 'Username required' });
        }
        
        if (!usePostgreSQL || !db) {
            console.log('HNH Load: Not using PostgreSQL or no database connection');
            return res.json({ player: null });
        }
        
        console.log('HNH Load: Attempting to load player:', username);
        
        // Use existing game_states table instead of creating new tables
        const gameStateResult = await db.query(
            'SELECT game_data FROM game_states WHERE user_id = $1 AND game_name = $2',
            [1, 'high-noon-hustle'] // Use user_id 1 for now, game_name 'high-noon-hustle'
        );
        
        console.log('HNH Load: Game state query result:', gameStateResult);
        
        if (gameStateResult.rows.length > 0) {
            const gameData = JSON.parse(gameStateResult.rows[0].game_data);
            const player = gameData.player;
            
            const gameState = gameStateResult.rows.length > 0 ? {
                energy: gameStateResult.rows[0].current_energy,
                maxEnergy: gameStateResult.rows[0].max_energy,
                gold: gameStateResult.rows[0].gold,
                experience: gameStateResult.rows[0].experience,
                level: gameStateResult.rows[0].level,
                honorScore: gameStateResult.rows[0].honor_score,
                currentActivity: gameStateResult.rows[0].current_activity,
                currentLocation: gameStateResult.rows[0].current_location
            } : null;
            
            res.json({
                success: true,
                player: {
                    username: player.username,
                    display_name: player.display_name,
                    character_class: player.character_class,
                    gender: player.gender
                },
                gameState: gameState,
                currentTown: player.current_town
            });
        } else {
            res.json({
                success: true,
                player: null,
                gameState: null,
                currentTown: null
            });
        }
    } catch (error) {
        console.error('Error loading player:', error);
        res.status(500).json({ error: 'Failed to load player data' });
    }
});

router.post('/player/save', async (req, res) => {
    try {
        const { username, player, gameState, currentTown } = req.body;
        
        if (!username || !player) {
            return res.status(400).json({ error: 'Username and player data required' });
        }
        
        if (!usePostgreSQL || !db) {
            console.log('HNH Save: Not using PostgreSQL or no database connection');
            return res.json({ success: true, message: 'Data saved to local storage' });
        }
        
        console.log('HNH Save: Attempting to save player:', username);
        
        // Check if HNH tables exist, create if not
        await createHNHTables();
        
        // Check if player exists
        const existingPlayerResult = await db.query(
            'SELECT id FROM hnh_players WHERE username = $1',
            [username]
        );
        
        if (existingPlayerResult.rows.length > 0) {
            // Update existing player
            const playerId = existingPlayerResult.rows[0].id;
            
            await db.query(
                'UPDATE hnh_players SET display_name = $1, character_class = $2, gender = $3, current_town = $4, updated_at = NOW() WHERE id = $5',
                [player.display_name, player.character_class, player.gender, currentTown || 'dusty_gulch', playerId]
            );
            
            // Update or create game state
            const gameStateResult = await db.query(
                'SELECT id FROM hnh_player_stats WHERE player_id = $1',
                [playerId]
            );
            
            if (gameStateResult.rows.length > 0) {
                await db.query(
                    'UPDATE hnh_player_stats SET current_energy = $1, max_energy = $2, gold = $3, experience = $4, level = $5, honor_score = $6, current_activity = $7, current_location = $8, updated_at = NOW() WHERE player_id = $9',
                    [gameState.energy, gameState.maxEnergy, gameState.gold, gameState.experience, gameState.level, gameState.honorScore, gameState.currentActivity, gameState.currentLocation, playerId]
                );
            } else {
                await db.query(
                    'INSERT INTO hnh_player_stats (player_id, current_energy, max_energy, gold, experience, level, honor_score, current_activity, current_location, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())',
                    [playerId, gameState.energy, gameState.maxEnergy, gameState.gold, gameState.experience, gameState.level, gameState.honorScore, gameState.currentActivity, gameState.currentLocation]
                );
            }
        } else {
            // Create new player
            const newPlayerResult = await pool.query(
                'INSERT INTO hnh_players (username, display_name, character_class, gender, current_town, current_energy, max_energy, gold, experience, level, honor_score, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW()) RETURNING id',
                [username, player.display_name, player.character_class, player.gender, currentTown || 'dusty_gulch', gameState.energy || 100, gameState.maxEnergy || 100, gameState.gold || 100, gameState.experience || 0, gameState.level || 1, gameState.honorScore || 0]
            );
            
            const playerId = newPlayerResult.rows[0].id;
            
            // Create game state
            await db.query(
                'INSERT INTO hnh_player_stats (player_id, current_energy, max_energy, gold, experience, level, honor_score, current_activity, current_location, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())',
                [playerId, gameState.energy, gameState.maxEnergy, gameState.gold, gameState.experience, gameState.level, gameState.honorScore, gameState.currentActivity, gameState.currentLocation]
            );
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error saving player:', error);
        res.status(500).json({ error: 'Failed to save player data' });
    }
});

// Create HNH tables if they don't exist
async function createHNHTables() {
    try {
        if (!db) {
            console.log('No database connection available for creating HNH tables');
            return;
        }
        
        // Create hnh_players table
        await db.query(`
            CREATE TABLE IF NOT EXISTS hnh_players (
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
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create hnh_player_stats table
        await db.query(`
            CREATE TABLE IF NOT EXISTS hnh_player_stats (
                id SERIAL PRIMARY KEY,
                player_id INTEGER NOT NULL REFERENCES hnh_players(id) ON DELETE CASCADE,
                current_energy INTEGER NOT NULL DEFAULT 100,
                max_energy INTEGER NOT NULL DEFAULT 100,
                gold INTEGER NOT NULL DEFAULT 100,
                experience INTEGER NOT NULL DEFAULT 0,
                level INTEGER NOT NULL DEFAULT 1,
                honor_score INTEGER NOT NULL DEFAULT 0,
                current_activity VARCHAR(50),
                current_location VARCHAR(50) DEFAULT 'saloon',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(player_id)
            )
        `);

        // Create indexes for performance
        await db.query('CREATE INDEX IF NOT EXISTS idx_hnh_players_username ON hnh_players(username)');
        await db.query('CREATE INDEX IF NOT EXISTS idx_hnh_player_stats_player_id ON hnh_player_stats(player_id)');
        
    } catch (error) {
        console.error('Error creating HNH tables:', error);
        throw error;
    }
}

// Health check endpoint
router.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        game: 'High Noon Hustle',
        database: usePostgreSQL ? 'PostgreSQL' : 'SQLite (fallback)',
        timestamp: new Date().toISOString()
    });
});

module.exports = router;
module.exports.initDatabase = initDatabase;
