-- High Noon Hustle Database Schema - SQLite Version
-- Adapted for SQLite compatibility

-- Players table - Core user data
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
    honor_score INTEGER NOT NULL DEFAULT 0, -- -100 to +100
    total_playtime INTEGER NOT NULL DEFAULT 0, -- in minutes
    last_active DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_online BOOLEAN DEFAULT FALSE,
    current_activity TEXT,
    current_location TEXT DEFAULT 'saloon'
);

-- Player stats - Character attributes
CREATE TABLE IF NOT EXISTS player_stats (
    player_id INTEGER PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
    accuracy INTEGER NOT NULL DEFAULT 10,
    agility INTEGER NOT NULL DEFAULT 10,
    charisma INTEGER NOT NULL DEFAULT 10,
    endurance INTEGER NOT NULL DEFAULT 10,
    luck INTEGER NOT NULL DEFAULT 10,
    duels_won INTEGER NOT NULL DEFAULT 0,
    duels_lost INTEGER NOT NULL DEFAULT 0,
    duels_draw INTEGER NOT NULL DEFAULT 0,
    fastest_draw_ms INTEGER,
    energy_recovered_today INTEGER NOT NULL DEFAULT 0,
    energy_spent_today INTEGER NOT NULL DEFAULT 0,
    last_energy_reset DATE DEFAULT (date('now'))
);

-- Towns - Town data and status
CREATE TABLE IF NOT EXISTS towns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    description TEXT,
    population INTEGER NOT NULL DEFAULT 0,
    prosperity_level INTEGER NOT NULL DEFAULT 1,
    current_event TEXT,
    event_end_time DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Player inventory - Items and equipment
CREATE TABLE IF NOT EXISTS player_inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    item_type TEXT NOT NULL CHECK (item_type IN ('weapon', 'horse', 'boots', 'clothes', 'accessory', 'consumable', 'misc')),
    item_name TEXT NOT NULL,
    item_tier INTEGER NOT NULL DEFAULT 1,
    quantity INTEGER NOT NULL DEFAULT 1,
    equipped BOOLEAN DEFAULT FALSE,
    item_data TEXT, -- JSON stored as TEXT in SQLite
    acquired_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Saloon messages - Telegraph/chat system
CREATE TABLE IF NOT EXISTS saloon_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER REFERENCES players(id) ON DELETE SET NULL,
    message_type TEXT NOT NULL CHECK (message_type IN ('whisper', 'town', 'global', 'system', 'event', 'emote')),
    target_player_id INTEGER REFERENCES players(id) ON DELETE SET NULL,
    town TEXT,
    content TEXT NOT NULL,
    is_private BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Player sessions - Active sessions and status
CREATE TABLE IF NOT EXISTS player_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    session_token TEXT UNIQUE NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    connected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_ping DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- Game events - Events and activities
CREATE TABLE IF NOT EXISTS game_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL,
    event_name TEXT NOT NULL,
    description TEXT,
    town TEXT,
    start_time DATETIME NOT NULL,
    end_time DATETIME,
    max_participants INTEGER,
    current_participants INTEGER DEFAULT 0,
    event_data TEXT, -- JSON stored as TEXT
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Player activities - Activity history and logs
CREATE TABLE IF NOT EXISTS player_activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL,
    activity_name TEXT NOT NULL,
    energy_cost INTEGER NOT NULL DEFAULT 0,
    energy_gained INTEGER NOT NULL DEFAULT 0,
    gold_gained INTEGER NOT NULL DEFAULT 0,
    experience_gained INTEGER NOT NULL DEFAULT 0,
    success BOOLEAN NOT NULL DEFAULT TRUE,
    activity_data TEXT, -- JSON stored as TEXT
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Trading - Player-to-player trading
CREATE TABLE IF NOT EXISTS trading (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    seller_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    buyer_id INTEGER REFERENCES players(id) ON DELETE SET NULL,
    item_type TEXT NOT NULL,
    item_name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    price INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled', 'expired')),
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME
);

-- Duels - Duel records and outcomes
CREATE TABLE IF NOT EXISTS duels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    challenger_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    challenged_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    wager_amount INTEGER NOT NULL DEFAULT 0,
    duel_type TEXT NOT NULL DEFAULT 'quick_draw' CHECK (duel_type IN ('quick_draw', 'accuracy', 'endurance', 'luck')),
    winner_id INTEGER REFERENCES players(id) ON DELETE SET NULL,
    challenger_time_ms INTEGER,
    challenged_time_ms INTEGER,
    duel_data TEXT, -- JSON stored as TEXT
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'cancelled')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME
);

