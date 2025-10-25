// High Noon Hustle Server API - Simplified Version
// Uses existing game_states table instead of creating new tables

const express = require('express');
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

// Health check endpoint
router.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        game: 'High Noon Hustle',
        database: usePostgreSQL ? 'PostgreSQL' : 'SQLite (fallback)',
        timestamp: new Date().toISOString()
    });
});

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
        
        // Get user ID from session or find by username
        let userId;
        if (req.session && req.session.userId) {
            userId = req.session.userId;
        } else {
            // Fallback: try to find user by username
            const userResult = await db.query(
                'SELECT id FROM users WHERE handle = $1',
                [username]
            );
            if (userResult.rows.length > 0) {
                userId = userResult.rows[0].id;
            } else {
                return res.json({ player: null });
            }
        }
        
        // Use existing game_states table
        const gameStateResult = await db.query(
            'SELECT game_data FROM game_states WHERE user_id = $1 AND game_name = $2',
            [userId, 'high-noon-hustle']
        );
        
        console.log('HNH Load: Game state query result:', gameStateResult);
        
        if (gameStateResult.rows.length > 0) {
            const gameData = JSON.parse(gameStateResult.rows[0].game_data);
            res.json({
                success: true,
                player: gameData.player,
                gameState: gameData.gameState,
                currentTown: gameData.currentTown
            });
        } else {
            res.json({ player: null });
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
        
        // Use existing game_states table
        const gameData = {
            player: player,
            gameState: gameState,
            currentTown: currentTown,
            timestamp: Date.now()
        };
        
        // Get user ID from session or find by username
        let userId;
        if (req.session && req.session.userId) {
            userId = req.session.userId;
        } else {
            // Fallback: try to find user by username
            const userResult = await db.query(
                'SELECT id FROM users WHERE handle = $1',
                [username]
            );
            if (userResult.rows.length > 0) {
                userId = userResult.rows[0].id;
            } else {
                return res.status(400).json({ error: 'User not found' });
            }
        }
        
        // Check if game state exists
        const existingResult = await db.query(
            'SELECT id FROM game_states WHERE user_id = $1 AND game_name = $2',
            [userId, 'high-noon-hustle']
        );
        
        if (existingResult.rows.length > 0) {
            // Update existing game state
            await db.query(
                'UPDATE game_states SET game_data = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2 AND game_name = $3',
                [JSON.stringify(gameData), userId, 'high-noon-hustle']
            );
        } else {
            // Insert new game state
            await db.query(
                'INSERT INTO game_states (user_id, game_name, game_data, created_at, updated_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
                [userId, 'high-noon-hustle', JSON.stringify(gameData)]
            );
        }
        
        console.log('HNH Save: Successfully saved player data');
        res.json({ success: true, message: 'Player data saved successfully' });
        
    } catch (error) {
        console.error('Error saving player:', error);
        res.status(500).json({ error: 'Failed to save player data' });
    }
});

module.exports = router;
module.exports.initDatabase = initDatabase;
