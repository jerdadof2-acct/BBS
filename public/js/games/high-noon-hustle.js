// HIGH NOON HUSTLE - Multiplayer Western BBS Door Game
// Adventure, a little danger, and a whole lotta laughter!
// 
// TESTING: Tournament system in development - countdown works, broadcast/join needs server testing

class HighNoonHustle {
    constructor(terminal, socketClient, authManager) {
        this.terminal = terminal;
        this.socketClient = socketClient;
        this.authManager = authManager;
        this.player = null;
        this.currentTown = 'dusty_gulch';
        this.recentMessages = [];
        this.socketListenersSetup = false;
        this.saloonRefreshTimeout = null; // Track pending saloon refresh timeout
        this.gameState = {
            energy: 100,
            maxEnergy: 100,
            gold: 100,
            experience: 0,
            level: 1,
            honorScore: 0,
            currentActivity: null,
            currentLocation: 'main_menu',
            equipment: {
                weapon: 'rusty_colt',
                horse: 'old_paint',
                boots: 'worn_leather',
                clothes: 'dusty_duds',
                accessory: 'lucky_coin'
            },
            // Adventure Ride Statistics
            adventureStats: {
                totalAdventures: 0,
                adventuresCompleted: 0,
                currentStreak: 0,
                bestStreak: 0,
                totalGoldFound: 0,
                totalExperienceGained: 0,
                totalHealthLost: 0,
                totalItemsFound: 0,
                eventsEncountered: {},
                achievements: [],
                bestAdventure: {
                    gold: 0,
                    experience: 0,
                    health: 100,
                    events: 0
                },
                worstAdventure: {
                    gold: 0,
                    experience: 0,
                    health: 100,
                    events: 0
                }
            }
        };
        this.dbAdapter = null;
        this.saloonMessages = [];
        this.onlinePlayers = [];
        this.activeEvents = [];
        this.miniGames = [];
        
        // Tournament system for true multiplayer
        this.tournament = {
            active: false,
            participants: [],
            startTime: null,
            joinEndTime: null,
            duration: 5 * 60 * 1000, // 5 minutes in milliseconds
            joinPeriod: 60 * 1000, // 60 seconds to join
            leaderboard: [],
            tournamentId: null,
            phase: 'waiting', // waiting, joining, active, ended
            gameType: null, // 'poker', 'derby', 'cooking', 'panning'
            stats: {
                tournamentsPlayed: 0,
                tournamentsWon: 0,
                totalWinnings: 0
            }
        };

        // Poker card system
        this.pokerDeck = [];
        this.pokerSuits = ['♠', '♥', '♦', '♣'];
        this.pokerRanks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
        this.pokerHands = [
            'High Card', 'Pair', 'Two Pair', 'Three of a Kind', 
            'Straight', 'Flush', 'Full House', 'Four of a Kind', 
            'Straight Flush', 'Royal Flush'
        ];
        this.tradingOffers = [];
        
        // Equipment system
        this.equipmentData = {
            weapons: {
                'rusty_colt': { name: 'Rusty Colt', accuracy: 0, cost: 0, description: 'A trusty old six-shooter' },
                'polished_peacemaker': { name: 'Polished Peacemaker', accuracy: 3, cost: 150, description: 'Shines like a new penny' },
                'engraved_revolver': { name: 'Engraved Revolver', accuracy: 6, cost: 300, description: 'Fancy scrollwork and deadly aim' },
                'golden_spurs': { name: 'Golden Spurs Revolver', accuracy: 10, cost: 500, description: 'The finest weapon in the West' }
            },
            horses: {
                'old_paint': { name: 'Old Paint', travelCost: 0, cost: 0, description: 'A reliable old mare' },
                'dust_devil': { name: 'Dust Devil', travelCost: -5, cost: 200, description: 'Kicks up dust but gets there fast' },
                'lightning_jack': { name: 'Lightning Jack', travelCost: -10, cost: 400, description: 'Faster than a rattlesnake strike' },
                'ghost_runner': { name: 'Ghost Runner', travelCost: -20, cost: 600, description: 'So fast, you barely see it coming' }
            },
            boots: {
                'worn_leather': { name: 'Worn Leather Boots', agility: 0, cost: 0, description: 'Comfortable and broken in' },
                'quickstep': { name: 'Quickstep Boots', agility: 5, cost: 100, description: 'Light as a feather, quick as a cat' },
                'coyote_kicks': { name: 'Coyote Kicks', agility: 10, cost: 250, description: 'Silent as a shadow, swift as the wind' }
            },
            clothes: {
                'dusty_duds': { name: 'Dusty Duds', charisma: 0, cost: 0, description: 'Practical frontier wear' },
                'dapper_duster': { name: 'Dapper Duster', charisma: 5, cost: 120, description: 'Sharp enough to cut through trouble' },
                'fancy_town_suit': { name: 'Fancy Town Suit', charisma: 10, cost: 300, description: 'The height of frontier fashion' }
            },
            accessories: {
                'lucky_coin': { name: 'Lucky Coin', luck: 2, cost: 50, description: 'Brings good fortune' },
                'silver_spurs': { name: 'Silver Spurs', luck: 5, cost: 150, description: 'Jingle with every step' },
                'marshals_badge': { name: 'Marshal\'s Badge', luck: 8, cost: 400, description: 'Symbol of law and order' },
                'goat_figurine': { name: 'Mysterious Goat Figurine', luck: 10, cost: 500, description: 'The goat knows something you don\'t' }
            }
        };
        
        // Energy recovery methods
        this.energyRecoveryMethods = {
            'beans': { cost: 5, energy: 15, description: 'Eat some beans (+15 energy)' },
            'stew': { cost: 15, energy: 30, description: 'Warm stew (+30 energy)' },
            'coffee': { cost: 8, energy: 20, description: 'Strong coffee (+20 energy)' },
            'rest': { cost: 0, energy: 25, description: 'Take a nap (+25 energy)' },
            'social': { cost: 0, energy: 10, description: 'Chat with folks (+10 energy)' },
            'work': { cost: 0, energy: 20, description: 'Help around town (+20 energy)' },
            'gamble': { cost: 10, energy: 30, description: 'Gamble for energy (risk gold)' }
        };
        
        // Towns data
        this.towns = {
            'dusty_gulch': {
                name: 'Dusty Gulch',
                description: 'A rough mining town where gold and trouble go hand in hand',
                saloon: 'The Dusty Rose',
                special: 'Gold panning contests and mining equipment trading'
            },
            'red_mesa': {
                name: 'Red Mesa',
                description: 'A peaceful ranching community known for its horses and hospitality',
                saloon: 'The Red Horse',
                special: 'Horse trading and livestock auctions'
            },
            'tumbleweed_junction': {
                name: 'Tumbleweed Junction',
                description: 'A bustling railroad hub where anything can happen',
                saloon: 'The Junction',
                special: 'Travel information and stagecoach schedules'
            },
            'dead_horse_canyon': {
                name: 'Dead Horse Canyon',
                description: 'An outlaw territory where the law don\'t reach',
                saloon: 'The Last Chance',
                special: 'Black market trading and bounty hunting'
            }
        };
        
        // Mini-games available
        this.miniGameTypes = {
            'poker': { name: 'Poker Night', maxPlayers: 6, energyCost: 15 },
            'horseshoes': { name: 'Horseshoe Toss', maxPlayers: 8, energyCost: 10 },
            'target_practice': { name: 'Target Practice', maxPlayers: 4, energyCost: 8 },
            'arm_wrestling': { name: 'Arm Wrestling', maxPlayers: 2, energyCost: 12 },
            'tall_tale': { name: 'Tall Tale Contest', maxPlayers: 10, energyCost: 5 },
            'dance_off': { name: 'Dance Off', maxPlayers: 6, energyCost: 10 },
            'gold_panning': { name: 'Gold Panning Contest', maxPlayers: 8, energyCost: 20 }
        };
        
        // Socket listeners will be set up after player data is loaded
    }

    async play() {
        this.terminal.clear();
        await this.showIntroAnimation();
        
        // Initialize database connection
        await this.initializeDatabase();
        
        // Try to load existing player data first using BBS username
        await this.loadPlayerData();
        
        // Check if player needs character creation
        if (!this.player) {
            await this.createCharacter();
            // After character creation, try to load again with the character username
            await this.loadPlayerData();
        }
        
        // Set up socket listeners now that player data is loaded
        this.setupSocketListeners();
        
        // Join the game room after player data is fully loaded
        this.joinGameRoom();
        
        while (true) {
            console.log('DEBUG: Main play() loop iteration starting...');
            console.log('DEBUG: About to clear terminal and show main menu...');
            this.terminal.clear();
            await this.showMainMenu();
            
            console.log('DEBUG: About to wait for user input...');
            const choice = (await this.terminal.input()).toLowerCase().trim();
            console.log('DEBUG: User input received:', choice);
            
            if (choice === '1') {
                this.gameState.currentLocation = 'solo_adventures';
                this.currentLocation = 'solo_adventures';
                await this.updatePlayerStatus();
                await this.soloAdventures();
            } else if (choice === '2') {
                this.gameState.currentLocation = 'general_store';
                this.currentLocation = 'general_store';
                await this.updatePlayerStatus();
                await this.generalStore();
            } else if (choice === '3') {
                this.gameState.currentLocation = 'solo_mini_games';
                this.currentLocation = 'solo_mini_games';
                await this.updatePlayerStatus();
                await this.soloMiniGames();
            } else if (choice === '4') {
                this.gameState.currentLocation = 'energy_recovery';
                this.currentLocation = 'energy_recovery';
                await this.updatePlayerStatus();
                await this.energyRecovery();
            } else if (choice === '5') {
                await this.leaderboardsAndRankings();
            } else if (choice === '6') {
                await this.viewGazette();
            } else if (choice === '7') {
                await this.characterManagement();
            } else if (choice.toLowerCase() === 's' || choice === 'saloon') {
                await this.enterSaloon();
                console.log('DEBUG: Returned from enterSaloon(), continuing main loop...');
                console.log('DEBUG: About to start new main loop iteration...');
                // Don't wait for input - just continue the loop to show main menu again
                continue;
            } else if (choice === 'q' || choice === 'quit') {
                await this.savePlayerData();
                return 'doors';
            } else {
                this.terminal.println(ANSIParser.fg('bright-red') + '  Invalid choice! Try again.' + ANSIParser.reset());
                await this.terminal.sleep(2000);
            }
        }
    }

    async initializeDatabase() {
        try {
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  🔌 Connecting to the frontier database...' + ANSIParser.reset());
            await this.terminal.sleep(500);
            
        // Always try PostgreSQL first (even on localhost)
        this.dbAdapter = {
            type: 'postgresql',
            connected: false,
            baseUrl: window.location.origin
        };
        
        // Test PostgreSQL connection
        try {
            this.terminal.println(ANSIParser.fg('bright-cyan') + '  🔍 Testing PostgreSQL connection...' + ANSIParser.reset());
            const response = await fetch(`${this.dbAdapter.baseUrl}/api/hnh/health`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            if (response.ok) {
                const healthData = await response.json();
                console.log('DEBUG: Health response:', healthData);
                
                // Only use PostgreSQL if it's actually PostgreSQL, not SQLite fallback
                if (healthData.database === 'PostgreSQL') {
                    this.dbAdapter.connected = true;
                    this.terminal.println(ANSIParser.fg('bright-green') + '  ✅ Connected to PostgreSQL frontier database!' + ANSIParser.reset());
                    this.terminal.println(ANSIParser.fg('bright-cyan') + `  📊 Database: ${healthData.database} | Status: ${healthData.status}` + ANSIParser.reset());
                    
                    // Try to sync any local data to PostgreSQL
                    await this.syncLocalDataToPostgreSQL();
                } else {
                    // Server is using SQLite fallback, so use localStorage
                    throw new Error(`Server using ${healthData.database}, falling back to localStorage`);
                }
            } else {
                throw new Error(`PostgreSQL not available (Status: ${response.status})`);
            }
        } catch (error) {
            // PostgreSQL not available, fall back to localStorage
            this.dbAdapter = {
                type: 'localStorage',
                connected: true
            };
            this.terminal.println(ANSIParser.fg('bright-blue') + '  ✅ Connected to local development database (PostgreSQL not available)' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-yellow') + `  ⚠️  PostgreSQL Error: ${error.message}` + ANSIParser.reset());
        }
            
            await this.terminal.sleep(500);
        } catch (error) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  ❌ Database connection failed!' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  Falling back to local storage...' + ANSIParser.reset());
            this.dbAdapter = { type: 'localStorage', connected: true };
            await this.terminal.sleep(1000);
        }
    }

    async showIntroAnimation() {
        this.terminal.println(ANSIParser.fg('bright-yellow') + this.getTitle() + ANSIParser.reset());
        this.terminal.println('');
        
        // Animated intro
        const introLines = [
            '🤠 Welcome to the Wild West!',
            '🏜️  Adventure, a little danger, and a whole lotta laughter!',
            '🍺 The Saloon is where the action is!',
            '⚡ Energy management is key to success!',
            '🎮 Mini-games and social fun await!'
        ];
        
        for (const line of introLines) {
            this.terminal.println(ANSIParser.fg('bright-cyan') + '  ' + line + ANSIParser.reset());
            await this.terminal.sleep(800);
        }
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-white') + '  ═══════════════════════════════════════════════════════════════════════════' + ANSIParser.reset());
        await this.terminal.sleep(1000);
    }