-- Mini games - Game instances and results
CREATE TABLE IF NOT EXISTS mini_games (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_type TEXT NOT NULL,
    game_name TEXT NOT NULL,
    host_player_id INTEGER REFERENCES players(id) ON DELETE SET NULL,
    max_players INTEGER NOT NULL DEFAULT 1,
    current_players INTEGER DEFAULT 0,
    game_data TEXT, -- JSON stored as TEXT
    status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'completed', 'cancelled')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    started_at DATETIME,
    ended_at DATETIME
);

-- Mini game participants
CREATE TABLE IF NOT EXISTS mini_game_participants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id INTEGER NOT NULL REFERENCES mini_games(id) ON DELETE CASCADE,
    player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    score INTEGER DEFAULT 0,
    position INTEGER,
    game_data TEXT, -- JSON stored as TEXT
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(game_id, player_id)
);

-- Achievements - Player achievements and titles
CREATE TABLE IF NOT EXISTS achievements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    achievement_type TEXT NOT NULL,
    achievement_name TEXT NOT NULL,
    description TEXT,
    reward_gold INTEGER DEFAULT 0,
    reward_energy INTEGER DEFAULT 0,
    reward_item TEXT,
    earned_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Energy transactions - Energy gain/loss tracking
CREATE TABLE IF NOT EXISTS energy_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    transaction_type TEXT NOT NULL,
    amount INTEGER NOT NULL, -- positive for gain, negative for loss
    reason TEXT NOT NULL,
    related_activity_id INTEGER REFERENCES player_activities(id) ON DELETE SET NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Player reputation - Honor/infamy system
CREATE TABLE IF NOT EXISTS player_reputation (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    reputation_type TEXT NOT NULL CHECK (reputation_type IN ('honor', 'infamy')),
    amount INTEGER NOT NULL DEFAULT 0,
    reason TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Town projects - Community goals and progress
CREATE TABLE IF NOT EXISTS town_projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    town_id INTEGER NOT NULL REFERENCES towns(id) ON DELETE CASCADE,
    project_name TEXT NOT NULL,
    description TEXT,
    required_resources TEXT NOT NULL, -- JSON stored as TEXT
    current_resources TEXT NOT NULL DEFAULT '{}', -- JSON stored as TEXT
    required_contributors INTEGER NOT NULL DEFAULT 1,
    current_contributors INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME
);

-- Town project contributions
CREATE TABLE IF NOT EXISTS town_project_contributions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES town_projects(id) ON DELETE CASCADE,
    player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    contribution_type TEXT NOT NULL,
    amount INTEGER NOT NULL,
    contributed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_players_username ON players(username);
CREATE INDEX IF NOT EXISTS idx_players_online ON players(is_online);
CREATE INDEX IF NOT EXISTS idx_players_town ON players(current_town);
CREATE INDEX IF NOT EXISTS idx_players_last_active ON players(last_active);

CREATE INDEX IF NOT EXISTS idx_saloon_messages_created_at ON saloon_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_saloon_messages_type ON saloon_messages(message_type);
CREATE INDEX IF NOT EXISTS idx_saloon_messages_town ON saloon_messages(town);
CREATE INDEX IF NOT EXISTS idx_saloon_messages_player ON saloon_messages(player_id);

CREATE INDEX IF NOT EXISTS idx_player_sessions_token ON player_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_player_sessions_player ON player_sessions(player_id);
CREATE INDEX IF NOT EXISTS idx_player_sessions_active ON player_sessions(is_active);

CREATE INDEX IF NOT EXISTS idx_player_activities_player ON player_activities(player_id);
CREATE INDEX IF NOT EXISTS idx_player_activities_type ON player_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_player_activities_created_at ON player_activities(created_at);

CREATE INDEX IF NOT EXISTS idx_duels_challenger ON duels(challenger_id);
CREATE INDEX IF NOT EXISTS idx_duels_challenged ON duels(challenged_id);
CREATE INDEX IF NOT EXISTS idx_duels_status ON duels(status);

CREATE INDEX IF NOT EXISTS idx_trading_seller ON trading(seller_id);
CREATE INDEX IF NOT EXISTS idx_trading_buyer ON trading(buyer_id);
CREATE INDEX IF NOT EXISTS idx_trading_status ON trading(status);

CREATE INDEX IF NOT EXISTS idx_energy_transactions_player ON energy_transactions(player_id);
CREATE INDEX IF NOT EXISTS idx_energy_transactions_created_at ON energy_transactions(created_at);

-- Insert default towns
INSERT OR IGNORE INTO towns (name, display_name, description) VALUES
('dusty_gulch', 'Dusty Gulch', 'A rough mining town where gold and trouble go hand in hand'),
('red_mesa', 'Red Mesa', 'A peaceful ranching community known for its horses and hospitality'),
('tumbleweed_junction', 'Tumbleweed Junction', 'A bustling railroad hub where anything can happen'),
('dead_horse_canyon', 'Dead Horse Canyon', 'An outlaw territory where the law don''t reach');
