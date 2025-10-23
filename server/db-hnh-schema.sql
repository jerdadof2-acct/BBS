-- High Noon Hustle Database Schema
-- Supports both PostgreSQL and SQLite

-- Players table - Core user data
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
    honor_score INTEGER NOT NULL DEFAULT 0, -- -100 to +100
    total_playtime INTEGER NOT NULL DEFAULT 0, -- in minutes
    last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_online BOOLEAN DEFAULT FALSE,
    current_activity VARCHAR(100),
    current_location VARCHAR(50) DEFAULT 'saloon'
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
    last_energy_reset DATE DEFAULT CURRENT_DATE
);

-- Towns - Town data and status
CREATE TABLE IF NOT EXISTS towns (
    id SERIAL PRIMARY KEY,
    name VARCHAR(30) UNIQUE NOT NULL,
    display_name VARCHAR(50) NOT NULL,
    description TEXT,
    population INTEGER NOT NULL DEFAULT 0,
    prosperity_level INTEGER NOT NULL DEFAULT 1,
    current_event VARCHAR(100),
    event_end_time TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Player inventory - Items and equipment
CREATE TABLE IF NOT EXISTS player_inventory (
    id SERIAL PRIMARY KEY,
    player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('weapon', 'horse', 'boots', 'clothes', 'accessory', 'consumable', 'misc')),
    item_name VARCHAR(50) NOT NULL,
    item_tier INTEGER NOT NULL DEFAULT 1,
    quantity INTEGER NOT NULL DEFAULT 1,
    equipped BOOLEAN DEFAULT FALSE,
    item_data JSONB, -- For item-specific properties
    acquired_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Saloon messages - Telegraph/chat system
CREATE TABLE IF NOT EXISTS saloon_messages (
    id SERIAL PRIMARY KEY,
    player_id INTEGER REFERENCES players(id) ON DELETE SET NULL,
    message_type VARCHAR(20) NOT NULL CHECK (message_type IN ('whisper', 'town', 'global', 'system', 'event', 'emote')),
    target_player_id INTEGER REFERENCES players(id) ON DELETE SET NULL,
    town VARCHAR(30),
    content TEXT NOT NULL,
    is_private BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Player sessions - Active sessions and status
CREATE TABLE IF NOT EXISTS player_sessions (
    id SERIAL PRIMARY KEY,
    player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    session_token VARCHAR(100) UNIQUE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    connected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_ping TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- Game events - Events and activities
CREATE TABLE IF NOT EXISTS game_events (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(30) NOT NULL,
    event_name VARCHAR(100) NOT NULL,
    description TEXT,
    town VARCHAR(30),
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    max_participants INTEGER,
    current_participants INTEGER DEFAULT 0,
    event_data JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Player activities - Activity history and logs
CREATE TABLE IF NOT EXISTS player_activities (
    id SERIAL PRIMARY KEY,
    player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    activity_type VARCHAR(30) NOT NULL,
    activity_name VARCHAR(100) NOT NULL,
    energy_cost INTEGER NOT NULL DEFAULT 0,
    energy_gained INTEGER NOT NULL DEFAULT 0,
    gold_gained INTEGER NOT NULL DEFAULT 0,
    experience_gained INTEGER NOT NULL DEFAULT 0,
    success BOOLEAN NOT NULL DEFAULT TRUE,
    activity_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trading - Player-to-player trading
CREATE TABLE IF NOT EXISTS trading (
    id SERIAL PRIMARY KEY,
    seller_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    buyer_id INTEGER REFERENCES players(id) ON DELETE SET NULL,
    item_type VARCHAR(20) NOT NULL,
    item_name VARCHAR(50) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    price INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled', 'expired')),
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Duels - Duel records and outcomes
CREATE TABLE IF NOT EXISTS duels (
    id SERIAL PRIMARY KEY,
    challenger_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    challenged_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    wager_amount INTEGER NOT NULL DEFAULT 0,
    duel_type VARCHAR(20) NOT NULL DEFAULT 'quick_draw' CHECK (duel_type IN ('quick_draw', 'accuracy', 'endurance', 'luck')),
    winner_id INTEGER REFERENCES players(id) ON DELETE SET NULL,
    challenger_time_ms INTEGER,
    challenged_time_ms INTEGER,
    duel_data JSONB,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'cancelled')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Mini games - Game instances and results
CREATE TABLE IF NOT EXISTS mini_games (
    id SERIAL PRIMARY KEY,
    game_type VARCHAR(30) NOT NULL,
    game_name VARCHAR(100) NOT NULL,
    host_player_id INTEGER REFERENCES players(id) ON DELETE SET NULL,
    max_players INTEGER NOT NULL DEFAULT 1,
    current_players INTEGER DEFAULT 0,
    game_data JSONB,
    status VARCHAR(20) NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'completed', 'cancelled')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP,
    ended_at TIMESTAMP
);

-- Mini game participants
CREATE TABLE IF NOT EXISTS mini_game_participants (
    id SERIAL PRIMARY KEY,
    game_id INTEGER NOT NULL REFERENCES mini_games(id) ON DELETE CASCADE,
    player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    score INTEGER DEFAULT 0,
    position INTEGER,
    game_data JSONB,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(game_id, player_id)
);

-- Achievements - Player achievements and titles
CREATE TABLE IF NOT EXISTS achievements (
    id SERIAL PRIMARY KEY,
    player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    achievement_type VARCHAR(30) NOT NULL,
    achievement_name VARCHAR(100) NOT NULL,
    description TEXT,
    reward_gold INTEGER DEFAULT 0,
    reward_energy INTEGER DEFAULT 0,
    reward_item VARCHAR(50),
    earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Energy transactions - Energy gain/loss tracking
CREATE TABLE IF NOT EXISTS energy_transactions (
    id SERIAL PRIMARY KEY,
    player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    transaction_type VARCHAR(30) NOT NULL,
    amount INTEGER NOT NULL, -- positive for gain, negative for loss
    reason VARCHAR(100) NOT NULL,
    related_activity_id INTEGER REFERENCES player_activities(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Player reputation - Honor/infamy system
CREATE TABLE IF NOT EXISTS player_reputation (
    id SERIAL PRIMARY KEY,
    player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    reputation_type VARCHAR(20) NOT NULL CHECK (reputation_type IN ('honor', 'infamy')),
    amount INTEGER NOT NULL DEFAULT 0,
    reason VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Town projects - Community goals and progress
CREATE TABLE IF NOT EXISTS town_projects (
    id SERIAL PRIMARY KEY,
    town_id INTEGER NOT NULL REFERENCES towns(id) ON DELETE CASCADE,
    project_name VARCHAR(100) NOT NULL,
    description TEXT,
    required_resources JSONB NOT NULL,
    current_resources JSONB NOT NULL DEFAULT '{}',
    required_contributors INTEGER NOT NULL DEFAULT 1,
    current_contributors INTEGER DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Town project contributions
CREATE TABLE IF NOT EXISTS town_project_contributions (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES town_projects(id) ON DELETE CASCADE,
    player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    contribution_type VARCHAR(30) NOT NULL,
    amount INTEGER NOT NULL,
    contributed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
INSERT INTO towns (name, display_name, description) VALUES
('dusty_gulch', 'Dusty Gulch', 'A rough mining town where gold and trouble go hand in hand'),
('red_mesa', 'Red Mesa', 'A peaceful ranching community known for its horses and hospitality'),
('tumbleweed_junction', 'Tumbleweed Junction', 'A bustling railroad hub where anything can happen'),
('dead_horse_canyon', 'Dead Horse Canyon', 'An outlaw territory where the law don''t reach')
ON CONFLICT (name) DO NOTHING;