    async showMainMenu() {
        this.terminal.println(ANSIParser.fg('bright-yellow') + this.getTitle() + ANSIParser.reset());
        this.terminal.println('');
        
        // Player status
        this.terminal.println(ANSIParser.fg('bright-white') + '  ═══════════════════════════════════════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + `  Name: ${this.player?.display_name || 'Unknown'}   Class: ${this.player?.character_class || 'Gunslinger'} Lv${this.gameState.level}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + `  Gold: ${this.gameState.gold}           Energy: ${this.getEnergyBar()} ${this.gameState.energy}/${this.gameState.maxEnergy}` + ANSIParser.reset());
        
        // XP Progress
        const requiredXP = Math.floor(100 * Math.pow(1.5, this.gameState.level - 1));
        const xpProgress = Math.min(100, Math.floor((this.gameState.experience / requiredXP) * 100));
        this.terminal.println(ANSIParser.fg('bright-yellow') + `  XP: ${this.gameState.experience}/${requiredXP} (${xpProgress}%)` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-magenta') + `  Town: ${this.towns[this.currentTown].name}   Location: ${this.gameState.currentLocation}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  ═══════════════════════════════════════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println('');
        
        // Online players - Show who's in the saloon
        if (this.onlinePlayers.length > 0) {
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  🤠 WHO\'S IN THE SALOON 🤠' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-cyan') + '  ═══════════════════════════════════════════════════════════════════════════' + ANSIParser.reset());
            this.onlinePlayers.forEach(player => {
                const townTag = this.getTownTag(player.current_town);
                const activity = player.current_activity || 'Chatting in Saloon';
                this.terminal.println(ANSIParser.fg('bright-white') + `  ${townTag} ${player.display_name} (${player.character_class}) - ${activity}` + ANSIParser.reset());
            });
            this.terminal.println(ANSIParser.fg('bright-cyan') + '  ═══════════════════════════════════════════════════════════════════════════' + ANSIParser.reset());
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-green') + '  💡 Tip: Press [S] to join them in the saloon for multiplayer fun!' + ANSIParser.reset());
            this.terminal.println('');
        } else {
            this.terminal.println(ANSIParser.fg('bright-red') + '  🏜️  SALOON IS EMPTY - No other players online' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  Focus on solo adventures or invite friends to join!' + ANSIParser.reset());
            this.terminal.println('');
        }
        
        // SOLO ADVENTURES - Main Menu Focus
        this.terminal.println(ANSIParser.fg('bright-blue') + '  🏜️  [1]' + ANSIParser.reset() + ' Solo Adventures (Story & Exploration)');
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ⚔️  [2]' + ANSIParser.reset() + ' General Store (Equipment & Gear)');
        this.terminal.println(ANSIParser.fg('bright-white') + '  🎮 [3]' + ANSIParser.reset() + ' Solo Mini-Games (Practice & Fun)');
        this.terminal.println(ANSIParser.fg('bright-green') + '  ⚡ [4]' + ANSIParser.reset() + ' Energy Recovery (Rest & Recharge)');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  📊 [5]' + ANSIParser.reset() + ' Leaderboards & Rankings');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  📰 [6]' + ANSIParser.reset() + ' The Gazette (Community News)');
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  👤 [7]' + ANSIParser.reset() + ' Character Management');
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-red') + '  🍺 [S]' + ANSIParser.reset() + ' Enter Saloon (Multiplayer Hub)');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [Q]' + ANSIParser.reset() + ' Quit to Door Games');
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
    }

    async enterSaloon() {
        console.log('DEBUG: enterSaloon() called');
        console.log('DEBUG: enterSaloon() - onlinePlayers length:', this.onlinePlayers.length);
        console.log('DEBUG: enterSaloon() - onlinePlayers:', this.onlinePlayers);
        this.gameState.currentLocation = 'saloon';
        this.currentLocation = 'saloon'; // Make sure both are set
        await this.updatePlayerStatus();
        
        // Show saloon welcome
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-yellow') + `  ╔════ ${this.towns[this.currentTown].saloon} (Telegraph Line) ════╗` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + `  ║ Users: ${this.onlinePlayers.length} | Energy: ${this.gameState.energy}/${this.gameState.maxEnergy} ║` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  ╚══════════════════════════════════════════════════════════════════════════╝' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  🍺 Welcome to the Saloon! 🍺' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  The multiplayer hub of the Wild West - where all the social action happens!' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Chat, duel, trade, and compete with other players!' + ANSIParser.reset());
        this.terminal.println('');
        
        // Show who's here
        console.log('DEBUG: Saloon - onlinePlayers length:', this.onlinePlayers.length);
        console.log('DEBUG: Saloon - onlinePlayers:', this.onlinePlayers);
        this.onlinePlayers.forEach((player, index) => {
            console.log(`DEBUG: Player ${index}:`, {
                display_name: player.display_name,
                character_class: player.character_class,
                current_town: player.current_town,
                name: player.name
            });
        });
        if (this.onlinePlayers.length > 0) {
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  🤠 Folks in the Saloon:' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-cyan') + '  (DG=Dusty Gulch, RM=Red Mesa, TJ=Tumbleweed Junction, DH=Dead Horse Canyon)' + ANSIParser.reset());
            this.onlinePlayers.forEach(player => {
                const displayName = player.display_name || player.name || 'Unknown';
                const characterClass = player.character_class || 'gunslinger';
                const currentTown = player.current_town || 'dusty_gulch';
                const townTag = this.getTownTag(currentTown);
                this.terminal.println(ANSIParser.fg('bright-white') + `    ${townTag} ${displayName} (${characterClass})` + ANSIParser.reset());
            });
            this.terminal.println('');
        } else {
            this.terminal.println(ANSIParser.fg('bright-red') + '  🏜️  The saloon is empty! You\'re the only one here.' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  Invite friends or wait for others to join!' + ANSIParser.reset());
            this.terminal.println('');
        }
        
        // Show recent telegraph messages
        this.showSaloonMessages();
        this.terminal.println('');
        
        // Saloon activities - PURE MULTIPLAYER & SOCIAL
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  🍺 Saloon Activities (Multiplayer & Social Only!):' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [1]' + ANSIParser.reset() + ' 💬 Send Telegraph Message');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [2]' + ANSIParser.reset() + ' 🎮 Join Multiplayer Games');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [3]' + ANSIParser.reset() + ' ⚔️  Challenge Someone to Duel');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [4]' + ANSIParser.reset() + ' 💰 Trade with Other Players');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [5]' + ANSIParser.reset() + ' 🎵 Social Activities');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [6]' + ANSIParser.reset() + ' 🏆 Join Competitions');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [7]' + ANSIParser.reset() + ' 📢 View Events & Announcements');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [8]' + ANSIParser.reset() + ' 👥 Form a Posse');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [9]' + ANSIParser.reset() + ' 🏆 Tournaments (TRUE Multiplayer!)');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [S]' + ANSIParser.reset() + ' 📊 View Your Stats & Equipment');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [R]' + ANSIParser.reset() + ' 🔄 Refresh Saloon (Update Player List)');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [B]' + ANSIParser.reset() + ' Back to Main Menu (Solo Adventures)');
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
        
        const choice = (await this.terminal.input()).toLowerCase().trim();
        console.log('DEBUG: Saloon choice received:', choice, 'type:', typeof choice);
        
        if (choice === '1') {
            await this.sendTelegraphMessage();
            // After sending message, return to saloon
            return await this.enterSaloon();
        } else if (choice === '2') {
            await this.joinMultiplayerGames();
            return await this.enterSaloon();
        } else if (choice === '3') {
            await this.challengeToDuel();
            return await this.enterSaloon();
        } else if (choice === '4') {
            await this.tradeWithPlayers();
            return await this.enterSaloon();
        } else if (choice === '5') {
            await this.socialActivities();
            return await this.enterSaloon();
        } else if (choice === '6') {
            await this.joinCompetitions();
            return await this.enterSaloon();
        } else if (choice === '7') {
            await this.viewEventsAndAnnouncements();
            return await this.enterSaloon();
        } else if (choice === '8') {
            await this.formPosse();
            return await this.enterSaloon();
        } else if (choice === '9') {
            await this.tournamentMode();
            return await this.enterSaloon();
        } else if (choice === 'tournament' || choice === 't') {
            await this.tournamentMode();
            return await this.enterSaloon();
        } else if (choice === 's' || choice === 'stats') {
            await this.showPlayerStats();
            return await this.enterSaloon();
        } else if (choice === 'r' || choice === 'refresh') {
            // Refresh the saloon display by calling enterSaloon again
            console.log('DEBUG: Refreshing saloon display...');
            return await this.enterSaloon();
        } else if (choice === 'b' || choice === 'B' || choice === 'back' || choice === 'Back') {
            // Update status when leaving saloon
            console.log('DEBUG: User pressed b/B/back, leaving saloon...');
            this.gameState.currentLocation = 'main_menu';
            this.currentLocation = 'main_menu';
            
            // Cancel any pending saloon refresh timeout
            if (this.saloonRefreshTimeout) {
                clearTimeout(this.saloonRefreshTimeout);
                this.saloonRefreshTimeout = null;
                console.log('DEBUG: Cancelled pending saloon refresh timeout');
            }
            
            console.log('DEBUG: Updated locations, calling updatePlayerStatus...');
            await this.updatePlayerStatus();
            console.log('DEBUG: updatePlayerStatus completed, showing exit message...');
            
            // Show exit message and wait for user to press any key
            this.terminal.clear();
            this.terminal.println(ANSIParser.fg('bright-green') + '  👋 You left the saloon!' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  Press any key to return to the main menu...' + ANSIParser.reset());
            await this.terminal.input();
            
            console.log('DEBUG: User pressed key, returning to main menu...');
            return; // Return to main play() loop
        } else {
            console.log('DEBUG: Invalid choice in saloon:', choice);
            this.terminal.println(ANSIParser.fg('bright-red') + '  Invalid choice!' + ANSIParser.reset());
            await this.terminal.sleep(1000);
            return await this.enterSaloon(); // Return to saloon instead of exiting
        }
    }

    async showPlayerStats() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  ╔═══════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  📊 YOUR CHARACTER STATS & EQUIPMENT 📊' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println('');
        
        // Character Info
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  🤠 CHARACTER INFO:' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + `    Name: ${this.player.display_name}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + `    Class: ${this.player.character_class}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + `    Town: ${this.towns[this.currentTown].name}` + ANSIParser.reset());
        this.terminal.println('');
        
        // Core Stats
        this.terminal.println(ANSIParser.fg('bright-green') + '  💪 CORE STATS:' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + `    Level: ${this.gameState.level}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + `    Experience: ${this.gameState.experience} XP` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + `    Energy: ${this.gameState.energy}/${this.gameState.maxEnergy}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + `    Gold: ${this.gameState.gold}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + `    Honor Score: ${this.gameState.honorScore}` + ANSIParser.reset());
        this.terminal.println('');
        
        // Equipment
        this.terminal.println(ANSIParser.fg('bright-magenta') + '  ⚔️  EQUIPMENT:' + ANSIParser.reset());
        
        // Check if equipment data is loaded
        if (this.equipmentData && this.equipmentData.weapons) {
            // Weapon
            const weapon = this.equipmentData.weapons[this.gameState.equipment.weapon];
            if (weapon) {
                this.terminal.println(ANSIParser.fg('bright-white') + `    🔫 Weapon: ${weapon.name} (+${weapon.accuracy} Accuracy)` + ANSIParser.reset());
                this.terminal.println(ANSIParser.fg('bright-cyan') + `        ${weapon.description}` + ANSIParser.reset());
            }
            
            // Horse
            const horse = this.equipmentData.horses[this.gameState.equipment.horse];
            if (horse) {
                this.terminal.println(ANSIParser.fg('bright-white') + `    🐎 Horse: ${horse.name} (${horse.travelCost}% Travel Cost)` + ANSIParser.reset());
                this.terminal.println(ANSIParser.fg('bright-cyan') + `        ${horse.description}` + ANSIParser.reset());
            }
            
            // Boots
            const boots = this.equipmentData.boots[this.gameState.equipment.boots];
            if (boots) {
                this.terminal.println(ANSIParser.fg('bright-white') + `    👢 Boots: ${boots.name} (+${boots.agility} Agility)` + ANSIParser.reset());
                this.terminal.println(ANSIParser.fg('bright-cyan') + `        ${boots.description}` + ANSIParser.reset());
            }
            
            // Clothes
            const clothes = this.equipmentData.clothes[this.gameState.equipment.clothes];
            if (clothes) {
                this.terminal.println(ANSIParser.fg('bright-white') + `    👕 Clothes: ${clothes.name} (+${clothes.charisma} Charisma)` + ANSIParser.reset());
                this.terminal.println(ANSIParser.fg('bright-cyan') + `        ${clothes.description}` + ANSIParser.reset());
            }
            
            // Accessory
            const accessory = this.equipmentData.accessories[this.gameState.equipment.accessory];
            if (accessory) {
                this.terminal.println(ANSIParser.fg('bright-white') + `    🍀 Accessory: ${accessory.name} (+${accessory.luck} Luck)` + ANSIParser.reset());
                this.terminal.println(ANSIParser.fg('bright-cyan') + `        ${accessory.description}` + ANSIParser.reset());
            }
        } else {
            this.terminal.println(ANSIParser.fg('bright-yellow') + '    Equipment data not loaded yet...' + ANSIParser.reset());
        }
        
        this.terminal.println('');
        
        // Tournament Stats (if available)
        if (this.tournament && this.tournament.participants && this.tournament.participants.length > 0) {
            const myParticipant = this.tournament.participants.find(p => p.id === this.player.username);
            if (myParticipant) {
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  🏆 CURRENT TOURNAMENT:' + ANSIParser.reset());
                this.terminal.println(ANSIParser.fg('bright-white') + `    Score: ${myParticipant.score}` + ANSIParser.reset());
                this.terminal.println(ANSIParser.fg('bright-white') + `    Gold Earned: ${myParticipant.gold || 0}` + ANSIParser.reset());
                this.terminal.println('');
            }
        }
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  [B] Back to Saloon' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
        
        const choice = (await this.terminal.input()).toLowerCase().trim();
        
        if (choice === 'b' || choice === 'back') {
            await this.enterSaloon();
        } else {
            // Any other key also goes back to saloon
            await this.enterSaloon();
        }
    }

    async multiplayerMiniGames() {
        while (true) {
            this.terminal.clear();
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  ╔════ MULTIPLAYER MINI-GAMES ════╗' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-cyan') + `  ║ Energy: ${this.gameState.energy}/${this.gameState.maxEnergy} ║` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-white') + '  ╚═══════════════════════════════════════╝' + ANSIParser.reset());
            this.terminal.println('');
            
            // Show who's available to play
            if (this.onlinePlayers.length > 1) {
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  🤠 Players Available for Games:' + ANSIParser.reset());
                this.onlinePlayers.forEach(player => {
                    if (player.username !== this.player?.username) {
                        const townTag = this.getTownTag(player.current_town);
                        this.terminal.println(ANSIParser.fg('bright-white') + `    ${townTag} ${player.display_name} (${player.character_class})` + ANSIParser.reset());
                    }
                });
                this.terminal.println('');
            } else {
                this.terminal.println(ANSIParser.fg('bright-red') + '  🏜️  No other players online to play with!' + ANSIParser.reset());
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  Wait for others to join or invite friends!' + ANSIParser.reset());
                this.terminal.println('');
            }
            
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  🎮 Multiplayer Games Available:' + ANSIParser.reset());
            this.terminal.println('');
            
            let gameIndex = 1;
            for (const [gameId, game] of Object.entries(this.miniGameTypes)) {
                const canPlay = this.gameState.energy >= game.energyCost;
                const status = canPlay ? ANSIParser.fg('bright-green') + '✓' : ANSIParser.fg('bright-red') + '✗';
                const multiplayer = game.maxPlayers > 1 ? ANSIParser.fg('bright-magenta') + ' [MULTIPLAYER]' : ANSIParser.fg('bright-cyan') + ' [SOLO]';
                this.terminal.println(ANSIParser.fg('bright-white') + `  [${gameIndex}]` + ANSIParser.reset() + 
                    ` ${game.name} (${game.energyCost} energy) ${status}${ANSIParser.reset()}${multiplayer}${ANSIParser.reset()}`);
                gameIndex++;
            }
            
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-white') + '  [B]' + ANSIParser.reset() + ' Back to Main Menu');
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
            
            const choice = (await this.terminal.input()).toLowerCase().trim();
            
            if (choice === 'b' || choice === 'back') {
                await this.enterSaloon();
                return;
            }
            
            const gameIndexNum = parseInt(choice) - 1;
            const gameIds = Object.keys(this.miniGameTypes);
            
            if (gameIndexNum >= 0 && gameIndexNum < gameIds.length) {
                const selectedGame = gameIds[gameIndexNum];
                await this.playSpecificMiniGame(selectedGame);
            } else {
                this.terminal.println(ANSIParser.fg('bright-red') + '  Invalid choice!' + ANSIParser.reset());
                await this.terminal.sleep(1000);
            }
        }
    }

    async playSpecificMiniGame(gameId) {
        const game = this.miniGameTypes[gameId];
        
        if (this.gameState.energy < game.energyCost) {
            this.terminal.println(ANSIParser.fg('bright-red') + `  Not enough energy! Need ${game.energyCost}, have ${this.gameState.energy}` + ANSIParser.reset());
            await this.terminal.sleep(2000);
            return;
        }
        
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-yellow') + `  ╔════ ${game.name.toUpperCase()} ════╗` + ANSIParser.reset());
        this.terminal.println('');
        
        // Deduct energy
        this.gameState.energy -= game.energyCost;
        await this.updatePlayerStatus();
        
        // Play the specific mini-game
        switch (gameId) {
            case 'poker':
                await this.playPoker();
                break;
            case 'horseshoes':
                await this.playHorseshoes();
                break;
            case 'target_practice':
                await this.playTargetPractice();
                break;
            case 'arm_wrestling':
                await this.playArmWrestling();
                break;
            case 'tall_tale':
                await this.playTallTale();
                break;
            case 'dance_off':
                await this.playDanceOff();
                break;
            case 'gold_panning':
                await this.playGoldPanning();
                break;
        }
        
        // Award experience and potential gold
        const experienceGained = Math.floor(Math.random() * 10) + 5;
        const goldGained = Math.floor(Math.random() * 20) + 5;
        
        this.gameState.experience += experienceGained;
        this.gameState.gold += goldGained;
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + `  +${experienceGained} XP, +${goldGained} Gold!` + ANSIParser.reset());
        await this.terminal.sleep(2000);
    }

    async playPoker() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  🃏 POKER NIGHT! 🃏' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  ════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println('');

        if (this.gameState.energy < 15) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Not enough energy! Need 15 energy to play poker.' + ANSIParser.reset());
            await this.terminal.sleep(2000);
            await this.enterSaloon();
            return;
        }

        if (this.onlinePlayers.length < 2) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Need at least 2 players for poker!' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  Wait for others to join!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
            await this.enterSaloon();
            return;
        }

        this.terminal.println(ANSIParser.fg('bright-yellow') + '  🤠 Players at the table:' + ANSIParser.reset());
        this.onlinePlayers.forEach((player, index) => {
            const townTag = this.getTownTag(player.current_town);
            this.terminal.println(ANSIParser.fg('bright-white') + `    ${index + 1}. ${townTag} ${player.display_name}` + ANSIParser.reset());
        });
        this.terminal.println('');

        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Buy-in: 25 gold' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [Y] Join Poker Game' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [B] Back to Saloon' + ANSIParser.reset());
        this.terminal.println('');

        const choice = await this.terminal.input();

        if (choice.toLowerCase() === 'y' || choice.toLowerCase() === 'yes') {
            if (this.gameState.gold >= 25) {
                await this.startMultiplayerPoker();
            } else {
                this.terminal.println(ANSIParser.fg('bright-red') + '  Not enough gold! Need 25 gold to play.' + ANSIParser.reset());
                await this.terminal.sleep(2000);
                await this.enterSaloon();
            }
        } else {
            await this.enterSaloon();
        }
    }

    async startMultiplayerPoker() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-green') + '  🃏 Starting Multiplayer Poker Game...' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + `  Players: ${this.onlinePlayers.length}` + ANSIParser.reset());
        this.terminal.println('');

        // Deduct buy-in and energy
        this.gameState.gold -= 25;
        this.gameState.energy -= 15;

        // Deal cards to all players
        const gameState = {
            pot: this.onlinePlayers.length * 25,
            hands: {},
            folded: {},
            bets: {}
        };

        // Create and shuffle deck
        this.createPokerDeck();
        
        // Deal initial hands
        this.onlinePlayers.forEach(player => {
            gameState.hands[player.id] = this.dealPokerHand();
            gameState.folded[player.id] = false;
            gameState.bets[player.id] = 25;
        });

        // Show your hand
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  Your hand:' + ANSIParser.reset());
        this.displayPokerHand(gameState.hands[this.player.id]);
        this.terminal.println('');

        // Simple betting round (everyone calls)
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  💰 Betting round - everyone calls!' + ANSIParser.reset());
        await this.terminal.sleep(2000);

        // Show all hands
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  🃏 All hands revealed:' + ANSIParser.reset());
        this.onlinePlayers.forEach(player => {
            const townTag = this.getTownTag(player.current_town);
            this.terminal.println(ANSIParser.fg('bright-white') + `  ${townTag} ${player.display_name}:` + ANSIParser.reset());
            this.displayPokerHand(gameState.hands[player.id]);
            
            // Show hand evaluation
            const handValue = this.evaluatePokerHand(gameState.hands[player.id]);
            const handName = this.pokerHands[handValue];
            this.terminal.println(ANSIParser.fg('bright-green') + `    Hand: ${handName}` + ANSIParser.reset());
            this.terminal.println('');
        });

        // Determine winner
        let winner = null;
        let bestHand = -1;
        
        this.onlinePlayers.forEach(player => {
            const handValue = this.evaluatePokerHand(gameState.hands[player.id]);
            if (handValue > bestHand) {
                bestHand = handValue;
                winner = player;
            }
        });

        // Results
        const winnerHandName = this.pokerHands[bestHand];
        if (winner.id === this.player.id) {
            this.terminal.println(ANSIParser.fg('bright-green') + `  🏆 YOU WIN! You won ${gameState.pot} gold with ${winnerHandName}!` + ANSIParser.reset());
            this.gameState.gold += gameState.pot;
            this.gameState.experience += 25;
        } else {
            this.terminal.println(ANSIParser.fg('bright-yellow') + `  🎯 ${winner.display_name} wins the pot of ${gameState.pot} gold with ${winnerHandName}!` + ANSIParser.reset());
            this.gameState.experience += 10;
        }

        await this.savePlayerData();
        await this.terminal.sleep(3000);
        await this.enterSaloon();
    }

    async playHorseshoes() {
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  🐎 Horseshoe Toss! 🐎' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-white') + '  You step up to the horseshoe pit...' + ANSIParser.reset());
        await this.terminal.sleep(1000);
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Press SPACE when the horseshoe is at the right angle!' + ANSIParser.reset());
        await this.terminal.sleep(1000);
        
        // Simple timing game
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  Get ready...' + ANSIParser.reset());
        await this.terminal.sleep(1000);
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  TOSS!' + ANSIParser.reset());
        
        const startTime = Date.now();
        await this.terminal.input();
        const reactionTime = Date.now() - startTime;
        
        let accuracy = 0;
        if (reactionTime < 200) {
            accuracy = 100;
            this.terminal.println(ANSIParser.fg('bright-green') + '  RINGER! Perfect throw!' + ANSIParser.reset());
        } else if (reactionTime < 400) {
            accuracy = 75;
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  Close! Good throw!' + ANSIParser.reset());
        } else if (reactionTime < 600) {
            accuracy = 50;
            this.terminal.println(ANSIParser.fg('bright-cyan') + '  Not bad, partner!' + ANSIParser.reset());
        } else {
            accuracy = 25;
            this.terminal.println(ANSIParser.fg('bright-red') + '  Missed! Better luck next time!' + ANSIParser.reset());
        }
        
        await this.terminal.sleep(2000);
    }

    async playTargetPractice() {
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  🎯 Target Practice! 🎯' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-white') + '  You step up to the shooting range...' + ANSIParser.reset());
        await this.terminal.sleep(1000);
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Quick! Press SPACE when the target is in your sights!' + ANSIParser.reset());
        await this.terminal.sleep(1000);
        
        // Moving target game
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  Target moving...' + ANSIParser.reset());
        await this.terminal.sleep(1000);
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  FIRE!' + ANSIParser.reset());
        
        const startTime = Date.now();
        await this.terminal.input();
        const reactionTime = Date.now() - startTime;
        
        let score = 0;
        if (reactionTime < 150) {
            score = 100;
            this.terminal.println(ANSIParser.fg('bright-green') + '  BULLSEYE! Dead center!' + ANSIParser.reset());
        } else if (reactionTime < 300) {
            score = 75;
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  Good shot! Hit the target!' + ANSIParser.reset());
        } else if (reactionTime < 500) {
            score = 50;
            this.terminal.println(ANSIParser.fg('bright-cyan') + '  Not bad! Close enough!' + ANSIParser.reset());
        } else {
            score = 25;
            this.terminal.println(ANSIParser.fg('bright-red') + '  Missed! Practice more!' + ANSIParser.reset());
        }
        
        await this.terminal.sleep(2000);
    }

    async playArmWrestling() {
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  💪 Arm Wrestling! 💪' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-white') + '  You sit down at the arm wrestling table...' + ANSIParser.reset());
        await this.terminal.sleep(1000);
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Press SPACE repeatedly to build up strength!' + ANSIParser.reset());
        await this.terminal.sleep(1000);
        
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  Ready...' + ANSIParser.reset());
        await this.terminal.sleep(1000);
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  GO!' + ANSIParser.reset());
        
        const startTime = Date.now();
        let presses = 0;
        const maxTime = 3000; // 3 seconds
        
        while (Date.now() - startTime < maxTime) {
            const input = await this.terminal.input();
            if (input === ' ') {
                presses++;
                this.terminal.println(ANSIParser.fg('bright-green') + '  💪' + ANSIParser.reset());
            }
        }
        
        let strength = Math.min(presses * 10, 100);
        
        if (strength > 80) {
            this.terminal.println(ANSIParser.fg('bright-green') + '  You win! Strong as an ox!' + ANSIParser.reset());
        } else if (strength > 60) {
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  Good effort! Close match!' + ANSIParser.reset());
        } else {
            this.terminal.println(ANSIParser.fg('bright-red') + '  You lose! Need more practice!' + ANSIParser.reset());
        }
        
        await this.terminal.sleep(2000);
    }

    async playTallTale() {
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  📖 Tall Tale Contest! 📖' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-white') + '  You step up to tell your tale...' + ANSIParser.reset());
        await this.terminal.sleep(1000);
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Tell us about your greatest adventure!' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  (Type your tale and press ENTER)' + ANSIParser.reset());
        
        const tale = await this.terminal.input();
        
        if (tale.length > 50) {
            this.terminal.println(ANSIParser.fg('bright-green') + '  What a tale! The crowd loves it!' + ANSIParser.reset());
        } else if (tale.length > 20) {
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  Not bad! Decent story!' + ANSIParser.reset());
        } else {
            this.terminal.println(ANSIParser.fg('bright-red') + '  That\'s it? Come on, partner!' + ANSIParser.reset());
        }
        
        await this.terminal.sleep(2000);
    }

    async playDanceOff() {
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  💃 Dance Off! 💃' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-white') + '  You step onto the dance floor...' + ANSIParser.reset());
        await this.terminal.sleep(1000);
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Follow the rhythm! Press the keys in sequence!' + ANSIParser.reset());
        await this.terminal.sleep(1000);
        
        const sequence = ['W', 'A', 'S', 'D'];
        let score = 0;
        
        for (let i = 0; i < sequence.length; i++) {
            this.terminal.println(ANSIParser.fg('bright-cyan') + `  Step ${i + 1}: Press ${sequence[i]}` + ANSIParser.reset());
            
            const startTime = Date.now();
            const input = await this.terminal.input();
            const reactionTime = Date.now() - startTime;
            
            if (input.toUpperCase() === sequence[i] && reactionTime < 1000) {
                score += 25;
                this.terminal.println(ANSIParser.fg('bright-green') + '  Perfect!' + ANSIParser.reset());
            } else {
                this.terminal.println(ANSIParser.fg('bright-red') + '  Missed!' + ANSIParser.reset());
            }
        }
        
        if (score === 100) {
            this.terminal.println(ANSIParser.fg('bright-green') + '  Amazing! You\'re the dance champion!' + ANSIParser.reset());
        } else if (score >= 75) {
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  Great moves! Well done!' + ANSIParser.reset());
        } else {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Need more practice, partner!' + ANSIParser.reset());
        }
        
        await this.terminal.sleep(2000);
    }

    async playGoldPanning() {
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ⛏️ Gold Panning Contest! ⛏️' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-white') + '  You kneel by the creek with your pan...' + ANSIParser.reset());
        await this.terminal.sleep(1000);
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Press SPACE to pan for gold!' + ANSIParser.reset());
        await this.terminal.sleep(1000);
        
        let goldFound = 0;
        const maxPans = 5;
        
        for (let i = 0; i < maxPans; i++) {
            this.terminal.println(ANSIParser.fg('bright-cyan') + `  Pan ${i + 1}/${maxPans} - Press SPACE!` + ANSIParser.reset());
            
            const startTime = Date.now();
            await this.terminal.input();
            const reactionTime = Date.now() - startTime;
            
            let panResult = 0;
            if (reactionTime < 200) {
                panResult = Math.floor(Math.random() * 20) + 10;
                this.terminal.println(ANSIParser.fg('bright-green') + `  Found ${panResult} gold!` + ANSIParser.reset());
            } else if (reactionTime < 500) {
                panResult = Math.floor(Math.random() * 10) + 5;
                this.terminal.println(ANSIParser.fg('bright-yellow') + `  Found ${panResult} gold!` + ANSIParser.reset());
            } else {
                panResult = Math.floor(Math.random() * 5);
                this.terminal.println(ANSIParser.fg('bright-red') + `  Found ${panResult} gold...` + ANSIParser.reset());
            }
            
            goldFound += panResult;
        }
        
        this.terminal.println(ANSIParser.fg('bright-green') + `  Total gold found: ${goldFound}!` + ANSIParser.reset());
        this.gameState.gold += goldFound;
        
        await this.terminal.sleep(2000);
    }

    // Utility methods
    dealCards(count) {
        const suits = ['♠', '♥', '♦', '♣'];
        const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
        const cards = [];
        
        for (let i = 0; i < count; i++) {
            const suit = suits[Math.floor(Math.random() * suits.length)];
            const rank = ranks[Math.floor(Math.random() * ranks.length)];
            cards.push({ suit, rank });
        }
        
        return cards;
    }

    showCards(cards) {
        cards.forEach(card => {
            this.terminal.println(ANSIParser.fg('bright-white') + `  ${card.rank}${card.suit}` + ANSIParser.reset());
        });
    }

    evaluateHand(cards) {
        // Simple hand evaluation (simplified for demo)
        const ranks = cards.map(card => card.rank);
        const uniqueRanks = new Set(ranks);
        
        if (uniqueRanks.size === 2) return 7; // Full house
        if (uniqueRanks.size === 3) return 3; // Two pair
        if (uniqueRanks.size === 4) return 1; // One pair
        return 0; // High card
    }

    getEnergyBar() {
        const filled = Math.floor((this.gameState.energy / this.gameState.maxEnergy) * 10);
        const empty = 10 - filled;
        return '█'.repeat(filled) + '░'.repeat(empty);
    }

    getTownTag(town) {
        const tags = {
            'dusty_gulch': '[DG]',
            'red_mesa': '[RM]',
            'tumbleweed_junction': '[TJ]',
            'dead_horse_canyon': '[DH]'
        };
        return tags[town] || '[??]';
    }

    getTitle() {
        return `
  ╔══════════════════════════════════════════════════════════════════════════╗
  ║                                                                          ║
  ║  🤠 HIGH NOON HUSTLE 🤠                                                  ║
  ║  Adventure, a little danger, and a whole lotta laughter!                ║
  ║                                                                          ║
  ╚══════════════════════════════════════════════════════════════════════════╝`;
    }

    // CHARACTER CREATION
    async createCharacter() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  ╔════ CREATE YOUR COWPOKE ════╗' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ║ Build your legend on the frontier! ║' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  ╚═══════════════════════════════════════╝' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  🤠 Welcome to the Wild West! 🤠' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  Time to create your legend on the open frontier!' + ANSIParser.reset());
        this.terminal.println('');
        
        // Get character name
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  What\'s your name, partner?' + ANSIParser.reset());
        const name = await this.terminal.input();
        
        if (!name.trim()) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Every cowpoke needs a name!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
            return await this.createCharacter();
        }
        
        // Get character class
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Choose your class (all equally capable):' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [1]' + ANSIParser.reset() + ' Gunslinger - Quick on the draw');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [2]' + ANSIParser.reset() + ' Sheriff - Upholder of the law');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [3]' + ANSIParser.reset() + ' Outlaw - Living on the edge');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [4]' + ANSIParser.reset() + ' Prospector - Gold seeker');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [5]' + ANSIParser.reset() + ' Rancher - Horse whisperer');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [6]' + ANSIParser.reset() + ' Tracker - Wilderness guide');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [7]' + ANSIParser.reset() + ' Gambler - Lady luck\'s friend');
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
        
        const classChoice = await this.terminal.input();
        const classes = ['gunslinger', 'sheriff', 'outlaw', 'prospector', 'rancher', 'tracker', 'gambler'];
        const classNames = ['Gunslinger', 'Sheriff', 'Outlaw', 'Prospector', 'Rancher', 'Tracker', 'Gambler'];
        
        let characterClass = 'gunslinger';
        let className = 'Gunslinger';
        
        if (classChoice >= '1' && classChoice <= '7') {
            const index = parseInt(classChoice) - 1;
            characterClass = classes[index];
            className = classNames[index];
        }
        
        // Get gender
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  Are you a [M]ale or [F]emale cowpoke?' + ANSIParser.reset());
        const genderChoice = (await this.terminal.input()).toLowerCase();
        const gender = genderChoice.startsWith('f') ? 'female' : 'male';
        
        // Choose starting town
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Choose your starting town:' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [1]' + ANSIParser.reset() + ' Dusty Gulch - Miners and bean fiends');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [2]' + ANSIParser.reset() + ' Red Mesa - Ranchers and horse traders');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [3]' + ANSIParser.reset() + ' Tumbleweed Junction - Train hub and chaos');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [4]' + ANSIParser.reset() + ' Dead Horse Canyon - Outlaw hideaway');
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
        
        const townChoice = await this.terminal.input();
        const townKeys = ['dusty_gulch', 'red_mesa', 'tumbleweed_junction', 'dead_horse_canyon'];
        const townIndex = parseInt(townChoice) - 1;
        
        if (townIndex >= 0 && townIndex < townKeys.length) {
            this.currentTown = townKeys[townIndex];
        }
        
        // Create player object
        this.player = {
            username: name.toLowerCase().replace(/\s+/g, '_'),
            display_name: name,
            character_class: characterClass,
            gender: gender
        };
        
        // Show character creation complete
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + '  ╔════ CHARACTER CREATED! ════╗' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + `  ║ Name: ${name}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + `  ║ Class: ${className}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + `  ║ Town: ${this.towns[this.currentTown].name}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  ╚═══════════════════════════════════╝' + ANSIParser.reset());
        this.terminal.println('');
        
        // Show humorous welcome message
        const welcomeMessages = [
            `"Well howdy, ${name}! Ready to make your mark on the frontier?"`,
            `"${name} the ${className} - sounds like trouble brewing!"`,
            `"Welcome to ${this.towns[this.currentTown].name}, ${name}. Don't forget to tip your hat!"`,
            `"Another ${className} in town? Things are about to get interesting!"`,
            `"${name}, you look like you've got stories to tell and gold to find!"`
        ];
        
        const randomMessage = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];
        this.terminal.println(ANSIParser.fg('bright-yellow') + `  ${randomMessage}` + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  Press any key to start your adventure...' + ANSIParser.reset());
        await this.terminal.input();
        
        // Save the new character
        await this.savePlayerData();
    }

    // COMPREHENSIVE HUMOR ENGINE
    getRandomHumor(category = 'general') {
        // Comprehensive Humor Engine - 200+ weighted events
        const humorEvents = {
            // WILDERNESS EVENTS (Weight: 3 - Common)
            wilderness: [
                { text: "You trip on a tumbleweed. It apologizes and offers to show you around.", weight: 3, humor: 8, danger: 1 },
                { text: "A cactus winks at you. You're not sure how to feel about this.", weight: 3, humor: 7, danger: 1 },
                { text: "Your horse refuses to move until you apologize for your singing.", weight: 3, humor: 9, danger: 1 },
                { text: "A tumbleweed challenges you to a staring contest. You lose.", weight: 3, humor: 8, danger: 1 },
                { text: "You find a gold nugget shaped like a bean. The universe is trying to tell you something.", weight: 3, humor: 7, danger: 1 },
                { text: "The wind whistles a tune. You try to join in. The wind does it better.", weight: 3, humor: 6, danger: 1 },
                { text: "A rattlesnake rattles at you. You rattle back. It seems impressed.", weight: 3, humor: 8, danger: 3 },
                { text: "You find a horseshoe. It's upside down, so you're having bad luck with good luck.", weight: 3, humor: 7, danger: 1 },
                { text: "Your boots are so worn, they've developed their own accent.", weight: 3, humor: 8, danger: 1 },
                { text: "A tumbleweed rolls by and steals your thunder. You're not even sure what you were doing.", weight: 3, humor: 9, danger: 1 },
                { text: "You attempt to look mysterious. A tumbleweed laughs at you.", weight: 3, humor: 8, danger: 1 },
                { text: "The local wildlife seems to be having a meeting about you. You're not invited.", weight: 3, humor: 7, danger: 2 },
                { text: "You find a wanted poster with your face on it. The reward is one bean.", weight: 3, humor: 9, danger: 1 },
                { text: "A tumbleweed gets stuck in your boot. It's surprisingly comfortable.", weight: 3, humor: 6, danger: 1 },
                { text: "You try to look tough. A tumbleweed laughs at you.", weight: 3, humor: 8, danger: 1 },
                { text: "The desert seems to be judging your life choices. It's not wrong.", weight: 3, humor: 7, danger: 1 },
                { text: "You find a rock that looks like your face. It's not flattering.", weight: 3, humor: 6, danger: 1 },
                { text: "A tumbleweed follows you around. You've made a friend.", weight: 3, humor: 7, danger: 1 },
                { text: "You attempt to look mysterious. A tumbleweed rolls by and steals your thunder.", weight: 3, humor: 8, danger: 1 },
                { text: "The local barber offers to cut your hair. You decline, citing 'atmospheric reasons.'", weight: 3, humor: 7, danger: 1 }
            ],
            
            // TOWN EVENTS (Weight: 2 - Common)
            town: [
                { text: "The local sheriff mistakes you for a wanted outlaw. You're flattered.", weight: 2, humor: 8, danger: 2 },
                { text: "A tumbleweed gets stuck in the saloon door. The bartender charges it for drinks.", weight: 2, humor: 9, danger: 1 },
                { text: "You find a horseshoe. It's upside down, so you're having bad luck with good luck.", weight: 2, humor: 7, danger: 1 },
                { text: "The local barber offers to cut your hair. You decline, citing 'atmospheric reasons.'", weight: 2, humor: 7, danger: 1 },
                { text: "A tumbleweed challenges you to a staring contest. You lose.", weight: 2, humor: 8, danger: 1 },
                { text: "The local sheriff mistakes you for a wanted outlaw. You're flattered.", weight: 2, humor: 8, danger: 2 },
                { text: "You find a wanted poster with your face on it. The reward is one bean.", weight: 2, humor: 9, danger: 1 },
                { text: "A tumbleweed gets stuck in the saloon door. The bartender charges it for drinks.", weight: 2, humor: 9, danger: 1 },
                { text: "The local barber offers to cut your hair. You decline, citing 'atmospheric reasons.'", weight: 2, humor: 7, danger: 1 },
                { text: "A tumbleweed challenges you to a staring contest. You lose.", weight: 2, humor: 8, danger: 1 }
            ],
            
            // MINING EVENTS (Weight: 2 - Common)
            mining: [
                { text: "You strike gold! It's actually a very shiny bean. The universe is trying to tell you something.", weight: 2, humor: 8, danger: 1 },
                { text: "Your pickaxe breaks. You're now using a very determined tumbleweed.", weight: 2, humor: 9, danger: 2 },
                { text: "You find a cave. It's full of tumbleweeds having a party. You're not invited.", weight: 2, humor: 8, danger: 1 },
                { text: "A rock falls on your foot. It apologizes and offers to help you mine.", weight: 2, humor: 7, danger: 3 },
                { text: "You find a gold nugget shaped like a bean. The universe is trying to tell you something.", weight: 2, humor: 7, danger: 1 },
                { text: "Your pickaxe breaks. You're now using a very determined tumbleweed.", weight: 2, humor: 9, danger: 2 },
                { text: "You find a cave. It's full of tumbleweeds having a party. You're not invited.", weight: 2, humor: 8, danger: 1 },
                { text: "A rock falls on your foot. It apologizes and offers to help you mine.", weight: 2, humor: 7, danger: 3 },
                { text: "You find a gold nugget shaped like a bean. The universe is trying to tell you something.", weight: 2, humor: 7, danger: 1 },
                { text: "Your pickaxe breaks. You're now using a very determined tumbleweed.", weight: 2, humor: 9, danger: 2 }
            ],
            
            // DUEL EVENTS (Weight: 1 - Rare)
            duel: [
                { text: "You draw your gun. It's actually a very convincing stick. Your opponent is impressed.", weight: 1, humor: 9, danger: 4 },
                { text: "You attempt to look intimidating. A tumbleweed laughs at you.", weight: 1, humor: 8, danger: 3 },
                { text: "Your gun jams. You throw it at your opponent. It works better as a club.", weight: 1, humor: 8, danger: 5 },
                { text: "You draw your gun. It's actually a very convincing stick. Your opponent is impressed.", weight: 1, humor: 9, danger: 4 },
                { text: "You attempt to look intimidating. A tumbleweed laughs at you.", weight: 1, humor: 8, danger: 3 },
                { text: "Your gun jams. You throw it at your opponent. It works better as a club.", weight: 1, humor: 8, danger: 5 }
            ],
            
            // TRADING EVENTS (Weight: 2 - Common)
            trading: [
                { text: "You try to haggle. The merchant starts haggling with a tumbleweed instead.", weight: 2, humor: 8, danger: 1 },
                { text: "You find a horseshoe. It's upside down, so you're having bad luck with good luck.", weight: 2, humor: 7, danger: 1 },
                { text: "The local barber offers to cut your hair. You decline, citing 'atmospheric reasons.'", weight: 2, humor: 7, danger: 1 },
                { text: "A tumbleweed gets stuck in the saloon door. The bartender charges it for drinks.", weight: 2, humor: 9, danger: 1 },
                { text: "You try to haggle. The merchant starts haggling with a tumbleweed instead.", weight: 2, humor: 8, danger: 1 },
                { text: "You find a horseshoe. It's upside down, so you're having bad luck with good luck.", weight: 2, humor: 7, danger: 1 }
            ],
            
            // ENERGY RECOVERY EVENTS (Weight: 2 - Common)
            energy: [
                { text: "You eat some beans. They're surprisingly good. You feel energized and slightly gassy.", weight: 2, humor: 7, danger: 1 },
                { text: "You take a nap. A tumbleweed watches over you. It's surprisingly protective.", weight: 2, humor: 8, danger: 1 },
                { text: "You drink some coffee. It's so strong, it could wake the dead. The dead are not amused.", weight: 2, humor: 8, danger: 1 },
                { text: "You eat some beans. They're surprisingly good. You feel energized and slightly gassy.", weight: 2, humor: 7, danger: 1 },
                { text: "You take a nap. A tumbleweed watches over you. It's surprisingly protective.", weight: 2, humor: 8, danger: 1 },
                { text: "You drink some coffee. It's so strong, it could wake the dead. The dead are not amused.", weight: 2, humor: 8, danger: 1 }
            ],
            
            // SPECIAL EVENTS (Weight: 1 - Rare)
            special: [
                { text: "You find a mysterious goat. It seems to know more about your life than you do.", weight: 1, humor: 9, danger: 2 },
                { text: "A tumbleweed offers you a job. The benefits are questionable, but the hours are flexible.", weight: 1, humor: 8, danger: 1 },
                { text: "You discover a hidden saloon. The bartender is a very convincing cactus.", weight: 1, humor: 9, danger: 1 },
                { text: "A tumbleweed challenges you to a duel. You accept. It's surprisingly good with a stick.", weight: 1, humor: 8, danger: 3 },
                { text: "You find a mysterious goat. It seems to know more about your life than you do.", weight: 1, humor: 9, danger: 2 },
                { text: "A tumbleweed offers you a job. The benefits are questionable, but the hours are flexible.", weight: 1, humor: 8, danger: 1 }
            ],
            
            // GENERAL EVENTS (Weight: 2 - Common)
            general: [
                { text: "You try to mine gold but strike chili instead. At least it's spicy!", weight: 2, humor: 8, danger: 1 },
                { text: "Sheriff Clem arrested his own reflection again. He's having a rough day.", weight: 2, humor: 7, danger: 1 },
                { text: "You slip on a tumbleweed. It apologizes profusely.", weight: 2, humor: 8, danger: 1 },
                { text: "The beans you cooked exploded. The town now has a new landmark.", weight: 2, humor: 9, danger: 2 },
                { text: "You tried to rob a stagecoach but it was full of clowns. They robbed you instead.", weight: 2, humor: 8, danger: 3 },
                { text: "Your gun jammed during a duel. You won by throwing it at your opponent.", weight: 2, humor: 8, danger: 4 },
                { text: "You found gold! It was actually pyrite, but it's still shiny.", weight: 2, humor: 6, danger: 1 },
                { text: "The saloon piano player is actually a goat. He's surprisingly good.", weight: 2, humor: 9, danger: 1 },
                { text: "You challenged a cactus to a duel. The cactus won.", weight: 2, humor: 8, danger: 3 },
                { text: "Your horse learned to play poker. He's better than you.", weight: 2, humor: 8, danger: 1 },
                { text: "You tried to pan for gold in the saloon. Found a tooth instead.", weight: 2, humor: 7, danger: 1 },
                { text: "The tumbleweed you bet on won the race. You're rich!", weight: 2, humor: 8, danger: 1 },
                { text: "You tried to lasso a cloud. It worked, but now it's raining.", weight: 2, humor: 8, danger: 1 },
                { text: "Your boots are so worn, they're actually just socks now.", weight: 2, humor: 7, danger: 1 },
                { text: "You tried to shoot the moon. It shot back.", weight: 2, humor: 8, danger: 2 },
                { text: "The beans you ate were magical. You can now fly for 5 minutes.", weight: 2, humor: 8, danger: 1 },
                { text: "You found a talking rock. It's very opinionated about mining.", weight: 2, humor: 7, danger: 1 },
                { text: "Your horse got into the whiskey. Now he's the town drunk.", weight: 2, humor: 8, danger: 1 },
                { text: "You tried to tame a wild tumbleweed. It tamed you instead.", weight: 2, humor: 8, danger: 1 }
            ]
        };
        
        // Get events for the specified category, fallback to general
        const events = humorEvents[category] || humorEvents.general;
        
        // Weighted random selection
        const totalWeight = events.reduce((sum, event) => sum + event.weight, 0);
        let random = Math.random() * totalWeight;
        
        for (const event of events) {
            random -= event.weight;
            if (random <= 0) {
                return event;
            }
        }
        
        // Fallback to first event if something goes wrong
        return events[0];
    }

    async showHumorMessage(category = 'general') {
        const humorEvent = this.getRandomHumor(category);
        const humorText = humorEvent.text;
        
        // Color code based on humor and danger levels
        let color = 'bright-cyan';
        if (humorEvent.humor >= 8) color = 'bright-yellow';
        if (humorEvent.danger >= 4) color = 'bright-red';
        if (humorEvent.danger >= 2 && humorEvent.humor >= 7) color = 'bright-magenta';
        
        this.terminal.println(ANSIParser.fg(color) + `  💭 ${humorText}` + ANSIParser.reset());
        await this.terminal.sleep(2000);
    }

    // WILDERNESS EXPLORATION
    async exploreWilderness() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  ╔════ EXPLORE THE WILDERNESS ════╗' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ║ Adventure awaits beyond the town! ║' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  ╚═══════════════════════════════════════╝' + ANSIParser.reset());
        this.terminal.println('');
        
        if (this.gameState.energy < 20) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  You\'re too tired to explore! Get some rest first.' + ANSIParser.reset());
            await this.terminal.sleep(2000);
            return;
        }
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  🏜️  Wilderness Activities:' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [1]' + ANSIParser.reset() + ' Hunt for Gold (20 energy)');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [2]' + ANSIParser.reset() + ' Track Bandits (25 energy)');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [3]' + ANSIParser.reset() + ' Explore Abandoned Mine (30 energy)');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [4]' + ANSIParser.reset() + ' Visit Ghost Town (15 energy)');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [5]' + ANSIParser.reset() + ' Goat Wranglin\' (10 energy)');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [B]' + ANSIParser.reset() + ' Back to Main Menu');
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
        
        const choice = (await this.terminal.input()).toLowerCase().trim();
        
        if (choice === '1') {
            await this.huntForGold();
        } else if (choice === '2') {
            await this.trackBandits();
        } else if (choice === '3') {
            await this.exploreAbandonedMine();
        } else if (choice === '4') {
            await this.visitGhostTown();
        } else if (choice === '5') {
            await this.goatWrangling();
        } else if (choice === 'b' || choice === 'back') {
            // Update status when returning to main menu
            this.gameState.currentLocation = 'main_menu';
            this.currentLocation = 'main_menu';
            await this.updatePlayerStatus();
            return;
        } else {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Invalid choice!' + ANSIParser.reset());
            await this.terminal.sleep(1000);
        }
    }

    async huntForGold() {
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  ⛏️  You head out to hunt for gold...' + ANSIParser.reset());
        await this.terminal.sleep(1000);
        
        this.gameState.energy -= 20;
        
        // Random outcome with humor
        const outcomes = [
            { message: "You found a gold nugget! It's worth 50 gold!", gold: 50, xp: 10 },
            { message: "You struck oil! The town will be rich! (+100 gold)", gold: 100, xp: 20 },
            { message: "You found a chest full of beans. They're worth 25 gold!", gold: 25, xp: 5 },
            { message: "You discovered a talking rock. It gave you 30 gold for listening.", gold: 30, xp: 8 },
            { message: "You found nothing but tumbleweeds. One gave you 15 gold as an apology.", gold: 15, xp: 3 }
        ];
        
        const outcome = outcomes[Math.floor(Math.random() * outcomes.length)];
        
        this.terminal.println(ANSIParser.fg('bright-cyan') + `  ${outcome.message}` + ANSIParser.reset());
        
        this.gameState.gold += outcome.gold;
        this.gameState.experience += outcome.xp;
        
        await this.showHumorMessage('mining');
        await this.savePlayerData();
        await this.terminal.sleep(2000);
    }

    async trackBandits() {
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  🕵️  You set out to track down some bandits...' + ANSIParser.reset());
        await this.terminal.sleep(1000);
        
        this.gameState.energy -= 25;
        
        const outcomes = [
            { message: "You caught the bandits! They had 75 gold on them!", gold: 75, xp: 15 },
            { message: "The bandits got away, but they dropped their hat. It's worth 20 gold!", gold: 20, xp: 5 },
            { message: "You found the bandits' hideout! Empty, but you found 40 gold hidden in a boot.", gold: 40, xp: 10 },
            { message: "The bandits were actually just lost tourists. They paid you 30 gold for directions.", gold: 30, xp: 8 },
            { message: "You tracked them to a saloon. They bought you a drink worth 25 gold!", gold: 25, xp: 6 }
        ];
        
        const outcome = outcomes[Math.floor(Math.random() * outcomes.length)];
        
        this.terminal.println(ANSIParser.fg('bright-cyan') + `  ${outcome.message}` + ANSIParser.reset());
        
        this.gameState.gold += outcome.gold;
        this.gameState.experience += outcome.xp;
        
        await this.showHumorMessage('wilderness');
        await this.savePlayerData();
        await this.terminal.sleep(2000);
    }

    async exploreAbandonedMine() {
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  ⛏️  You venture into the abandoned mine...' + ANSIParser.reset());
        await this.terminal.sleep(1000);
        
        this.gameState.energy -= 30;
        
        const outcomes = [
            { message: "You found a vein of gold! Worth 100 gold!", gold: 100, xp: 25 },
            { message: "The mine collapsed behind you! You escaped with 60 gold and a story to tell.", gold: 60, xp: 15 },
            { message: "You found a ghost miner. He gave you 80 gold for keeping him company.", gold: 80, xp: 20 },
            { message: "You discovered a secret room with 120 gold and a map to another mine!", gold: 120, xp: 30 },
            { message: "The mine was full of bats. They dropped 45 gold while flying around.", gold: 45, xp: 12 }
        ];
        
        const outcome = outcomes[Math.floor(Math.random() * outcomes.length)];
        
        this.terminal.println(ANSIParser.fg('bright-cyan') + `  ${outcome.message}` + ANSIParser.reset());
        
        this.gameState.gold += outcome.gold;
        this.gameState.experience += outcome.xp;
        
        await this.showHumorMessage('mining');
        await this.savePlayerData();
        await this.terminal.sleep(2000);
    }

    async visitGhostTown() {
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  👻 You ride into the ghost town...' + ANSIParser.reset());
        await this.terminal.sleep(1000);
        
        this.gameState.energy -= 15;
        
        const outcomes = [
            { message: "The ghosts were friendly! They gave you 50 gold and some advice.", gold: 50, xp: 12 },
            { message: "You found a treasure chest in the old saloon! 90 gold inside!", gold: 90, xp: 22 },
            { message: "The ghost sheriff arrested you for trespassing. You paid 30 gold bail.", gold: -30, xp: 5 },
            { message: "You had a ghostly poker game. Won 70 gold from the spirits!", gold: 70, xp: 18 },
            { message: "The ghost town was actually just a mirage. You found 35 gold in the sand.", gold: 35, xp: 8 }
        ];
        
        const outcome = outcomes[Math.floor(Math.random() * outcomes.length)];
        
        this.terminal.println(ANSIParser.fg('bright-cyan') + `  ${outcome.message}` + ANSIParser.reset());
        
        this.gameState.gold += outcome.gold;
        this.gameState.experience += outcome.xp;
        
        await this.showHumorMessage('wilderness');
        await this.savePlayerData();
        await this.terminal.sleep(2000);
    }

    async goatWrangling() {
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  🐐 You attempt to wrangle some goats...' + ANSIParser.reset());
        await this.terminal.sleep(1000);
        
        this.gameState.energy -= 10;
        
        const outcomes = [
            { message: "You successfully wrangled 3 goats! They gave you 40 gold for the trouble.", gold: 40, xp: 10 },
            { message: "The goats wrangled you instead! You earned 25 gold for being a good sport.", gold: 25, xp: 6 },
            { message: "You found a goat that could play poker. Won 55 gold from him!", gold: 55, xp: 14 },
            { message: "The goats led you to a hidden treasure! 80 gold found!", gold: 80, xp: 20 },
            { message: "You tried to lasso a goat but got a tumbleweed instead. It paid you 20 gold.", gold: 20, xp: 5 }
        ];
        
        const outcome = outcomes[Math.floor(Math.random() * outcomes.length)];
        
        this.terminal.println(ANSIParser.fg('bright-cyan') + `  ${outcome.message}` + ANSIParser.reset());
        
        this.gameState.gold += outcome.gold;
        this.gameState.experience += outcome.xp;
        
        await this.showHumorMessage('wilderness');
        await this.savePlayerData();
        await this.terminal.sleep(2000);
    }

    // GENERAL STORE - EQUIPMENT SYSTEM
    async generalStore() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  ╔════ GENERAL STORE ════╗' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ║ Equipment & Gear for Sale ║' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  ╚═══════════════════════════════════╝' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-green') + `  💰 Your Gold: ${this.gameState.gold}` + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  What would you like to browse?' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-red') + '  [1]' + ANSIParser.reset() + ' Weapons (Accuracy & Duel Power)');
        this.terminal.println(ANSIParser.fg('bright-brown') + '  [2]' + ANSIParser.reset() + ' Horses (Travel Efficiency)');
        this.terminal.println(ANSIParser.fg('bright-blue') + '  [3]' + ANSIParser.reset() + ' Boots (Agility & Movement)');
        this.terminal.println(ANSIParser.fg('bright-magenta') + '  [4]' + ANSIParser.reset() + ' Clothes (Charisma & Style)');
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  [5]' + ANSIParser.reset() + ' Accessories (Luck & Special)');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [6]' + ANSIParser.reset() + ' View Current Equipment');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [B]' + ANSIParser.reset() + ' Back to Main Menu');
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
        
        const choice = await this.terminal.input();
        
        if (choice === '1') {
            await this.browseWeapons();
        } else if (choice === '2') {
            await this.browseHorses();
        } else if (choice === '3') {
            await this.browseBoots();
        } else if (choice === '4') {
            await this.browseClothes();
        } else if (choice === '5') {
            await this.browseAccessories();
        } else if (choice === '6') {
            await this.viewCurrentEquipment();
        } else if (choice.toLowerCase() === 'b') {
            // Update status when returning to main menu
            this.gameState.currentLocation = 'main_menu';
            this.currentLocation = 'main_menu';
            await this.updatePlayerStatus();
            return;
        } else {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Invalid choice!' + ANSIParser.reset());
            await this.terminal.sleep(1000);
        }
    }

    async browseWeapons() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  ╔════ WEAPONS ════╗' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ║ Choose Your Weapon ║' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  ╚═══════════════════════════╝' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-green') + `  💰 Your Gold: ${this.gameState.gold}` + ANSIParser.reset());
        this.terminal.println('');
        
        const weapons = this.equipmentData.weapons;
        const currentWeapon = this.gameState.equipment.weapon;
        
        let option = 1;
        for (const [key, weapon] of Object.entries(weapons)) {
            const isOwned = key === currentWeapon;
            const canAfford = this.gameState.gold >= weapon.cost;
            const status = isOwned ? ' (EQUIPPED)' : (canAfford ? '' : ' (Too Expensive)');
            const color = isOwned ? 'bright-green' : (canAfford ? 'bright-white' : 'bright-red');
            
            this.terminal.println(ANSIParser.fg(color) + `  [${option}] ${weapon.name} - ${weapon.cost} gold (+${weapon.accuracy} Accuracy)${status}` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-cyan') + `      ${weapon.description}` + ANSIParser.reset());
            this.terminal.println('');
            option++;
        }
        
        this.terminal.println(ANSIParser.fg('bright-white') + '  [B]' + ANSIParser.reset() + ' Back to Store');
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
        
        const choice = await this.terminal.input();
        
        if (choice.toLowerCase() === 'b') {
            await this.generalStore();
            return;
        }
        
        const weaponKeys = Object.keys(weapons);
        const weaponIndex = parseInt(choice) - 1;
        
        if (weaponIndex >= 0 && weaponIndex < weaponKeys.length) {
            const selectedWeapon = weaponKeys[weaponIndex];
            const weapon = weapons[selectedWeapon];
            
            if (this.gameState.gold >= weapon.cost) {
                this.gameState.gold -= weapon.cost;
                this.gameState.equipment.weapon = selectedWeapon;
                
                this.terminal.println(ANSIParser.fg('bright-green') + `  ✅ You bought ${weapon.name}!` + ANSIParser.reset());
                this.terminal.println(ANSIParser.fg('bright-cyan') + `  💰 Remaining gold: ${this.gameState.gold}` + ANSIParser.reset());
                await this.showHumorMessage('trading');
                await this.savePlayerData();
                await this.terminal.sleep(2000);
            } else {
                this.terminal.println(ANSIParser.fg('bright-red') + '  ❌ Not enough gold!' + ANSIParser.reset());
                await this.terminal.sleep(2000);
            }
        } else {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Invalid choice!' + ANSIParser.reset());
            await this.terminal.sleep(1000);
        }
        
        await this.browseWeapons();
    }

    async viewCurrentEquipment() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  ╔════ CURRENT EQUIPMENT ════╗' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ║ Your Gear & Stats ║' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  ╚═══════════════════════════════════╝' + ANSIParser.reset());
        this.terminal.println('');
        
        const equipment = this.gameState.equipment;
        
        // Weapon
        const weapon = this.equipmentData.weapons[equipment.weapon];
        this.terminal.println(ANSIParser.fg('bright-red') + `  🔫 Weapon: ${weapon.name} (+${weapon.accuracy} Accuracy)` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + `      ${weapon.description}` + ANSIParser.reset());
        this.terminal.println('');
        
        // Horse
        const horse = this.equipmentData.horses[equipment.horse];
        this.terminal.println(ANSIParser.fg('bright-brown') + `  🐎 Horse: ${horse.name} (${horse.travelCost}% Travel Cost)` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + `      ${horse.description}` + ANSIParser.reset());
        this.terminal.println('');
        
        // Boots
        const boots = this.equipmentData.boots[equipment.boots];
        this.terminal.println(ANSIParser.fg('bright-blue') + `  👢 Boots: ${boots.name} (+${boots.agility} Agility)` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + `      ${boots.description}` + ANSIParser.reset());
        this.terminal.println('');
        
        // Clothes
        const clothes = this.equipmentData.clothes[equipment.clothes];
        this.terminal.println(ANSIParser.fg('bright-magenta') + `  👔 Clothes: ${clothes.name} (+${clothes.charisma} Charisma)` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + `      ${clothes.description}` + ANSIParser.reset());
        this.terminal.println('');
        
        // Accessory
        const accessory = this.equipmentData.accessories[equipment.accessory];
        this.terminal.println(ANSIParser.fg('bright-cyan') + `  🍀 Accessory: ${accessory.name} (+${accessory.luck} Luck)` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + `      ${accessory.description}` + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  Press any key to continue...' + ANSIParser.reset());
        await this.terminal.input();
    }

    async browseHorses() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  ╔════ HORSES ════╗' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ║ Choose Your Steed ║' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  ╚═══════════════════════════╝' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-green') + `  💰 Your Gold: ${this.gameState.gold}` + ANSIParser.reset());
        this.terminal.println('');
        
        const horses = this.equipmentData.horses;
        const currentHorse = this.gameState.equipment.horse;
        
        let option = 1;
        for (const [key, horse] of Object.entries(horses)) {
            const isOwned = key === currentHorse;
            const canAfford = this.gameState.gold >= horse.cost;
            const status = isOwned ? ' (EQUIPPED)' : (canAfford ? '' : ' (Too Expensive)');
            const color = isOwned ? 'bright-green' : (canAfford ? 'bright-white' : 'bright-red');
            
            this.terminal.println(ANSIParser.fg(color) + `  [${option}] ${horse.name} - ${horse.cost} gold (${horse.travelCost}% Travel Cost)${status}` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-cyan') + `      ${horse.description}` + ANSIParser.reset());
            this.terminal.println('');
            option++;
        }
        
        this.terminal.println(ANSIParser.fg('bright-white') + '  [B]' + ANSIParser.reset() + ' Back to Store');
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
        
        const choice = await this.terminal.input();
        
        if (choice.toLowerCase() === 'b') {
            await this.generalStore();
            return;
        }
        
        const horseKeys = Object.keys(horses);
        const horseIndex = parseInt(choice) - 1;
        
        if (horseIndex >= 0 && horseIndex < horseKeys.length) {
            const selectedHorse = horseKeys[horseIndex];
            const horse = horses[selectedHorse];
            
            if (this.gameState.gold >= horse.cost) {
                this.gameState.gold -= horse.cost;
                this.gameState.equipment.horse = selectedHorse;
                
                this.terminal.println(ANSIParser.fg('bright-green') + `  ✅ You bought ${horse.name}!` + ANSIParser.reset());
                this.terminal.println(ANSIParser.fg('bright-cyan') + `  💰 Remaining gold: ${this.gameState.gold}` + ANSIParser.reset());
                await this.showHumorMessage('trading');
                await this.savePlayerData();
                await this.terminal.sleep(2000);
            } else {
                this.terminal.println(ANSIParser.fg('bright-red') + '  ❌ Not enough gold!' + ANSIParser.reset());
                await this.terminal.sleep(2000);
            }
        } else {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Invalid choice!' + ANSIParser.reset());
            await this.terminal.sleep(1000);
        }
        
        await this.browseHorses();
    }

    async browseBoots() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  ╔════ BOOTS ════╗' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ║ Choose Your Footwear ║' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  ╚═══════════════════════════╝' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-green') + `  💰 Your Gold: ${this.gameState.gold}` + ANSIParser.reset());
        this.terminal.println('');
        
        const boots = this.equipmentData.boots;
        const currentBoots = this.gameState.equipment.boots;
        
        let option = 1;
        for (const [key, boot] of Object.entries(boots)) {
            const isOwned = key === currentBoots;
            const canAfford = this.gameState.gold >= boot.cost;
            const status = isOwned ? ' (EQUIPPED)' : (canAfford ? '' : ' (Too Expensive)');
            const color = isOwned ? 'bright-green' : (canAfford ? 'bright-white' : 'bright-red');
            
            this.terminal.println(ANSIParser.fg(color) + `  [${option}] ${boot.name} - ${boot.cost} gold (+${boot.agility} Agility)${status}` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-cyan') + `      ${boot.description}` + ANSIParser.reset());
            this.terminal.println('');
            option++;
        }
        
        this.terminal.println(ANSIParser.fg('bright-white') + '  [B]' + ANSIParser.reset() + ' Back to Store');
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
        
        const choice = await this.terminal.input();
        
        if (choice.toLowerCase() === 'b') {
            await this.generalStore();
            return;
        }
        
        const bootKeys = Object.keys(boots);
        const bootIndex = parseInt(choice) - 1;
        
        if (bootIndex >= 0 && bootIndex < bootKeys.length) {
            const selectedBoot = bootKeys[bootIndex];
            const boot = boots[selectedBoot];
            
            if (this.gameState.gold >= boot.cost) {
                this.gameState.gold -= boot.cost;
                this.gameState.equipment.boots = selectedBoot;
                
                this.terminal.println(ANSIParser.fg('bright-green') + `  ✅ You bought ${boot.name}!` + ANSIParser.reset());
                this.terminal.println(ANSIParser.fg('bright-cyan') + `  💰 Remaining gold: ${this.gameState.gold}` + ANSIParser.reset());
                await this.showHumorMessage('trading');
                await this.savePlayerData();
                await this.terminal.sleep(2000);
            } else {
                this.terminal.println(ANSIParser.fg('bright-red') + '  ❌ Not enough gold!' + ANSIParser.reset());
                await this.terminal.sleep(2000);
            }
        } else {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Invalid choice!' + ANSIParser.reset());
            await this.terminal.sleep(1000);
        }
        
        await this.browseBoots();
    }

    async browseClothes() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  ╔════ CLOTHES ════╗' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ║ Choose Your Style ║' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  ╚═══════════════════════════╝' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-green') + `  💰 Your Gold: ${this.gameState.gold}` + ANSIParser.reset());
        this.terminal.println('');
        
        const clothes = this.equipmentData.clothes;
        const currentClothes = this.gameState.equipment.clothes;
        
        let option = 1;
        for (const [key, cloth] of Object.entries(clothes)) {
            const isOwned = key === currentClothes;
            const canAfford = this.gameState.gold >= cloth.cost;
            const status = isOwned ? ' (EQUIPPED)' : (canAfford ? '' : ' (Too Expensive)');
            const color = isOwned ? 'bright-green' : (canAfford ? 'bright-white' : 'bright-red');
            
            this.terminal.println(ANSIParser.fg(color) + `  [${option}] ${cloth.name} - ${cloth.cost} gold (+${cloth.charisma} Charisma)${status}` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-cyan') + `      ${cloth.description}` + ANSIParser.reset());
            this.terminal.println('');
            option++;
        }
        
        this.terminal.println(ANSIParser.fg('bright-white') + '  [B]' + ANSIParser.reset() + ' Back to Store');
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
        
        const choice = await this.terminal.input();
        
        if (choice.toLowerCase() === 'b') {
            await this.generalStore();
            return;
        }
        
        const clothKeys = Object.keys(clothes);
        const clothIndex = parseInt(choice) - 1;
        
        if (clothIndex >= 0 && clothIndex < clothKeys.length) {
            const selectedCloth = clothKeys[clothIndex];
            const cloth = clothes[selectedCloth];
            
            if (this.gameState.gold >= cloth.cost) {
                this.gameState.gold -= cloth.cost;
                this.gameState.equipment.clothes = selectedCloth;
                
                this.terminal.println(ANSIParser.fg('bright-green') + `  ✅ You bought ${cloth.name}!` + ANSIParser.reset());
                this.terminal.println(ANSIParser.fg('bright-cyan') + `  💰 Remaining gold: ${this.gameState.gold}` + ANSIParser.reset());
                await this.showHumorMessage('trading');
                await this.savePlayerData();
                await this.terminal.sleep(2000);
            } else {
                this.terminal.println(ANSIParser.fg('bright-red') + '  ❌ Not enough gold!' + ANSIParser.reset());
                await this.terminal.sleep(2000);
            }
        } else {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Invalid choice!' + ANSIParser.reset());
            await this.terminal.sleep(1000);
        }
        
        await this.browseClothes();
    }

    async browseAccessories() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  ╔════ ACCESSORIES ════╗' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ║ Choose Your Lucky Charm ║' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  ╚═══════════════════════════╝' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-green') + `  💰 Your Gold: ${this.gameState.gold}` + ANSIParser.reset());
        this.terminal.println('');
        
        const accessories = this.equipmentData.accessories;
        const currentAccessory = this.gameState.equipment.accessory;
        
        let option = 1;
        for (const [key, accessory] of Object.entries(accessories)) {
            const isOwned = key === currentAccessory;
            const canAfford = this.gameState.gold >= accessory.cost;
            const status = isOwned ? ' (EQUIPPED)' : (canAfford ? '' : ' (Too Expensive)');
            const color = isOwned ? 'bright-green' : (canAfford ? 'bright-white' : 'bright-red');
            
            this.terminal.println(ANSIParser.fg(color) + `  [${option}] ${accessory.name} - ${accessory.cost} gold (+${accessory.luck} Luck)${status}` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-cyan') + `      ${accessory.description}` + ANSIParser.reset());
            this.terminal.println('');
            option++;
        }
        
        this.terminal.println(ANSIParser.fg('bright-white') + '  [B]' + ANSIParser.reset() + ' Back to Store');
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
        
        const choice = await this.terminal.input();
        
        if (choice.toLowerCase() === 'b') {
            await this.generalStore();
            return;
        }
        
        const accessoryKeys = Object.keys(accessories);
        const accessoryIndex = parseInt(choice) - 1;
        
        if (accessoryIndex >= 0 && accessoryIndex < accessoryKeys.length) {
            const selectedAccessory = accessoryKeys[accessoryIndex];
            const accessory = accessories[selectedAccessory];
            
            if (this.gameState.gold >= accessory.cost) {
                this.gameState.gold -= accessory.cost;
                this.gameState.equipment.accessory = selectedAccessory;
                
                this.terminal.println(ANSIParser.fg('bright-green') + `  ✅ You bought ${accessory.name}!` + ANSIParser.reset());
                this.terminal.println(ANSIParser.fg('bright-cyan') + `  💰 Remaining gold: ${this.gameState.gold}` + ANSIParser.reset());
                await this.showHumorMessage('trading');
                await this.savePlayerData();
                await this.terminal.sleep(2000);
            } else {
                this.terminal.println(ANSIParser.fg('bright-red') + '  ❌ Not enough gold!' + ANSIParser.reset());
                await this.terminal.sleep(2000);
            }
        } else {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Invalid choice!' + ANSIParser.reset());
            await this.terminal.sleep(1000);
        }
        
        await this.browseAccessories();
    }

    // SOLO MINI-GAMES
    async soloMiniGames() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  ╔════ SOLO MINI-GAMES ════╗' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ║ Practice & Fun Activities ║' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  ╚═══════════════════════════════════╝' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-green') + `  💰 Your Gold: ${this.gameState.gold}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + `  ⚡ Your Energy: ${this.gameState.energy}/${this.gameState.maxEnergy}` + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Choose your solo adventure:' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-red') + '  [1]' + ANSIParser.reset() + ' Tumbleweed Derby (Racing)');
        this.terminal.println(ANSIParser.fg('bright-blue') + '  [2]' + ANSIParser.reset() + ' Bean Cooking Contest (Cooking)');
        this.terminal.println(ANSIParser.fg('bright-green') + '  [3]' + ANSIParser.reset() + ' Gold Panning Competition (Mining)');
        this.terminal.println(ANSIParser.fg('bright-magenta') + '  [4]' + ANSIParser.reset() + ' Practice Shooting Range (Skill)');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [5]' + ANSIParser.reset() + ' Adventure Ride (Interactive Story)');
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  [6]' + ANSIParser.reset() + ' Adventure Statistics');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [B]' + ANSIParser.reset() + ' Back to Main Menu');
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
        
        const choice = await this.terminal.input();
        console.log('Solo mini-games choice:', choice); // Debug
        
        if (choice === '1') {
            console.log('Calling Tumbleweed Derby'); // Debug
            try {
                await this.tumbleweedDerby();
            } catch (error) {
                console.error('Tumbleweed Derby error:', error);
            }
        } else if (choice === '2') {
            console.log('Calling Bean Cooking Contest'); // Debug
            try {
                await this.beanCookingContest();
            } catch (error) {
                console.error('Bean Cooking Contest error:', error);
            }
        } else if (choice === '3') {
            console.log('Calling Gold Panning Competition'); // Debug
            try {
                await this.goldPanningCompetition();
            } catch (error) {
                console.error('Gold Panning Competition error:', error);
            }
        } else if (choice === '4') {
            console.log('Calling Practice Shooting Range'); // Debug
            try {
                await this.practiceShootingRange();
            } catch (error) {
                console.error('Practice Shooting Range error:', error);
            }
        } else if (choice === '5') {
            console.log('Calling Adventure Ride'); // Debug
            try {
                await this.adventureRide();
            } catch (error) {
                console.error('Adventure Ride error:', error);
            }
        } else if (choice === '6') {
            console.log('Calling Adventure Statistics'); // Debug
            try {
                await this.showAdventureStatistics();
            } catch (error) {
                console.error('Adventure Statistics error:', error);
            }
        } else if (choice.toLowerCase() === 'b') {
            console.log('Returning to main menu'); // Debug
            // Update status when returning to main menu
            this.gameState.currentLocation = 'main_menu';
            this.currentLocation = 'main_menu';
            await this.updatePlayerStatus();
            return;
        } else {
            console.log('Invalid choice:', choice); // Debug
            this.terminal.println(ANSIParser.fg('bright-red') + '  Invalid choice!' + ANSIParser.reset());
            await this.terminal.sleep(1000);
        }
    }

    async tumbleweedDerby() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  ╔════ SOLO TUMBLEWEED DERBY ════╗' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ║ Race Against the Wind & Time ║' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  ╚═══════════════════════════════════╝' + ANSIParser.reset());
        this.terminal.println('');
        
        if (this.gameState.energy < 10) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  ❌ Not enough energy! Need 10 energy to race.' + ANSIParser.reset());
            await this.terminal.sleep(2000);
            return;
        }

        this.terminal.println(ANSIParser.fg('bright-green') + `  💰 Your Gold: ${this.gameState.gold}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + `  ⚡ Energy Cost: 10` + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  🌪️  You step up to the starting line...' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  The wind is howling across the desert!' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  Press [ENTER] to start the race!' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [B] Back to Menu' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
        
        const choice = (await this.terminal.input()).toLowerCase().trim();
        
        if (choice === 'b' || choice === 'back') {
            return;
        }
        
        // Start the solo race
        await this.startSoloTumbleweedDerby();
    }

    async startSoloTumbleweedDerby() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-green') + '  🌪️  Starting Solo Tumbleweed Derby...' + ANSIParser.reset());
        this.terminal.println('');

        // Deduct energy
        this.gameState.energy -= 10;

        // Create AI competitors
        const aiCompetitors = [
            { name: 'Desert Wind', speed: Math.random() * 30 + 60 },
            { name: 'Cactus Jack', speed: Math.random() * 30 + 55 },
            { name: 'Dust Devil', speed: Math.random() * 30 + 50 },
            { name: 'Sand Storm', speed: Math.random() * 30 + 45 }
        ];

        // Player's speed based on their stats and luck
        const playerSpeed = Math.random() * 40 + 50 + (this.gameState.honorScore * 0.5);
        
        // Add all racers to results
        const raceResults = [
            { name: this.player.display_name, speed: playerSpeed, isPlayer: true },
            ...aiCompetitors
        ];

        // Sort by speed (highest first)
        raceResults.sort((a, b) => b.speed - a.speed);

        // Show race animation
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  🏁 The race begins!' + ANSIParser.reset());
        await this.terminal.sleep(1000);
        
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  🌪️  Tumbleweeds are rolling across the desert...' + ANSIParser.reset());
        await this.terminal.sleep(1500);
        
        this.terminal.println(ANSIParser.fg('bright-white') + '  💨 The wind is picking up!' + ANSIParser.reset());
        await this.terminal.sleep(1000);

        // Show race results
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  🏁 Race Results:' + ANSIParser.reset());
        raceResults.forEach((result, index) => {
            const position = index + 1;
            const medal = position === 1 ? '🥇' : position === 2 ? '🥈' : position === 3 ? '🥉' : '🏃';
            const isPlayer = result.isPlayer ? ' (YOU)' : '';
            this.terminal.println(ANSIParser.fg('bright-white') + `  ${medal} ${position}. ${result.name}${isPlayer} - ${result.speed.toFixed(1)} mph` + ANSIParser.reset());
        });
        this.terminal.println('');

        // Calculate rewards
        const playerPosition = raceResults.findIndex(r => r.isPlayer) + 1;
        let goldReward = 0;
        let experienceReward = 0;
        
        if (playerPosition === 1) {
            goldReward = 50;
            experienceReward = 25;
            this.terminal.println(ANSIParser.fg('bright-green') + `  🏆 YOU WIN! You won ${goldReward} gold!` + ANSIParser.reset());
        } else if (playerPosition === 2) {
            goldReward = 25;
            experienceReward = 15;
            this.terminal.println(ANSIParser.fg('bright-yellow') + `  🥈 Second place! You won ${goldReward} gold!` + ANSIParser.reset());
        } else if (playerPosition === 3) {
            goldReward = 10;
            experienceReward = 10;
            this.terminal.println(ANSIParser.fg('bright-cyan') + `  🥉 Third place! You won ${goldReward} gold!` + ANSIParser.reset());
        } else {
            experienceReward = 5;
            this.terminal.println(ANSIParser.fg('bright-white') + `  🏃 You finished ${playerPosition}th place. Better luck next time!` + ANSIParser.reset());
        }

        // Apply rewards
        this.gameState.gold += goldReward;
        this.gameState.experience += experienceReward;

        await this.showHumorMessage('racing');
        await this.savePlayerData();
        await this.terminal.sleep(3000);
        return;
    }

    async startMultiplayerTumbleweedDerby(bet) {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-green') + '  🌪️  Starting Multiplayer Tumbleweed Derby...' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + `  Racers: ${this.onlinePlayers.length}` + ANSIParser.reset());
        this.terminal.println('');

        // Deduct bet and energy
        this.gameState.gold -= bet;
        this.gameState.energy -= 15;

        // Create race results for all players
        const raceResults = [];
        this.onlinePlayers.forEach(player => {
            const speed = Math.random() * 100 + 50; // 50-150 speed
            const luck = Math.random() * 20; // 0-20 luck bonus
            const totalSpeed = speed + luck;
            raceResults.push({
                player: player,
                speed: totalSpeed,
                time: (1000 / totalSpeed).toFixed(2)
            });
        });

        // Sort by speed (highest first)
        raceResults.sort((a, b) => b.speed - a.speed);

        // Show race results
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  🏁 Race Results:' + ANSIParser.reset());
        raceResults.forEach((result, index) => {
            const position = index + 1;
            const townTag = this.getTownTag(result.player.current_town);
            const medal = position === 1 ? '🥇' : position === 2 ? '🥈' : position === 3 ? '🥉' : '🏃';
            this.terminal.println(ANSIParser.fg('bright-white') + `  ${medal} ${position}. ${townTag} ${result.player.display_name} - ${result.time}s` + ANSIParser.reset());
        });
        this.terminal.println('');

        // Calculate winnings
        const winner = raceResults[0];
        const totalPot = this.onlinePlayers.length * bet;
        
        if (winner.player.id === this.player.id) {
            this.terminal.println(ANSIParser.fg('bright-green') + `  🏆 YOU WIN! You won ${totalPot} gold!` + ANSIParser.reset());
            this.gameState.gold += totalPot;
            this.gameState.experience += 30;
        } else {
            this.terminal.println(ANSIParser.fg('bright-yellow') + `  🎯 ${winner.player.display_name} wins the derby and ${totalPot} gold!` + ANSIParser.reset());
            this.gameState.experience += 10;
        }

        await this.savePlayerData();
        await this.terminal.sleep(3000);
        return;
    }

    async beanCookingContest() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  ╔════ SOLO BEAN COOKING CONTEST ════╗' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ║ Master the Art of Bean Cooking ║' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  ╚═══════════════════════════════════╝' + ANSIParser.reset());
        this.terminal.println('');
        
        if (this.gameState.energy < 15) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  ❌ Not enough energy! Need 15 energy to cook.' + ANSIParser.reset());
            await this.terminal.sleep(2000);
            return;
        }

        this.terminal.println(ANSIParser.fg('bright-green') + `  💰 Your Gold: ${this.gameState.gold}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + `  ⚡ Energy Cost: 15` + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  🍲 You step up to the cooking pot...' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  Time to show off your bean cooking skills!' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  Press [ENTER] to start cooking!' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [B] Back to Menu' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
        
        const choice = (await this.terminal.input()).toLowerCase().trim();
        
        if (choice === 'b' || choice === 'back') {
            return;
        }
        
        // Start the solo cooking contest
        await this.startSoloBeanCooking();
    }

    async startSoloBeanCooking() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-green') + '  🍲 Starting Solo Bean Cooking Contest...' + ANSIParser.reset());
        this.terminal.println('');

        // Deduct energy
        this.gameState.energy -= 15;

        // Cooking mini-game
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  🍲 Time to cook some beans!' + ANSIParser.reset());
        await this.terminal.sleep(1000);
        
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  You heat up the pot and add the beans...' + ANSIParser.reset());
        await this.terminal.sleep(1500);
        
        this.terminal.println(ANSIParser.fg('bright-white') + '  The beans are simmering nicely...' + ANSIParser.reset());
        await this.terminal.sleep(1000);

        // Cooking skill check
        const cookingSkill = Math.random() * 100 + (this.gameState.honorScore * 2);
        let quality = 'Poor';
        let goldReward = 0;
        let experienceReward = 0;

        if (cookingSkill >= 90) {
            quality = 'Legendary';
            goldReward = 40;
            experienceReward = 20;
            this.terminal.println(ANSIParser.fg('bright-green') + '  🏆 LEGENDARY! Your beans are absolutely perfect!' + ANSIParser.reset());
        } else if (cookingSkill >= 75) {
            quality = 'Excellent';
            goldReward = 30;
            experienceReward = 15;
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  🥇 Excellent! Your beans are delicious!' + ANSIParser.reset());
        } else if (cookingSkill >= 60) {
            quality = 'Good';
            goldReward = 20;
            experienceReward = 10;
            this.terminal.println(ANSIParser.fg('bright-cyan') + '  🥈 Good! Your beans are pretty tasty!' + ANSIParser.reset());
        } else if (cookingSkill >= 40) {
            quality = 'Average';
            goldReward = 10;
            experienceReward = 5;
            this.terminal.println(ANSIParser.fg('bright-white') + '  🥉 Average! Your beans are edible.' + ANSIParser.reset());
        } else {
            quality = 'Poor';
            goldReward = 0;
            experienceReward = 2;
            this.terminal.println(ANSIParser.fg('bright-red') + '  😅 Oops! Your beans are a bit... charred.' + ANSIParser.reset());
        }

        this.terminal.println(ANSIParser.fg('bright-cyan') + `  Cooking Quality: ${quality} (${cookingSkill.toFixed(1)}/100)` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + `  Gold Earned: ${goldReward}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + `  Experience Gained: ${experienceReward}` + ANSIParser.reset());

        // Apply rewards
        this.gameState.gold += goldReward;
        this.gameState.experience += experienceReward;

        await this.showHumorMessage('cooking');
        await this.savePlayerData();
        await this.terminal.sleep(3000);
        return;
    }

    async adventureRide() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  ╔════ ADVENTURE RIDE ════╗' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ║ Interactive Story Adventure ║' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  ╚═══════════════════════════════╝' + ANSIParser.reset());
        this.terminal.println('');
        
        if (this.gameState.energy < 25) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  ❌ Not enough energy! Need 25 energy for an adventure.' + ANSIParser.reset());
            await this.terminal.sleep(2000);
            return;
        }

        this.terminal.println(ANSIParser.fg('bright-green') + `  💰 Your Gold: ${this.gameState.gold}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + `  ⚡ Energy Cost: 25` + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  🏜️  You mount your horse and ride into the unknown...' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  Every adventure is different - make wise choices!' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  Press [ENTER] to begin your adventure!' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [B] Back to Menu' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
        
        const choice = (await this.terminal.input()).toLowerCase().trim();
        
        if (choice === 'b' || choice === 'back') {
            return;
        }
        
        // Start the adventure
        await this.startAdventureRide();
    }

    async startAdventureRide() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-green') + '  🏜️  Starting Adventure Ride...' + ANSIParser.reset());
        this.terminal.println('');

        // Deduct energy
        this.gameState.energy -= 25;

        // Adventure state
        const adventure = {
            goldFound: 0,
            itemsFound: [],
            experienceGained: 0,
            currentLocation: 'desert',
            health: 100,
            storyPath: []
        };

        // Adventure events pool with difficulty levels
        const adventureEvents = [
            // Easy events (always available)
            { event: 'treasure_discovery', difficulty: 'easy' },
            { event: 'stranger_meeting', difficulty: 'easy' },
            { event: 'oasis_discovery', difficulty: 'easy' },
            { event: 'trading_post', difficulty: 'easy' },
            { event: 'desert_heat', difficulty: 'easy' },
            
            // Medium events (unlocked at level 3+)
            { event: 'bandit_encounter', difficulty: 'medium' },
            { event: 'wild_animal', difficulty: 'medium' },
            { event: 'abandoned_mine', difficulty: 'medium' },
            { event: 'ghost_town', difficulty: 'medium' },
            { event: 'cave_exploration', difficulty: 'medium' },
            { event: 'sandstorm', difficulty: 'medium' },
            { event: 'quicksand', difficulty: 'medium' },
            { event: 'rattlesnake', difficulty: 'medium' },
            { event: 'broken_wagon', difficulty: 'medium' },
            { event: 'mysterious_merchant', difficulty: 'medium' },
            
            // Hard events (unlocked at level 5+)
            { event: 'outlaw_posse', difficulty: 'hard' },
            { event: 'mysterious_ruins', difficulty: 'hard' },
            { event: 'haunted_saloon', difficulty: 'hard' },
            { event: 'gold_rush_claim', difficulty: 'hard' },
            { event: 'sheriff_encounter', difficulty: 'hard' },
            
            // Weather events (unlocked at level 2+)
            { event: 'thunderstorm', difficulty: 'medium' },
            { event: 'fog_encounter', difficulty: 'easy' },
            { event: 'blizzard', difficulty: 'hard' },
            { event: 'heat_wave', difficulty: 'medium' },
            
            // Time-based events (unlocked at level 4+)
            { event: 'midnight_encounter', difficulty: 'hard' },
            { event: 'dawn_ritual', difficulty: 'medium' },
            { event: 'dusk_trading', difficulty: 'easy' },
            { event: 'noon_duel', difficulty: 'hard' }
        ];

        // Start the adventure loop
        let adventureStep = 0;
        const maxSteps = 5 + Math.floor(Math.random() * 4); // 5-8 steps

        this.terminal.println(ANSIParser.fg('bright-yellow') + '  🌅 Your adventure begins at dawn...' + ANSIParser.reset());
        await this.terminal.sleep(1500);

        while (adventureStep < maxSteps && adventure.health > 0) {
            adventureStep++;
            
            // Select random event based on difficulty scaling
            const availableEvents = this.getAvailableAdventureEvents(adventureEvents);
            const selectedEvent = availableEvents[Math.floor(Math.random() * availableEvents.length)];
            
            // Execute the event
            const eventResult = await this.executeAdventureEvent(selectedEvent.event, adventure);
            
            if (eventResult.ended) {
                break;
            }
            
            // Small delay between events
            await this.terminal.sleep(1000);
        }

        // Adventure conclusion
        await this.concludeAdventure(adventure);
    }

    async executeAdventureEvent(eventType, adventure) {
        this.terminal.clear();
        
        switch (eventType) {
            case 'bandit_encounter':
                return await this.banditEncounter(adventure);
            case 'treasure_discovery':
                return await this.treasureDiscovery(adventure);
            case 'stranger_meeting':
                return await this.strangerMeeting(adventure);
            case 'wild_animal':
                return await this.wildAnimalEncounter(adventure);
            case 'abandoned_mine':
                return await this.abandonedMineExploration(adventure);
            case 'ghost_town':
                return await this.ghostTownVisit(adventure);
            case 'oasis_discovery':
                return await this.oasisDiscovery(adventure);
            case 'cave_exploration':
                return await this.caveExploration(adventure);
            case 'trading_post':
                return await this.tradingPostVisit(adventure);
            case 'mysterious_ruins':
                return await this.mysteriousRuins(adventure);
            case 'sandstorm':
                return await this.sandstormEncounter(adventure);
            case 'quicksand':
                return await this.quicksandTrap(adventure);
            case 'rattlesnake':
                return await this.rattlesnakeEncounter(adventure);
            case 'outlaw_posse':
                return await this.outlawPosseEncounter(adventure);
            case 'desert_heat':
                return await this.desertHeat(adventure);
            case 'broken_wagon':
                return await this.brokenWagon(adventure);
            case 'mysterious_merchant':
                return await this.mysteriousMerchant(adventure);
            case 'haunted_saloon':
                return await this.hauntedSaloon(adventure);
            case 'gold_rush_claim':
                return await this.goldRushClaim(adventure);
            case 'sheriff_encounter':
                return await this.sheriffEncounter(adventure);
            case 'thunderstorm':
                return await this.thunderstormEncounter(adventure);
            case 'fog_encounter':
                return await this.fogEncounter(adventure);
            case 'blizzard':
                return await this.blizzardEncounter(adventure);
            case 'heat_wave':
                return await this.heatWaveEncounter(adventure);
            case 'midnight_encounter':
                return await this.midnightEncounter(adventure);
            case 'dawn_ritual':
                return await this.dawnRitual(adventure);
            case 'dusk_trading':
                return await this.duskTrading(adventure);
            case 'noon_duel':
                return await this.noonDuel(adventure);
            default:
                return { ended: false };
        }
    }

    async banditEncounter(adventure) {
        this.terminal.println(ANSIParser.fg('bright-red') + '  ⚔️  BANDIT ENCOUNTER!' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  A masked bandit blocks your path!' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  What do you do?' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [1] Draw your weapon and fight!' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [2] Try to talk your way out' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [3] Offer gold to pass safely' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [4] Try to sneak around' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
        const choice = await this.terminal.input();
        
        const fightChance = Math.random();
        const playerSkill = this.gameState.honorScore + (Math.random() * 50);
        
        switch (choice) {
            case '1':
                if (playerSkill > 60) {
                    this.terminal.println(ANSIParser.fg('bright-green') + '  🏆 You defeat the bandit! Found 30 gold!' + ANSIParser.reset());
                    adventure.goldFound += 30;
                    adventure.experienceGained += 15;
                } else {
                    this.terminal.println(ANSIParser.fg('bright-red') + '  💥 The bandit wounds you! Lost 20 health.' + ANSIParser.reset());
                    adventure.health -= 20;
                    adventure.experienceGained += 5;
                }
                break;
            case '2':
                if (Math.random() > 0.5) {
                    this.terminal.println(ANSIParser.fg('bright-yellow') + '  🤝 You convince the bandit to let you pass!' + ANSIParser.reset());
                    adventure.experienceGained += 10;
                } else {
                    this.terminal.println(ANSIParser.fg('bright-red') + '  💥 The bandit attacks! Lost 15 health.' + ANSIParser.reset());
                    adventure.health -= 15;
                    adventure.experienceGained += 5;
                }
                break;
            case '3':
                const goldCost = 20 + Math.floor(Math.random() * 30);
                this.terminal.println(ANSIParser.fg('bright-cyan') + `  💰 You pay ${goldCost} gold to pass safely.` + ANSIParser.reset());
                adventure.goldFound -= goldCost;
                adventure.experienceGained += 5;
                break;
            case '4':
                if (Math.random() > 0.6) {
                    this.terminal.println(ANSIParser.fg('bright-green') + '  🥷 You sneak past successfully!' + ANSIParser.reset());
                    adventure.experienceGained += 12;
                } else {
                    this.terminal.println(ANSIParser.fg('bright-red') + '  💥 The bandit spots you! Lost 10 health.' + ANSIParser.reset());
                    adventure.health -= 10;
                    adventure.experienceGained += 5;
                }
                break;
        }
        
        return { ended: false };
    }

    async treasureDiscovery(adventure) {
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  💎 TREASURE DISCOVERY!' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  You spot something glinting in the sand...' + ANSIParser.reset());
        this.terminal.println('');
        
        const treasureValue = 25 + Math.floor(Math.random() * 75);
        const itemChance = Math.random();
        
        this.terminal.println(ANSIParser.fg('bright-green') + `  🏆 You found ${treasureValue} gold!` + ANSIParser.reset());
        adventure.goldFound += treasureValue;
        adventure.experienceGained += 8;
        
        if (itemChance > 0.7) {
            const items = ['Lucky Coin', 'Silver Spur', 'Desert Rose', 'Ancient Arrowhead', 'Gold Nugget'];
            const foundItem = items[Math.floor(Math.random() * items.length)];
            this.terminal.println(ANSIParser.fg('bright-cyan') + `  🎁 You also found a ${foundItem}!` + ANSIParser.reset());
            adventure.itemsFound.push(foundItem);
            adventure.experienceGained += 5;
        }
        
        return { ended: false };
    }

    async strangerMeeting(adventure) {
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  👤 STRANGER ENCOUNTER!' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  A mysterious stranger approaches you...' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  How do you respond?' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [1] Greet them warmly' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [2] Be cautious and guarded' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [3] Ignore them and ride on' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
        const choice = await this.terminal.input();
        
        const strangerType = Math.random();
        
        switch (choice) {
            case '1':
                if (strangerType > 0.3) {
                    this.terminal.println(ANSIParser.fg('bright-green') + '  🤝 The stranger shares valuable information! +20 XP' + ANSIParser.reset());
                    adventure.experienceGained += 20;
                } else {
                    this.terminal.println(ANSIParser.fg('bright-red') + '  💥 The stranger was a trickster! Lost 15 health.' + ANSIParser.reset());
                    adventure.health -= 15;
                }
                break;
            case '2':
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  🛡️  Your caution pays off. Safe passage.' + ANSIParser.reset());
                adventure.experienceGained += 8;
                break;
            case '3':
                this.terminal.println(ANSIParser.fg('bright-white') + '  🐎 You ride on without incident.' + ANSIParser.reset());
                adventure.experienceGained += 3;
                break;
        }
        
        return { ended: false };
    }

    async wildAnimalEncounter(adventure) {
        this.terminal.println(ANSIParser.fg('bright-red') + '  🐺 WILD ANIMAL ENCOUNTER!' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  A wild animal blocks your path!' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  What do you do?' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [1] Try to scare it away' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [2] Feed it some food' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [3] Try to sneak around' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [4] Draw your weapon' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
        const choice = await this.terminal.input();
        
        const successChance = Math.random();
        
        switch (choice) {
            case '1':
                if (successChance > 0.4) {
                    this.terminal.println(ANSIParser.fg('bright-green') + '  🦁 The animal runs away! +10 XP' + ANSIParser.reset());
                    adventure.experienceGained += 10;
                } else {
                    this.terminal.println(ANSIParser.fg('bright-red') + '  💥 The animal attacks! Lost 25 health.' + ANSIParser.reset());
                    adventure.health -= 25;
                }
                break;
            case '2':
                this.terminal.println(ANSIParser.fg('bright-green') + '  🍖 The animal is friendly! +15 XP' + ANSIParser.reset());
                adventure.experienceGained += 15;
                break;
            case '3':
                if (successChance > 0.5) {
                    this.terminal.println(ANSIParser.fg('bright-green') + '  🥷 You sneak past successfully! +12 XP' + ANSIParser.reset());
                    adventure.experienceGained += 12;
                } else {
                    this.terminal.println(ANSIParser.fg('bright-red') + '  💥 The animal spots you! Lost 20 health.' + ANSIParser.reset());
                    adventure.health -= 20;
                }
                break;
            case '4':
                if (successChance > 0.6) {
                    this.terminal.println(ANSIParser.fg('bright-green') + '  ⚔️  You defeat the animal! +20 XP' + ANSIParser.reset());
                    adventure.experienceGained += 20;
                } else {
                    this.terminal.println(ANSIParser.fg('bright-red') + '  💥 The animal wounds you! Lost 30 health.' + ANSIParser.reset());
                    adventure.health -= 30;
                }
                break;
        }
        
        return { ended: false };
    }

    async abandonedMineExploration(adventure) {
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  ⛏️  ABANDONED MINE!' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  You discover an old mine entrance...' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  What do you do?' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [1] Explore the mine carefully' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [2] Search for gold near the entrance' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [3] Leave it alone and move on' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
        const choice = await this.terminal.input();
        
        switch (choice) {
            case '1':
                const mineGold = 15 + Math.floor(Math.random() * 35);
                this.terminal.println(ANSIParser.fg('bright-green') + `  🏆 You found ${mineGold} gold in the mine!` + ANSIParser.reset());
                adventure.goldFound += mineGold;
                adventure.experienceGained += 12;
                break;
            case '2':
                const surfaceGold = 5 + Math.floor(Math.random() * 15);
                this.terminal.println(ANSIParser.fg('bright-cyan') + `  💰 You found ${surfaceGold} gold near the entrance!` + ANSIParser.reset());
                adventure.goldFound += surfaceGold;
                adventure.experienceGained += 8;
                break;
            case '3':
                this.terminal.println(ANSIParser.fg('bright-white') + '  🐎 You decide to move on safely.' + ANSIParser.reset());
                adventure.experienceGained += 3;
                break;
        }
        
        return { ended: false };
    }

    async ghostTownVisit(adventure) {
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  👻 GHOST TOWN!' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  You ride into an abandoned town...' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  What do you do?' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [1] Search the buildings for supplies' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [2] Rest and recover health' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [3] Leave quickly' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
        const choice = await this.terminal.input();
        
        switch (choice) {
            case '1':
                const suppliesGold = 10 + Math.floor(Math.random() * 25);
                this.terminal.println(ANSIParser.fg('bright-green') + `  🏆 You found ${suppliesGold} gold in the buildings!` + ANSIParser.reset());
                adventure.goldFound += suppliesGold;
                adventure.experienceGained += 10;
                break;
            case '2':
                const healthGain = 20 + Math.floor(Math.random() * 30);
                this.terminal.println(ANSIParser.fg('bright-green') + `  ❤️  You rest and recover ${healthGain} health!` + ANSIParser.reset());
                adventure.health = Math.min(100, adventure.health + healthGain);
                adventure.experienceGained += 5;
                break;
            case '3':
                this.terminal.println(ANSIParser.fg('bright-white') + '  🐎 You leave the ghost town quickly.' + ANSIParser.reset());
                adventure.experienceGained += 3;
                break;
        }
        
        return { ended: false };
    }

    async oasisDiscovery(adventure) {
        this.terminal.println(ANSIParser.fg('bright-green') + '  🌴 OASIS DISCOVERY!' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  You find a beautiful oasis in the desert...' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  What do you do?' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [1] Drink and rest at the oasis' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [2] Search for hidden treasures' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [3] Fill your canteen and move on' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
        const choice = await this.terminal.input();
        
        switch (choice) {
            case '1':
                const healthGain = 30 + Math.floor(Math.random() * 20);
                this.terminal.println(ANSIParser.fg('bright-green') + `  ❤️  You rest and recover ${healthGain} health!` + ANSIParser.reset());
                adventure.health = Math.min(100, adventure.health + healthGain);
                adventure.experienceGained += 15;
                break;
            case '2':
                const treasureGold = 20 + Math.floor(Math.random() * 40);
                this.terminal.println(ANSIParser.fg('bright-green') + `  🏆 You found ${treasureGold} gold hidden in the oasis!` + ANSIParser.reset());
                adventure.goldFound += treasureGold;
                adventure.experienceGained += 12;
                break;
            case '3':
                this.terminal.println(ANSIParser.fg('bright-cyan') + '  💧 You fill your canteen and feel refreshed!' + ANSIParser.reset());
                adventure.experienceGained += 8;
                break;
        }
        
        return { ended: false };
    }

    async caveExploration(adventure) {
        this.terminal.println(ANSIParser.fg('bright-magenta') + '  🕳️  CAVE EXPLORATION!' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  You discover a mysterious cave...' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  What do you do?' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [1] Explore the cave thoroughly' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [2] Just peek inside' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [3] Avoid the cave entirely' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
        const choice = await this.terminal.input();
        
        const caveChance = Math.random();
        
        switch (choice) {
            case '1':
                if (caveChance > 0.3) {
                    const caveGold = 25 + Math.floor(Math.random() * 50);
                    this.terminal.println(ANSIParser.fg('bright-green') + `  🏆 You found ${caveGold} gold in the cave!` + ANSIParser.reset());
                    adventure.goldFound += caveGold;
                    adventure.experienceGained += 18;
                } else {
                    this.terminal.println(ANSIParser.fg('bright-red') + '  💥 The cave collapses! Lost 25 health.' + ANSIParser.reset());
                    adventure.health -= 25;
                    adventure.experienceGained += 5;
                }
                break;
            case '2':
                const peekGold = 5 + Math.floor(Math.random() * 15);
                this.terminal.println(ANSIParser.fg('bright-cyan') + `  💰 You found ${peekGold} gold near the entrance!` + ANSIParser.reset());
                adventure.goldFound += peekGold;
                adventure.experienceGained += 8;
                break;
            case '3':
                this.terminal.println(ANSIParser.fg('bright-white') + '  🐎 You avoid the cave and move on safely.' + ANSIParser.reset());
                adventure.experienceGained += 3;
                break;
        }
        
        return { ended: false };
    }

    async tradingPostVisit(adventure) {
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  🏪 TRADING POST!' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  You find a friendly trading post...' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  What do you do?' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [1] Trade your items for gold' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [2] Buy supplies and rest' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [3] Just rest and move on' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
        const choice = await this.terminal.input();
        
        switch (choice) {
            case '1':
                const tradeGold = 15 + Math.floor(Math.random() * 25);
                this.terminal.println(ANSIParser.fg('bright-green') + `  💰 You trade items for ${tradeGold} gold!` + ANSIParser.reset());
                adventure.goldFound += tradeGold;
                adventure.experienceGained += 10;
                break;
            case '2':
                const supplyCost = 10 + Math.floor(Math.random() * 20);
                const healthGain = 25 + Math.floor(Math.random() * 15);
                this.terminal.println(ANSIParser.fg('bright-cyan') + `  🛒 You buy supplies for ${supplyCost} gold and recover ${healthGain} health!` + ANSIParser.reset());
                adventure.goldFound -= supplyCost;
                adventure.health = Math.min(100, adventure.health + healthGain);
                adventure.experienceGained += 12;
                break;
            case '3':
                const restHealth = 15 + Math.floor(Math.random() * 10);
                this.terminal.println(ANSIParser.fg('bright-green') + `  😴 You rest and recover ${restHealth} health!` + ANSIParser.reset());
                adventure.health = Math.min(100, adventure.health + restHealth);
                adventure.experienceGained += 8;
                break;
        }
        
        return { ended: false };
    }

    async mysteriousRuins(adventure) {
        this.terminal.println(ANSIParser.fg('bright-magenta') + '  🏛️  MYSTERIOUS RUINS!' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  You discover ancient ruins in the desert...' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  What do you do?' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [1] Explore the ruins carefully' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [2] Search for artifacts' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [3] Leave the ruins alone' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
        const choice = await this.terminal.input();
        
        const ruinChance = Math.random();
        
        switch (choice) {
            case '1':
                if (ruinChance > 0.4) {
                    const ruinGold = 30 + Math.floor(Math.random() * 40);
                    this.terminal.println(ANSIParser.fg('bright-green') + `  🏆 You found ${ruinGold} gold in the ruins!` + ANSIParser.reset());
                    adventure.goldFound += ruinGold;
                    adventure.experienceGained += 20;
                } else {
                    this.terminal.println(ANSIParser.fg('bright-red') + '  💥 The ruins are unstable! Lost 20 health.' + ANSIParser.reset());
                    adventure.health -= 20;
                    adventure.experienceGained += 5;
                }
                break;
            case '2':
                if (ruinChance > 0.5) {
                    const artifacts = ['Ancient Coin', 'Mysterious Gem', 'Old Map', 'Sacred Relic', 'Lost Journal'];
                    const foundArtifact = artifacts[Math.floor(Math.random() * artifacts.length)];
                    this.terminal.println(ANSIParser.fg('bright-cyan') + `  🎁 You found a ${foundArtifact}!` + ANSIParser.reset());
                    adventure.itemsFound.push(foundArtifact);
                    adventure.experienceGained += 15;
                } else {
                    this.terminal.println(ANSIParser.fg('bright-white') + '  🔍 You search but find nothing of value.' + ANSIParser.reset());
                    adventure.experienceGained += 5;
                }
                break;
            case '3':
                this.terminal.println(ANSIParser.fg('bright-white') + '  🐎 You leave the ruins undisturbed.' + ANSIParser.reset());
                adventure.experienceGained += 3;
                break;
        }
        
        return { ended: false };
    }

    async sandstormEncounter(adventure) {
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  🌪️  SANDSTORM!' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  A massive sandstorm approaches...' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  What do you do?' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [1] Seek immediate shelter' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [2] Try to ride through it' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [3] Cover your face and wait it out' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
        const choice = await this.terminal.input();
        
        const stormChance = Math.random();
        
        switch (choice) {
            case '1':
                if (stormChance > 0.3) {
                    this.terminal.println(ANSIParser.fg('bright-green') + '  🏠 You find shelter! Safe and sound.' + ANSIParser.reset());
                    adventure.experienceGained += 10;
                } else {
                    this.terminal.println(ANSIParser.fg('bright-red') + '  💥 The shelter collapses! Lost 15 health.' + ANSIParser.reset());
                    adventure.health -= 15;
                    adventure.experienceGained += 5;
                }
                break;
            case '2':
                if (stormChance > 0.6) {
                    this.terminal.println(ANSIParser.fg('bright-green') + '  🐎 You make it through! Found 20 gold!' + ANSIParser.reset());
                    adventure.goldFound += 20;
                    adventure.experienceGained += 15;
                } else {
                    this.terminal.println(ANSIParser.fg('bright-red') + '  💥 You get lost in the storm! Lost 25 health and 10 gold.' + ANSIParser.reset());
                    adventure.health -= 25;
                    adventure.goldFound -= 10;
                    adventure.experienceGained += 5;
                }
                break;
            case '3':
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  😷 You wait it out safely but lose some time.' + ANSIParser.reset());
                adventure.experienceGained += 8;
                break;
        }
        
        return { ended: false };
    }

    async quicksandTrap(adventure) {
        this.terminal.println(ANSIParser.fg('bright-red') + '  🏜️  QUICKSAND TRAP!' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  Your horse steps into quicksand!' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  What do you do?' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [1] Try to pull your horse out' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [2] Jump off and save yourself' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [3] Use your rope to escape' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
        const choice = await this.terminal.input();
        
        const escapeChance = Math.random();
        
        switch (choice) {
            case '1':
                if (escapeChance > 0.4) {
                    this.terminal.println(ANSIParser.fg('bright-green') + '  🐎 You save your horse! +15 XP' + ANSIParser.reset());
                    adventure.experienceGained += 15;
                } else {
                    this.terminal.println(ANSIParser.fg('bright-red') + '  💥 You both get stuck! Lost 30 health and 20 gold.' + ANSIParser.reset());
                    adventure.health -= 30;
                    adventure.goldFound -= 20;
                    adventure.experienceGained += 5;
                }
                break;
            case '2':
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  🏃 You escape but lose your horse and supplies! Lost 25 gold.' + ANSIParser.reset());
                adventure.goldFound -= 25;
                adventure.experienceGained += 10;
                break;
            case '3':
                if (escapeChance > 0.5) {
                    this.terminal.println(ANSIParser.fg('bright-green') + '  🪢 Your rope saves the day! +12 XP' + ANSIParser.reset());
                    adventure.experienceGained += 12;
                } else {
                    this.terminal.println(ANSIParser.fg('bright-red') + '  💥 The rope breaks! Lost 20 health.' + ANSIParser.reset());
                    adventure.health -= 20;
                    adventure.experienceGained += 5;
                }
                break;
        }
        
        return { ended: false };
    }

    async rattlesnakeEncounter(adventure) {
        this.terminal.println(ANSIParser.fg('bright-red') + '  🐍 RATTLESNAKE!' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  A rattlesnake blocks your path!' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  What do you do?' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [1] Try to scare it away' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [2] Shoot it with your gun' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [3] Back away slowly' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
        const choice = await this.terminal.input();
        
        const snakeChance = Math.random();
        
        switch (choice) {
            case '1':
                if (snakeChance > 0.5) {
                    this.terminal.println(ANSIParser.fg('bright-green') + '  🐍 The snake slithers away! +10 XP' + ANSIParser.reset());
                    adventure.experienceGained += 10;
                } else {
                    this.terminal.println(ANSIParser.fg('bright-red') + '  💥 The snake strikes! Lost 35 health.' + ANSIParser.reset());
                    adventure.health -= 35;
                    adventure.experienceGained += 5;
                }
                break;
            case '2':
                if (snakeChance > 0.3) {
                    this.terminal.println(ANSIParser.fg('bright-green') + '  🔫 You shoot the snake! Found 15 gold in its den!' + ANSIParser.reset());
                    adventure.goldFound += 15;
                    adventure.experienceGained += 12;
                } else {
                    this.terminal.println(ANSIParser.fg('bright-red') + '  💥 You miss and it strikes! Lost 40 health.' + ANSIParser.reset());
                    adventure.health -= 40;
                    adventure.experienceGained += 5;
                }
                break;
            case '3':
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  🚶 You back away safely but lose time.' + ANSIParser.reset());
                adventure.experienceGained += 8;
                break;
        }
        
        return { ended: false };
    }

    async outlawPosseEncounter(adventure) {
        this.terminal.println(ANSIParser.fg('bright-red') + '  🤠 OUTLAW POSSE!' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  A gang of outlaws surrounds you!' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  What do you do?' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [1] Draw your weapon and fight' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [2] Try to talk your way out' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [3] Surrender and give them your gold' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
        const choice = await this.terminal.input();
        
        const fightChance = Math.random();
        const playerSkill = this.gameState.honorScore + (Math.random() * 40);
        
        switch (choice) {
            case '1':
                if (playerSkill > 70) {
                    this.terminal.println(ANSIParser.fg('bright-green') + '  🏆 You defeat the posse! Found 50 gold!' + ANSIParser.reset());
                    adventure.goldFound += 50;
                    adventure.experienceGained += 25;
                } else {
                    this.terminal.println(ANSIParser.fg('bright-red') + '  💥 You\'re outnumbered! Lost 40 health and 30 gold.' + ANSIParser.reset());
                    adventure.health -= 40;
                    adventure.goldFound -= 30;
                    adventure.experienceGained += 5;
                }
                break;
            case '2':
                if (fightChance > 0.6) {
                    this.terminal.println(ANSIParser.fg('bright-yellow') + '  🤝 You convince them to let you pass! +15 XP' + ANSIParser.reset());
                    adventure.experienceGained += 15;
                } else {
                    this.terminal.println(ANSIParser.fg('bright-red') + '  💥 They don\'t buy it! Lost 25 health and 20 gold.' + ANSIParser.reset());
                    adventure.health -= 25;
                    adventure.goldFound -= 20;
                    adventure.experienceGained += 5;
                }
                break;
            case '3':
                const goldCost = 30 + Math.floor(Math.random() * 40);
                this.terminal.println(ANSIParser.fg('bright-cyan') + `  💰 You surrender ${goldCost} gold but stay safe.` + ANSIParser.reset());
                adventure.goldFound -= goldCost;
                adventure.experienceGained += 8;
                break;
        }
        
        return { ended: false };
    }

    async desertHeat(adventure) {
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  ☀️  DESERT HEAT!' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  The sun is scorching hot...' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  What do you do?' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [1] Find shade and rest' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [2] Keep riding to get through it' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [3] Use your water sparingly' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
        const choice = await this.terminal.input();
        
        const heatChance = Math.random();
        
        switch (choice) {
            case '1':
                this.terminal.println(ANSIParser.fg('bright-green') + '  🌳 You find shade and rest safely.' + ANSIParser.reset());
                adventure.experienceGained += 10;
                break;
            case '2':
                if (heatChance > 0.4) {
                    this.terminal.println(ANSIParser.fg('bright-green') + '  🐎 You make it through! +12 XP' + ANSIParser.reset());
                    adventure.experienceGained += 12;
                } else {
                    this.terminal.println(ANSIParser.fg('bright-red') + '  💥 Heat exhaustion! Lost 20 health.' + ANSIParser.reset());
                    adventure.health -= 20;
                    adventure.experienceGained += 5;
                }
                break;
            case '3':
                this.terminal.println(ANSIParser.fg('bright-cyan') + '  💧 You conserve water and stay hydrated.' + ANSIParser.reset());
                adventure.experienceGained += 8;
                break;
        }
        
        return { ended: false };
    }

    async brokenWagon(adventure) {
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  🚛 BROKEN WAGON!' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  You find a broken wagon on the trail...' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  What do you do?' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [1] Search for valuable items' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [2] Help any survivors' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [3] Take what you can and move on' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
        const choice = await this.terminal.input();
        
        const wagonChance = Math.random();
        
        switch (choice) {
            case '1':
                if (wagonChance > 0.3) {
                    const wagonGold = 20 + Math.floor(Math.random() * 30);
                    this.terminal.println(ANSIParser.fg('bright-green') + `  🏆 You found ${wagonGold} gold in the wagon!` + ANSIParser.reset());
                    adventure.goldFound += wagonGold;
                    adventure.experienceGained += 12;
                } else {
                    this.terminal.println(ANSIParser.fg('bright-red') + '  💥 The wagon collapses on you! Lost 15 health.' + ANSIParser.reset());
                    adventure.health -= 15;
                    adventure.experienceGained += 5;
                }
                break;
            case '2':
                if (wagonChance > 0.5) {
                    this.terminal.println(ANSIParser.fg('bright-green') + '  🤝 You help survivors! They reward you with 25 gold!' + ANSIParser.reset());
                    adventure.goldFound += 25;
                    adventure.experienceGained += 18;
                } else {
                    this.terminal.println(ANSIParser.fg('bright-red') + '  💥 No survivors, but you waste time. Lost 10 health.' + ANSIParser.reset());
                    adventure.health -= 10;
                    adventure.experienceGained += 5;
                }
                break;
            case '3':
                const quickGold = 10 + Math.floor(Math.random() * 20);
                this.terminal.println(ANSIParser.fg('bright-cyan') + `  💰 You quickly grab ${quickGold} gold and move on.` + ANSIParser.reset());
                adventure.goldFound += quickGold;
                adventure.experienceGained += 8;
                break;
        }
        
        return { ended: false };
    }

    async mysteriousMerchant(adventure) {
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  🧙 MYSTERIOUS MERCHANT!' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  A strange merchant offers you a deal...' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  What do you do?' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [1] Buy a mysterious potion (50 gold)' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [2] Trade your items for gold' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [3] Decline and move on' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
        const choice = await this.terminal.input();
        
        const merchantChance = Math.random();
        
        switch (choice) {
            case '1':
                if (adventure.goldFound >= 50) {
                    adventure.goldFound -= 50;
                    if (merchantChance > 0.5) {
                        this.terminal.println(ANSIParser.fg('bright-green') + '  🧪 The potion heals you! +30 health!' + ANSIParser.reset());
                        adventure.health = Math.min(100, adventure.health + 30);
                        adventure.experienceGained += 15;
                    } else {
                        this.terminal.println(ANSIParser.fg('bright-red') + '  💥 The potion was poison! Lost 20 health.' + ANSIParser.reset());
                        adventure.health -= 20;
                        adventure.experienceGained += 5;
                    }
                } else {
                    this.terminal.println(ANSIParser.fg('bright-red') + '  💰 You don\'t have enough gold!' + ANSIParser.reset());
                }
                break;
            case '2':
                const tradeGold = 15 + Math.floor(Math.random() * 25);
                this.terminal.println(ANSIParser.fg('bright-green') + `  💰 You trade items for ${tradeGold} gold!` + ANSIParser.reset());
                adventure.goldFound += tradeGold;
                adventure.experienceGained += 10;
                break;
            case '3':
                this.terminal.println(ANSIParser.fg('bright-white') + '  🐎 You decline and move on safely.' + ANSIParser.reset());
                adventure.experienceGained += 5;
                break;
        }
        
        return { ended: false };
    }

    async hauntedSaloon(adventure) {
        this.terminal.println(ANSIParser.fg('bright-magenta') + '  👻 HAUNTED SALOON!' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  You find an abandoned saloon...' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  What do you do?' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [1] Explore the saloon' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [2] Rest in the saloon' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [3] Avoid the spooky place' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
        const choice = await this.terminal.input();
        
        const ghostChance = Math.random();
        
        switch (choice) {
            case '1':
                if (ghostChance > 0.6) {
                    const saloonGold = 30 + Math.floor(Math.random() * 40);
                    this.terminal.println(ANSIParser.fg('bright-green') + `  🏆 You found ${saloonGold} gold in the saloon!` + ANSIParser.reset());
                    adventure.goldFound += saloonGold;
                    adventure.experienceGained += 20;
                } else {
                    this.terminal.println(ANSIParser.fg('bright-red') + '  👻 The ghost scares you! Lost 25 health.' + ANSIParser.reset());
                    adventure.health -= 25;
                    adventure.experienceGained += 5;
                }
                break;
            case '2':
                if (ghostChance > 0.4) {
                    this.terminal.println(ANSIParser.fg('bright-green') + '  😴 You rest peacefully! +20 health.' + ANSIParser.reset());
                    adventure.health = Math.min(100, adventure.health + 20);
                    adventure.experienceGained += 12;
                } else {
                    this.terminal.println(ANSIParser.fg('bright-red') + '  👻 Ghostly nightmares! Lost 15 health.' + ANSIParser.reset());
                    adventure.health -= 15;
                    adventure.experienceGained += 5;
                }
                break;
            case '3':
                this.terminal.println(ANSIParser.fg('bright-white') + '  🐎 You avoid the spooky saloon.' + ANSIParser.reset());
                adventure.experienceGained += 5;
                break;
        }
        
        return { ended: false };
    }

    async goldRushClaim(adventure) {
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  ⛏️  GOLD RUSH CLAIM!' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  You discover a gold claim site...' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  What do you do?' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [1] Stake your claim and mine' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [2] Search for surface gold' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [3] Leave it for others' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
        const choice = await this.terminal.input();
        
        const goldChance = Math.random();
        
        switch (choice) {
            case '1':
                if (goldChance > 0.3) {
                    const claimGold = 40 + Math.floor(Math.random() * 60);
                    this.terminal.println(ANSIParser.fg('bright-green') + `  🏆 You strike gold! Found ${claimGold} gold!` + ANSIParser.reset());
                    adventure.goldFound += claimGold;
                    adventure.experienceGained += 25;
                } else {
                    this.terminal.println(ANSIParser.fg('bright-red') + '  💥 The claim collapses! Lost 30 health.' + ANSIParser.reset());
                    adventure.health -= 30;
                    adventure.experienceGained += 5;
                }
                break;
            case '2':
                const surfaceGold = 15 + Math.floor(Math.random() * 25);
                this.terminal.println(ANSIParser.fg('bright-cyan') + `  💰 You found ${surfaceGold} gold on the surface!` + ANSIParser.reset());
                adventure.goldFound += surfaceGold;
                adventure.experienceGained += 12;
                break;
            case '3':
                this.terminal.println(ANSIParser.fg('bright-white') + '  🐎 You leave the claim for others.' + ANSIParser.reset());
                adventure.experienceGained += 8;
                break;
        }
        
        return { ended: false };
    }

    async sheriffEncounter(adventure) {
        this.terminal.println(ANSIParser.fg('bright-blue') + '  👮 SHERIFF ENCOUNTER!' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  The local sheriff approaches you...' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  What do you do?' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [1] Greet him respectfully' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [2] Be cautious and guarded' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [3] Try to avoid him' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
        const choice = await this.terminal.input();
        
        const sheriffChance = Math.random();
        
        switch (choice) {
            case '1':
                if (sheriffChance > 0.3) {
                    this.terminal.println(ANSIParser.fg('bright-green') + '  🤝 The sheriff likes you! +5 honor and 20 gold!' + ANSIParser.reset());
                    this.gameState.honorScore += 5;
                    adventure.goldFound += 20;
                    adventure.experienceGained += 15;
                } else {
                    this.terminal.println(ANSIParser.fg('bright-red') + '  💥 The sheriff is suspicious! Lost 10 gold.' + ANSIParser.reset());
                    adventure.goldFound -= 10;
                    adventure.experienceGained += 5;
                }
                break;
            case '2':
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  🛡️  Your caution pays off. Safe passage.' + ANSIParser.reset());
                adventure.experienceGained += 10;
                break;
            case '3':
                if (sheriffChance > 0.5) {
                    this.terminal.println(ANSIParser.fg('bright-white') + '  🐎 You avoid the sheriff successfully.' + ANSIParser.reset());
                    adventure.experienceGained += 8;
                } else {
                    this.terminal.println(ANSIParser.fg('bright-red') + '  💥 The sheriff stops you! Lost 15 gold.' + ANSIParser.reset());
                    adventure.goldFound -= 15;
                    adventure.experienceGained += 5;
                }
                break;
        }
        
        return { ended: false };
    }

    async thunderstormEncounter(adventure) {
        this.terminal.println(ANSIParser.fg('bright-blue') + '  ⛈️  THUNDERSTORM!' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  Lightning crashes overhead as rain pours down...' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  What do you do?' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [1] Seek immediate shelter' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [2] Ride through the storm' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [3] Wait for it to pass' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
        const choice = await this.terminal.input();
        
        const stormChance = Math.random();
        
        switch (choice) {
            case '1':
                if (stormChance > 0.3) {
                    this.terminal.println(ANSIParser.fg('bright-green') + '  🏠 You find shelter! Found 15 gold inside!' + ANSIParser.reset());
                    adventure.goldFound += 15;
                    adventure.experienceGained += 10;
                } else {
                    this.terminal.println(ANSIParser.fg('bright-red') + '  💥 The shelter collapses! Lost 20 health.' + ANSIParser.reset());
                    adventure.health -= 20;
                    adventure.experienceGained += 5;
                }
                break;
            case '2':
                if (stormChance > 0.6) {
                    this.terminal.println(ANSIParser.fg('bright-green') + '  ⚡ You brave the storm! Found 25 gold!' + ANSIParser.reset());
                    adventure.goldFound += 25;
                    adventure.experienceGained += 15;
                } else {
                    this.terminal.println(ANSIParser.fg('bright-red') + '  💥 Lightning strikes nearby! Lost 30 health.' + ANSIParser.reset());
                    adventure.health -= 30;
                    adventure.experienceGained += 5;
                }
                break;
            case '3':
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  ⏰ You wait safely for the storm to pass.' + ANSIParser.reset());
                adventure.experienceGained += 8;
                break;
        }
        
        return { ended: false };
    }

    async fogEncounter(adventure) {
        this.terminal.println(ANSIParser.fg('bright-white') + '  🌫️  FOG ENCOUNTER!' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  Thick fog rolls in, reducing visibility...' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  What do you do?' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [1] Slow down and be cautious' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [2] Keep your normal pace' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [3] Stop and wait for it to clear' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
        const choice = await this.terminal.input();
        
        const fogChance = Math.random();
        
        switch (choice) {
            case '1':
                this.terminal.println(ANSIParser.fg('bright-green') + '  🐌 You proceed safely through the fog.' + ANSIParser.reset());
                adventure.experienceGained += 10;
                break;
            case '2':
                if (fogChance > 0.5) {
                    this.terminal.println(ANSIParser.fg('bright-green') + '  🏃 You make good time through the fog!' + ANSIParser.reset());
                    adventure.experienceGained += 12;
                } else {
                    this.terminal.println(ANSIParser.fg('bright-red') + '  💥 You get lost! Lost 15 health.' + ANSIParser.reset());
                    adventure.health -= 15;
                    adventure.experienceGained += 5;
                }
                break;
            case '3':
                this.terminal.println(ANSIParser.fg('bright-cyan') + '  ⏰ You wait patiently for the fog to clear.' + ANSIParser.reset());
                adventure.experienceGained += 8;
                break;
        }
        
        return { ended: false };
    }

    async blizzardEncounter(adventure) {
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ❄️  BLIZZARD!' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  A fierce blizzard sweeps across the desert...' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  What do you do?' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [1] Find shelter immediately' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [2] Try to ride through it' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [3] Build a snow shelter' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
        const choice = await this.terminal.input();
        
        const blizzardChance = Math.random();
        
        switch (choice) {
            case '1':
                if (blizzardChance > 0.4) {
                    this.terminal.println(ANSIParser.fg('bright-green') + '  🏠 You find shelter! +20 health!' + ANSIParser.reset());
                    adventure.health = Math.min(100, adventure.health + 20);
                    adventure.experienceGained += 12;
                } else {
                    this.terminal.println(ANSIParser.fg('bright-red') + '  💥 No shelter found! Lost 25 health.' + ANSIParser.reset());
                    adventure.health -= 25;
                    adventure.experienceGained += 5;
                }
                break;
            case '2':
                if (blizzardChance > 0.7) {
                    this.terminal.println(ANSIParser.fg('bright-green') + '  🐎 You brave the blizzard! Found 30 gold!' + ANSIParser.reset());
                    adventure.goldFound += 30;
                    adventure.experienceGained += 18;
                } else {
                    this.terminal.println(ANSIParser.fg('bright-red') + '  💥 You get lost in the blizzard! Lost 35 health.' + ANSIParser.reset());
                    adventure.health -= 35;
                    adventure.experienceGained += 5;
                }
                break;
            case '3':
                this.terminal.println(ANSIParser.fg('bright-cyan') + '  🏗️  You build a snow shelter and survive!' + ANSIParser.reset());
                adventure.experienceGained += 15;
                break;
        }
        
        return { ended: false };
    }

    async heatWaveEncounter(adventure) {
        this.terminal.println(ANSIParser.fg('bright-red') + '  🔥 HEAT WAVE!' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  An intense heat wave makes the desert unbearable...' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  What do you do?' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [1] Find shade and rest' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [2] Use all your water' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [3] Keep riding to escape it' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
        const choice = await this.terminal.input();
        
        const heatChance = Math.random();
        
        switch (choice) {
            case '1':
                this.terminal.println(ANSIParser.fg('bright-green') + '  🌳 You find shade and rest safely.' + ANSIParser.reset());
                adventure.experienceGained += 10;
                break;
            case '2':
                this.terminal.println(ANSIParser.fg('bright-cyan') + '  💧 You use your water to stay hydrated!' + ANSIParser.reset());
                adventure.experienceGained += 12;
                break;
            case '3':
                if (heatChance > 0.6) {
                    this.terminal.println(ANSIParser.fg('bright-green') + '  🐎 You escape the heat wave!' + ANSIParser.reset());
                    adventure.experienceGained += 15;
                } else {
                    this.terminal.println(ANSIParser.fg('bright-red') + '  💥 Heat exhaustion! Lost 25 health.' + ANSIParser.reset());
                    adventure.health -= 25;
                    adventure.experienceGained += 5;
                }
                break;
        }
        
        return { ended: false };
    }

    async midnightEncounter(adventure) {
        this.terminal.println(ANSIParser.fg('bright-magenta') + '  🌙 MIDNIGHT ENCOUNTER!' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  You find yourself riding under the full moon...' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  What do you do?' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [1] Make camp for the night' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [2] Continue riding by moonlight' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [3] Search for nocturnal treasures' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
        const choice = await this.terminal.input();
        
        const midnightChance = Math.random();
        
        switch (choice) {
            case '1':
                this.terminal.println(ANSIParser.fg('bright-green') + '  🏕️  You make camp and rest peacefully! +25 health!' + ANSIParser.reset());
                adventure.health = Math.min(100, adventure.health + 25);
                adventure.experienceGained += 12;
                break;
            case '2':
                if (midnightChance > 0.5) {
                    this.terminal.println(ANSIParser.fg('bright-green') + '  🌙 You ride safely by moonlight! Found 20 gold!' + ANSIParser.reset());
                    adventure.goldFound += 20;
                    adventure.experienceGained += 15;
                } else {
                    this.terminal.println(ANSIParser.fg('bright-red') + '  💥 You get lost in the dark! Lost 20 health.' + ANSIParser.reset());
                    adventure.health -= 20;
                    adventure.experienceGained += 5;
                }
                break;
            case '3':
                if (midnightChance > 0.6) {
                    this.terminal.println(ANSIParser.fg('bright-green') + '  💎 You find nocturnal treasures! +35 gold!' + ANSIParser.reset());
                    adventure.goldFound += 35;
                    adventure.experienceGained += 18;
                } else {
                    this.terminal.println(ANSIParser.fg('bright-red') + '  💥 You encounter night predators! Lost 30 health.' + ANSIParser.reset());
                    adventure.health -= 30;
                    adventure.experienceGained += 5;
                }
                break;
        }
        
        return { ended: false };
    }

    async dawnRitual(adventure) {
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  🌅 DAWN RITUAL!' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  You witness an ancient dawn ritual...' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  What do you do?' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [1] Participate in the ritual' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [2] Watch from a distance' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [3] Avoid the ritual entirely' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
        const choice = await this.terminal.input();
        
        const ritualChance = Math.random();
        
        switch (choice) {
            case '1':
                if (ritualChance > 0.4) {
                    this.terminal.println(ANSIParser.fg('bright-green') + '  🙏 You participate and gain wisdom! +30 XP!' + ANSIParser.reset());
                    adventure.experienceGained += 30;
                } else {
                    this.terminal.println(ANSIParser.fg('bright-red') + '  💥 The ritual backfires! Lost 20 health.' + ANSIParser.reset());
                    adventure.health -= 20;
                    adventure.experienceGained += 5;
                }
                break;
            case '2':
                this.terminal.println(ANSIParser.fg('bright-cyan') + '  👁️  You observe and learn something valuable.' + ANSIParser.reset());
                adventure.experienceGained += 15;
                break;
            case '3':
                this.terminal.println(ANSIParser.fg('bright-white') + '  🐎 You avoid the ritual and move on.' + ANSIParser.reset());
                adventure.experienceGained += 8;
                break;
        }
        
        return { ended: false };
    }

    async duskTrading(adventure) {
        this.terminal.println(ANSIParser.fg('bright-orange') + '  🌆 DUSK TRADING!' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  You find a dusk trading post...' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  What do you do?' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [1] Trade your items' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [2] Buy supplies' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [3] Just rest and move on' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
        const choice = await this.terminal.input();
        
        switch (choice) {
            case '1':
                const tradeGold = 20 + Math.floor(Math.random() * 30);
                this.terminal.println(ANSIParser.fg('bright-green') + `  💰 You trade items for ${tradeGold} gold!` + ANSIParser.reset());
                adventure.goldFound += tradeGold;
                adventure.experienceGained += 12;
                break;
            case '2':
                const supplyCost = 15 + Math.floor(Math.random() * 25);
                const healthGain = 30 + Math.floor(Math.random() * 20);
                this.terminal.println(ANSIParser.fg('bright-cyan') + `  🛒 You buy supplies for ${supplyCost} gold and recover ${healthGain} health!` + ANSIParser.reset());
                adventure.goldFound -= supplyCost;
                adventure.health = Math.min(100, adventure.health + healthGain);
                adventure.experienceGained += 15;
                break;
            case '3':
                const restHealth = 20 + Math.floor(Math.random() * 15);
                this.terminal.println(ANSIParser.fg('bright-green') + `  😴 You rest and recover ${restHealth} health!` + ANSIParser.reset());
                adventure.health = Math.min(100, adventure.health + restHealth);
                adventure.experienceGained += 10;
                break;
        }
        
        return { ended: false };
    }

    async noonDuel(adventure) {
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  ☀️  NOON DUEL!' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  A gunslinger challenges you to a high noon duel...' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  What do you do?' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [1] Accept the duel' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [2] Try to talk your way out' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [3] Refuse and ride away' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
        const choice = await this.terminal.input();
        
        const duelChance = Math.random();
        const playerSkill = this.gameState.honorScore + (Math.random() * 30);
        
        switch (choice) {
            case '1':
                if (playerSkill > 60) {
                    this.terminal.println(ANSIParser.fg('bright-green') + '  🏆 You win the duel! Found 50 gold!' + ANSIParser.reset());
                    adventure.goldFound += 50;
                    adventure.experienceGained += 25;
                } else {
                    this.terminal.println(ANSIParser.fg('bright-red') + '  💥 You lose the duel! Lost 40 health.' + ANSIParser.reset());
                    adventure.health -= 40;
                    adventure.experienceGained += 5;
                }
                break;
            case '2':
                if (duelChance > 0.5) {
                    this.terminal.println(ANSIParser.fg('bright-yellow') + '  🤝 You convince them to back down!' + ANSIParser.reset());
                    adventure.experienceGained += 15;
                } else {
                    this.terminal.println(ANSIParser.fg('bright-red') + '  💥 They don\'t buy it! Lost 25 health.' + ANSIParser.reset());
                    adventure.health -= 25;
                    adventure.experienceGained += 5;
                }
                break;
            case '3':
                this.terminal.println(ANSIParser.fg('bright-white') + '  🐎 You refuse and ride away safely.' + ANSIParser.reset());
                adventure.experienceGained += 8;
                break;
        }
        
        return { ended: false };
    }

    getAvailableAdventureEvents(adventureEvents) {
        const playerLevel = this.gameState.level;
        return adventureEvents.filter(eventData => {
            switch (eventData.difficulty) {
                case 'easy':
                    return true;
                case 'medium':
                    return playerLevel >= 2;
                case 'hard':
                    return playerLevel >= 4;
                default:
                    return true;
            }
        });
    }

    updateAdventureStats(adventure) {
        const stats = this.gameState.adventureStats;
        
        // Update basic stats
        stats.totalAdventures++;
        stats.adventuresCompleted++;
        stats.currentStreak++;
        stats.totalGoldFound += adventure.goldFound;
        stats.totalExperienceGained += adventure.experienceGained;
        stats.totalHealthLost += (100 - adventure.health);
        stats.totalItemsFound += adventure.itemsFound.length;
        
        // Update best streak
        if (stats.currentStreak > stats.bestStreak) {
            stats.bestStreak = stats.currentStreak;
        }
        
        // Update best/worst adventure records
        const adventureScore = adventure.goldFound + adventure.experienceGained + adventure.health;
        const bestScore = stats.bestAdventure.gold + stats.bestAdventure.experience + stats.bestAdventure.health;
        const worstScore = stats.worstAdventure.gold + stats.worstAdventure.experience + stats.worstAdventure.health;
        
        if (adventureScore > bestScore) {
            stats.bestAdventure = {
                gold: adventure.goldFound,
                experience: adventure.experienceGained,
                health: adventure.health,
                events: adventure.storyPath.length
            };
        }
        
        if (adventureScore < worstScore || stats.worstAdventure.gold === 0) {
            stats.worstAdventure = {
                gold: adventure.goldFound,
                experience: adventure.experienceGained,
                health: adventure.health,
                events: adventure.storyPath.length
            };
        }
        
        // Check for achievements
        this.checkAdventureAchievements(stats);
    }

    checkAdventureAchievements(stats) {
        const achievements = stats.achievements;
        
        // Desert Survivor - Complete 10 adventures
        if (stats.adventuresCompleted >= 10 && !achievements.includes('desert_survivor')) {
            achievements.push('desert_survivor');
        }
        
        // Gold Hunter - Find 500+ gold total
        if (stats.totalGoldFound >= 500 && !achievements.includes('gold_hunter')) {
            achievements.push('gold_hunter');
        }
        
        // Streak Master - Get 5+ adventure streak
        if (stats.bestStreak >= 5 && !achievements.includes('streak_master')) {
            achievements.push('streak_master');
        }
        
        // Honor Bound - Reach 50+ honor score
        if (this.gameState.honorScore >= 50 && !achievements.includes('honor_bound')) {
            achievements.push('honor_bound');
        }
        
        // Risk Taker - Complete adventure with <20 health
        if (stats.worstAdventure.health < 20 && !achievements.includes('risk_taker')) {
            achievements.push('risk_taker');
        }
        
        // Treasure Seeker - Find 20+ items total
        if (stats.totalItemsFound >= 20 && !achievements.includes('treasure_seeker')) {
            achievements.push('treasure_seeker');
        }
    }

    async showAdventureStatistics() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ╔════ ADVENTURE STATISTICS ════╗' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  ║ Your Adventure Ride Records ║' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  ╚═══════════════════════════════════╝' + ANSIParser.reset());
        this.terminal.println('');
        
        // Ensure adventureStats exists, initialize if missing
        if (!this.gameState.adventureStats) {
            this.gameState.adventureStats = {
                totalAdventures: 0,
                adventuresCompleted: 0,
                currentStreak: 0,
                bestStreak: 0,
                totalGoldFound: 0,
                totalExperienceGained: 0,
                totalHealthLost: 0,
                totalItemsFound: 0,
                eventsEncountered: {},
                achievements: [],
                bestAdventure: {
                    gold: 0,
                    experience: 0,
                    health: 100,
                    events: 0
                },
                worstAdventure: {
                    gold: 0,
                    experience: 0,
                    health: 100,
                    events: 0
                }
            };
        }
        
        const stats = this.gameState.adventureStats;
        
        // Basic Statistics
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  📊 Adventure Records:' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + `  Total Adventures Started: ${stats.totalAdventures}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + `  Adventures Completed: ${stats.adventuresCompleted}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + `  Current Streak: ${stats.currentStreak}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-magenta') + `  Best Streak: ${stats.bestStreak}` + ANSIParser.reset());
        this.terminal.println('');
        
        // Rewards Statistics
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  💰 Rewards Earned:' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + `  Total Gold Found: ${stats.totalGoldFound}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + `  Total Experience: ${stats.totalExperienceGained}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + `  Total Items Found: ${stats.totalItemsFound}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-red') + `  Total Health Lost: ${stats.totalHealthLost}` + ANSIParser.reset());
        this.terminal.println('');
        
        // Best/Worst Adventures
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  🏆 Adventure Records:' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + `  Best Adventure: ${stats.bestAdventure.gold} gold, ${stats.bestAdventure.experience} XP, ${stats.bestAdventure.health} health` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-red') + `  Worst Adventure: ${stats.worstAdventure.gold} gold, ${stats.worstAdventure.experience} XP, ${stats.worstAdventure.health} health` + ANSIParser.reset());
        this.terminal.println('');
        
        // Achievements
        if (stats.achievements.length > 0) {
            this.terminal.println(ANSIParser.fg('bright-cyan') + '  🏅 Achievements Unlocked:' + ANSIParser.reset());
            stats.achievements.forEach(achievement => {
                const achievementNames = {
                    'desert_survivor': '🏜️ Desert Survivor - Complete 10 adventures',
                    'gold_hunter': '💰 Gold Hunter - Find 500+ gold total',
                    'streak_master': '🔥 Streak Master - Get 5+ adventure streak',
                    'honor_bound': '⚖️ Honor Bound - Reach 50+ honor score',
                    'risk_taker': '⚡ Risk Taker - Complete adventure with <20 health',
                    'treasure_seeker': '🎁 Treasure Seeker - Find 20+ items total'
                };
                this.terminal.println(ANSIParser.fg('bright-yellow') + `  ${achievementNames[achievement] || achievement}` + ANSIParser.reset());
            });
            this.terminal.println('');
        } else {
            this.terminal.println(ANSIParser.fg('bright-white') + '  🏅 No achievements yet. Keep adventuring!' + ANSIParser.reset());
            this.terminal.println('');
        }
        
        // Current Character Stats
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  👤 Current Character:' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + `  Level: ${this.gameState.level}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-blue') + `  Honor Score: ${this.gameState.honorScore}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + `  Total Gold: ${this.gameState.gold}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + `  Total Experience: ${this.gameState.experience}` + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  Press [ENTER] to continue...' + ANSIParser.reset());
        await this.terminal.input();
        return;
    }

    async concludeAdventure(adventure) {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  🏁 ADVENTURE COMPLETE!' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  📊 Adventure Summary:' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + `  💰 Gold Found: ${adventure.goldFound}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + `  ⭐ Experience Gained: ${adventure.experienceGained} (added to your total XP)` + ANSIParser.reset());
        
        if (adventure.itemsFound.length > 0) {
            this.terminal.println(ANSIParser.fg('bright-cyan') + `  🎁 Items Found: ${adventure.itemsFound.join(', ')}` + ANSIParser.reset());
        }
        
        this.terminal.println(ANSIParser.fg('bright-white') + `  ❤️  Health Remaining: ${adventure.health}/100` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-blue') + `  ⚖️  Honor Score: ${this.gameState.honorScore} (affects all High Noon Hustle games)` + ANSIParser.reset());
        this.terminal.println('');
        
        // Update adventure statistics
        this.updateAdventureStats(adventure);
        
        // Apply rewards
        this.gameState.gold += adventure.goldFound;
        this.gameState.experience += adventure.experienceGained;
        
        // Health penalty if low
        if (adventure.health < 50) {
            const healthPenalty = 50 - adventure.health;
            this.terminal.println(ANSIParser.fg('bright-red') + `  ⚠️  You're wounded! -${healthPenalty} energy tomorrow.` + ANSIParser.reset());
            // Could implement health system here
        }
        
        // Honor-based ending message
        if (this.gameState.honorScore >= 50) {
            this.terminal.println(ANSIParser.fg('bright-green') + '  🏆 Your honorable actions are remembered!' + ANSIParser.reset());
        } else if (this.gameState.honorScore <= 20) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  ⚠️  Your reputation precedes you...' + ANSIParser.reset());
        }
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  Press [ENTER] to continue...' + ANSIParser.reset());
        await this.terminal.input();
        
        await this.showHumorMessage('adventure');
        await this.savePlayerData();
        await this.terminal.sleep(2000);
        return;
    }

    async startMultiplayerBeanCooking() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-green') + '  🍲 Starting Multiplayer Bean Cooking Contest...' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + `  Cooks: ${this.onlinePlayers.length}` + ANSIParser.reset());
        this.terminal.println('');

        // Deduct energy
        this.gameState.energy -= 20;

        // Create cooking results for all players
        const cookingResults = [];
        this.onlinePlayers.forEach(player => {
            const flavor = Math.random() * 100 + 50; // 50-150 flavor
            const chaos = Math.random() * 100 + 30; // 30-130 chaos
            const explosive = Math.random() * 50; // 0-50 explosive
            const totalScore = flavor + chaos + explosive;
            cookingResults.push({
                player: player,
                flavor: flavor,
                chaos: chaos,
                explosive: explosive,
                totalScore: totalScore
            });
        });

        // Sort by total score (highest first)
        cookingResults.sort((a, b) => b.totalScore - a.totalScore);

        // Show cooking results
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  🍲 Cooking Results:' + ANSIParser.reset());
        cookingResults.forEach((result, index) => {
            const position = index + 1;
            const townTag = this.getTownTag(result.player.current_town);
            const medal = position === 1 ? '🥇' : position === 2 ? '🥈' : position === 3 ? '🥉' : '👨‍🍳';
            this.terminal.println(ANSIParser.fg('bright-white') + `  ${medal} ${position}. ${townTag} ${result.player.display_name}` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-cyan') + `      Flavor: ${result.flavor.toFixed(1)} | Chaos: ${result.chaos.toFixed(1)} | Explosive: ${result.explosive.toFixed(1)}` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-yellow') + `      Total: ${result.totalScore.toFixed(1)}` + ANSIParser.reset());
            this.terminal.println('');
        });

        // Calculate rewards
        const winner = cookingResults[0];
        const goldReward = Math.floor(50 + (this.onlinePlayers.length * 10));
        
        if (winner.player.id === this.player.id) {
            this.terminal.println(ANSIParser.fg('bright-green') + `  🏆 YOU WIN! You won ${goldReward} gold!` + ANSIParser.reset());
            this.gameState.gold += goldReward;
            this.gameState.experience += 35;
        } else {
            this.terminal.println(ANSIParser.fg('bright-yellow') + `  🎯 ${winner.player.display_name} wins the contest and ${goldReward} gold!` + ANSIParser.reset());
            this.gameState.experience += 15;
        }

        await this.savePlayerData();
        await this.terminal.sleep(3000);
        return;
    }

    async goldPanningCompetition() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  ╔════ GOLD PANNING COMPETITION ════╗' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ║ Find the Shiniest Gold in the Creek ║' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  ╚═══════════════════════════════════╝' + ANSIParser.reset());
        this.terminal.println('');
        
        if (this.gameState.energy < 25) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  ❌ Not enough energy! Need 25 energy to pan.' + ANSIParser.reset());
            await this.terminal.sleep(2000);
            return;
        }

        if (this.onlinePlayers.length < 2) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Need at least 2 players for the gold panning competition!' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  Wait for others to join!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
            return;
        }

        this.terminal.println(ANSIParser.fg('bright-yellow') + '  ⛏️  Prospectors in the Competition:' + ANSIParser.reset());
        this.onlinePlayers.forEach((player, index) => {
            const townTag = this.getTownTag(player.current_town);
            this.terminal.println(ANSIParser.fg('bright-white') + `    ${index + 1}. ${townTag} ${player.display_name}` + ANSIParser.reset());
        });
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-green') + `  💰 Your Gold: ${this.gameState.gold}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + `  ⚡ Energy Cost: 25` + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [Y] Join Gold Panning Competition' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [B] Back to Saloon' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
        
        const choice = (await this.terminal.input()).toLowerCase().trim();
        
        if (choice === 'y' || choice === 'yes') {
            await this.startMultiplayerGoldPanning();
        } else if (choice === 'b' || choice === 'back') {
            return;
        } else {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Invalid choice!' + ANSIParser.reset());
            await this.terminal.sleep(1000);
            return;
        }
    }

    async startMultiplayerGoldPanning() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-green') + '  ⛏️  Starting Multiplayer Gold Panning Competition...' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + `  Prospectors: ${this.onlinePlayers.length}` + ANSIParser.reset());
        this.terminal.println('');

        // Deduct energy
        this.gameState.energy -= 25;

        // Create panning results for all players
        const panningResults = [];
        this.onlinePlayers.forEach(player => {
            const baseGold = Math.random() * 50 + 20; // 20-70 base gold
            const luck = Math.random() * 30; // 0-30 luck bonus
            const skill = Math.random() * 20; // 0-20 skill bonus
            const totalGold = baseGold + luck + skill;
            panningResults.push({
                player: player,
                baseGold: baseGold,
                luck: luck,
                skill: skill,
                totalGold: totalGold
            });
        });

        // Sort by total gold (highest first)
        panningResults.sort((a, b) => b.totalGold - a.totalGold);

        // Show panning results
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ⛏️  Panning Results:' + ANSIParser.reset());
        panningResults.forEach((result, index) => {
            const position = index + 1;
            const townTag = this.getTownTag(result.player.current_town);
            const medal = position === 1 ? '🥇' : position === 2 ? '🥈' : position === 3 ? '🥉' : '⛏️';
            this.terminal.println(ANSIParser.fg('bright-white') + `  ${medal} ${position}. ${townTag} ${result.player.display_name}` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-cyan') + `      Base: ${result.baseGold.toFixed(1)} | Luck: ${result.luck.toFixed(1)} | Skill: ${result.skill.toFixed(1)}` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-yellow') + `      Total: ${result.totalGold.toFixed(1)} gold` + ANSIParser.reset());
            this.terminal.println('');
        });

        // Calculate rewards
        const winner = panningResults[0];
        const goldReward = Math.floor(winner.totalGold);
        
        if (winner.player.id === this.player.id) {
            this.terminal.println(ANSIParser.fg('bright-green') + `  🏆 YOU WIN! You found ${goldReward} gold!` + ANSIParser.reset());
            this.gameState.gold += goldReward;
            this.gameState.experience += 40;
        } else {
            this.terminal.println(ANSIParser.fg('bright-yellow') + `  🎯 ${winner.player.display_name} wins and found ${goldReward} gold!` + ANSIParser.reset());
            this.gameState.experience += 20;
        }

        await this.savePlayerData();
        await this.terminal.sleep(3000);
        return;
    }

    async practiceShootingRange() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  ╔════ PRACTICE SHOOTING RANGE ════╗' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ║ Improve Your Aim & Reflexes ║' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  ╚═══════════════════════════════════╝' + ANSIParser.reset());
        this.terminal.println('');
        
        if (this.gameState.energy < 10) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  ❌ Not enough energy! Need 10 energy to practice.' + ANSIParser.reset());
            await this.terminal.sleep(2000);
            return;
        }
        
        this.terminal.println(ANSIParser.fg('bright-green') + `  💰 Your Gold: ${this.gameState.gold}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + `  ⚡ Energy Cost: 10` + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Practice your quick draw! Press any key when ready...' + ANSIParser.reset());
        await this.terminal.input();
        
        this.gameState.energy -= 10;
        
        this.terminal.println(ANSIParser.fg('bright-red') + '  🎯 Target appears!' + ANSIParser.reset());
        await this.terminal.sleep(500);
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  ⚡ DRAW!' + ANSIParser.reset());
        await this.terminal.sleep(200);
        
        const startTime = Date.now();
        await this.terminal.input();
        const reactionTime = Date.now() - startTime;
        
        const weapon = this.equipmentData.weapons[this.gameState.equipment.weapon];
        const accuracyBonus = weapon.accuracy;
        const hitChance = Math.min(95, 60 + accuracyBonus + (reactionTime < 500 ? 20 : 0));
        const hit = Math.random() * 100 < hitChance;
        
        if (hit) {
            const score = Math.max(1, 100 - Math.floor(reactionTime / 10));
            this.gameState.experience += score;
            
            this.terminal.println(ANSIParser.fg('bright-green') + `  🎯 BULLSEYE! Score: ${score}` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-cyan') + `  ⚡ Reaction time: ${reactionTime}ms` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-yellow') + `  📈 +${score} XP` + ANSIParser.reset());
        } else {
            this.terminal.println(ANSIParser.fg('bright-red') + '  💥 Missed! Better luck next time.' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-cyan') + `  ⚡ Reaction time: ${reactionTime}ms` + ANSIParser.reset());
        }
        
        await this.showHumorMessage('duel');
        await this.savePlayerData();
        await this.terminal.sleep(3000);
        
        // Return to mini-games menu
        await this.soloMiniGames();
    }

    // ENERGY RECOVERY SYSTEM
    async energyRecovery() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  ╔════ ENERGY RECOVERY ════╗' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ║ Rest & Recharge Your Energy ║' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  ╚═══════════════════════════════════╝' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-green') + `  Current Energy: ${this.getEnergyBar()} ${this.gameState.energy}/${this.gameState.maxEnergy}` + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Choose how to recover energy:' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  [1]' + ANSIParser.reset() + ' Eat Beans & Stew (+10-40 energy, costs gold)');
        this.terminal.println(ANSIParser.fg('bright-blue') + '  [2]' + ANSIParser.reset() + ' Take a Nap (+15-30 energy, time passes)');
        this.terminal.println(ANSIParser.fg('bright-magenta') + '  [3]' + ANSIParser.reset() + ' Drink Coffee (+20-35 energy, costs gold)');
        this.terminal.println(ANSIParser.fg('bright-green') + '  [4]' + ANSIParser.reset() + ' Rest in Shade (+5-25 energy, free)');
        this.terminal.println(ANSIParser.fg('bright-red') + '  [5]' + ANSIParser.reset() + ' Push Yourself (+25 now, -25 tomorrow)');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [6]' + ANSIParser.reset() + ' Drink Tonic (+25 energy, crash tomorrow)');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [B]' + ANSIParser.reset() + ' Back to Main Menu');
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
        
        const choice = await this.terminal.input();
        
        if (choice === '1') {
            await this.eatBeansAndStew();
        } else if (choice === '2') {
            await this.takeANap();
        } else if (choice === '3') {
            await this.drinkCoffee();
        } else if (choice === '4') {
            await this.restInShade();
        } else if (choice === '5') {
            await this.pushYourself();
        } else if (choice === '6') {
            await this.drinkTonic();
        } else if (choice.toLowerCase() === 'b') {
            return;
        } else {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Invalid choice!' + ANSIParser.reset());
            await this.terminal.sleep(1000);
        }
    }

    async eatBeansAndStew() {
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  🍲 You sit down for a hearty meal...' + ANSIParser.reset());
        await this.terminal.sleep(1000);
        
        const energyGain = Math.floor(Math.random() * 31) + 10; // 10-40 energy
        const cost = Math.floor(energyGain * 0.8); // Cost based on energy gained
        
        if (this.gameState.gold < cost) {
            this.terminal.println(ANSIParser.fg('bright-red') + `  You need ${cost} gold for this meal, but only have ${this.gameState.gold}!` + ANSIParser.reset());
            await this.terminal.sleep(2000);
            return;
        }
        
        this.gameState.gold -= cost;
        this.gameState.energy = Math.min(this.gameState.energy + energyGain, this.gameState.maxEnergy);
        
        this.terminal.println(ANSIParser.fg('bright-green') + `  You gained ${energyGain} energy! (Cost: ${cost} gold)` + ANSIParser.reset());
        await this.showHumorMessage('energy');
        await this.savePlayerData();
        await this.terminal.sleep(2000);
    }

    async takeANap() {
        this.terminal.println(ANSIParser.fg('bright-blue') + '  😴 You find a quiet spot to rest...' + ANSIParser.reset());
        await this.terminal.sleep(1000);
        
        const energyGain = Math.floor(Math.random() * 16) + 15; // 15-30 energy
        this.gameState.energy = Math.min(this.gameState.energy + energyGain, this.gameState.maxEnergy);
        
        this.terminal.println(ANSIParser.fg('bright-green') + `  You gained ${energyGain} energy! (Time passed while you slept)` + ANSIParser.reset());
        await this.showHumorMessage('energy');
        await this.savePlayerData();
        await this.terminal.sleep(2000);
    }

    async drinkCoffee() {
        this.terminal.println(ANSIParser.fg('bright-magenta') + '  ☕ You brew some strong coffee...' + ANSIParser.reset());
        await this.terminal.sleep(1000);
        
        const energyGain = Math.floor(Math.random() * 16) + 20; // 20-35 energy
        const cost = Math.floor(energyGain * 0.6); // Coffee is cheaper than food
        
        if (this.gameState.gold < cost) {
            this.terminal.println(ANSIParser.fg('bright-red') + `  You need ${cost} gold for coffee, but only have ${this.gameState.gold}!` + ANSIParser.reset());
            await this.terminal.sleep(2000);
            return;
        }
        
        this.gameState.gold -= cost;
        this.gameState.energy = Math.min(this.gameState.energy + energyGain, this.gameState.maxEnergy);
        
        this.terminal.println(ANSIParser.fg('bright-green') + `  You gained ${energyGain} energy! (Cost: ${cost} gold)` + ANSIParser.reset());
        await this.showHumorMessage('energy');
        await this.savePlayerData();
        await this.terminal.sleep(2000);
    }

    async restInShade() {
        this.terminal.println(ANSIParser.fg('bright-green') + '  🌳 You find a nice shady spot to rest...' + ANSIParser.reset());
        await this.terminal.sleep(1000);
        
        const energyGain = Math.floor(Math.random() * 21) + 5; // 5-25 energy
        this.gameState.energy = Math.min(this.gameState.energy + energyGain, this.gameState.maxEnergy);
        
        this.terminal.println(ANSIParser.fg('bright-green') + `  You gained ${energyGain} energy! (Free rest in the shade)` + ANSIParser.reset());
        await this.showHumorMessage('energy');
        await this.savePlayerData();
        await this.terminal.sleep(2000);
    }

    async pushYourself() {
        this.terminal.println(ANSIParser.fg('bright-red') + '  💪 You push yourself beyond your limits...' + ANSIParser.reset());
        await this.terminal.sleep(1000);
        
        const energyGain = 25;
        this.gameState.energy = Math.min(this.gameState.energy + energyGain, this.gameState.maxEnergy);
        
        // Store the debt for tomorrow
        if (!this.gameState.energyDebt) this.gameState.energyDebt = 0;
        this.gameState.energyDebt += 25;
        
        this.terminal.println(ANSIParser.fg('bright-green') + `  You gained ${energyGain} energy! (You'll be -25 energy tomorrow)` + ANSIParser.reset());
        await this.showHumorMessage('energy');
        await this.savePlayerData();
        await this.terminal.sleep(2000);
    }

    async drinkTonic() {
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  🧪 You drink a mysterious frontier tonic...' + ANSIParser.reset());
        await this.terminal.sleep(1000);
        
        const energyGain = 25;
        this.gameState.energy = Math.min(this.gameState.energy + energyGain, this.gameState.maxEnergy);
        
        // Store the crash for tomorrow
        if (!this.gameState.tonicCrash) this.gameState.tonicCrash = 0;
        this.gameState.tonicCrash += 10;
        
        this.terminal.println(ANSIParser.fg('bright-green') + `  You gained ${energyGain} energy! (You'll crash -10 energy tomorrow)` + ANSIParser.reset());
        await this.showHumorMessage('energy');
        await this.savePlayerData();
        await this.terminal.sleep(2000);
    }

    // GAZETTE SYSTEM
    async viewGazette() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  ╔════ THE GAZETTE ════╗' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ║ Funny Stories & News ║' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  ╚═══════════════════════════╝' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  📰 Today\'s Headlines:' + ANSIParser.reset());
        this.terminal.println('');
        
        const stories = [
            "Sheriff Clem arrested his own reflection again. The mirror is now in jail.",
            "A tumbleweed won the horse race. The horses are considering retirement.",
            "Someone tried to rob the stagecoach but it was full of clowns. They got robbed instead.",
            "The saloon piano is now played by a goat. He's surprisingly good at ragtime.",
            "A prospector found gold in his beans. The town is now mining the saloon kitchen.",
            "Someone challenged a cactus to a duel. The cactus won by default.",
            "A horse learned to play poker and cleaned out the entire saloon.",
            "Someone tried to lasso a cloud. It worked, but now it's raining indoors.",
            "The ghost town had a party. All the ghosts showed up and had a great time.",
            "Someone tried to tame a wild tumbleweed. The tumbleweed tamed them instead."
        ];
        
        stories.slice(0, 5).forEach((story, index) => {
            this.terminal.println(ANSIParser.fg('bright-white') + `  ${index + 1}. ${story}` + ANSIParser.reset());
        });
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  💭 Submit your own funny story in the saloon!' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Press any key to continue...' + ANSIParser.reset());
        await this.terminal.input();
    }

    // MULTIPLAYER-FIRST METHODS - PvP & Co-op Emphasis
    
    async pvpAction() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-red') + '  ╔════ PvP ACTION ════╗' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ║ Player vs Player Combat ║' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  ╚═══════════════════════════╝' + ANSIParser.reset());
        this.terminal.println('');
        
        if (this.onlinePlayers.length <= 1) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  🏜️  No other players online for PvP!' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  Wait for others to join or invite friends!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
            return;
        }
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  ⚔️  PvP Activities:' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [1]' + ANSIParser.reset() + ' Quick Draw Duel (1v1)');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [2]' + ANSIParser.reset() + ' Bank Robbery (Outlaws vs Lawmen)');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [3]' + ANSIParser.reset() + ' Bounty Hunt (Track & Capture)');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [4]' + ANSIParser.reset() + ' Posse vs Posse Battle');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [5]' + ANSIParser.reset() + ' High Stakes Poker');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [6]' + ANSIParser.reset() + ' Territory Control');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [B]' + ANSIParser.reset() + ' Back to Main Menu');
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
        
        const choice = (await this.terminal.input()).toLowerCase().trim();
        
        if (choice === '1') {
            await this.quickDrawDuel();
        } else if (choice === '2') {
            await this.bankRobbery();
        } else if (choice === '3') {
            await this.bountyHunt();
        } else if (choice === '4') {
            await this.posseBattle();
        } else if (choice === '5') {
            await this.highStakesPoker();
        } else if (choice === '6') {
            await this.territoryControl();
        } else if (choice === 'b' || choice === 'back') {
            return;
        } else {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Invalid choice!' + ANSIParser.reset());
            await this.terminal.sleep(1000);
        }
    }

    async coopMissions() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-green') + '  ╔════ CO-OP MISSIONS ════╗' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ║ Team Up for Adventure! ║' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  ╚═══════════════════════════════╝' + ANSIParser.reset());
        this.terminal.println('');
        
        if (this.onlinePlayers.length <= 1) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  🏜️  No other players online for co-op!' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  Wait for others to join or invite friends!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
            return;
        }
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  🤝 Co-op Missions:' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [1]' + ANSIParser.reset() + ' Stagecoach Defense (Team vs Bandits)');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [2]' + ANSIParser.reset() + ' Town Protection (Defend from Raid)');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [3]' + ANSIParser.reset() + ' Gold Rush Expedition (Mining Team)');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [4]' + ANSIParser.reset() + ' Break Up Robbery (Lawmen Team)');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [5]' + ANSIParser.reset() + ' Cattle Drive (Transport Mission)');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [6]' + ANSIParser.reset() + ' Ghost Town Investigation');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [B]' + ANSIParser.reset() + ' Back to Main Menu');
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
        
        const choice = (await this.terminal.input()).toLowerCase().trim();
        
        if (choice === '1') {
            await this.stagecoachDefense();
        } else if (choice === '2') {
            await this.townProtection();
        } else if (choice === '3') {
            await this.goldRushExpedition();
        } else if (choice === '4') {
            await this.breakUpRobbery();
        } else if (choice === '5') {
            await this.cattleDrive();
        } else if (choice === '6') {
            await this.ghostTownInvestigation();
        } else if (choice === 'b' || choice === 'back') {
            return;
        } else {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Invalid choice!' + ANSIParser.reset());
            await this.terminal.sleep(1000);
        }
    }

    async competitionsAndTournaments() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ╔════ COMPETITIONS & TOURNAMENTS ════╗' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  ║ Compete for Glory and Gold! ║' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  ╚═══════════════════════════════════════╝' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  🏆 Active Competitions:' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [1]' + ANSIParser.reset() + ' Tumbleweed Derby (Racing Tournament)');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [2]' + ANSIParser.reset() + ' Bean Cooking Contest (Team Event)');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [3]' + ANSIParser.reset() + ' Tall Tale Contest (Storytelling)');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [4]' + ANSIParser.reset() + ' Quick Draw Championship');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [5]' + ANSIParser.reset() + ' Gold Panning Competition');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [6]' + ANSIParser.reset() + ' Horse Racing Tournament');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [7]' + ANSIParser.reset() + ' Poker Championship');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [B]' + ANSIParser.reset() + ' Back to Main Menu');
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
        
        const choice = (await this.terminal.input()).toLowerCase().trim();
        
        if (choice === '1') {
            await this.tumbleweedDerby();
        } else if (choice === '2') {
            await this.beanCookingContest();
        } else if (choice === '3') {
            await this.tallTaleContest();
        } else if (choice === '4') {
            await this.quickDrawChampionship();
        } else if (choice === '5') {
            await this.goldPanningCompetition();
        } else if (choice === '6') {
            await this.horseRacingTournament();
        } else if (choice === '7') {
            await this.pokerChampionship();
        } else if (choice === 'b' || choice === 'back') {
            return;
        } else {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Invalid choice!' + ANSIParser.reset());
            await this.terminal.sleep(1000);
        }
    }

    async soloAdventures() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-blue') + '  ╔════ SOLO ADVENTURES ════╗' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ║ When you\'re flying solo ║' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  ╚═══════════════════════════════╝' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  🏜️  Solo Activities:' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [1]' + ANSIParser.reset() + ' Explore the Wilderness');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [2]' + ANSIParser.reset() + ' Hunt for Gold');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [3]' + ANSIParser.reset() + ' Practice Shooting');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [4]' + ANSIParser.reset() + ' Visit Ghost Towns');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [5]' + ANSIParser.reset() + ' Goat Wranglin\'');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [6]' + ANSIParser.reset() + ' Energy Recovery');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [B]' + ANSIParser.reset() + ' Back to Main Menu');
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  💡 Tip: Solo activities are great for building up energy and gold for multiplayer action!' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
        
        const choice = (await this.terminal.input()).toLowerCase().trim();
        
        if (choice === '1') {
            await this.exploreWilderness();
        } else if (choice === '2') {
            await this.huntForGold();
        } else if (choice === '3') {
            await this.practiceShooting();
        } else if (choice === '4') {
            await this.visitGhostTown();
        } else if (choice === '5') {
            await this.goatWrangling();
        } else if (choice === '6') {
            await this.socialEnergyRecovery();
        } else if (choice === 'b' || choice === 'back') {
            return;
        } else {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Invalid choice!' + ANSIParser.reset());
            await this.terminal.sleep(1000);
        }
    }

    // PvP ACTION METHODS
    async quickDrawDuel() {
        this.terminal.println(ANSIParser.fg('bright-red') + '  ⚔️  Quick Draw Duel!' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Challenge another player to a duel!' + ANSIParser.reset());
        await this.showHumorMessage('duel');
        // TODO: Implement real-time duel system
        await this.terminal.sleep(2000);
    }

    async bankRobbery() {
        this.terminal.println(ANSIParser.fg('bright-red') + '  🏦 Bank Robbery!' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Outlaws vs Lawmen - who will win?' + ANSIParser.reset());
        await this.showHumorMessage('special');
        // TODO: Implement bank robbery event
        await this.terminal.sleep(2000);
    }

    async bountyHunt() {
        this.terminal.println(ANSIParser.fg('bright-red') + '  🎯 Bounty Hunt!' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Track down wanted players!' + ANSIParser.reset());
        // TODO: Implement bounty hunting system
        await this.terminal.sleep(2000);
    }

    async posseBattle() {
        this.terminal.println(ANSIParser.fg('bright-red') + '  👥 Posse vs Posse!' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Team battles for territory!' + ANSIParser.reset());
        // TODO: Implement posse battle system
        await this.terminal.sleep(2000);
    }

    async highStakesPoker() {
        this.terminal.println(ANSIParser.fg('bright-red') + '  🃏 High Stakes Poker!' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Risk it all in a poker game!' + ANSIParser.reset());
        // TODO: Implement high stakes poker
        await this.terminal.sleep(2000);
    }

    async territoryControl() {
        this.terminal.println(ANSIParser.fg('bright-red') + '  🗺️  Territory Control!' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Fight for control of the frontier!' + ANSIParser.reset());
        // TODO: Implement territory control system
        await this.terminal.sleep(2000);
    }

    // CO-OP MISSION METHODS
    async stagecoachDefense() {
        if (this.onlinePlayers.length < 2) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Need at least 2 players for co-op missions!' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  Wait for others to join!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
            await this.enterSaloon();
            return;
        }

        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-green') + '  ╔════ STAGECOACH DEFENSE ════╗' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ║ Protect the Gold Transport! ║' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  ╚═══════════════════════════════════╝' + ANSIParser.reset());
        this.terminal.println('');

        this.terminal.println(ANSIParser.fg('bright-yellow') + '  🚌 The stagecoach is carrying 500 gold!' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-red') + '  🏴‍☠️  Bandits are approaching from the hills!' + ANSIParser.reset());
        this.terminal.println('');

        // Show team members
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  🤠 Defense Team:' + ANSIParser.reset());
        this.onlinePlayers.forEach(player => {
            this.terminal.println(ANSIParser.fg('bright-white') + `    • ${player.display_name} (${player.character_class})` + ANSIParser.reset());
        });
        this.terminal.println('');

        this.terminal.println(ANSIParser.fg('bright-white') + '  Press ENTER when ready to start the defense!' + ANSIParser.reset());
        await this.terminal.input();

        // Defense sequence
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-red') + '  🏴‍☠️  BANDITS ATTACK!' + ANSIParser.reset());
        await this.terminal.sleep(1000);

        let stagecoachHealth = 100;
        let bandits = 5;
        let round = 1;

        while (stagecoachHealth > 0 && bandits > 0) {
            this.terminal.println(ANSIParser.fg('bright-yellow') + `  Round ${round} - Stagecoach Health: ${stagecoachHealth}% | Bandits: ${bandits}` + ANSIParser.reset());
            this.terminal.println('');

            // Team action
            this.terminal.println(ANSIParser.fg('bright-cyan') + '  Choose your action:' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-white') + '  [1] Shoot at bandits' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-white') + '  [2] Repair stagecoach' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-white') + '  [3] Use special ability' + ANSIParser.reset());
            this.terminal.println('');

            const action = await this.terminal.input();

            let damage = 0;
            let repair = 0;

            switch (action) {
                case '1':
                    damage = Math.floor(Math.random() * 20) + 10;
                    bandits = Math.max(0, bandits - 1);
                    this.terminal.println(ANSIParser.fg('bright-green') + `  💥 You shot a bandit! (-1 bandit)` + ANSIParser.reset());
                    break;
                case '2':
                    repair = Math.floor(Math.random() * 15) + 5;
                    stagecoachHealth = Math.min(100, stagecoachHealth + repair);
                    this.terminal.println(ANSIParser.fg('bright-blue') + `  🔧 Repaired stagecoach! (+${repair} health)` + ANSIParser.reset());
                    break;
                case '3':
                    damage = Math.floor(Math.random() * 30) + 20;
                    bandits = Math.max(0, bandits - 2);
                    this.terminal.println(ANSIParser.fg('bright-magenta') + `  ⚡ Special attack! (-2 bandits)` + ANSIParser.reset());
                    break;
                default:
                    this.terminal.println(ANSIParser.fg('bright-red') + '  Invalid action! You fumble around.' + ANSIParser.reset());
            }

            // Bandit damage
            if (bandits > 0) {
                const banditDamage = Math.floor(Math.random() * 15) + 5;
                stagecoachHealth = Math.max(0, stagecoachHealth - banditDamage);
                this.terminal.println(ANSIParser.fg('bright-red') + `  🏴‍☠️  Bandits damage stagecoach! (-${banditDamage} health)` + ANSIParser.reset());
            }

            await this.terminal.sleep(2000);
            round++;
        }

        // Results
        this.terminal.println('');
        if (stagecoachHealth > 0) {
            this.terminal.println(ANSIParser.fg('bright-green') + '  🏆 VICTORY! Stagecoach defended successfully!' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  💰 Each team member earns 50 gold and 30 XP!' + ANSIParser.reset());
            this.gameState.gold += 50;
            this.gameState.experience += 30;
            await this.showHumorMessage('special');
        } else {
            this.terminal.println(ANSIParser.fg('bright-red') + '  💀 DEFEAT! The stagecoach was destroyed!' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  💰 Each team member earns 10 gold and 5 XP for trying.' + ANSIParser.reset());
            this.gameState.gold += 10;
            this.gameState.experience += 5;
        }

        await this.savePlayerData();
        await this.terminal.sleep(3000);
        await this.enterSaloon();
    }

    async townProtection() {
        this.terminal.println(ANSIParser.fg('bright-green') + '  🏘️  Town Protection!' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Defend the town from a bandit raid!' + ANSIParser.reset());
        // TODO: Implement town protection co-op mission
        await this.terminal.sleep(2000);
    }

    async goldRushExpedition() {
        this.terminal.println(ANSIParser.fg('bright-green') + '  ⛏️  Gold Rush Expedition!' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Team mining mission for big rewards!' + ANSIParser.reset());
        // TODO: Implement gold rush co-op mission
        await this.terminal.sleep(2000);
    }

    async breakUpRobbery() {
        this.terminal.println(ANSIParser.fg('bright-green') + '  🚔 Break Up Robbery!' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Lawmen team up to stop a robbery in progress!' + ANSIParser.reset());
        // TODO: Implement break up robbery co-op mission
        await this.terminal.sleep(2000);
    }

    async cattleDrive() {
        this.terminal.println(ANSIParser.fg('bright-green') + '  🐄 Cattle Drive!' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Team up to drive cattle across the frontier!' + ANSIParser.reset());
        // TODO: Implement cattle drive co-op mission
        await this.terminal.sleep(2000);
    }

    async ghostTownInvestigation() {
        this.terminal.println(ANSIParser.fg('bright-green') + '  👻 Ghost Town Investigation!' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Explore mysterious ghost towns together!' + ANSIParser.reset());
        // TODO: Implement ghost town investigation co-op mission
        await this.terminal.sleep(2000);
    }

    // COMPETITION METHODS

    async tallTaleContest() {
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  📖 Tall Tale Contest!' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Collaborative storytelling competition!' + ANSIParser.reset());
        // TODO: Implement tall tale contest
        await this.terminal.sleep(2000);
    }

    async quickDrawChampionship() {
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ⚔️  Quick Draw Championship!' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Tournament of the fastest guns!' + ANSIParser.reset());
        // TODO: Implement quick draw championship
        await this.terminal.sleep(2000);
    }


    async horseRacingTournament() {
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  🐎 Horse Racing Tournament!' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Bet on the fastest horses!' + ANSIParser.reset());
        // TODO: Implement horse racing tournament
        await this.terminal.sleep(2000);
    }

    async pokerChampionship() {
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  🃏 Poker Championship!' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  High stakes poker tournament!' + ANSIParser.reset());
        // TODO: Implement poker championship
        await this.terminal.sleep(2000);
    }

    // SOLO ADVENTURE METHODS
    async practiceShooting() {
        this.terminal.println(ANSIParser.fg('bright-blue') + '  🎯 Practice Shooting!' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Improve your aim at the shooting range!' + ANSIParser.reset());
        // TODO: Implement practice shooting
        await this.terminal.sleep(2000);
    }

    async leaderboardsAndRankings() {
        while (true) {
            this.terminal.clear();
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  ╔═══════════════════════════════════════' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  📊 LEADERBOARDS & RANKINGS 📊' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  ════════════════════════════════════════' + ANSIParser.reset());
            this.terminal.println('');
            
            this.terminal.println(ANSIParser.fg('bright-cyan') + '  🏆 Choose a leaderboard category:' + ANSIParser.reset());
            this.terminal.println('');
            
            this.terminal.println(ANSIParser.fg('bright-white') + '  [1]' + ANSIParser.reset() + ' 💰 Richest Outlaws (Gold)');
            this.terminal.println(ANSIParser.fg('bright-white') + '  [2]' + ANSIParser.reset() + ' ⭐ Most Experienced (XP)');
            this.terminal.println(ANSIParser.fg('bright-white') + '  [3]' + ANSIParser.reset() + ' ⚔️  Duel Champions (Wins)');
            this.terminal.println(ANSIParser.fg('bright-white') + '  [4]' + ANSIParser.reset() + ' 🏆 Tournament Winners');
            this.terminal.println(ANSIParser.fg('bright-white') + '  [5]' + ANSIParser.reset() + ' 🎯 Highest Level Players');
            this.terminal.println(ANSIParser.fg('bright-white') + '  [6]' + ANSIParser.reset() + ' 🏅 Honor Score Leaders');
            this.terminal.println(ANSIParser.fg('bright-white') + '  [7]' + ANSIParser.reset() + ' 🎮 Mini-Game Champions');
            this.terminal.println(ANSIParser.fg('bright-white') + '  [8]' + ANSIParser.reset() + ' 📊 Overall Rankings');
            this.terminal.println('');
            
            this.terminal.println(ANSIParser.fg('bright-white') + '  [B]' + ANSIParser.reset() + ' Back to Main Menu');
            this.terminal.println('');
            
            this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
            
            const choice = (await this.terminal.input()).toLowerCase().trim();
            
            if (choice === 'b' || choice === 'back') {
                return;
            } else if (choice === '1') {
                await this.showGoldLeaderboard();
            } else if (choice === '2') {
                await this.showExperienceLeaderboard();
            } else if (choice === '3') {
                await this.showDuelLeaderboard();
            } else if (choice === '4') {
                await this.showTournamentLeaderboard();
            } else if (choice === '5') {
                await this.showLevelLeaderboard();
            } else if (choice === '6') {
                await this.showHonorLeaderboard();
            } else if (choice === '7') {
                await this.showMiniGameLeaderboard();
            } else if (choice === '8') {
                await this.showOverallLeaderboard();
            } else {
                this.terminal.println(ANSIParser.fg('bright-red') + '  Invalid choice! Try again.' + ANSIParser.reset());
                await this.terminal.sleep(1000);
            }
        }
    }

    async showGoldLeaderboard() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  ╔═══════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  💰 RICHEST OUTLAWS (GOLD) 💰' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println('');
        
        try {
            const players = await this.getLeaderboardData('gold');
            this.displayLeaderboard(players, 'gold', 'Gold');
        } catch (error) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Error loading gold leaderboard: ' + error.message + ANSIParser.reset());
        }
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-white') + '  Press any key to continue...' + ANSIParser.reset());
        await this.terminal.input();
    }

    async showExperienceLeaderboard() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  ╔═══════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  ⭐ MOST EXPERIENCED PLAYERS ⭐' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println('');
        
        try {
            const players = await this.getLeaderboardData('experience');
            this.displayLeaderboard(players, 'experience', 'Experience');
        } catch (error) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Error loading experience leaderboard: ' + error.message + ANSIParser.reset());
        }
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-white') + '  Press any key to continue...' + ANSIParser.reset());
        await this.terminal.input();
    }

    async showDuelLeaderboard() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  ╔═══════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  ⚔️  DUEL CHAMPIONS ⚔️' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println('');
        
        try {
            const players = await this.getLeaderboardData('duel_wins');
            this.displayLeaderboard(players, 'duel_wins', 'Duel Wins');
        } catch (error) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Error loading duel leaderboard: ' + error.message + ANSIParser.reset());
        }
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-white') + '  Press any key to continue...' + ANSIParser.reset());
        await this.terminal.input();
    }

    async showTournamentLeaderboard() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  ╔═══════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  🏆 TOURNAMENT WINNERS 🏆' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println('');
        
        try {
            const players = await this.getLeaderboardData('tournament_wins');
            this.displayLeaderboard(players, 'tournament_wins', 'Tournament Wins');
        } catch (error) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Error loading tournament leaderboard: ' + error.message + ANSIParser.reset());
        }
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-white') + '  Press any key to continue...' + ANSIParser.reset());
        await this.terminal.input();
    }

    async showLevelLeaderboard() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  ╔═══════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  🎯 HIGHEST LEVEL PLAYERS 🎯' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println('');
        
        try {
            const players = await this.getLeaderboardData('level');
            this.displayLeaderboard(players, 'level', 'Level');
        } catch (error) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Error loading level leaderboard: ' + error.message + ANSIParser.reset());
        }
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-white') + '  Press any key to continue...' + ANSIParser.reset());
        await this.terminal.input();
    }

    async showHonorLeaderboard() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  ╔═══════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  🏅 HONOR SCORE LEADERS 🏅' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println('');
        
        try {
            const players = await this.getLeaderboardData('honor_score');
            this.displayLeaderboard(players, 'honor_score', 'Honor Score');
        } catch (error) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Error loading honor leaderboard: ' + error.message + ANSIParser.reset());
        }
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-white') + '  Press any key to continue...' + ANSIParser.reset());
        await this.terminal.input();
    }

    async showMiniGameLeaderboard() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  ╔═══════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  🎮 MINI-GAME CHAMPIONS 🎮' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println('');
        
        try {
            const players = await this.getLeaderboardData('mini_game_wins');
            this.displayLeaderboard(players, 'mini_game_wins', 'Mini-Game Wins');
        } catch (error) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Error loading mini-game leaderboard: ' + error.message + ANSIParser.reset());
        }
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-white') + '  Press any key to continue...' + ANSIParser.reset());
        await this.terminal.input();
    }

    async showOverallLeaderboard() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  ╔═══════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  📊 OVERALL RANKINGS 📊' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println('');
        
        try {
            const players = await this.getOverallRankings();
            this.displayOverallRankings(players);
        } catch (error) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Error loading overall rankings: ' + error.message + ANSIParser.reset());
        }
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-white') + '  Press any key to continue...' + ANSIParser.reset());
        await this.terminal.input();
    }

    async getLeaderboardData(category, limit = 10) {
        // For now, always use mock data since API endpoints don't exist yet
        console.log(`DEBUG: Using mock data for ${category} leaderboard`);
        return this.getMockLeaderboardData(category, limit);
        
        // TODO: Uncomment when API endpoints are implemented
        /*
        try {
            const response = await fetch('/api/leaderboard', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    game: 'high-noon-hustle',
                    category: category,
                    limit: limit
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data.players || [];
        } catch (error) {
            console.error('Error fetching leaderboard data:', error);
            // Return mock data for development
            return this.getMockLeaderboardData(category, limit);
        }
        */
    }

    getMockLeaderboardData(category, limit) {
        const mockPlayers = [
            { username: 'Halley66', display_name: 'Halley66', character_class: 'sheriff', gold: 1250, experience: 850, level: 8, honor_score: 95, duel_wins: 12, tournament_wins: 3, mini_game_wins: 25 },
            { username: 'SlowPoke', display_name: 'SlowPoke', character_class: 'outlaw', gold: 980, experience: 720, level: 6, honor_score: 78, duel_wins: 8, tournament_wins: 1, mini_game_wins: 18 },
            { username: 'QuickDraw', display_name: 'QuickDraw', character_class: 'gunslinger', gold: 2100, experience: 1200, level: 10, honor_score: 120, duel_wins: 20, tournament_wins: 5, mini_game_wins: 35 },
            { username: 'LuckyLuke', display_name: 'Lucky Luke', character_class: 'gambler', gold: 750, experience: 450, level: 4, honor_score: 45, duel_wins: 3, tournament_wins: 0, mini_game_wins: 12 },
            { username: 'WildBill', display_name: 'Wild Bill', character_class: 'sheriff', gold: 1800, experience: 950, level: 9, honor_score: 110, duel_wins: 15, tournament_wins: 2, mini_game_wins: 28 },
            { username: 'CalamityJane', display_name: 'Calamity Jane', character_class: 'outlaw', gold: 650, experience: 380, level: 3, honor_score: 35, duel_wins: 2, tournament_wins: 0, mini_game_wins: 8 },
            { username: 'DocHolliday', display_name: 'Doc Holliday', character_class: 'gambler', gold: 1500, experience: 800, level: 7, honor_score: 85, duel_wins: 10, tournament_wins: 1, mini_game_wins: 22 },
            { username: 'WyattEarp', display_name: 'Wyatt Earp', character_class: 'sheriff', gold: 2200, experience: 1100, level: 11, honor_score: 130, duel_wins: 18, tournament_wins: 4, mini_game_wins: 30 },
            { username: 'BillyTheKid', display_name: 'Billy the Kid', character_class: 'outlaw', gold: 420, experience: 250, level: 2, honor_score: 20, duel_wins: 1, tournament_wins: 0, mini_game_wins: 5 },
            { username: 'AnnieOakley', display_name: 'Annie Oakley', character_class: 'gunslinger', gold: 1100, experience: 680, level: 6, honor_score: 70, duel_wins: 7, tournament_wins: 1, mini_game_wins: 15 }
        ];

        // Sort by the specified category
        const sortedPlayers = mockPlayers.sort((a, b) => {
            if (category === 'gold' || category === 'experience' || category === 'level' || category === 'honor_score' || 
                category === 'duel_wins' || category === 'tournament_wins' || category === 'mini_game_wins') {
                return (b[category] || 0) - (a[category] || 0);
            }
            return 0;
        });

        return sortedPlayers.slice(0, limit);
    }

    displayLeaderboard(players, category, categoryName) {
        if (players.length === 0) {
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  No players found in this category.' + ANSIParser.reset());
            return;
        }

        this.terminal.println(ANSIParser.fg('bright-cyan') + `  Top ${players.length} ${categoryName} Leaders:` + ANSIParser.reset());
        this.terminal.println('');

        players.forEach((player, index) => {
            const rank = index + 1;
            const isCurrentPlayer = player.username === this.player?.username;
            const playerName = isCurrentPlayer ? `${player.display_name} (YOU)` : player.display_name;
            const value = player[category] || 0;
            
            let rankColor = ANSIParser.fg('bright-white');
            if (rank === 1) rankColor = ANSIParser.fg('bright-yellow');
            else if (rank === 2) rankColor = ANSIParser.fg('bright-cyan');
            else if (rank === 3) rankColor = ANSIParser.fg('bright-magenta');
            
            let nameColor = isCurrentPlayer ? ANSIParser.fg('bright-green') : ANSIParser.fg('bright-white');
            
            this.terminal.println(rankColor + `  ${rank}.` + ANSIParser.reset() + 
                nameColor + ` ${playerName}` + ANSIParser.reset() + 
                ANSIParser.fg('bright-cyan') + ` (${player.character_class})` + ANSIParser.reset() + 
                ANSIParser.fg('bright-yellow') + ` - ${this.formatValue(value, category)}` + ANSIParser.reset());
        });
    }

    formatValue(value, category) {
        switch (category) {
            case 'gold':
                return `${value} gold`;
            case 'experience':
                return `${value} XP`;
            case 'level':
                return `Level ${value}`;
            case 'honor_score':
                return `${value} honor`;
            case 'duel_wins':
            case 'tournament_wins':
            case 'mini_game_wins':
                return `${value} wins`;
            default:
                return value.toString();
        }
    }

    async getOverallRankings() {
        // For now, always use mock data since API endpoints don't exist yet
        console.log('DEBUG: Using mock data for overall rankings');
        return this.getMockOverallRankings();
        
        // TODO: Uncomment when API endpoints are implemented
        /*
        try {
            const response = await fetch('/api/overall-rankings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    game: 'high-noon-hustle'
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data.players || [];
        } catch (error) {
            console.error('Error fetching overall rankings:', error);
            // Return mock data for development
            return this.getMockOverallRankings();
        }
        */
    }

    getMockOverallRankings() {
        const mockPlayers = [
            { username: 'WyattEarp', display_name: 'Wyatt Earp', character_class: 'sheriff', overall_score: 95.5, gold: 2200, experience: 1100, level: 11, honor_score: 130, duel_wins: 18, tournament_wins: 4, mini_game_wins: 30 },
            { username: 'QuickDraw', display_name: 'QuickDraw', character_class: 'gunslinger', overall_score: 92.3, gold: 2100, experience: 1200, level: 10, honor_score: 120, duel_wins: 20, tournament_wins: 5, mini_game_wins: 35 },
            { username: 'WildBill', display_name: 'Wild Bill', character_class: 'sheriff', overall_score: 88.7, gold: 1800, experience: 950, level: 9, honor_score: 110, duel_wins: 15, tournament_wins: 2, mini_game_wins: 28 },
            { username: 'Halley66', display_name: 'Halley66', character_class: 'sheriff', overall_score: 82.1, gold: 1250, experience: 850, level: 8, honor_score: 95, duel_wins: 12, tournament_wins: 3, mini_game_wins: 25 },
            { username: 'DocHolliday', display_name: 'Doc Holliday', character_class: 'gambler', overall_score: 75.4, gold: 1500, experience: 800, level: 7, honor_score: 85, duel_wins: 10, tournament_wins: 1, mini_game_wins: 22 },
            { username: 'SlowPoke', display_name: 'SlowPoke', character_class: 'outlaw', overall_score: 68.9, gold: 980, experience: 720, level: 6, honor_score: 78, duel_wins: 8, tournament_wins: 1, mini_game_wins: 18 },
            { username: 'AnnieOakley', display_name: 'Annie Oakley', character_class: 'gunslinger', overall_score: 62.3, gold: 1100, experience: 680, level: 6, honor_score: 70, duel_wins: 7, tournament_wins: 1, mini_game_wins: 15 },
            { username: 'LuckyLuke', display_name: 'Lucky Luke', character_class: 'gambler', overall_score: 45.2, gold: 750, experience: 450, level: 4, honor_score: 45, duel_wins: 3, tournament_wins: 0, mini_game_wins: 12 },
            { username: 'CalamityJane', display_name: 'Calamity Jane', character_class: 'outlaw', overall_score: 38.7, gold: 650, experience: 380, level: 3, honor_score: 35, duel_wins: 2, tournament_wins: 0, mini_game_wins: 8 },
            { username: 'BillyTheKid', display_name: 'Billy the Kid', character_class: 'outlaw', overall_score: 25.1, gold: 420, experience: 250, level: 2, honor_score: 20, duel_wins: 1, tournament_wins: 0, mini_game_wins: 5 }
        ];

        return mockPlayers;
    }

    displayOverallRankings(players) {
        if (players.length === 0) {
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  No players found for overall rankings.' + ANSIParser.reset());
            return;
        }

        this.terminal.println(ANSIParser.fg('bright-cyan') + `  Overall Rankings (Top ${players.length}):` + ANSIParser.reset());
        this.terminal.println('');

        players.forEach((player, index) => {
            const rank = index + 1;
            const isCurrentPlayer = player.username === this.player?.username;
            const playerName = isCurrentPlayer ? `${player.display_name} (YOU)` : player.display_name;
            
            let rankColor = ANSIParser.fg('bright-white');
            if (rank === 1) rankColor = ANSIParser.fg('bright-yellow');
            else if (rank === 2) rankColor = ANSIParser.fg('bright-cyan');
            else if (rank === 3) rankColor = ANSIParser.fg('bright-magenta');
            
            let nameColor = isCurrentPlayer ? ANSIParser.fg('bright-green') : ANSIParser.fg('bright-white');
            
            this.terminal.println(rankColor + `  ${rank}.` + ANSIParser.reset() + 
                nameColor + ` ${playerName}` + ANSIParser.reset() + 
                ANSIParser.fg('bright-cyan') + ` (${player.character_class})` + ANSIParser.reset() + 
                ANSIParser.fg('bright-yellow') + ` - Score: ${player.overall_score}` + ANSIParser.reset());
            
            // Show detailed stats
            this.terminal.println(ANSIParser.fg('bright-cyan') + `      Gold: ${player.gold} | XP: ${player.experience} | Level: ${player.level} | Honor: ${player.honor_score}` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-cyan') + `      Duels: ${player.duel_wins} | Tournaments: ${player.tournament_wins} | Mini-Games: ${player.mini_game_wins}` + ANSIParser.reset());
            this.terminal.println('');
        });
    }

    // MULTIPLAYER-FOCUSED METHODS
    
    async sendTelegraphMessage() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  ╔════ TELEGRAPH MESSAGE ════╗' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ║ Send message to all towns ║' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  ╚═══════════════════════════════╝' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Message types:' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [1]' + ANSIParser.reset() + ' Global message (all towns)');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [2]' + ANSIParser.reset() + ' Town message (current town only)');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [3]' + ANSIParser.reset() + ' Whisper to specific player');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [4]' + ANSIParser.reset() + ' Emote action');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [B]' + ANSIParser.reset() + ' Back to Saloon');
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
        
        const choice = (await this.terminal.input()).toLowerCase().trim();
        
        if (choice === '1') {
            await this.sendGlobalMessage();
        } else if (choice === '2') {
            await this.sendTownMessage();
        } else if (choice === '3') {
            await this.sendWhisper();
        } else if (choice === '4') {
            await this.sendEmote();
        } else if (choice === 'b' || choice === 'back') {
            await this.enterSaloon();
        } else {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Invalid choice!' + ANSIParser.reset());
            await this.terminal.sleep(1000);
            await this.enterSaloon();
        }
    }

    async sendGlobalMessage() {
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Type your global message:' + ANSIParser.reset());
        const message = await this.terminal.input();
        
        if (message.trim()) {
            this.terminal.println(ANSIParser.fg('bright-green') + '  Message sent to all towns!' + ANSIParser.reset());
            await this.sendSaloonMessage(message, 'global');
            await this.terminal.sleep(1000);
        }
        await this.enterSaloon();
    }

    async sendTownMessage() {
        this.terminal.println(ANSIParser.fg('bright-yellow') + `  Type your message for ${this.towns[this.currentTown].name}:` + ANSIParser.reset());
        const message = await this.terminal.input();
        
        if (message.trim()) {
            this.terminal.println(ANSIParser.fg('bright-green') + `  Message sent to ${this.towns[this.currentTown].name}!` + ANSIParser.reset());
            await this.sendSaloonMessage(message, 'town');
            await this.terminal.sleep(1000);
        }
        await this.enterSaloon();
    }

    async sendWhisper() {
        if (this.onlinePlayers.length <= 1) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  No other players online to whisper to!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
            await this.enterSaloon();
            return;
        }
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Select player to whisper to:' + ANSIParser.reset());
        this.onlinePlayers.forEach((player, index) => {
            if (player.username !== this.player?.username) {
                const townTag = this.getTownTag(player.current_town);
                this.terminal.println(ANSIParser.fg('bright-white') + `  [${index + 1}] ${townTag} ${player.display_name}` + ANSIParser.reset());
            }
        });
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
        const choice = await this.terminal.input();
        const playerIndex = parseInt(choice) - 1;
        
        if (playerIndex >= 0 && playerIndex < this.onlinePlayers.length) {
            const targetPlayer = this.onlinePlayers[playerIndex];
            this.terminal.println(ANSIParser.fg('bright-yellow') + `  Type your whisper to ${targetPlayer.display_name}:` + ANSIParser.reset());
            const message = await this.terminal.input();
            
            if (message.trim()) {
                this.terminal.println(ANSIParser.fg('bright-green') + `  Whisper sent to ${targetPlayer.display_name}!` + ANSIParser.reset());
                await this.sendSaloonMessage(`@${targetPlayer.display_name}: ${message}`, 'whisper');
                await this.terminal.sleep(1000);
            }
        }
        await this.enterSaloon();
    }

    async sendEmote() {
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Available emotes:' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [1]' + ANSIParser.reset() + ' *tips hat*');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [2]' + ANSIParser.reset() + ' *spins revolver*');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [3]' + ANSIParser.reset() + ' *takes a swig*');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [4]' + ANSIParser.reset() + ' *dances a jig*');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [5]' + ANSIParser.reset() + ' *looks around suspiciously*');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [6]' + ANSIParser.reset() + ' *custom emote*');
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
        const choice = await this.terminal.input();
        
        let emote = '';
        switch (choice) {
            case '1': emote = '*tips hat*'; break;
            case '2': emote = '*spins revolver*'; break;
            case '3': emote = '*takes a swig*'; break;
            case '4': emote = '*dances a jig*'; break;
            case '5': emote = '*looks around suspiciously*'; break;
            case '6': 
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  Type your custom emote:' + ANSIParser.reset());
                emote = await this.terminal.input();
                break;
            default:
                this.terminal.println(ANSIParser.fg('bright-red') + '  Invalid choice!' + ANSIParser.reset());
                await this.terminal.sleep(1000);
                await this.enterSaloon();
                return;
        }
        
        if (emote.trim()) {
            this.terminal.println(ANSIParser.fg('bright-green') + `  Emote sent: ${emote}` + ANSIParser.reset());
            await this.sendSaloonMessage(emote, 'emote');
            await this.terminal.sleep(1000);
        }
        await this.enterSaloon();
    }

    async joinMultiplayerGames() {
        // Redirect to multiplayer mini-games
        await this.multiplayerMiniGames();
    }

    async challengeToDuel() {
        if (this.onlinePlayers.length <= 1) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  No other players online to duel!' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  Wait for others to join!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
            await this.enterSaloon();
            return;
        }
        
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  ╔════ CHALLENGE TO DUEL ════╗' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ║ Choose your opponent! ║' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  ╚═══════════════════════════════╝' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  🤠 Available Opponents:' + ANSIParser.reset());
        this.onlinePlayers.forEach((player, index) => {
            if (player.username !== this.player?.username) {
                const townTag = this.getTownTag(player.current_town);
                this.terminal.println(ANSIParser.fg('bright-white') + `  [${index + 1}] ${townTag} ${player.display_name} (${player.character_class})` + ANSIParser.reset());
            }
        });
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [B]' + ANSIParser.reset() + ' Back to Saloon');
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
        
        const choice = (await this.terminal.input()).toLowerCase().trim();
        
        if (choice === 'b' || choice === 'back') {
            await this.enterSaloon();
            return;
        }
        
        const playerIndex = parseInt(choice) - 1;
        if (playerIndex >= 0 && playerIndex < this.onlinePlayers.length) {
            const opponent = this.onlinePlayers[playerIndex];
            await this.initiateDuel(opponent);
        } else {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Invalid choice!' + ANSIParser.reset());
            await this.terminal.sleep(1000);
        }
    }

    async initiateDuel(opponent) {
        this.terminal.println(ANSIParser.fg('bright-yellow') + `  Challenging ${opponent.display_name} to a duel!` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  Choose duel type:' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [1]' + ANSIParser.reset() + ' Quick Draw (reflex)');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [2]' + ANSIParser.reset() + ' Accuracy Contest');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [3]' + ANSIParser.reset() + ' Endurance Test');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [4]' + ANSIParser.reset() + ' Luck Challenge');
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
        const choice = await this.terminal.input();
        
        let duelType = 'quick_draw';
        switch (choice) {
            case '1': duelType = 'quick_draw'; break;
            case '2': duelType = 'accuracy'; break;
            case '3': duelType = 'endurance'; break;
            case '4': duelType = 'luck'; break;
            default:
                this.terminal.println(ANSIParser.fg('bright-red') + '  Invalid choice!' + ANSIParser.reset());
                await this.terminal.sleep(1000);
                return;
        }
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Wager amount (0 for no wager):' + ANSIParser.reset());
        const wager = parseInt(await this.terminal.input()) || 0;
        
        if (wager > this.gameState.gold) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  You don\'t have enough gold!' + ANSIParser.reset());
            await this.terminal.sleep(1000);
            return;
        }
        
        // Send duel challenge via WebSocket
        this.socketClient.socket.emit('duel-challenge', {
            game: 'high-noon-hustle',
            targetPlayer: opponent.id,
            challenger: {
                id: this.player.id,
                name: this.player.display_name,
                username: this.player.username
            },
            duelType: duelType,
            wager: wager
        });
        
        this.terminal.println(ANSIParser.fg('bright-green') + `  Duel challenge sent to ${opponent.display_name}!` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  Waiting for response...' + ANSIParser.reset());
        
        // Wait for duel response
        await this.waitForDuelResponse(opponent);
    }

    async waitForDuelResponse(opponent) {
        // Set up a promise that resolves when we get a duel response
        return new Promise((resolve) => {
            const timeout = setTimeout(() => {
                this.terminal.println(ANSIParser.fg('bright-red') + '  Duel challenge timed out!' + ANSIParser.reset());
                this.enterSaloon();
                resolve();
            }, 30000); // 30 second timeout

            // Listen for duel response
            const handleDuelResponse = async (data) => {
                if (data.targetPlayer === this.player.id) {
                    clearTimeout(timeout);
                    this.socketClient.socket.off('duel-response', handleDuelResponse);
                    if (data.accepted) {
                        await this.startDuel(data.duelType, data.wager, data.challenger);
                    } else {
                        this.terminal.println(ANSIParser.fg('bright-yellow') + `  ${data.challenger.name} declined your duel challenge!` + ANSIParser.reset());
                        await this.terminal.sleep(2000);
                        await this.enterSaloon();
                    }
                    resolve();
                }
            };

            this.socketClient.socket.on('duel-response', handleDuelResponse);
        });
    }

    async startDuel(duelType, wager, opponent) {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-red') + '  ╔════ DUEL AT HIGH NOON ════╗' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + `  ║ ${this.player.display_name} vs ${opponent.name} ║` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  ╚═══════════════════════════════════╝' + ANSIParser.reset());
        this.terminal.println('');

        if (wager > 0) {
            this.terminal.println(ANSIParser.fg('bright-cyan') + `  💰 Wager: ${wager} gold` + ANSIParser.reset());
        }
        this.terminal.println('');

        // Countdown
        for (let i = 3; i > 0; i--) {
            this.terminal.println(ANSIParser.fg('bright-red') + `  ${i}...` + ANSIParser.reset());
            await this.terminal.sleep(1000);
        }

        this.terminal.println(ANSIParser.fg('bright-yellow') + '  DRAW!' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  Press SPACE as fast as you can!' + ANSIParser.reset());

        // Quick draw duel
        const startTime = Date.now();
        await this.terminal.input();
        const reactionTime = Date.now() - startTime;

        // Calculate results
        const playerScore = Math.max(0, 1000 - reactionTime);
        const opponentScore = Math.max(0, 1000 - (Math.random() * 800 + 200)); // Simulated opponent

        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-cyan') + `  Your reaction: ${reactionTime}ms` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + `  Opponent reaction: ${Math.round(opponentScore)}ms` + ANSIParser.reset());
        this.terminal.println('');

        if (playerScore > opponentScore) {
            this.terminal.println(ANSIParser.fg('bright-green') + `  🏆 YOU WIN! You outdrew ${opponent.name}!` + ANSIParser.reset());
            this.gameState.gold += wager;
            this.gameState.experience += 25;
            await this.showHumorMessage('duel');
        } else {
            this.terminal.println(ANSIParser.fg('bright-red') + `  💀 You lost to ${opponent.name}!` + ANSIParser.reset());
            this.gameState.gold -= wager;
            this.gameState.experience += 10;
        }

        await this.savePlayerData();
        await this.terminal.sleep(3000);
        await this.enterSaloon();
    }

    async handleDuelChallenge(data) {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-red') + '  ⚔️  DUEL CHALLENGE! ⚔️' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + `  ${data.challenger.name} challenges you to a duel!` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + `  Type: ${data.duelType}` + ANSIParser.reset());
        if (data.wager > 0) {
            this.terminal.println(ANSIParser.fg('bright-cyan') + `  Wager: ${data.wager} gold` + ANSIParser.reset());
        }
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [A] Accept Challenge' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [D] Decline Challenge' + ANSIParser.reset());
        this.terminal.println('');
        
        const choice = await this.terminal.input();
        
        if (choice.toLowerCase() === 'a' || choice.toLowerCase() === 'accept') {
            // Accept the duel
            this.socketClient.socket.emit('duel-response', {
                game: 'high-noon-hustle',
                targetPlayer: data.challenger.id,
                accepted: true,
                duelType: data.duelType,
                wager: data.wager,
                challenger: data.challenger
            });
            
            this.terminal.println(ANSIParser.fg('bright-green') + '  Challenge accepted! Starting duel...' + ANSIParser.reset());
            await this.terminal.sleep(2000);
            await this.startDuel(data.duelType, data.wager, data.challenger);
        } else {
            // Decline the duel
            this.socketClient.socket.emit('duel-response', {
                game: 'high-noon-hustle',
                targetPlayer: data.challenger.id,
                accepted: false,
                challenger: data.challenger
            });
            
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  Challenge declined.' + ANSIParser.reset());
                await this.terminal.sleep(2000);
                await this.enterSaloon();
            }
    }

    async tradingPost() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  ╔════ TRADING POST ════╗' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ║ Player-to-Player Trading ║' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  ╚═══════════════════════════════╝' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Trading Options:' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [1]' + ANSIParser.reset() + ' View Available Trades');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [2]' + ANSIParser.reset() + ' Create Trade Offer');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [3]' + ANSIParser.reset() + ' My Trade Offers');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [4]' + ANSIParser.reset() + ' Direct Trade with Player');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [B]' + ANSIParser.reset() + ' Back to Main Menu');
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
        
        const choice = (await this.terminal.input()).toLowerCase().trim();
        
        if (choice === '1') {
            await this.viewAvailableTrades();
        } else if (choice === '2') {
            await this.createTradeOffer();
        } else if (choice === '3') {
            await this.viewMyTradeOffers();
        } else if (choice === '4') {
            await this.directTradeWithPlayer();
        } else if (choice === 'b' || choice === 'back') {
            await this.enterSaloon();
        } else {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Invalid choice!' + ANSIParser.reset());
            await this.terminal.sleep(1000);
            await this.enterSaloon();
        }
    }

    async competitionsAndEvents() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  ╔════ COMPETITIONS & EVENTS ════╗' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ║ Join town-wide competitions! ║' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  ╚═══════════════════════════════════════╝' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  🏆 Available Competitions:' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [1]' + ANSIParser.reset() + ' Gold Rush Contest (Mining)');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [2]' + ANSIParser.reset() + ' Tumbleweed Derby (Racing)');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [3]' + ANSIParser.reset() + ' Bean Cooking Contest');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [4]' + ANSIParser.reset() + ' Tall Tale Contest');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [5]' + ANSIParser.reset() + ' Town Defense Event');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [6]' + ANSIParser.reset() + ' Stagecoach Heist (Co-op)');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [B]' + ANSIParser.reset() + ' Back to Main Menu');
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
        
        const choice = (await this.terminal.input()).toLowerCase().trim();
        
        if (choice === '1') {
            await this.joinGoldRushContest();
        } else if (choice === '2') {
            await this.joinTumbleweedDerby();
        } else if (choice === '3') {
            await this.joinBeanCookingContest();
        } else if (choice === '4') {
            await this.joinTallTaleContest();
        } else if (choice === '5') {
            await this.joinTownDefenseEvent();
        } else if (choice === '6') {
            await this.joinStagecoachHeist();
        } else if (choice === 'b' || choice === 'back') {
            await this.enterSaloon();
        } else {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Invalid choice!' + ANSIParser.reset());
            await this.terminal.sleep(1000);
            await this.enterSaloon();
        }
    }

    async socialEnergyRecovery() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  ╔════ SOCIAL ENERGY RECOVERY ════╗' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ║ Recover energy through socializing! ║' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  ╚═══════════════════════════════════════════╝' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  🎵 Social Activities:' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [1]' + ANSIParser.reset() + ' Chat with other players (+10 energy)');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [2]' + ANSIParser.reset() + ' Play piano for the crowd (+20 energy)');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [3]' + ANSIParser.reset() + ' Tell tall tales (+25 energy)');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [4]' + ANSIParser.reset() + ' Help other players (+15 energy)');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [5]' + ANSIParser.reset() + ' Dance with others (+15 energy)');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [6]' + ANSIParser.reset() + ' Serve drinks (+20 energy)');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [B]' + ANSIParser.reset() + ' Back to Main Menu');
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
        
        const choice = (await this.terminal.input()).toLowerCase().trim();
        
        if (choice === '1') {
            await this.chatWithPlayers();
        } else if (choice === '2') {
            await this.playPianoForCrowd();
        } else if (choice === '3') {
            await this.tellTallTales();
        } else if (choice === '4') {
            await this.helpOtherPlayers();
        } else if (choice === '5') {
            await this.danceWithOthers();
        } else if (choice === '6') {
            await this.serveDrinks();
        } else if (choice === 'b' || choice === 'back') {
            await this.enterSaloon();
        } else {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Invalid choice!' + ANSIParser.reset());
            await this.terminal.sleep(1000);
            await this.enterSaloon();
        }
    }

    // Real-time chat methods
    async displaySaloonMessage(data) {
        console.log('Saloon message:', data);
        
        // Add message to recent messages array
        if (!this.recentMessages) {
            this.recentMessages = [];
        }
        
        // Check if this message already exists to prevent duplicates
        const timeStr = new Date().toLocaleTimeString().slice(0,5);
        const townTag = this.getTownTag(data.player.town);
        const messageType = data.type === 'global' ? 'GLOBAL' : data.type === 'town' ? 'TOWN' : data.type === 'whisper' ? 'WHISPER' : '';
        const typeIndicator = messageType ? ` [${messageType}]` : '';
        const messageText = `[${timeStr}] ${townTag} ${data.player.name}${typeIndicator}: ${data.message}`;
        const messageExists = this.recentMessages.some(msg => msg.includes(data.message) && msg.includes(data.player.name));
        
        if (!messageExists) {
            this.recentMessages.push(messageText);
            
            // Keep only last 10 messages
            if (this.recentMessages.length > 10) {
                this.recentMessages = this.recentMessages.slice(-10);
            }
            
            // If we're currently in the saloon, refresh the display
            if (this.gameState.currentLocation === 'saloon') {
                await this.enterSaloon();
            }
        }
    }

    async sendSaloonMessage(message, type = 'global') {
        if (this.socketClient && this.socketClient.socket) {
            this.socketClient.socket.emit('saloon-message', {
                game: 'high-noon-hustle',
                type: type,
                message: message,
                player: {
                    id: this.player.id,
                    name: this.player.display_name,
                    town: this.currentTown
                }
            });
        }
    }

    // Database persistence methods
    async loadPlayerData() {
        try {
            console.log('loadPlayerData - dbAdapter:', this.dbAdapter); // Debug
            if (this.dbAdapter.type === 'postgresql' && this.dbAdapter.connected) {
                // Production: Load from PostgreSQL via server API
                const response = await fetch(`${this.dbAdapter.baseUrl}/api/hnh/player/load`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        username: this.player?.username || this.authManager?.getCurrentUser()?.username || 'guest'
                    })
                });
                
                if (response.ok) {
                    const data = await response.json();
                    if (data.player) {
                        this.player = data.player;
                        this.gameState = data.gameState;
                        this.currentTown = data.currentTown;
                        
                        // Ensure adventureStats exists in loaded game state
                        if (!this.gameState.adventureStats) {
                            this.gameState.adventureStats = {
                                totalAdventures: 0,
                                adventuresCompleted: 0,
                                currentStreak: 0,
                                bestStreak: 0,
                                totalGoldFound: 0,
                                totalExperienceGained: 0,
                                totalHealthLost: 0,
                                totalItemsFound: 0,
                                eventsEncountered: {},
                                achievements: [],
                                bestAdventure: {
                                    gold: 0,
                                    experience: 0,
                                    health: 100,
                                    events: 0
                                },
                                worstAdventure: {
                                    gold: 0,
                                    experience: 0,
                                    health: 100,
                                    events: 0
                                }
                            };
                        }
                        this.terminal.println(ANSIParser.fg('bright-green') + '  ✅ Player data loaded from PostgreSQL frontier database!' + ANSIParser.reset());
                        await this.terminal.sleep(1000);
                    } else {
                        this.terminal.println(ANSIParser.fg('bright-yellow') + '  🆕 No frontier records found. Time to create your legend!' + ANSIParser.reset());
                        await this.terminal.sleep(1000);
                    }
                } else {
                    throw new Error('Failed to load from PostgreSQL');
                }
            } else {
                // Development: Load from localStorage
                console.log('Using localStorage fallback'); // Debug
                const characterUsername = this.player?.username || this.authManager?.getCurrentUser()?.username || 'guest';
                const savedData = localStorage.getItem(`highNoonHustle_player_${characterUsername}`);
                console.log('Loading from localStorage:', savedData); // Debug
                if (savedData) {
                    const data = JSON.parse(savedData);
                    this.player = data.player;
                    this.gameState = data.gameState;
                    this.currentTown = data.currentTown;
                    
                    // Ensure adventureStats exists in loaded game state
                    if (!this.gameState.adventureStats) {
                        this.gameState.adventureStats = {
                            totalAdventures: 0,
                            adventuresCompleted: 0,
                            currentStreak: 0,
                            bestStreak: 0,
                            totalGoldFound: 0,
                            totalExperienceGained: 0,
                            totalHealthLost: 0,
                            totalItemsFound: 0,
                            eventsEncountered: {},
                            achievements: [],
                            bestAdventure: {
                                gold: 0,
                                experience: 0,
                                health: 100,
                                events: 0
                            },
                            worstAdventure: {
                                gold: 0,
                                experience: 0,
                                health: 100,
                                events: 0
                            }
                        };
                    }
                    this.terminal.println(ANSIParser.fg('bright-green') + '  ✅ Player data loaded from local frontier records!' + ANSIParser.reset());
                    await this.terminal.sleep(1000);
                } else {
                    this.terminal.println(ANSIParser.fg('bright-yellow') + '  🆕 No frontier records found. Time to create your legend!' + ANSIParser.reset());
                    await this.terminal.sleep(1000);
                }
            }
        } catch (error) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  ❌ Error loading player data!' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  Falling back to character creation...' + ANSIParser.reset());
            await this.terminal.sleep(1000);
        }
    }

    async checkLevelUp() {
        const currentLevel = this.gameState.level;
        const currentXP = this.gameState.experience;
        
        // Calculate required XP for next level (exponential curve)
        const requiredXP = Math.floor(100 * Math.pow(1.5, currentLevel - 1));
        
        if (currentXP >= requiredXP) {
            // Level up!
            this.gameState.level += 1;
            this.gameState.maxEnergy += 5; // +5 max energy per level
            this.gameState.energy = this.gameState.maxEnergy; // Full energy on level up
            
            // Show level up message
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  ╔════ LEVEL UP! ════╗' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-green') + `  ║ You reached Level ${this.gameState.level}! ║` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-cyan') + `  ║ +5 Max Energy (${this.gameState.maxEnergy} total) ║` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  ║ Energy fully restored! ║' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-white') + '  ╚═══════════════════════════════════╝' + ANSIParser.reset());
            
            await this.terminal.sleep(3000);
            
            // Check if there's another level up
            await this.checkLevelUp();
        }
    }

    async savePlayerData() {
        try {
            // Check for level up before saving
            await this.checkLevelUp();
            
            const dataToSave = {
                player: this.player,
                gameState: this.gameState,
                currentTown: this.currentTown,
                timestamp: Date.now()
            };
            
            if (this.dbAdapter.type === 'postgresql' && this.dbAdapter.connected) {
                // Production: Save to PostgreSQL via server API
                const response = await fetch(`${this.dbAdapter.baseUrl}/api/hnh/player/save`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        username: this.player?.username || this.authManager?.getCurrentUser()?.username || 'guest',
                        ...dataToSave
                    })
                });
                
                if (response.ok) {
                    this.terminal.println(ANSIParser.fg('bright-green') + '  💾 Progress saved to PostgreSQL frontier database!' + ANSIParser.reset());
                    
                    // Also save to localStorage as backup
                    const characterUsername = this.player?.username || this.authManager?.getCurrentUser()?.username || 'guest';
                    localStorage.setItem(`highNoonHustle_player_${characterUsername}`, JSON.stringify(dataToSave));
                } else {
                    throw new Error('Failed to save to PostgreSQL');
                }
            } else {
                // Development: Save to localStorage
                const characterUsername = this.player?.username || this.authManager?.getCurrentUser()?.username || 'guest';
                localStorage.setItem(`highNoonHustle_player_${characterUsername}`, JSON.stringify(dataToSave));
                console.log('Saving to localStorage:', dataToSave); // Debug
                this.terminal.println(ANSIParser.fg('bright-green') + '  💾 Progress saved to local frontier records!' + ANSIParser.reset());
            }
            
            await this.terminal.sleep(1000);
        } catch (error) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  ❌ Error saving player data!' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  Falling back to local storage...' + ANSIParser.reset());
            
            // Fallback to localStorage
            try {
                const dataToSave = {
                    player: this.player,
                    gameState: this.gameState,
                    currentTown: this.currentTown,
                    timestamp: Date.now()
                };
                localStorage.setItem('highNoonHustle_player', JSON.stringify(dataToSave));
                console.log('Fallback save to localStorage:', dataToSave); // Debug
                this.terminal.println(ANSIParser.fg('bright-blue') + '  💾 Progress saved to local backup!' + ANSIParser.reset());
            } catch (localError) {
                this.terminal.println(ANSIParser.fg('bright-red') + '  ❌ Failed to save to local storage too!' + ANSIParser.reset());
            }
            
            await this.terminal.sleep(1000);
        }
    }

    async syncLocalDataToPostgreSQL() {
        try {
            // Only try to sync if we're connected to PostgreSQL
            if (this.dbAdapter.type !== 'postgresql' || !this.dbAdapter.connected) {
                return;
            }
            
            // Check if we have local data to sync
            const characterUsername = this.player?.username || this.authManager?.getCurrentUser()?.username || 'guest';
            const localData = localStorage.getItem(`highNoonHustle_player_${characterUsername}`);
            if (!localData) return;
            
            const data = JSON.parse(localData);
            
            // Try to sync to PostgreSQL
            const response = await fetch(`${this.dbAdapter.baseUrl}/api/hnh/player/save`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: this.player?.username || this.authManager?.getCurrentUser()?.username || 'guest',
                    ...data
                })
            });
            
            if (response.ok) {
                this.terminal.println(ANSIParser.fg('bright-green') + '  🔄 Local data synced to PostgreSQL!' + ANSIParser.reset());
                await this.terminal.sleep(1000);
            }
        } catch (error) {
            // Silently fail - this is just a sync attempt
        }
    }

    async updatePlayerStatus() {
        // Update player status on server
        if (this.socketClient && this.socketClient.socket) {
            this.socketClient.socket.emit('player-status-update', {
                game: 'high-noon-hustle',
                player: {
                    id: this.player?.id,
                    username: this.player?.username,
                    currentLocation: this.gameState.currentLocation,
                    currentTown: this.currentTown,
                    characterClass: this.player?.character_class
                }
            });
            console.log('DEBUG: Sent player status update:', {
                currentLocation: this.gameState.currentLocation,
                currentTown: this.currentTown
            });
        }
    }

    async showSaloonMessages() {
        // Show recent saloon messages
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  Recent Telegraph Messages:' + ANSIParser.reset());
        
        if (this.recentMessages && this.recentMessages.length > 0) {
            this.recentMessages.forEach(message => {
                this.terminal.println(ANSIParser.fg('bright-white') + `  ${message}` + ANSIParser.reset());
            });
        } else {
            // Show default welcome messages if no real messages yet
            this.terminal.println(ANSIParser.fg('bright-white') + '  [12:00] System: Welcome to the Wild West!' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-white') + '  [12:01] System: Send messages to chat with other players!' + ANSIParser.reset());
        }
    }

    // Additional placeholder methods
    async travelBetweenTowns() { /* TODO */ }
    async leaderboardsAndStats() { /* TODO */ }
    async viewAvailableTrades() { /* TODO */ }
    async createTradeOffer() { /* TODO */ }
    async viewMyTradeOffers() { /* TODO */ }
    async directTradeWithPlayer() { /* TODO */ }
    async joinGoldRushContest() { /* TODO */ }
    async joinTumbleweedDerby() { /* TODO */ }
    async joinBeanCookingContest() { /* TODO */ }
    async joinTallTaleContest() { /* TODO */ }
    async joinTownDefenseEvent() { /* TODO */ }
    async joinStagecoachHeist() { /* TODO */ }
    async chatWithPlayers() { /* TODO */ }
    async playPianoForCrowd() { /* TODO */ }
    async tellTallTales() { /* TODO */ }
    async helpOtherPlayers() { /* TODO */ }
    async danceWithOthers() { /* TODO */ }
    async serveDrinks() { /* TODO */ }
    async formPosse() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  ╔════ FORM POSSE ════╗' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ║ Gather your gang! ║' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  ╚═══════════════════════════╝' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  🤠 Available Gang Members:' + ANSIParser.reset());
        this.onlinePlayers.forEach((player, index) => {
            if (player.username !== this.player?.username) {
                const townTag = this.getTownTag(player.current_town);
                this.terminal.println(ANSIParser.fg('bright-white') + `  [${index + 1}] ${townTag} ${player.display_name} (${player.character_class})` + ANSIParser.reset());
            }
        });
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [B] Back to Saloon' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
        
        const choice = (await this.terminal.input()).toLowerCase().trim();
        
        if (choice === 'b' || choice === 'back') {
            await this.enterSaloon();
        } else {
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  Posse formation coming soon!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
            await this.enterSaloon();
        }
    }
    
    async viewEventsAndAnnouncements() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  ╔════ EVENTS & ANNOUNCEMENTS ════╗' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ║ Latest frontier news! ║' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  ╚═══════════════════════════════════╝' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  📢 Current Events:' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  • High Noon Hustle Tournament Season' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  • New equipment available at the General Store' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  • Daily challenges reset at midnight' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  🏆 Recent Winners:' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  • Poker Tournament: Halley66' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  • Derby Race: SlowPoke' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-white') + '  [B] Back to Saloon' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
        
        const choice = (await this.terminal.input()).toLowerCase().trim();
        await this.enterSaloon();
    }
    
    async tradeWithPlayers() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  ╔════ TRADING POST ════╗' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ║ Player-to-Player Trading ║' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  ╚═══════════════════════════════╝' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  🤠 Available Traders:' + ANSIParser.reset());
        this.onlinePlayers.forEach((player, index) => {
            if (player.username !== this.player?.username) {
                const townTag = this.getTownTag(player.current_town);
                this.terminal.println(ANSIParser.fg('bright-white') + `  [${index + 1}] ${townTag} ${player.display_name} (${player.character_class})` + ANSIParser.reset());
            }
        });
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [B] Back to Saloon' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
        
        const choice = (await this.terminal.input()).toLowerCase().trim();
        
        if (choice === 'b' || choice === 'back') {
            await this.enterSaloon();
        } else {
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  Trading system coming soon!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
            await this.enterSaloon();
        }
    }
    
    async joinCompetitions() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  ╔════ COMPETITIONS ════╗' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ║ Join the competition! ║' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  ╚═══════════════════════════════╝' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  🏆 Available Competitions:' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [1] Daily High Score Challenge' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [2] Weekly Gold Rush Contest' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [3] Monthly Sheriff Election' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-white') + '  [B] Back to Saloon' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
        
        const choice = (await this.terminal.input()).toLowerCase().trim();
        
        if (choice === 'b' || choice === 'back') {
            await this.enterSaloon();
        } else {
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  Competition system coming soon!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
            await this.enterSaloon();
        }
    }
    
    async socialActivities() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  ╔════ SOCIAL ACTIVITIES ════╗' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ║ Mingle with other players! ║' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  ╚═══════════════════════════════╝' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  🎭 Social Activities:' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [1] Play Piano for Crowd' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [2] Tell Tall Tales' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [3] Help Other Players' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [4] Dance with Others' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [5] Serve Drinks' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-white') + '  [B] Back to Saloon' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
        
        const choice = (await this.terminal.input()).toLowerCase().trim();
        
        if (choice === 'b' || choice === 'back') {
            await this.enterSaloon();
        } else {
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  Social activities coming soon!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
            await this.enterSaloon();
        }
    }

    setupSocketListeners() {
        // Setup WebSocket listeners for real-time updates
        if (this.socketClient && this.socketClient.socket && !this.socketListenersSetup) {
            // Ensure player data is available
            if (!this.player) {
                console.log('DEBUG: Player data not available, skipping socket setup');
                return;
            }
            this.socketListenersSetup = true;
            // Listen for player join/leave events
            this.socketClient.socket.on('player-joined', (data) => {
                console.log('DEBUG: Received player-joined event:', data);
                if (data.game === 'high-noon-hustle') {
                    // Check if player already exists
                    const existingPlayerIndex = this.onlinePlayers.findIndex(p => p.id === data.player.id);
                    if (existingPlayerIndex === -1) {
                        // Player doesn't exist, add them
                        this.onlinePlayers.push(data.player);
                        console.log('DEBUG: Added new player to onlinePlayers:', this.onlinePlayers);
                        console.log('DEBUG: Player data:', data.player);
                        this.terminal.println(ANSIParser.fg('bright-green') + `  🤠 ${data.player.name || data.player.display_name} joined the frontier!` + ANSIParser.reset());
                    } else {
                        // Player exists, update their character data
                        console.log('DEBUG: Updating existing player character data:', data.player);
                        this.onlinePlayers[existingPlayerIndex] = data.player;
                        console.log('DEBUG: Updated onlinePlayers:', this.onlinePlayers);
                    }
                    
                    // Automatically refresh the saloon display if we're currently in the saloon
                    console.log('DEBUG: Player joined - currentLocation:', this.currentLocation);
                    if (this.currentLocation === 'saloon') {
                        console.log('DEBUG: Player in saloon, scheduling refresh...');
                        // Cancel any existing timeout
                        if (this.saloonRefreshTimeout) {
                            clearTimeout(this.saloonRefreshTimeout);
                            console.log('DEBUG: Cancelled existing saloon refresh timeout');
                        }
                        // Use a more reliable refresh approach
                        this.saloonRefreshTimeout = setTimeout(async () => {
                            console.log('DEBUG: Timeout fired - currentLocation:', this.currentLocation);
                            // Double-check we're still in saloon before refreshing
                            if (this.currentLocation === 'saloon' && this.gameState.currentLocation === 'saloon') {
                                console.log('DEBUG: Refreshing saloon display...');
                                this.terminal.clear();
                                await this.enterSaloon();
                            } else {
                                console.log('DEBUG: No longer in saloon, skipping refresh');
                            }
                            this.saloonRefreshTimeout = null; // Clear the timeout reference
                        }, 1000);
                    } else {
                        console.log('DEBUG: Player not in saloon, no refresh needed');
                    }
                }
            });

            this.socketClient.socket.on('player-left', (data) => {
                if (data.game === 'high-noon-hustle') {
                    this.onlinePlayers = this.onlinePlayers.filter(p => p.id !== data.player.id);
                    this.terminal.println(ANSIParser.fg('bright-yellow') + `  👋 ${data.player.name} rode off into the sunset` + ANSIParser.reset());
                    
                    // Automatically refresh the saloon display if we're currently in the saloon
                    if (this.currentLocation === 'saloon') {
                        setTimeout(() => {
                            if (this.currentLocation === 'saloon') {
                                this.terminal.clear();
                                this.enterSaloon();
                            }
                        }, 1000);
                    }
                }
            });

            // Listen for saloon chat messages
            this.socketClient.socket.on('saloon-message', (data) => {
                if (data.game === 'high-noon-hustle') {
                    this.saloonMessages.push(data);
                    // Keep only last 10 messages
                    if (this.saloonMessages.length > 10) {
                        this.saloonMessages = this.saloonMessages.slice(-10);
                    }
                }
            });

            // Listen for game events
            this.socketClient.socket.on('game-event', (data) => {
                if (data.game === 'high-noon-hustle') {
                    this.activeEvents.push(data);
                }
            });

            // Listen for duel challenges
            this.socketClient.socket.on('duel-challenge', (data) => {
                if (data.game === 'high-noon-hustle' && data.targetPlayer === this.player.id) {
                    this.handleDuelChallenge(data);
                }
            });

            // Listen for current players list (when joining)
            this.socketClient.socket.on('current-players', (data) => {
                if (data.game === 'high-noon-hustle') {
                    console.log('DEBUG: Received current players list:', data.players);
                    console.log('DEBUG: First player in received data:', data.players[0]);
                    console.log('DEBUG: Number of players received:', data.players.length);
                    this.onlinePlayers = data.players;
                    console.log('DEBUG: Set onlinePlayers to:', this.onlinePlayers);
                    console.log('DEBUG: onlinePlayers length after setting:', this.onlinePlayers.length);
                    console.log('DEBUG: onlinePlayers array contents:', JSON.stringify(this.onlinePlayers, null, 2));
                }
            });

            // Listen for saloon messages
            this.socketClient.socket.on('saloon-message', (data) => {
                if (data.game === 'high-noon-hustle') {
                    this.displaySaloonMessage(data);
                }
            });

            // Listen for tournament events
            this.socketClient.socket.on('tournament-start', (data) => {
                if (data.game === 'high-noon-hustle') {
                    this.handleTournamentStart(data);
                }
            });

            this.socketClient.socket.on('tournament-join', (data) => {
                if (data.game === 'high-noon-hustle') {
                    this.handleTournamentJoin(data);
                }
            });

            this.socketClient.socket.on('tournament-update', (data) => {
                if (data.game === 'high-noon-hustle') {
                    this.handleTournamentUpdate(data);
                }
            });

            this.socketClient.socket.on('tournament-end', (data) => {
                if (data.game === 'high-noon-hustle') {
                    this.handleTournamentEnd(data);
                }
            });

            // Listen for tournament state updates
            this.socketClient.socket.on('tournament-state', (data) => {
                if (data.game === 'high-noon-hustle') {
                    this.handleTournamentState(data);
                }
            });

            // Listen for tournament phase changes
            this.socketClient.socket.on('tournament-phase-change', (data) => {
                if (data.game === 'high-noon-hustle') {
                    this.handleTournamentPhaseChange(data);
                }
            });

            // Listen for tournament score updates
            this.socketClient.socket.on('tournament-score-update', (data) => {
                if (data.game === 'high-noon-hustle') {
                    this.handleTournamentScoreUpdate(data);
                }
            });

            // Listen for tournament cancellation
            this.socketClient.socket.on('tournament-cancelled', (data) => {
                if (data.game === 'high-noon-hustle') {
                    this.handleTournamentCancelled(data);
                }
            });

            // Socket listeners are set up, but join-game-room will be called separately
        }
    }

    joinGameRoom() {
        // Join the high-noon-hustle room with player data
        console.log('DEBUG: Emitting join-game-room for high-noon-hustle');
        if (this.player) {
            // Reset currentLocation to main_menu when joining game room
            // Players should only appear in saloon when they actually enter it
            this.gameState.currentLocation = 'main_menu';
            this.currentLocation = 'main_menu';
            
            const playerData = {
                game: 'high-noon-hustle',
                player: {
                    id: this.player.id,
                    username: this.player.username, // Add username field
                    name: this.player.display_name,
                    display_name: this.player.display_name,
                    character_class: this.player.character_class,
                    current_town: this.currentTown,
                    current_location: 'main_menu' // Always start in main_menu when joining
                }
            };
            console.log('DEBUG: Sending player data:', playerData);
            console.log('DEBUG: this.currentTown:', this.currentTown);
            console.log('DEBUG: this.player.character_class:', this.player.character_class);
            console.log('DEBUG: Full player object being sent:', this.player);
            this.socketClient.socket.emit('join-game-room', playerData);
            
            // Request current tournament state
            this.socketClient.socket.emit('get-tournament-state', {
                game: 'high-noon-hustle'
            });
        } else {
            console.log('DEBUG: No player data available, sending fallback');
            // Fallback for when player data isn't loaded yet
            this.socketClient.socket.emit('join-game-room', 'high-noon-hustle');
        }
    }

    // TOURNAMENT SYSTEM METHODS
    async tournamentMode() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  🏆 HIGH NOON HUSTLE TOURNAMENTS 🏆' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println('');
        
        if (this.tournament.active) {
            await this.joinActiveTournament();
        } else {
            await this.tournamentMenu();
        }
    }

    async tournamentMenu() {
        this.terminal.println(ANSIParser.fg('bright-white') + '  [1] Start Poker Tournament' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [2] Start Derby Tournament' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [3] Start Cooking Tournament' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [4] Start Gold Panning Tournament' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [5] Join Active Tournament' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [6] Tournament Rules' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-red') + '  [B] Back to Saloon' + ANSIParser.reset());
        this.terminal.println('');
        
        const choice = (await this.terminal.input()).toLowerCase().trim();
        
        switch (choice) {
            case '1':
                await this.startTournament('poker');
                break;
            case '2':
                await this.startTournament('derby');
                break;
            case '3':
                await this.startTournament('cooking');
                break;
            case '4':
                await this.startTournament('panning');
                break;
            case '5':
                await this.joinActiveTournament();
                break;
            case '6':
                await this.showTournamentRules();
                break;
            case 'b':
            case 'back':
                await this.enterSaloon();
                break;
            default:
                this.terminal.println(ANSIParser.fg('bright-red') + '  Invalid choice!' + ANSIParser.reset());
                await this.terminal.sleep(1000);
                await this.tournamentMenu();
        }
    }

    async startTournament(gameType) {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + `  🎮 STARTING ${gameType.toUpperCase()} TOURNAMENT 🎮` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-white') + '  Tournament Rules:' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + `  • Compete in ${gameType} for multiple rounds` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  • Winner takes all the gold!' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  • All BBS users will be notified' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  • 30 seconds for players to join' + ANSIParser.reset());
        this.terminal.println('');
        
        // Ask for number of rounds
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  Choose tournament length:' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [1] Quick Tournament - 10 rounds (~2 minutes)' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [2] Full Tournament - 20 rounds (~4 minutes)' + ANSIParser.reset());
        this.terminal.println('');
        
        let rounds = 10; // Default to quick tournament
        const roundChoice = await this.terminal.input(ANSIParser.fg('bright-yellow') + '  Select rounds (1 or 2): ' + ANSIParser.reset());
        
        if (roundChoice === '2') {
            rounds = 20;
        }
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + `  Selected: ${rounds} rounds` + ANSIParser.reset());
        this.terminal.println('');
        
        const confirm = await this.terminal.input(ANSIParser.fg('bright-yellow') + '  Start tournament? (Y/N): ' + ANSIParser.reset());
        
        if (confirm.toLowerCase() === 'y' || confirm.toLowerCase() === 'yes') {
            // Generate tournament ID and set up tournament
            this.tournament.tournamentId = Date.now().toString();
            this.tournament.phase = 'joining';
            this.tournament.joinEndTime = Date.now() + (30 * 1000); // 30 seconds
            this.tournament.gameType = gameType;
            this.tournament.rounds = rounds;
            console.log('DEBUG: this.player object when starting tournament:', this.player);
            this.tournament.participants = [{
                id: this.player.username, // Use username as unique identifier
                name: this.player.display_name,
                score: 0,
                gold: 0
            }];
            
            // Broadcast tournament start to all BBS users
            if (this.socketClient && this.socketClient.socket) {
                console.log('DEBUG: Sending tournament-start event:', {
                    game: 'high-noon-hustle',
                    host: this.player.display_name,
                    gameType: gameType,
                    tournamentId: this.tournament.tournamentId,
                    rounds: rounds,
                    joinPeriod: 30
                });
                this.socketClient.socket.emit('tournament-start', {
                    game: 'high-noon-hustle',
                    host: this.player.display_name,
                    gameType: gameType,
                    tournamentId: this.tournament.tournamentId,
                    rounds: rounds,
                    joinPeriod: 30
                });
            } else {
                console.log('DEBUG: No socket client available for tournament broadcast');
            }
            
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-green') + '  Tournament announced to all BBS users!' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  Waiting 30 seconds for players to join...' + ANSIParser.reset());
            
            console.log('DEBUG: About to call showJoinCountdown, tournament state:', this.tournament);
            // Show join countdown
            await this.showJoinCountdown();
            
            // Start the tournament
            await this.runTournament();
        } else {
            await this.tournamentMenu();
        }
    }

    async showJoinCountdown() {
        console.log('DEBUG: showJoinCountdown called, joinEndTime:', this.tournament.joinEndTime);
        const joinEndTime = this.tournament.joinEndTime;
        
        // Simple countdown for 30 seconds
        for (let i = 30; i > 0; i--) {
            this.terminal.clear();
            this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-cyan') + '  🏆 TOURNAMENT JOINING PERIOD 🏆' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
            this.terminal.println('');
            
            this.terminal.println(ANSIParser.fg('bright-white') + `  Tournament ID: ${this.tournament.tournamentId}` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-white') + `  Host: ${this.player.display_name}` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-white') + `  Game Type: ${this.tournament.gameType}` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-white') + `  Duration: ${this.tournament.duration / (60 * 1000)} minutes` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-white') + `  Participants: ${this.tournament.participants.length}` + ANSIParser.reset());
            this.terminal.println('');
            
            this.terminal.println(ANSIParser.fg('bright-yellow') + `  Time remaining to join: ${i} seconds` + ANSIParser.reset());
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-cyan') + '  Other players can join by going to:' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-cyan') + '  Door Games → High Noon Hustle → Tournaments' + ANSIParser.reset());
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-green') + '  Press any key to continue...' + ANSIParser.reset());
            
            await this.terminal.sleep(1000);
        }
    }

    async runTournament() {
        console.log('DEBUG: runTournament() called for player:', this.player.username);
        console.log('DEBUG: Current tournament state:', {
            active: this.tournament.active,
            running: this.tournament.running,
            phase: this.tournament.phase
        });
        
        // Prevent multiple tournament runs
        if (this.tournament.running) {
            console.log('DEBUG: Tournament already running, ignoring duplicate call');
            return;
        }
        
        this.tournament.running = true;
        this.tournament.active = true;
        this.tournament.phase = 'active';
        this.tournament.startTime = Date.now();
        
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-green') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + `  🏆 ${this.tournament.gameType.toUpperCase()} TOURNAMENT ACTIVE! 🏆` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + `  Competing in ${this.tournament.gameType} for 5 minutes!` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + `  Participants: ${this.tournament.participants.length}` + ANSIParser.reset());
        this.terminal.println('');
        
        // Run the tournament game
        await this.playTournamentGame();
        
        // End tournament
        await this.endTournament();
    }

    async playTournamentGame() {
        const maxRounds = this.tournament.rounds || 10; // Use selected rounds or default to 10
        const roundDuration = 10000; // 10 seconds per round (7s for game + 3s for display)
        const totalDuration = maxRounds * roundDuration;
        
        this.terminal.println(ANSIParser.fg('bright-cyan') + `  🎯 Tournament will run for ${maxRounds} rounds` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + `  ⏱️  Estimated duration: ${Math.ceil(totalDuration / 60000)} minutes` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  All players get the same number of rounds!' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  ⏳ Waiting for all players to be ready...' + ANSIParser.reset());
        
        // Wait for all participants to be ready and synchronized
        await this.waitForAllPlayersReady();
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  ✅ All players ready! Starting tournament...' + ANSIParser.reset());
        await this.terminal.sleep(2000);
        
        // Use server-synchronized timing
        const startTime = this.tournament.startTime;
        
        for (let round = 1; round <= maxRounds && this.tournament.active; round++) {
            // Track current round for deterministic seeding
            this.tournament.currentRound = round;
            
            const remaining = Math.ceil((totalDuration - (Date.now() - startTime)) / 1000);
            
            this.terminal.clear();
            this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-cyan') + `  🏆 ${this.tournament.gameType.toUpperCase()} TOURNAMENT 🏆` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
            this.terminal.println('');
            
            this.terminal.println(ANSIParser.fg('bright-yellow') + `  Round ${round}/${maxRounds}` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-yellow') + `  Time remaining: ${remaining} seconds` + ANSIParser.reset());
            this.terminal.println('');
            
            // Show current leaderboard
            this.showCurrentTournamentLeaderboard();
            this.terminal.println('');
            
            // Play one round of the game (with fixed timing)
            await this.playTournamentRound();
        }
    }

    async waitForAllPlayersReady() {
        return new Promise((resolve) => {
            const checkReady = () => {
                // Wait for tournament to be active and all participants confirmed ready
                if (this.tournament.active && this.tournament.phase === 'active') {
                    // Additional check: ensure we have the expected number of participants
                    if (this.tournament.participants.length >= 2) {
                        resolve();
                    } else {
                        setTimeout(checkReady, 100);
                    }
                } else {
                    setTimeout(checkReady, 100);
                }
            };
            checkReady();
        });
    }

    async playTournamentRound() {
        // This will be implemented based on game type
        switch (this.tournament.gameType) {
            case 'poker':
                await this.playTournamentPokerRound();
                break;
            case 'derby':
                await this.playTournamentDerbyRound();
                break;
            case 'cooking':
                await this.playTournamentCookingRound();
                break;
            case 'panning':
                await this.playTournamentPanningRound();
                break;
        }
    }

    async playTournamentPokerRound() {
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  🃏 Poker Round - 5 Card Draw!' + ANSIParser.reset());
        this.terminal.println('');
        
        // Request cards from server for this round
        const roundNumber = this.tournament.currentRound || 1;
        
        if (this.socketClient && this.socketClient.socket) {
            this.socketClient.socket.emit('tournament-round-request', {
                game: 'high-noon-hustle',
                tournamentId: this.tournament.tournamentId,
                roundNumber: roundNumber
            });
        }
        
        // Wait for server to send the cards
        const roundCards = await this.waitForTournamentCards(roundNumber);
        
        if (!roundCards) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Error: Could not get tournament cards' + ANSIParser.reset());
            return;
        }
        
        // Process the server-generated cards
        const playerHands = [];
        for (const playerCard of roundCards) {
            // Convert server cards to our format
            const hand = playerCard.cards.map(card => ({
                rank: card.rank,
                suit: card.suit
            }));
            
            const handValue = this.evaluatePokerHand(hand);
            const handName = this.pokerHands[handValue];
            const score = (handValue + 1) * 20; // 20-200 points based on hand strength
            
            playerHands.push({
                participant: {
                    id: playerCard.participantId,
                    name: playerCard.participantName
                },
                hand: hand,
                handValue: handValue,
                handName: handName,
                score: score
            });
        }
        
        // Display all players' hands
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  🃏 All Players\' Hands:' + ANSIParser.reset());
        this.terminal.println('');
        
        for (let i = 0; i < playerHands.length; i++) {
            const playerHand = playerHands[i];
            const isYou = playerHand.participant.id === this.player.username;
            const playerLabel = isYou ? `${playerHand.participant.name} (YOU)` : playerHand.participant.name;
            
            this.terminal.println(ANSIParser.fg('bright-white') + `  ${playerLabel}:` + ANSIParser.reset());
            this.displayPokerHand(playerHand.hand);
            this.terminal.println(ANSIParser.fg('bright-green') + `    ${playerHand.handName} (${playerHand.score} points)` + ANSIParser.reset());
            this.terminal.println('');
            
            // Add a small delay between each player's hand display
            await this.terminal.sleep(1000);
        }
        
        // Update scores for all participants
        for (const playerHand of playerHands) {
            // Find the participant in our tournament and update their score
            const participantIndex = this.tournament.participants.findIndex(p => p.id === playerHand.participant.id);
            if (participantIndex !== -1) {
                this.tournament.participants[participantIndex].score += playerHand.score;
                
                // Broadcast score update to other players
                if (this.socketClient && this.socketClient.socket) {
                    this.socketClient.socket.emit('tournament-score-update', {
                        game: 'high-noon-hustle',
                        tournamentId: this.tournament.tournamentId,
                        participantId: playerHand.participant.id,
                        score: this.tournament.participants[participantIndex].score
                    });
                }
            }
        }
        
        // Show round summary
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  📊 Round Summary:' + ANSIParser.reset());
        for (const playerHand of playerHands) {
            const isYou = playerHand.participant.id === this.player.username;
            const playerLabel = isYou ? `${playerHand.participant.name} (YOU)` : playerHand.participant.name;
            this.terminal.println(ANSIParser.fg('bright-white') + `    ${playerLabel}: ${playerHand.handName} (+${playerHand.score} points)` + ANSIParser.reset());
        }
        this.terminal.println('');
        
        // Slower pace for better viewing
        await this.terminal.sleep(3000); // 3 seconds to view results
    }

    async waitForTournamentCards(roundNumber) {
        return new Promise((resolve) => {
            const timeout = setTimeout(() => {
                console.log('DEBUG: Timeout waiting for tournament cards');
                resolve(null);
            }, 10000); // 10 second timeout
            
            const handleTournamentCards = (data) => {
                if (data.game === 'high-noon-hustle' && 
                    data.tournamentId === this.tournament.tournamentId && 
                    data.roundNumber === roundNumber) {
                    clearTimeout(timeout);
                    this.socketClient.socket.off('tournament-round-cards', handleTournamentCards);
                    console.log('DEBUG: Received tournament cards from server:', data.cards);
                    resolve(data.cards);
                }
            };
            
            this.socketClient.socket.on('tournament-round-cards', handleTournamentCards);
        });
    }

    dealPokerHandWithSeed(seed) {
        // Create a deterministic deck based on seed
        this.createPokerDeck();
        const deck = [...this.pokerDeck]; // Copy the deck
        
        // Simple seeded shuffle
        let currentSeed = seed;
        for (let i = deck.length - 1; i > 0; i--) {
            currentSeed = (currentSeed * 9301 + 49297) % 233280;
            const j = Math.floor((currentSeed / 233280) * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
        
        return deck.slice(0, 5);
    }

    async playTournamentDerbyRound() {
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  🌪️ Tumbleweed Derby - Speed Test!' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  Press any key as fast as you can!' + ANSIParser.reset());
        await this.terminal.sleep(1000);
        
        this.terminal.println(ANSIParser.fg('bright-red') + '  Ready...' + ANSIParser.reset());
        await this.terminal.sleep(1000);
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  GO!' + ANSIParser.reset());
        
        const startTime = Date.now();
        await this.terminal.input();
        const reactionTime = Date.now() - startTime;
        
        // Score based on speed (faster = higher score)
        const maxScore = 100;
        const minScore = 10;
        const score = Math.max(minScore, maxScore - (reactionTime / 8));
        
        this.terminal.println(ANSIParser.fg('bright-green') + `  Speed: ${reactionTime}ms` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + `  Score: ${score.toFixed(1)}` + ANSIParser.reset());
        
        this.updatePlayerScore(score);
        await this.terminal.sleep(1000);
    }

    async playTournamentCookingRound() {
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  🍲 Bean Cooking - Timing Test!' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  Press any key when the pot boils!' + ANSIParser.reset());
        await this.terminal.sleep(1000);
        
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  Heating up...' + ANSIParser.reset());
        await this.terminal.sleep(1000);
        
        this.terminal.println(ANSIParser.fg('bright-red') + '  BOIL!' + ANSIParser.reset());
        
        const startTime = Date.now();
        await this.terminal.input();
        const reactionTime = Date.now() - startTime;
        
        // Score based on timing (faster = higher score)
        const maxScore = 100;
        const minScore = 10;
        const score = Math.max(minScore, maxScore - (reactionTime / 12));
        
        this.terminal.println(ANSIParser.fg('bright-green') + `  Timing: ${reactionTime}ms` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + `  Score: ${score.toFixed(1)}` + ANSIParser.reset());
        
        this.updatePlayerScore(score);
        await this.terminal.sleep(1000);
    }

    async playTournamentPanningRound() {
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  ⛏️ Gold Panning - Reflex Test!' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  Press any key when you see gold!' + ANSIParser.reset());
        await this.terminal.sleep(1000);
        
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  Panning...' + ANSIParser.reset());
        await this.terminal.sleep(1000);
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  GOLD!' + ANSIParser.reset());
        
        const startTime = Date.now();
        await this.terminal.input();
        const reactionTime = Date.now() - startTime;
        
        // Score based on reflexes (faster = higher score)
        const maxScore = 100;
        const minScore = 10;
        const score = Math.max(minScore, maxScore - (reactionTime / 15));
        
        this.terminal.println(ANSIParser.fg('bright-green') + `  Reflex: ${reactionTime}ms` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + `  Score: ${score.toFixed(1)}` + ANSIParser.reset());
        
        this.updatePlayerScore(score);
        await this.terminal.sleep(1000);
    }

    updatePlayerScore(score) {
        const playerIndex = this.tournament.participants.findIndex(p => p.id === this.player.username);
        if (playerIndex !== -1) {
            this.tournament.participants[playerIndex].score += score;
            
            // Broadcast score update to other players
            if (this.socketClient && this.socketClient.socket) {
                this.socketClient.socket.emit('tournament-score-update', {
                    game: 'high-noon-hustle',
                    tournamentId: this.tournament.tournamentId,
                    participantId: this.player.username,
                    score: this.tournament.participants[playerIndex].score
                });
            }
        }
    }

    showCurrentTournamentLeaderboard() {
        // Sort participants by score
        const sorted = [...this.tournament.participants].sort((a, b) => b.score - a.score);
        
        console.log('DEBUG: showCurrentTournamentLeaderboard - this.player.username:', this.player.username);
        console.log('DEBUG: showCurrentTournamentLeaderboard - participants:', this.tournament.participants);
        
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  🏆 Current Leaderboard:' + ANSIParser.reset());
        sorted.forEach((participant, index) => {
            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏃';
            const isYou = participant.id === this.player.username ? ' (YOU)' : '';
            console.log(`DEBUG: Participant ${index}: id=${participant.id}, name=${participant.name}, isYou=${isYou}`);
            this.terminal.println(ANSIParser.fg('bright-white') + `  ${medal} ${participant.name}${isYou}: ${participant.score.toFixed(1)}` + ANSIParser.reset());
        });
        this.terminal.println('');
    }

    async endTournament() {
        this.tournament.active = false;
        this.tournament.phase = 'ended';
        this.tournament.running = false;
        
        // Calculate rewards based on final standings
        const rewards = this.calculateTournamentRewards();
        
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  🏆 TOURNAMENT COMPLETE! 🏆' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println('');
        
        // Show final leaderboard
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  🏆 FINAL RESULTS 🏆' + ANSIParser.reset());
        this.terminal.println('');
        this.showTournamentLeaderboard();
        this.terminal.println('');
        
        // Show rewards
        this.terminal.println(ANSIParser.fg('bright-green') + '  🎁 TOURNAMENT REWARDS 🎁' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-white') + `  Your Final Score: ${rewards.finalScore}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + `  Your Position: ${rewards.position}${rewards.position === 1 ? 'st' : rewards.position === 2 ? 'nd' : rewards.position === 3 ? 'rd' : 'th'}` + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + `  💰 Gold Earned: +${rewards.gold}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + `  ⭐ Experience: +${rewards.experience}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + `  🏆 Honor Score: +${rewards.honor}` + ANSIParser.reset());
        
        if (rewards.bonus) {
            this.terminal.println(ANSIParser.fg('bright-cyan') + `  🎯 Bonus: ${rewards.bonus}` + ANSIParser.reset());
        }
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-white') + '  Press any key to return to the saloon...' + ANSIParser.reset());
        
        // Apply rewards to player
        await this.applyTournamentRewards(rewards);
        
        // Wait for user input
        await this.terminal.input();
        
        await this.enterSaloon();
    }

    calculateTournamentRewards() {
        // Sort participants by score to determine position
        const sortedParticipants = [...this.tournament.participants].sort((a, b) => b.score - a.score);
        const playerIndex = sortedParticipants.findIndex(p => p.id === this.player.username);
        const position = playerIndex + 1;
        const totalParticipants = sortedParticipants.length;
        const finalScore = sortedParticipants[playerIndex].score;
        
        // Base rewards (much more conservative)
        let gold = Math.floor(finalScore / 50); // 1 gold per 50 points
        let experience = Math.floor(finalScore / 100); // 1 XP per 100 points
        let honor = Math.floor(finalScore / 200); // 1 honor per 200 points
        
        // Position bonuses (reduced)
        let bonus = '';
        if (position === 1) {
            gold += 25; // Winner bonus
            experience += 10;
            honor += 5;
            bonus = '🏆 TOURNAMENT CHAMPION!';
        } else if (position === 2) {
            gold += 15; // Runner-up bonus
            experience += 5;
            honor += 3;
            bonus = '🥈 Runner-up!';
        } else if (position === 3) {
            gold += 10; // Third place bonus
            experience += 3;
            honor += 2;
            bonus = '🥉 Third place!';
        }
        
        // Participation bonus (minimal)
        gold += 2; // Everyone gets participation gold
        experience += 1;
        honor += 1;
        
        return {
            position,
            finalScore,
            gold,
            experience,
            honor,
            bonus: bonus || null
        };
    }

    async applyTournamentRewards(rewards) {
        // Update player stats
        this.gameState.gold += rewards.gold;
        this.gameState.experience += rewards.experience;
        this.gameState.honorScore += rewards.honor;
        
        // Save player data
        try {
            await this.savePlayerData();
            console.log('DEBUG: Tournament rewards applied and saved:', rewards);
        } catch (error) {
            console.error('DEBUG: Error saving tournament rewards:', error);
        }
    }

    async joinActiveTournament() {
        if (!this.tournament.active && this.tournament.phase !== 'joining') {
            this.terminal.println(ANSIParser.fg('bright-red') + '  No active tournament found!' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  Start a tournament or wait for one to begin.' + ANSIParser.reset());
            await this.terminal.sleep(2000);
            await this.tournamentMenu();
            return;
        }

        this.terminal.println(ANSIParser.fg('bright-green') + '  🏆 Active Tournament Found!' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + `  Game: ${this.tournament.gameType}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + `  Participants: ${this.tournament.participants.length}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + `  Phase: ${this.tournament.phase}` + ANSIParser.reset());
        this.terminal.println('');
        
        const join = await this.terminal.input(ANSIParser.fg('bright-yellow') + '  Join tournament? (Y/N): ' + ANSIParser.reset());
        
        if (join.toLowerCase() === 'y' || join.toLowerCase() === 'yes') {
            // Check if already participating
            const alreadyParticipating = this.tournament.participants.find(p => p.id === this.player.username);
            if (alreadyParticipating) {
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  You are already in this tournament!' + ANSIParser.reset());
                await this.terminal.sleep(2000);
                await this.tournamentMenu();
                return;
            }

            // Add player to tournament
            console.log('DEBUG: this.player object when joining tournament:', this.player);
            const newParticipant = {
                id: this.player.username, // Use username as unique identifier
                name: this.player.display_name,
                score: 0,
                gold: 0
            };
            console.log('DEBUG: Adding participant to tournament:', newParticipant);
            this.tournament.participants.push(newParticipant);

            // Notify other players
            if (this.socketClient && this.socketClient.socket) {
                this.socketClient.socket.emit('tournament-join', {
                    game: 'high-noon-hustle',
                    tournamentId: this.tournament.tournamentId,
                    participant: newParticipant // Use the same participant data we created
                });
            }
            
            this.terminal.println(ANSIParser.fg('bright-green') + '  Joined tournament!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
            
            // Check if tournament is already active or if we should wait for it to start
            if (this.tournament.active) {
                // Tournament is already running, join it
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  Tournament is already active! Joining now...' + ANSIParser.reset());
                await this.terminal.sleep(1000);
                await this.runTournament();
            } else {
                // Enter waiting room instead of returning to menu
                await this.tournamentWaitingRoom();
            }
        } else {
            await this.tournamentMenu();
        }
    }

    async tournamentWaitingRoom() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  🏆 TOURNAMENT WAITING ROOM 🏆' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-white') + `  Tournament: ${this.tournament.gameType.toUpperCase()}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + `  Participants: ${this.tournament.participants.length}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + `  Status: ${this.tournament.phase.toUpperCase()}` + ANSIParser.reset());
        this.terminal.println('');
        
        // Show current participants
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Current Participants:' + ANSIParser.reset());
        this.tournament.participants.forEach((participant, index) => {
            const isYou = participant.id === this.player.username ? ' (YOU)' : '';
            this.terminal.println(ANSIParser.fg('bright-white') + `    ${index + 1}. ${participant.name}${isYou}` + ANSIParser.reset());
        });
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  Waiting for tournament to start...' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
        
        // Set up a flag to track if we should exit the waiting room
        this.inWaitingRoom = true;
        
        // Start a countdown display
        let countdownInterval;
        const startCountdown = () => {
            if (this.tournament.joinEndTime) {
                const updateCountdown = () => {
                    if (!this.inWaitingRoom) return;
                    
                    const now = Date.now();
                    const timeLeft = Math.max(0, this.tournament.joinEndTime - now);
                    const secondsLeft = Math.ceil(timeLeft / 1000);
                    
                    // Update the countdown line by clearing and reprinting
                    this.terminal.clear();
                    this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
                    this.terminal.println(ANSIParser.fg('bright-cyan') + '  🏆 TOURNAMENT WAITING ROOM 🏆' + ANSIParser.reset());
                    this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
                    this.terminal.println('');
                    
                    this.terminal.println(ANSIParser.fg('bright-white') + `  Tournament: ${this.tournament.gameType.toUpperCase()}` + ANSIParser.reset());
                    this.terminal.println(ANSIParser.fg('bright-white') + `  Participants: ${this.tournament.participants.length}` + ANSIParser.reset());
                    this.terminal.println(ANSIParser.fg('bright-white') + `  Status: ${this.tournament.phase.toUpperCase()}` + ANSIParser.reset());
                    this.terminal.println('');
                    
                    // Show current participants
                    this.terminal.println(ANSIParser.fg('bright-yellow') + '  Current Participants:' + ANSIParser.reset());
                    this.tournament.participants.forEach((participant, index) => {
                        const isYou = participant.id === this.player.username ? ' (YOU)' : '';
                        this.terminal.println(ANSIParser.fg('bright-white') + `    ${index + 1}. ${participant.name}${isYou}` + ANSIParser.reset());
                    });
                    this.terminal.println('');
                    
                    this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
                    this.terminal.println(ANSIParser.fg('bright-cyan') + `  Time remaining: ${secondsLeft} seconds` + ANSIParser.reset());
                    this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
                    
                    if (timeLeft <= 0) {
                        clearInterval(countdownInterval);
                    }
                };
                
                updateCountdown();
                countdownInterval = setInterval(updateCountdown, 1000);
            }
        };
        
        startCountdown();
        
        // Wait for tournament to start or user to press a key
        const waitForStart = async () => {
            return new Promise((resolve) => {
                const checkTournament = () => {
                    if (!this.inWaitingRoom) {
                        resolve();
                        return;
                    }
                    
                    if (this.tournament.active && this.tournament.phase === 'active') {
                        clearInterval(countdownInterval);
                        this.inWaitingRoom = false;
                        resolve();
                        return;
                    }
                    
                    setTimeout(checkTournament, 100);
                };
                checkTournament();
            });
        };
        
        await waitForStart();
        
        if (this.tournament.active && this.tournament.phase === 'active') {
            this.terminal.println(ANSIParser.fg('bright-green') + '  🏆 Tournament is starting! Joining now...' + ANSIParser.reset());
            await this.terminal.sleep(2000);
            await this.runTournament();
        } else {
            // Tournament was cancelled or something went wrong
            this.terminal.println(ANSIParser.fg('bright-red') + '  Tournament was cancelled or ended.' + ANSIParser.reset());
            await this.terminal.sleep(2000);
            await this.tournamentMenu();
        }
    }

    async showTournamentRules() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  📋 TOURNAMENT RULES & REWARDS 📋' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  🎮 HOW TO PLAY:' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  • Quick Tournament: 10 rounds (~2 minutes)' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  • Full Tournament: 20 rounds (~4 minutes)' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  • Players have 30 seconds to join' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  • All players start simultaneously' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  • 10 seconds per round (shows all hands)' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  • Real-time leaderboard updates' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  🎁 REWARDS SYSTEM:' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  • Base rewards: 1 gold per 50 points' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  • Experience: 1 XP per 100 points' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  • Honor: 1 honor per 200 points' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  🏆 POSITION BONUSES:' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  🥇 1st Place: +25 gold, +10 XP, +5 honor' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  🥈 2nd Place: +15 gold, +5 XP, +3 honor' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  🥉 3rd Place: +10 gold, +3 XP, +2 honor' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  🏃 Participation: +2 gold, +1 XP, +1 honor' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  💡 TIP: Higher scores = better rewards!' + ANSIParser.reset());
        this.terminal.println('');
        
        await this.terminal.input(ANSIParser.fg('bright-yellow') + '  Press any key to continue...' + ANSIParser.reset());
        await this.tournamentMenu();
    }

    // Tournament event handlers
    handleTournamentStart(data) {
        if (data.tournamentId !== this.tournament.tournamentId) {
            this.tournament.tournamentId = data.tournamentId;
            this.tournament.gameType = data.gameType;
            this.tournament.phase = 'joining';
            this.tournament.joinEndTime = Date.now() + (data.joinPeriod * 1000);
            this.tournament.participants = [];
            
            this.terminal.println(ANSIParser.fg('bright-green') + `  🏆 ${data.host} started a ${data.gameType} tournament!` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-yellow') + `  Type 'tournament' to join!` + ANSIParser.reset());
        }
    }

    handleTournamentJoin(data) {
        this.tournament.participants.push(data.participant);
        this.terminal.println(ANSIParser.fg('bright-cyan') + `  ${data.participant.name} joined the tournament!` + ANSIParser.reset());
    }

    handleTournamentUpdate(data) {
        this.tournament.leaderboard = data.leaderboard;
        // Update display if in tournament
    }

    handleTournamentEnd(data) {
        this.tournament.active = false;
        this.tournament.phase = 'ended';
        this.terminal.println(ANSIParser.fg('bright-green') + `  🏆 Tournament ended! ${data.winner} won!` + ANSIParser.reset());
    }

    handleTournamentState(data) {
        console.log('DEBUG: Received tournament state:', data);
        if (data.tournaments && data.tournaments.length > 0) {
            // Update local tournament state with server data
            const serverTournament = data.tournaments[0]; // Take the first active tournament
            const wasInJoiningPhase = this.tournament.phase === 'joining';
            const isNowActive = serverTournament.phase === 'active';
            
            console.log('DEBUG: Tournament phase change - wasInJoiningPhase:', wasInJoiningPhase, 'isNowActive:', isNowActive);
            console.log('DEBUG: Current player username:', this.player.username);
            console.log('DEBUG: Tournament participants:', serverTournament.participants);
            
            this.tournament = {
                ...this.tournament,
                ...serverTournament,
                active: serverTournament.phase === 'active' || serverTournament.phase === 'joining'
            };
            
            // Remove duplicate participants based on ID
            const uniqueParticipants = [];
            const seenIds = new Set();
            for (const participant of this.tournament.participants) {
                if (!seenIds.has(participant.id)) {
                    seenIds.add(participant.id);
                    uniqueParticipants.push(participant);
                }
            }
            this.tournament.participants = uniqueParticipants;
            
            console.log('DEBUG: Updated tournament state from server:', this.tournament);
            
            // If tournament just started and we're a participant, join it
            const isParticipant = this.tournament.participants.some(p => p.id === this.player.username);
            console.log('DEBUG: Is participant:', isParticipant);
            console.log('DEBUG: Looking for participant with id:', this.player.username);
            console.log('DEBUG: Available participant IDs:', this.tournament.participants.map(p => p.id));
            
            if (wasInJoiningPhase && isNowActive && isParticipant) {
                // If we're in the waiting room, the waiting room will handle the transition
                if (this.inWaitingRoom) {
                    console.log('DEBUG: In waiting room, letting waiting room handle transition');
                    return;
                }
                
                // If not in waiting room, handle the transition directly
                this.terminal.println(ANSIParser.fg('bright-green') + '  🏆 Tournament is starting! Joining now...' + ANSIParser.reset());
                setTimeout(() => {
                    this.runTournament();
                }, 2000);
            }
        }
    }

    handleTournamentPhaseChange(data) {
        console.log('DEBUG: Received tournament phase change:', data);
        if (data.tournamentId === this.tournament.tournamentId && data.phase === 'active') {
            console.log('DEBUG: Tournament phase changed to active, checking if we should join...');
            const isParticipant = this.tournament.participants.some(p => p.id === this.player.username);
            console.log('DEBUG: Is participant in phase change:', isParticipant);
            console.log('DEBUG: Looking for participant with id:', this.player.username);
            console.log('DEBUG: Available participant IDs in phase change:', this.tournament.participants.map(p => p.id));
            
            if (isParticipant) {
                this.tournament.phase = 'active';
                this.tournament.active = true;
                
                // If we're in the waiting room, the waiting room will handle the transition
                if (this.inWaitingRoom) {
                    console.log('DEBUG: In waiting room, letting waiting room handle transition');
                    return;
                }
                
                // If not in waiting room, handle the transition directly
                this.terminal.println(ANSIParser.fg('bright-green') + '  🏆 Tournament is starting! Joining now...' + ANSIParser.reset());
                setTimeout(() => {
                    this.runTournament();
                }, 2000);
            }
        }
    }

    handleTournamentScoreUpdate(data) {
        console.log('DEBUG: Received tournament score update:', data);
        if (data.tournamentId === this.tournament.tournamentId) {
            const participantIndex = this.tournament.participants.findIndex(p => p.id === data.participantId);
            if (participantIndex !== -1) {
                this.tournament.participants[participantIndex].score = data.score;
                console.log('DEBUG: Updated score for', data.participantId, 'to', data.score);
            }
        }
    }

    handleTournamentCancelled(data) {
        console.log('DEBUG: Received tournament cancellation:', data);
        if (data.tournamentId === this.tournament.tournamentId) {
            this.tournament.active = false;
            this.tournament.phase = 'cancelled';
            this.tournament.running = false;
            this.inWaitingRoom = false;
            
            this.terminal.println(ANSIParser.fg('bright-red') + '  🏆 Tournament Cancelled!' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-yellow') + `  Reason: ${data.reason}` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-cyan') + '  Returning to saloon...' + ANSIParser.reset());
            
            setTimeout(() => {
                this.enterSaloon();
            }, 3000);
        }
    }

    // POKER CARD METHODS
    createPokerDeck() {
        this.pokerDeck = [];
        for (let suit of this.pokerSuits) {
            for (let rank of this.pokerRanks) {
                this.pokerDeck.push({ suit, rank });
            }
        }
        this.shufflePokerDeck();
    }

    shufflePokerDeck() {
        for (let i = this.pokerDeck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.pokerDeck[i], this.pokerDeck[j]] = [this.pokerDeck[j], this.pokerDeck[i]];
        }
    }

    dealPokerHand() {
        if (this.pokerDeck.length < 5) {
            this.createPokerDeck();
        }
        return this.pokerDeck.splice(0, 5);
    }

    displayPokerHand(hand) {
        // Display cards in a nice format
        const topRow = hand.map(card => `┌─────┐`).join(' ');
        const middleRow = hand.map(card => {
            const rank = card.rank.padEnd(2);
            const suit = card.suit;
            return `│${rank}${suit} │`;
        }).join(' ');
        const bottomRow = hand.map(card => `└─────┘`).join(' ');
        
        this.terminal.println(ANSIParser.fg('bright-white') + `  ${topRow}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + `  ${middleRow}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + `  ${bottomRow}` + ANSIParser.reset());
    }

    evaluatePokerHand(hand) {
        const ranks = hand.map(card => {
            switch (card.rank) {
                case 'A': return 14;
                case 'K': return 13;
                case 'Q': return 12;
                case 'J': return 11;
                default: return parseInt(card.rank);
            }
        }).sort((a, b) => b - a);

        const suits = hand.map(card => card.suit);
        const isFlush = suits.every(suit => suit === suits[0]);
        const isStraight = this.isStraight(ranks);
        const counts = this.getRankCounts(ranks);

        // Royal Flush
        if (isFlush && isStraight && ranks[0] === 14) return 9;
        
        // Straight Flush
        if (isFlush && isStraight) return 8;
        
        // Four of a Kind
        if (counts.includes(4)) return 7;
        
        // Full House
        if (counts.includes(3) && counts.includes(2)) return 6;
        
        // Flush
        if (isFlush) return 5;
        
        // Straight
        if (isStraight) return 4;
        
        // Three of a Kind
        if (counts.includes(3)) return 3;
        
        // Two Pair
        if (counts.filter(count => count === 2).length === 2) return 2;
        
        // Pair
        if (counts.includes(2)) return 1;
        
        // High Card
        return 0;
    }

    isStraight(ranks) {
        // Check for regular straight
        for (let i = 0; i < ranks.length - 1; i++) {
            if (ranks[i] - ranks[i + 1] !== 1) {
                // Check for A-2-3-4-5 straight
                if (ranks[0] === 14 && ranks[1] === 5 && ranks[2] === 4 && ranks[3] === 3 && ranks[4] === 2) {
                    return true;
                }
                return false;
            }
        }
        return true;
    }

    getRankCounts(ranks) {
        const counts = {};
        ranks.forEach(rank => {
            counts[rank] = (counts[rank] || 0) + 1;
        });
        return Object.values(counts);
    }

    // CHARACTER MANAGEMENT
    async characterManagement() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  ╔════ CHARACTER MANAGEMENT ════╗' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ║ Manage your frontier identity ║' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  ╚═══════════════════════════════════════╝' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  Current Character:' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + `  Name: ${this.player.display_name}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + `  Class: ${this.player.character_class}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + `  Gender: ${this.player.gender}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + `  Level: ${this.gameState.level}` + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  What would you like to do?' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [1] Change Character Class' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [2] Change Display Name' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [3] View Character Stats' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-red') + '  [B] Back to Main Menu' + ANSIParser.reset());
        this.terminal.println('');
        
        const choice = (await this.terminal.input()).toLowerCase().trim();
        
        switch (choice) {
            case '1':
                await this.changeCharacterClass();
                break;
            case '2':
                await this.changeDisplayName();
                break;
            case '3':
                await this.viewCharacterStats();
                break;
            case 'b':
            case 'back':
                return;
            default:
                this.terminal.println(ANSIParser.fg('bright-red') + '  Invalid choice!' + ANSIParser.reset());
                await this.terminal.sleep(1000);
                await this.characterManagement();
        }
    }

    async changeCharacterClass() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  ╔════ CHANGE CHARACTER CLASS ════╗' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ║ Choose your new frontier role ║' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  ╚═══════════════════════════════════════╝' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-cyan') + `  Current Class: ${this.player.character_class}` + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Choose your new class (all equally capable):' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [1]' + ANSIParser.reset() + ' Gunslinger - Quick on the draw');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [2]' + ANSIParser.reset() + ' Sheriff - Upholder of the law');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [3]' + ANSIParser.reset() + ' Outlaw - Living on the edge');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [4]' + ANSIParser.reset() + ' Prospector - Gold seeker');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [5]' + ANSIParser.reset() + ' Rancher - Horse whisperer');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [6]' + ANSIParser.reset() + ' Tracker - Wilderness guide');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [7]' + ANSIParser.reset() + ' Gambler - Lady luck\'s friend');
        this.terminal.println(ANSIParser.fg('bright-red') + '  [B] Back to Character Management' + ANSIParser.reset());
        this.terminal.println('');
        
        const classChoice = (await this.terminal.input()).toLowerCase().trim();
        const classes = ['gunslinger', 'sheriff', 'outlaw', 'prospector', 'rancher', 'tracker', 'gambler'];
        const classNames = ['Gunslinger', 'Sheriff', 'Outlaw', 'Prospector', 'Rancher', 'Tracker', 'Gambler'];
        
        if (classChoice === 'b' || classChoice === 'back') {
            await this.characterManagement();
            return;
        }
        
        if (classChoice >= '1' && classChoice <= '7') {
            const index = parseInt(classChoice) - 1;
            const newClass = classes[index];
            const newClassName = classNames[index];
            
            if (newClass === this.player.character_class) {
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  You\'re already a ' + newClassName + '!' + ANSIParser.reset());
                await this.terminal.sleep(2000);
                await this.changeCharacterClass();
                return;
            }
            
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-green') + `  Changing from ${this.player.character_class} to ${newClassName}...` + ANSIParser.reset());
            await this.terminal.sleep(1000);
            
            // Update character class
            this.player.character_class = newClass;
            
            // Save the change
            await this.savePlayerData();
            
            this.terminal.println(ANSIParser.fg('bright-green') + '  ✅ Character class changed successfully!' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-cyan') + `  You are now a ${newClassName}!` + ANSIParser.reset());
            await this.terminal.sleep(2000);
            
            await this.characterManagement();
        } else {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Invalid choice!' + ANSIParser.reset());
            await this.terminal.sleep(1000);
            await this.changeCharacterClass();
        }
    }

    async changeDisplayName() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  ╔════ CHANGE DISPLAY NAME ════╗' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ║ Choose your new frontier name ║' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  ╚═══════════════════════════════════════╝' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-cyan') + `  Current Name: ${this.player.display_name}` + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Enter your new display name:' + ANSIParser.reset());
        const newName = await this.terminal.input();
        
        if (!newName.trim()) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Name cannot be empty!' + ANSIParser.reset());
            await this.terminal.sleep(1000);
            await this.changeDisplayName();
            return;
        }
        
        if (newName.trim() === this.player.display_name) {
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  That\'s already your name!' + ANSIParser.reset());
            await this.terminal.sleep(1000);
            await this.changeDisplayName();
            return;
        }
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + `  Changing name from ${this.player.display_name} to ${newName.trim()}...` + ANSIParser.reset());
        await this.terminal.sleep(1000);
        
        // Update display name and username
        this.player.display_name = newName.trim();
        this.player.username = newName.toLowerCase().replace(/\s+/g, '_');
        
        // Save the change
        await this.savePlayerData();
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  ✅ Display name changed successfully!' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + `  You are now known as ${newName.trim()}!` + ANSIParser.reset());
        await this.terminal.sleep(2000);
        
        await this.characterManagement();
    }

    async viewCharacterStats() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  ╔════ CHARACTER STATS ════╗' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ║ Your frontier profile ║' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  ╚═══════════════════════════════════════╝' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  Personal Information:' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + `  Name: ${this.player.display_name}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + `  Class: ${this.player.character_class}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + `  Gender: ${this.player.gender}` + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  Game Stats:' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + `  Level: ${this.gameState.level}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + `  Experience: ${this.gameState.experience}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + `  Gold: ${this.gameState.gold}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + `  Honor Score: ${this.gameState.honorScore}` + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  Equipment:' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + `  Weapon: ${this.gameState.equipment.weapon}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + `  Horse: ${this.gameState.equipment.horse}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + `  Boots: ${this.gameState.equipment.boots}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + `  Clothes: ${this.gameState.equipment.clothes}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + `  Accessory: ${this.gameState.equipment.accessory}` + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  Current Status:' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + `  Energy: ${this.gameState.energy}/${this.gameState.maxEnergy}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + `  Location: ${this.gameState.currentLocation}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + `  Town: ${this.towns[this.currentTown].name}` + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  Press any key to continue...' + ANSIParser.reset());
        await this.terminal.input();
        
        await this.characterManagement();
    }
}

// Export for use in main.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HighNoonHustle;
}
