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
        this.gameState = {
            energy: 100,
            maxEnergy: 100,
            gold: 100,
            experience: 0,
            level: 1,
            honorScore: 0,
            currentActivity: null,
            currentLocation: 'saloon',
            equipment: {
                weapon: 'rusty_colt',
                horse: 'old_paint',
                boots: 'worn_leather',
                clothes: 'dusty_duds',
                accessory: 'lucky_coin'
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
        
        // Try to load existing player data first
        await this.loadPlayerData();
        
        // Check if player needs character creation
        if (!this.player) {
            await this.createCharacter();
        }
        
        // Set up socket listeners now that player data is loaded
        this.setupSocketListeners();
        
        // Join the game room after player data is fully loaded
        this.joinGameRoom();
        
        while (true) {
            this.terminal.clear();
            await this.showMainMenu();
            
            const choice = (await this.terminal.input()).toLowerCase().trim();
            
            if (choice === '1') {
                await this.pvpAction();
            } else if (choice === '2') {
                await this.coopMissions();
            } else if (choice === '3') {
                await this.enterSaloon();
            } else if (choice === '4') {
                await this.competitionsAndTournaments();
            } else if (choice === '5') {
                await this.tradingPost();
            } else if (choice === '6') {
                await this.multiplayerMiniGames();
            } else if (choice === '7') {
                await this.soloAdventures();
            } else if (choice.toLowerCase() === 'g') {
                await this.generalStore();
            } else if (choice.toLowerCase() === 'm') {
                await this.soloMiniGames();
            } else if (choice.toLowerCase() === 'e') {
                await this.energyRecovery();
            } else if (choice === '8') {
                await this.leaderboardsAndRankings();
            } else if (choice === '9') {
                await this.viewGazette();
            } else if (choice.toLowerCase() === 'c') {
                await this.characterManagement();
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
        
        // Online players - MUCH MORE PROMINENT
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
        } else {
            this.terminal.println(ANSIParser.fg('bright-red') + '  🏜️  SALOON IS EMPTY - You\'re the only one here!' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  Invite friends or wait for others to join!' + ANSIParser.reset());
            this.terminal.println('');
        }
        
        // MULTIPLAYER-FIRST Menu - PvP & Co-op Emphasis
        this.terminal.println(ANSIParser.fg('bright-red') + '  ⚔️  [1]' + ANSIParser.reset() + ' PvP ACTION (Duels, Heists, Bounties)');
        this.terminal.println(ANSIParser.fg('bright-green') + '  🤝 [2]' + ANSIParser.reset() + ' CO-OP MISSIONS (Stagecoach, Town Defense)');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  🍺 [3]' + ANSIParser.reset() + ' Saloon (Telegraph & Social Hub)');
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  🏆 [4]' + ANSIParser.reset() + ' COMPETITIONS & TOURNAMENTS');
            this.terminal.println(ANSIParser.fg('bright-magenta') + '  💰 [5]' + ANSIParser.reset() + ' Trading Post (Player Economy)');
            this.terminal.println(ANSIParser.fg('bright-white') + '  🎮 [6]' + ANSIParser.reset() + ' Mini-Games (Multiplayer)');
            this.terminal.println(ANSIParser.fg('bright-blue') + '  🏜️  [7]' + ANSIParser.reset() + ' Solo Adventures (When Alone)');
            this.terminal.println(ANSIParser.fg('bright-cyan') + '  ⚔️  [G]' + ANSIParser.reset() + ' General Store (Equipment & Gear)');
            this.terminal.println(ANSIParser.fg('bright-white') + '  🎮 [M]' + ANSIParser.reset() + ' Solo Mini-Games (Practice & Fun)');
            this.terminal.println(ANSIParser.fg('bright-green') + '  ⚡ [E]' + ANSIParser.reset() + ' Energy Recovery (Rest & Recharge)');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  📊 [8]' + ANSIParser.reset() + ' Leaderboards & Rankings');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  📰 [9]' + ANSIParser.reset() + ' The Gazette (Community News)');
            this.terminal.println(ANSIParser.fg('bright-cyan') + '  👤 [C]' + ANSIParser.reset() + ' Character Management');
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
        this.terminal.println(ANSIParser.fg('bright-white') + '  The heart of the Wild West - where all the action happens!' + ANSIParser.reset());
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
        
        // Saloon activities - ALL MULTIPLAYER FOCUSED
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  🍺 Saloon Activities (All Multiplayer!):' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [1]' + ANSIParser.reset() + ' 💬 Send Telegraph Message');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [2]' + ANSIParser.reset() + ' 🎮 Join Multiplayer Games');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [3]' + ANSIParser.reset() + ' ⚔️  Challenge Someone to Duel');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [4]' + ANSIParser.reset() + ' 💰 Trade with Other Players');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [5]' + ANSIParser.reset() + ' 🎵 Social Activities (Energy Recovery)');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [6]' + ANSIParser.reset() + ' 🏆 Join Competitions');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [7]' + ANSIParser.reset() + ' 📢 View Events & Announcements');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [8]' + ANSIParser.reset() + ' 👥 Form a Posse');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [9]' + ANSIParser.reset() + ' 🏆 Tournaments (TRUE Multiplayer!)');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [R]' + ANSIParser.reset() + ' 🔄 Refresh Saloon (Update Player List)');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [B]' + ANSIParser.reset() + ' Back to Main Menu');
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
        
        const choice = (await this.terminal.input()).toLowerCase().trim();
        
        if (choice === '1') {
            await this.sendTelegraphMessage();
        } else if (choice === '2') {
            await this.joinMultiplayerGames();
        } else if (choice === '3') {
            await this.challengeToDuel();
        } else if (choice === '4') {
            await this.tradeWithPlayers();
        } else if (choice === '5') {
            await this.socialActivities();
        } else if (choice === '6') {
            await this.joinCompetitions();
        } else if (choice === '7') {
            await this.viewEventsAndAnnouncements();
        } else if (choice === '8') {
            await this.formPosse();
        } else if (choice === '9') {
            await this.tournamentMode();
        } else if (choice === 'tournament' || choice === 't') {
            await this.tournamentMode();
        } else if (choice === 'r' || choice === 'refresh') {
            await this.enterSaloon(); // Refresh the saloon display
        } else if (choice === 'b' || choice === 'back') {
            return;
        } else {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Invalid choice!' + ANSIParser.reset());
            await this.terminal.sleep(1000);
            await this.enterSaloon(); // Return to saloon instead of exiting
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
                break;
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
        } else if (choice.toLowerCase() === 'b') {
            console.log('Returning to main menu'); // Debug
            return;
        } else {
            console.log('Invalid choice:', choice); // Debug
            this.terminal.println(ANSIParser.fg('bright-red') + '  Invalid choice!' + ANSIParser.reset());
            await this.terminal.sleep(1000);
        }
    }

    async tumbleweedDerby() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  ╔════ TUMBLEWEED DERBY ════╗' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ║ The Fastest Tumbleweed in the West ║' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  ╚═══════════════════════════════════╝' + ANSIParser.reset());
        this.terminal.println('');
        
        if (this.gameState.energy < 15) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  ❌ Not enough energy! Need 15 energy to race.' + ANSIParser.reset());
            await this.terminal.sleep(2000);
            await this.enterSaloon();
            return;
        }

        if (this.onlinePlayers.length < 2) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Need at least 2 players for the derby!' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  Wait for others to join!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
            await this.enterSaloon();
            return;
        }

        this.terminal.println(ANSIParser.fg('bright-yellow') + '  🌪️  Racers in the Derby:' + ANSIParser.reset());
        this.onlinePlayers.forEach((player, index) => {
            const townTag = this.getTownTag(player.current_town);
            this.terminal.println(ANSIParser.fg('bright-white') + `    ${index + 1}. ${townTag} ${player.display_name}` + ANSIParser.reset());
        });
        this.terminal.println('');

        this.terminal.println(ANSIParser.fg('bright-green') + `  💰 Your Gold: ${this.gameState.gold}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + `  ⚡ Energy Cost: 15` + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Place your bet (minimum 10 gold):' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [10] 10 gold' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [25] 25 gold' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [50] 50 gold' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [100] 100 gold' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [B] Back to Saloon' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
        
        const choice = (await this.terminal.input()).toLowerCase().trim();
        let bet = 0;
        
        if (choice === '10') bet = 10;
        else if (choice === '25') bet = 25;
        else if (choice === '50') bet = 50;
        else if (choice === '100') bet = 100;
        else if (choice === 'b' || choice === 'back') {
            await this.enterSaloon();
            return;
        }
        else {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Invalid choice!' + ANSIParser.reset());
            await this.terminal.sleep(1000);
            await this.enterSaloon();
            return;
        }
        
        if (this.gameState.gold < bet) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  ❌ Not enough gold!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
            await this.enterSaloon();
            return;
        }
        
        await this.startMultiplayerTumbleweedDerby(bet);
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
        await this.enterSaloon();
    }

    async beanCookingContest() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  ╔════ BEAN COOKING CONTEST ════╗' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ║ The Most Chaotic Cooking in the West ║' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  ╚═══════════════════════════════════╝' + ANSIParser.reset());
        this.terminal.println('');
        
        if (this.gameState.energy < 20) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  ❌ Not enough energy! Need 20 energy to cook.' + ANSIParser.reset());
            await this.terminal.sleep(2000);
            await this.enterSaloon();
            return;
        }

        if (this.onlinePlayers.length < 2) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Need at least 2 players for the cooking contest!' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  Wait for others to join!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
            await this.enterSaloon();
            return;
        }

        this.terminal.println(ANSIParser.fg('bright-yellow') + '  🍲 Cooks in the Contest:' + ANSIParser.reset());
        this.onlinePlayers.forEach((player, index) => {
            const townTag = this.getTownTag(player.current_town);
            this.terminal.println(ANSIParser.fg('bright-white') + `    ${index + 1}. ${townTag} ${player.display_name}` + ANSIParser.reset());
        });
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-green') + `  💰 Your Gold: ${this.gameState.gold}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + `  ⚡ Energy Cost: 20` + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [Y] Join Cooking Contest' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [B] Back to Saloon' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
        
        const choice = (await this.terminal.input()).toLowerCase().trim();
        
        if (choice === 'y' || choice === 'yes') {
            await this.startMultiplayerBeanCooking();
        } else if (choice === 'b' || choice === 'back') {
            await this.enterSaloon();
        } else {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Invalid choice!' + ANSIParser.reset());
            await this.terminal.sleep(1000);
            await this.enterSaloon();
        }
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
        await this.enterSaloon();
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
            await this.enterSaloon();
            return;
        }

        if (this.onlinePlayers.length < 2) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Need at least 2 players for the gold panning competition!' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  Wait for others to join!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
            await this.enterSaloon();
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
            await this.enterSaloon();
        } else {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Invalid choice!' + ANSIParser.reset());
            await this.terminal.sleep(1000);
            await this.enterSaloon();
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
        await this.enterSaloon();
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
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  📊 Leaderboards & Rankings!' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  See who\'s the best in the West!' + ANSIParser.reset());
        // TODO: Implement leaderboards
        await this.terminal.sleep(2000);
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
            const handleDuelResponse = (data) => {
                if (data.targetPlayer === this.player.id) {
                    clearTimeout(timeout);
                    this.socketClient.socket.off('duel-response', handleDuelResponse);
                    if (data.accepted) {
                        this.startDuel(data.duelType, data.wager, data.challenger);
                    } else {
                        this.terminal.println(ANSIParser.fg('bright-yellow') + `  ${data.challenger.name} declined your duel challenge!` + ANSIParser.reset());
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
    displaySaloonMessage(data) {
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
                this.enterSaloon();
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
                        username: this.authManager?.getCurrentUser()?.username || 'guest'
                    })
                });
                
                if (response.ok) {
                    const data = await response.json();
                    if (data.player) {
                        this.player = data.player;
                        this.gameState = data.gameState;
                        this.currentTown = data.currentTown;
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
                const savedData = localStorage.getItem('highNoonHustle_player');
                console.log('Loading from localStorage:', savedData); // Debug
                if (savedData) {
                    const data = JSON.parse(savedData);
                    this.player = data.player;
                    this.gameState = data.gameState;
                    this.currentTown = data.currentTown;
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
                        username: this.authManager?.getCurrentUser()?.username || 'guest',
                        ...dataToSave
                    })
                });
                
                if (response.ok) {
                    this.terminal.println(ANSIParser.fg('bright-green') + '  💾 Progress saved to PostgreSQL frontier database!' + ANSIParser.reset());
                    
                    // Also save to localStorage as backup
                    localStorage.setItem('highNoonHustle_player', JSON.stringify(dataToSave));
                } else {
                    throw new Error('Failed to save to PostgreSQL');
                }
            } else {
                // Development: Save to localStorage
                localStorage.setItem('highNoonHustle_player', JSON.stringify(dataToSave));
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
            const localData = localStorage.getItem('highNoonHustle_player');
            if (!localData) return;
            
            const data = JSON.parse(localData);
            
            // Try to sync to PostgreSQL
            const response = await fetch(`${this.dbAdapter.baseUrl}/api/hnh/player/save`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: this.authManager?.getCurrentUser()?.username || 'guest',
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
    async formPosse() { /* TODO */ }
    async viewEventsAndAnnouncements() { /* TODO */ }
    async tradeWithPlayers() { /* TODO */ }
    async joinCompetitions() { /* TODO */ }

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
                        // Use a more reliable refresh approach
                        setTimeout(() => {
                            console.log('DEBUG: Timeout fired - currentLocation:', this.currentLocation);
                            if (this.currentLocation === 'saloon') {
                                console.log('DEBUG: Refreshing saloon display...');
                                this.terminal.clear();
                                this.enterSaloon();
                            }
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
                    this.onlinePlayers = data.players;
                    console.log('DEBUG: Set onlinePlayers to:', this.onlinePlayers);
                    console.log('DEBUG: onlinePlayers length after setting:', this.onlinePlayers.length);
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

            // Socket listeners are set up, but join-game-room will be called separately
        }
    }

    joinGameRoom() {
        // Join the high-noon-hustle room with player data
        console.log('DEBUG: Emitting join-game-room for high-noon-hustle');
        if (this.player) {
            const playerData = {
                game: 'high-noon-hustle',
                player: {
                    id: this.player.id,
                    name: this.player.display_name,
                    display_name: this.player.display_name,
                    character_class: this.player.character_class,
                    current_town: this.currentTown
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
        this.terminal.println(ANSIParser.fg('bright-white') + `  • 5 minutes to compete in ${gameType}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  • Winner takes all the gold!' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  • All BBS users will be notified' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  • 60 seconds for players to join' + ANSIParser.reset());
        this.terminal.println('');
        
        const confirm = await this.terminal.input(ANSIParser.fg('bright-yellow') + '  Start tournament? (Y/N): ' + ANSIParser.reset());
        
        if (confirm.toLowerCase() === 'y' || confirm.toLowerCase() === 'yes') {
            // Generate tournament ID and set up tournament
            this.tournament.tournamentId = Date.now().toString();
            this.tournament.phase = 'joining';
            this.tournament.joinEndTime = Date.now() + (30 * 1000); // 30 seconds
            this.tournament.gameType = gameType;
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
                    joinPeriod: 30
                });
                this.socketClient.socket.emit('tournament-start', {
                    game: 'high-noon-hustle',
                    host: this.player.display_name,
                    gameType: gameType,
                    tournamentId: this.tournament.tournamentId,
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
        const startTime = Date.now();
        const duration = this.tournament.duration;
        
        while (Date.now() - startTime < duration) {
            const remaining = Math.ceil((duration - (Date.now() - startTime)) / 1000);
            
            this.terminal.clear();
            this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-cyan') + `  🏆 ${this.tournament.gameType.toUpperCase()} TOURNAMENT 🏆` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
            this.terminal.println('');
            
            this.terminal.println(ANSIParser.fg('bright-yellow') + `  Time remaining: ${remaining} seconds` + ANSIParser.reset());
            this.terminal.println('');
            
            // Show current leaderboard
            this.showTournamentLeaderboard();
            
            // Play one round of the game
            await this.playTournamentRound();
            
            await this.terminal.sleep(1000);
        }
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
        
        // Deal 5 cards
        const hand = this.dealPokerHand();
        
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  Your hand:' + ANSIParser.reset());
        this.displayPokerHand(hand);
        this.terminal.println('');
        
        // Evaluate hand
        const handValue = this.evaluatePokerHand(hand);
        const handName = this.pokerHands[handValue];
        
        this.terminal.println(ANSIParser.fg('bright-green') + `  Hand: ${handName}` + ANSIParser.reset());
        
        // Score based on hand strength (better hands = higher score)
        const score = (handValue + 1) * 20; // 20-200 points based on hand strength
        
        this.terminal.println(ANSIParser.fg('bright-cyan') + `  Score: ${score}` + ANSIParser.reset());
        
        this.updatePlayerScore(score);
        await this.terminal.sleep(2000);
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
        }
    }

    showTournamentLeaderboard() {
        // Sort participants by score
        const sorted = [...this.tournament.participants].sort((a, b) => b.score - a.score);
        
        console.log('DEBUG: showTournamentLeaderboard - this.player.username:', this.player.username);
        console.log('DEBUG: showTournamentLeaderboard - participants:', this.tournament.participants);
        
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
        
        // Sort final results
        const sorted = [...this.tournament.participants].sort((a, b) => b.score - a.score);
        const winner = sorted[0];
        
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-green') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + '  🏆 TOURNAMENT RESULTS 🏆' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Final Leaderboard:' + ANSIParser.reset());
        sorted.forEach((participant, index) => {
            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏃';
            const isYou = participant.id === this.player.id ? ' (YOU)' : '';
            this.terminal.println(ANSIParser.fg('bright-white') + `  ${medal} ${participant.name}${isYou}: ${participant.score.toFixed(1)}` + ANSIParser.reset());
        });
        this.terminal.println('');
        
        if (winner.id === this.player.id) {
            this.terminal.println(ANSIParser.fg('bright-green') + `  🎉 YOU WON THE TOURNAMENT!` + ANSIParser.reset());
            this.gameState.gold += 200; // Tournament winner bonus
            this.gameState.experience += 100;
        } else {
            this.terminal.println(ANSIParser.fg('bright-yellow') + `  🎯 ${winner.name} wins the tournament!` + ANSIParser.reset());
            this.gameState.experience += 25; // Participation bonus
        }
        
        await this.savePlayerData();
        await this.terminal.sleep(3000);
        await this.enterSaloon();
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
            } else if (this.tournament.phase === 'joining') {
                // Tournament is still in joining phase, wait for it to start
                this.terminal.println(ANSIParser.fg('bright-cyan') + '  Waiting for tournament to start...' + ANSIParser.reset());
                await this.terminal.sleep(1000);
                await this.tournamentMenu();
            } else {
                // Fallback to tournament menu
                await this.tournamentMenu();
            }
        } else {
            await this.tournamentMenu();
        }
    }

    async showTournamentRules() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  📋 TOURNAMENT RULES 📋' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-white') + '  • Tournaments last 5 minutes' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  • Players have 60 seconds to join' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  • Winner takes all the gold!' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  • Real-time leaderboard updates' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  • All BBS users are notified' + ANSIParser.reset());
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
            
            if (wasInJoiningPhase && isNowActive && isParticipant) {
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
            
            if (isParticipant) {
                this.tournament.phase = 'active';
                this.tournament.active = true;
                this.terminal.println(ANSIParser.fg('bright-green') + '  🏆 Tournament is starting! Joining now...' + ANSIParser.reset());
                setTimeout(() => {
                    this.runTournament();
                }, 2000);
            }
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
