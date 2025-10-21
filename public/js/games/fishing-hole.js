// FISHING HOLE - Multiplayer Fishing Game
// Fish alone or with friends! See what others catch in real-time!

class FishingHole {
    constructor(terminal, socketClient, authManager) {
        this.terminal = terminal;
        this.socketClient = socketClient;
        this.authManager = authManager;
        this.player = null;
        this.location = null;
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
            stats: {
                tournamentsPlayed: 0,
                tournamentsWon: 0,
                biggestTournamentFish: 0,
                biggestTournamentBag: 0,
                totalTournamentWeight: 0,
                totalTournamentFish: 0
            }
        };
        
        // Save batching to reduce API calls
        this.saveQueue = [];
        this.saveTimeout = null;
        this.lastSaveTime = 0;
        this.saveInterval = 5000; // Save every 5 seconds max
        
        // Save data when page is unloaded
        window.addEventListener('beforeunload', () => {
            this.savePlayerData(true);
        });
        this.fish = [
            // Common Fish
            { name: 'Minnow', rarity: 'Common', minWeight: 0.1, maxWeight: 0.5, value: 5, experience: 1, season: 'All' },
            { name: 'Sunfish', rarity: 'Common', minWeight: 0.3, maxWeight: 1.2, value: 8, experience: 2, season: 'All' },
            { name: 'Bass', rarity: 'Common', minWeight: 1.0, maxWeight: 5.0, value: 15, experience: 5, season: 'All' },
            { name: 'Perch', rarity: 'Common', minWeight: 0.5, maxWeight: 2.0, value: 12, experience: 3, season: 'All' },
            { name: 'Crappie', rarity: 'Common', minWeight: 0.8, maxWeight: 3.0, value: 18, experience: 4, season: 'All' },
            
            // Uncommon Fish
            { name: 'Trout', rarity: 'Uncommon', minWeight: 0.5, maxWeight: 3.0, value: 25, experience: 10, season: 'Spring/Fall' },
            { name: 'Pike', rarity: 'Uncommon', minWeight: 2.0, maxWeight: 8.0, value: 40, experience: 15, season: 'All' },
            { name: 'Walleye', rarity: 'Uncommon', minWeight: 1.5, maxWeight: 6.0, value: 35, experience: 12, season: 'Spring/Fall' },
            { name: 'Muskie', rarity: 'Uncommon', minWeight: 5.0, maxWeight: 15.0, value: 60, experience: 20, season: 'All' },
            { name: 'Carp', rarity: 'Uncommon', minWeight: 3.0, maxWeight: 20.0, value: 30, experience: 8, season: 'All' },
            
            // Rare Fish
            { name: 'Salmon', rarity: 'Rare', minWeight: 3.0, maxWeight: 12.0, value: 75, experience: 30, season: 'Fall' },
            { name: 'Sturgeon', rarity: 'Rare', minWeight: 10.0, maxWeight: 50.0, value: 150, experience: 50, season: 'All' },
            { name: 'Marlin', rarity: 'Rare', minWeight: 20.0, maxWeight: 100.0, value: 200, experience: 60, season: 'Summer' },
            { name: 'Tuna', rarity: 'Rare', minWeight: 15.0, maxWeight: 80.0, value: 180, experience: 55, season: 'Summer' },
            { name: 'Shark', rarity: 'Rare', minWeight: 25.0, maxWeight: 200.0, value: 250, experience: 70, season: 'Summer' },
            
            // Epic Fish
            { name: 'Catfish', rarity: 'Epic', minWeight: 5.0, maxWeight: 30.0, value: 200, experience: 75, season: 'All' },
            { name: 'Giant Bass', rarity: 'Epic', minWeight: 8.0, maxWeight: 25.0, value: 300, experience: 80, season: 'All' },
            { name: 'Monster Pike', rarity: 'Epic', minWeight: 12.0, maxWeight: 35.0, value: 350, experience: 85, season: 'All' },
            { name: 'Ancient Trout', rarity: 'Epic', minWeight: 6.0, maxWeight: 18.0, value: 280, experience: 75, season: 'Spring/Fall' },
            { name: 'Golden Carp', rarity: 'Epic', minWeight: 10.0, maxWeight: 40.0, value: 400, experience: 90, season: 'All' },
            
            // Legendary Fish
            { name: 'Legendary Bass', rarity: 'Legendary', minWeight: 15.0, maxWeight: 40.0, value: 500, experience: 150, season: 'All' },
            { name: 'Mystery Fish', rarity: 'Legendary', minWeight: 1.0, maxWeight: 100.0, value: 1000, experience: 300, season: 'All' },
            { name: 'King of the Lake', rarity: 'Legendary', minWeight: 50.0, maxWeight: 150.0, value: 800, experience: 200, season: 'All' },
            { name: 'Rainbow Serpent', rarity: 'Legendary', minWeight: 20.0, maxWeight: 80.0, value: 600, experience: 180, season: 'All' },
            { name: 'Phantom Pike', rarity: 'Legendary', minWeight: 25.0, maxWeight: 75.0, value: 700, experience: 190, season: 'All' },
            
            // Trophy Fish (Special category)
            { name: 'Trophy Bass', rarity: 'Trophy', minWeight: 10.0, maxWeight: 30.0, value: 1000, experience: 250, season: 'All' },
            { name: 'Trophy Pike', rarity: 'Trophy', minWeight: 15.0, maxWeight: 45.0, value: 1200, experience: 280, season: 'All' },
            { name: 'Trophy Trout', rarity: 'Trophy', minWeight: 8.0, maxWeight: 25.0, value: 900, experience: 220, season: 'Spring/Fall' },
            { name: 'Trophy Salmon', rarity: 'Trophy', minWeight: 12.0, maxWeight: 35.0, value: 1100, experience: 260, season: 'Fall' },
            { name: 'Trophy Catfish', rarity: 'Trophy', minWeight: 20.0, maxWeight: 60.0, value: 1500, experience: 320, season: 'All' },
            { name: 'Trophy Sturgeon', rarity: 'Trophy', minWeight: 40.0, maxWeight: 120.0, value: 2000, experience: 400, season: 'All' },
            { name: 'Trophy Marlin', rarity: 'Trophy', minWeight: 60.0, maxWeight: 200.0, value: 2500, experience: 500, season: 'Summer' },
            { name: 'Trophy Shark', rarity: 'Trophy', minWeight: 80.0, maxWeight: 300.0, value: 3000, experience: 600, season: 'Summer' }
        ];
        this.locations = [
            // Freshwater Locations
            { name: 'Lake Shore', difficulty: 'Easy', fish: [0, 1, 2], cost: 0, unlockLevel: 1, description: 'Perfect for beginners' },
            { name: 'River Bend', difficulty: 'Easy', fish: [0, 1, 2, 3], cost: 0, unlockLevel: 1, description: 'Gentle flowing waters' },
            { name: 'Deep Lake', difficulty: 'Medium', fish: [2, 3, 4, 5], cost: 50, unlockLevel: 3, description: 'Deep waters with bigger fish' },
            { name: 'Mountain Stream', difficulty: 'Medium', fish: [3, 4, 5, 6], cost: 75, unlockLevel: 5, description: 'Cold mountain waters' },
            { name: 'Secret Pond', difficulty: 'Hard', fish: [4, 5, 6, 7], cost: 150, unlockLevel: 8, description: 'Hidden treasure spot' },
            { name: 'Legendary Waters', difficulty: 'Expert', fish: [6, 7, 8, 9], cost: 300, unlockLevel: 12, description: 'Where legends are born' },
            
            // Saltwater Locations
            { name: 'Ocean Pier', difficulty: 'Medium', fish: [10, 11, 12], cost: 100, unlockLevel: 6, description: 'Saltwater fishing spot' },
            { name: 'Deep Sea', difficulty: 'Hard', fish: [12, 13, 14], cost: 250, unlockLevel: 10, description: 'Deep ocean fishing' },
            { name: 'Trophy Waters', difficulty: 'Expert', fish: [25, 26, 27, 28, 29, 30, 31, 32], cost: 500, unlockLevel: 15, description: 'Trophy fish paradise' },
            
            // Special Locations
            { name: 'Crystal Lake', difficulty: 'Hard', fish: [15, 16, 17, 18], cost: 200, unlockLevel: 9, description: 'Magical crystal-clear waters' },
            { name: 'Abyss', difficulty: 'Expert', fish: [19, 20, 21, 22, 23], cost: 400, unlockLevel: 14, description: 'Bottomless depths' },
            { name: 'Fishing Tournament', difficulty: 'Tournament', fish: [24, 25, 26, 27, 28], cost: 100, unlockLevel: 10, description: 'Competitive fishing event' }
        ];
        
        // Extensive tackle system
        this.tackle = {
            rods: [
                { name: 'Basic Rod', cost: 0, catchBonus: 0, strength: 10, description: 'Starting rod' },
                { name: 'Fiberglass Rod', cost: 100, catchBonus: 5, strength: 15, description: 'Better durability' },
                { name: 'Carbon Fiber Rod', cost: 300, catchBonus: 10, strength: 20, description: 'Lightweight and strong' },
                { name: 'Pro Rod', cost: 600, catchBonus: 15, strength: 25, description: 'Professional grade' },
                { name: 'Master Rod', cost: 1000, catchBonus: 20, strength: 30, description: 'Master angler equipment' },
                { name: 'Legendary Rod', cost: 2000, catchBonus: 25, strength: 40, description: 'Legendary craftsmanship' },
                { name: 'Trophy Rod', cost: 5000, catchBonus: 30, strength: 50, description: 'Trophy fishing specialist' }
            ],
            reels: [
                { name: 'Basic Reel', cost: 0, speedBonus: 0, smoothness: 10, description: 'Simple reel' },
                { name: 'Spinning Reel', cost: 75, speedBonus: 5, smoothness: 15, description: 'Smooth retrieval' },
                { name: 'Baitcasting Reel', cost: 200, speedBonus: 10, smoothness: 20, description: 'Precision casting' },
                { name: 'Fly Reel', cost: 400, speedBonus: 15, smoothness: 25, description: 'Fly fishing specialist' },
                { name: 'Big Game Reel', cost: 800, speedBonus: 20, smoothness: 30, description: 'Heavy duty fishing' },
                { name: 'Trophy Reel', cost: 1500, speedBonus: 25, smoothness: 40, description: 'Trophy fishing specialist' }
            ],
            lines: [
                { name: 'Monofilament', cost: 0, strength: 10, visibility: 5, description: 'Basic fishing line' },
                { name: 'Braided Line', cost: 50, strength: 15, visibility: 3, description: 'Strong and thin' },
                { name: 'Fluorocarbon', cost: 100, strength: 12, visibility: 1, description: 'Nearly invisible' },
                { name: 'Super Line', cost: 200, strength: 20, visibility: 2, description: 'Advanced technology' },
                { name: 'Trophy Line', cost: 400, strength: 30, visibility: 1, description: 'Trophy fishing specialist' }
            ],
            hooks: [
                { name: 'Basic Hook', cost: 0, hookBonus: 0, size: 'Medium', description: 'Standard hook' },
                { name: 'Sharp Hook', cost: 25, hookBonus: 5, size: 'Medium', description: 'Sharper point' },
                { name: 'Barbed Hook', cost: 50, hookBonus: 10, size: 'Medium', description: 'Harder to escape' },
                { name: 'Circle Hook', cost: 75, hookBonus: 15, size: 'Large', description: 'Better hooking' },
                { name: 'Treble Hook', cost: 100, hookBonus: 20, size: 'Large', description: 'Triple hooks' },
                { name: 'Trophy Hook', cost: 200, hookBonus: 30, size: 'Extra Large', description: 'Trophy fishing specialist' }
            ],
            bait: [
                { name: 'Basic Bait', cost: 0, attractionBonus: 0, durability: 5, description: 'Simple bait' },
                { name: 'Worms', cost: 10, attractionBonus: 5, durability: 3, description: 'Natural attraction' },
                { name: 'Minnows', cost: 20, attractionBonus: 10, durability: 4, description: 'Live bait' },
                { name: 'Crickets', cost: 15, attractionBonus: 8, durability: 2, description: 'Fresh bait' },
                { name: 'Power Bait', cost: 30, attractionBonus: 15, durability: 6, description: 'Enhanced attraction' },
                { name: 'Lures', cost: 50, attractionBonus: 20, durability: 10, description: 'Reusable lures' },
                { name: 'Trophy Bait', cost: 100, attractionBonus: 30, durability: 15, description: 'Trophy fishing specialist' }
            ]
        };
        this.otherFishers = [];
    }

    async play() {
        // Track location when entering fishing game
        if (this.socketClient) {
            this.socketClient.updateLocation('Fishing Hole Game');
        }
        
        // Notify server that user entered fishing game
        if (this.socketClient && this.socketClient.socket) {
            this.socketClient.socket.emit('enter-fishing-game');
        }
        
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + this.getTitleScreen() + ANSIParser.reset());
        this.terminal.println('');
        
        await this.loadGameState();
        
        if (!this.player) {
            await this.createPlayer();
        }
        
        // Listen for other fishers' catches
        await this.setupFishingListeners();
        
        // Listen for tournament announcements
        this.setupTournamentAnnouncementListener();
        
        while (true) {
            const choice = await this.mainMenu();
            
            if (choice === 'Q') {
                // Notify server that user left fishing game
                if (this.socketClient && this.socketClient.socket) {
                    this.socketClient.socket.emit('leave-fishing-game');
                }
                await this.savePlayerData(true); // Force save when leaving
                return 'doors';
            } else if (choice === '1') {
                await this.goFishing();
            } else if (choice === '2') {
                await this.viewInventory();
            } else if (choice === '3') {
                await this.tackleShop();
            } else if (choice === '4') {
                await this.changeLocation();
            } else if (choice === '5') {
                await this.viewStats();
            } else if (choice === '6') {
                await this.viewChallenges();
            } else if (choice === '7') {
                await this.viewAchievements();
            } else if (choice === '8') {
                await this.viewLeaderboard();
            } else if (choice === 'T') {
                await this.tournamentMode();
            }
        }
    }

    getTitleScreen() {
        return `
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║                          🎣 FISHING HOLE 🎣                                   ║
║                                                                              ║
║                    Multiplayer Fishing Adventure                               ║
║                                                                              ║
║                   Fish alone or with friends in real-time!                     ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
`;
    }

    async setupFishingListeners() {
        // Listen for other players fishing
        console.log('Setting up fishing listeners...');
        console.log('SocketClient available:', !!this.socketClient);
        
        if (!this.socketClient) {
            console.error('Socket client not available for fishing listeners');
            return;
        }

        try {
            // Wait for socket connection to be ready
            console.log('Waiting for socket connection...');
            await this.socketClient.waitForConnection(5000);
            console.log('Socket connection ready!');
            
            console.log('Socket available:', !!(this.socketClient && this.socketClient.socket));
            console.log('Socket connected:', !!(this.socketClient && this.socketClient.socket && this.socketClient.socket.connected));
            
            console.log('Registering fish-caught listener');
            
            // Remove any existing listeners first to prevent duplicates
            this.socketClient.socket.off('fish-caught');
            
            this.socketClient.socket.on('fish-caught', (data) => {
                console.log('🎣 FISH-CAUGHT EVENT RECEIVED:', data);
                console.log('Current user ID:', this.authManager.getCurrentUser().id);
                console.log('Event user ID:', data.userId);
                
                if (data.userId !== this.authManager.getCurrentUser().id) {
                    console.log('Displaying notification for other player');
                    this.terminal.println('');
                    this.terminal.println(ANSIParser.fg('bright-cyan') + `  🎣 ${data.handle} caught a ${data.fishName} (${data.weight.toFixed(2)} lbs)!` + ANSIParser.reset());
                    this.terminal.println(ANSIParser.fg('bright-white') + `     Location: ${data.location} | Value: $${data.value} | XP: ${data.experience}` + ANSIParser.reset());
                } else {
                    console.log('Ignoring own fish catch notification');
                }
            });
            
            console.log('Fish-caught listener registered successfully');
        } catch (error) {
            console.error('Failed to set up fishing listeners:', error);
            console.error('SocketClient:', this.socketClient);
            if (this.socketClient) {
                console.error('Socket:', this.socketClient.socket);
                console.error('Socket connected:', this.socketClient.socket?.connected);
            }
        }
    }

    async createPlayer() {
        this.terminal.println(ANSIParser.fg('bright-cyan') + '\n  Welcome to FISHING HOLE!' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println('  You are a master angler ready to catch the big one!');
        this.terminal.println('  Fish alone or join other anglers in real-time!');
        this.terminal.println('');
        
        const playerName = await this.terminal.input('  Enter your angler name: ');
        
        // Load player data from database or create new player
        const playerLoaded = await this.loadPlayerData(playerName);
        
        // If player data couldn't be loaded safely, exit the game
        if (!playerLoaded) {
            return; // Exit without creating new player
        }
        
        // Set default location if none was loaded
        if (!this.location) {
            this.location = this.locations[0];
        }
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + `  Welcome to the fishing hole, ${playerName}!` + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println('  Press any key to continue...');
        await this.terminal.input();
    }

    async mainMenu() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + this.getTitleScreen() + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-cyan') + `  Angler: ${this.player.name || 'Unknown'}  |  Level: ${this.player.level || 1}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + `  Money: $${this.player.money || 100}  |  Total Caught: ${this.player.totalCaught || 0}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + `  Biggest Catch: ${this.player.biggestCatchName || 'None'} (${(this.player.biggestCatch || 0).toFixed(2)} lbs)` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + `  Current Location: ${this.location.name} (${this.location.difficulty})` + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [1] Go Fishing!' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [2] View Inventory' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [3] Tackle Shop' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [4] Change Location' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [5] View Stats' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [6] Challenges' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [7] Achievements' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [8] Leaderboard' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [T] Tournament Mode' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-red') + '  [Q] Quit Game' + ANSIParser.reset());
        this.terminal.println('');
        
        const choice = await this.terminal.input('  Your choice: ');
        return choice.toUpperCase();
    }

    async goFishing() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + `  FISHING AT ${this.location.name.toUpperCase()}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println('');
        
        // Check for other fishers
        try {
            const response = await fetch('/api/users/online', {
                credentials: 'include'
            });
            const onlineUsers = await response.json();
            const currentUser = this.authManager.getCurrentUser();
            const otherFishers = onlineUsers.filter(u => u.id !== currentUser.id);
            
            if (otherFishers.length > 0) {
                this.terminal.println(ANSIParser.fg('bright-green') + '  🎣 Other anglers fishing nearby:' + ANSIParser.reset());
                otherFishers.forEach(fisher => {
                    this.terminal.println(ANSIParser.fg('bright-white') + `     • ${fisher.handle}` + ANSIParser.reset());
                });
                this.terminal.println('');
            }
        } catch (error) {
            // Ignore errors
        }
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Casting your line...' + ANSIParser.reset());
        await this.terminal.sleep(500);
        
        // Enhanced fishing animation
        await this.showCastingAnimation();
        await this.showWaitingAnimation();
        
        this.terminal.println('');
        this.terminal.println('');
        
        // Calculate catch chance based on location difficulty and gear
        const baseChance = this.getBaseCatchChance();
        const randomRoll = Math.random();
        const caughtFish = randomRoll < baseChance;
        
        // Debug logging
        console.log(`Fishing attempt - Catch chance: ${(baseChance * 100).toFixed(1)}%, Roll: ${(randomRoll * 100).toFixed(1)}%, Caught: ${caughtFish}`);
        
        if (caughtFish) {
            await this.showCatchAnimation();
            await this.catchFish();
        } else {
            await this.showNoCatchAnimation();
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  The fish got away!' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-white') + '  Try again!' + ANSIParser.reset());
        }
        
        this.terminal.println('');
        this.terminal.println('  Press any key to continue...');
        await this.terminal.input();
    }

    getBaseCatchChance() {
        let chance = 0.7; // 70% base chance
        
        // Adjust for location difficulty
        if (this.location.difficulty === 'Easy') chance += 0.1;
        else if (this.location.difficulty === 'Medium') chance -= 0.1;
        else if (this.location.difficulty === 'Hard') chance -= 0.2;
        else if (this.location.difficulty === 'Expert') chance -= 0.3;
        else if (this.location.difficulty === 'Tournament') chance -= 0.4;
        
        // Adjust for tackle bonuses
        const rodBonus = this.getTackleBonus('rod', 'catchBonus');
        const reelBonus = this.getTackleBonus('reel', 'speedBonus') * 0.5; // Half bonus for catch rate
        const lineBonus = this.getTackleBonus('line', 'strength') * 0.3; // Quarter bonus for catch rate
        const hookBonus = this.getTackleBonus('hook', 'hookBonus');
        const baitBonus = this.getTackleBonus('bait', 'attractionBonus');
        
        chance += (rodBonus + reelBonus + lineBonus + hookBonus + baitBonus) / 100;
        
        // Adjust for player stats
        console.log('Player stats in catch calculation:', this.player.stats);
        const accuracyBonus = (this.player.stats.accuracy - 50) * 0.001; // Accuracy affects catch rate
        const luckBonus = (this.player.stats.luck - 50) * 0.002; // Luck affects catch rate
        
        chance += accuracyBonus + luckBonus;
        
        // Adjust for level
        const levelBonus = (this.player.level - 1) * 0.02;
        chance += levelBonus;
        
        const finalChance = Math.min(0.95, Math.max(0.2, chance));
        
        // Debug logging
        const locationAdjustment = chance - 0.7;
        console.log(`Catch chance calculation:
          Base: 70%
          Location (${this.location.difficulty}): ${locationAdjustment.toFixed(3)}
          Tackle bonuses: rod=${rodBonus}, reel=${reelBonus}, line=${lineBonus}, hook=${hookBonus}, bait=${baitBonus}
          Stats: accuracy=${accuracyBonus.toFixed(3)} (from ${this.player.stats.accuracy}), luck=${luckBonus.toFixed(3)} (from ${this.player.stats.luck})
          Level bonus: ${levelBonus.toFixed(3)}
          Final chance: ${(finalChance * 100).toFixed(1)}%`);
        
        return finalChance;
    }

    getTackleBonus(category, stat) {
        if (!this.tackle || !this.tackle[category]) {
            return 0; // Return 0 bonus if tackle not initialized
        }
        const tackle = this.tackle[category];
        const equipped = this.player.gear[category];
        const item = tackle.find(t => t.name === equipped);
        return item ? item[stat] || 0 : 0;
    }

    async catchFish() {
        // Select fish based on location
        const availableFish = this.location.fish;
        const fishIndex = availableFish[Math.floor(Math.random() * availableFish.length)];
        const fishTemplate = this.fish[fishIndex];
        
        // Calculate weight
        const weight = fishTemplate.minWeight + Math.random() * (fishTemplate.maxWeight - fishTemplate.minWeight);
        
        // Calculate value (based on weight)
        const value = Math.floor(fishTemplate.value * (1 + weight / fishTemplate.maxWeight));
        
        // Calculate experience
        const experience = Math.floor(fishTemplate.experience * (1 + weight / fishTemplate.maxWeight));
        
        // Create fish object
        const caughtFish = {
            name: fishTemplate.name,
            weight: weight,
            value: value,
            experience: experience,
            rarity: fishTemplate.rarity,
            location: this.location.name,
            timestamp: new Date().toISOString()
        };
        
        // Add to inventory
        this.player.inventory.push(caughtFish);
        
        // Update stats
        this.player.totalCaught++;
        this.player.totalWeight += weight;
        this.player.money += value;
        this.player.experience += experience;
        
        if (weight > this.player.biggestCatch) {
            this.player.biggestCatch = weight;
            this.player.biggestCatchName = caughtFish.name;
        }
        
        if (caughtFish.rarity === 'Rare' || caughtFish.rarity === 'Epic') {
            this.player.rareCatches++;
        }
        if (caughtFish.rarity === 'Legendary') {
            this.player.legendaryCatches++;
        }
        if (caughtFish.rarity === 'Trophy') {
            this.player.trophyCatches++;
        }
        
        // Display catch
        this.terminal.println(ANSIParser.fg('bright-green') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + '  🎣 YOU CAUGHT A FISH! 🎣' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-yellow') + `  ${caughtFish.name}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + `  Weight: ${weight.toFixed(2)} lbs` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + `  Rarity: ${caughtFish.rarity}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + `  Value: $${value}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + `  Experience: ${experience}` + ANSIParser.reset());
        
        // Special messages for big catches
        if (weight > 10) {
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-cyan') + '  ⭐ BIG CATCH! ⭐' + ANSIParser.reset());
        }
        if (caughtFish.rarity === 'Legendary') {
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  ⭐⭐⭐ LEGENDARY CATCH! ⭐⭐⭐' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  This fish will be remembered for generations!' + ANSIParser.reset());
        }
        if (caughtFish.rarity === 'Trophy') {
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-red') + '  🏆 TROPHY FISH! 🏆' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-red') + '  This is a true trophy catch!' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-red') + '  You have proven yourself a master angler!' + ANSIParser.reset());
        }
        if (weight > this.player.biggestCatch) {
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-green') + '  🎯 NEW PERSONAL BEST! 🎯' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-green') + '  You just caught your biggest fish ever!' + ANSIParser.reset());
        }
        
        // Broadcast to other players
        console.log('🐟 Attempting to broadcast fish catch...');
        console.log('SocketClient available:', !!this.socketClient);
        console.log('Socket available:', !!(this.socketClient && this.socketClient.socket));
        console.log('Socket connected:', !!(this.socketClient && this.socketClient.socket && this.socketClient.socket.connected));
        
        if (this.socketClient && this.socketClient.socket) {
            const fishData = {
                userId: this.authManager.getCurrentUser().id,
                handle: this.player.name,
                fishName: caughtFish.name,
                weight: weight,
                location: this.location.name,
                value: value,
                experience: experience,
                rarity: caughtFish.rarity
            };
            
            console.log('🎣 EMITTING FISH-CAUGHT EVENT:', fishData);
            console.log('Socket connected:', this.socketClient.socket.connected);
            
            this.socketClient.socket.emit('fish-caught', fishData);
            console.log('Fish-caught event emitted successfully');
        } else {
            console.error('Cannot emit fish-caught event - socket not available');
        }
        
        this.checkLevelUp();
        
        // Save progress after catching a fish
        await this.savePlayerData();
    }

    async viewInventory() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  YOUR CATCH' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println('');
        
        if (this.player.inventory.length === 0) {
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  No fish caught yet!' + ANSIParser.reset());
        } else {
            // Show last 10 catches
            const recentCatches = this.player.inventory.slice(-10).reverse();
            
            this.terminal.println(ANSIParser.fg('bright-white') + '  Recent Catches (Last 10):' + ANSIParser.reset());
            this.terminal.println('');
            
            recentCatches.forEach((fish, index) => {
                const time = new Date(fish.timestamp).toLocaleTimeString();
                this.terminal.println(ANSIParser.fg('bright-green') + `  ${index + 1}. ${fish.name} (${fish.weight.toFixed(2)} lbs)` + ANSIParser.reset());
                this.terminal.println(ANSIParser.fg('bright-white') + `     ${fish.location} | $${fish.value} | ${time}` + ANSIParser.reset());
                this.terminal.println('');
            });
            
            this.terminal.println(ANSIParser.fg('bright-yellow') + `  Total Fish: ${this.player.inventory.length}` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-yellow') + `  Total Weight: ${this.player.totalWeight.toFixed(2)} lbs` + ANSIParser.reset());
        }
        
        this.terminal.println('');
        this.terminal.println('  Press any key to continue...');
        await this.terminal.input();
    }

    async viewLeaderboard() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  FISHING LEADERBOARD' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println('');
        
        try {
            const response = await fetch('/api/game-state/fishing-hole/leaderboard', {
                credentials: 'include'
            });
            console.log('Leaderboard response status:', response.status);
            const data = await response.json();
            console.log('Leaderboard response data:', data);
            
            // Show Biggest Catch Leaderboard
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  🏆 BIGGEST CATCH LEADERBOARD' + ANSIParser.reset());
            this.terminal.println('');
            
            console.log('topCatches data:', data.topCatches);
            console.log('topCatches length:', data.topCatches ? data.topCatches.length : 'undefined');
            console.log('First topCatch entry:', data.topCatches[0]);
            
            if (!data.topCatches || data.topCatches.length === 0) {
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  No anglers yet!' + ANSIParser.reset());
            } else {
                this.terminal.println(ANSIParser.fg('bright-cyan') + '  Rank  Angler Name         Level  Biggest Catch' + ANSIParser.reset());
                this.terminal.println(ANSIParser.fg('bright-white') + '  ───────────────────────────────────────────' + ANSIParser.reset());
                
                data.topCatches.forEach((entry, index) => {
                    console.log(`Processing topCatch ${index}:`, entry);
                    const rank = (index + 1).toString().padStart(2);
                    const name = entry.playerName.padEnd(20);
                    const level = entry.level.toString().padStart(5);
                    const biggestCatch = parseFloat(entry.biggestCatch) || 0;
                    const catchInfo = `${entry.biggestCatchName} (${biggestCatch.toFixed(2)} lbs)`;
                    const color = index === 0 ? 'bright-yellow' : index < 3 ? 'bright-green' : 'bright-cyan';
                    console.log(`Displaying: ${rank}. ${name} ${level} ${catchInfo}`);
                    this.terminal.println(ANSIParser.fg(color) + `  ${rank}.  ${name}  ${level}  ${catchInfo}` + ANSIParser.reset());
                });
            }
            
            this.terminal.println('');
            
            // Show Biggest Bag Leaderboard
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  🎣 BIGGEST BAG LEADERBOARD (Top 10 Fish Total)' + ANSIParser.reset());
            this.terminal.println('');
            
            console.log('topBags data:', data.topBags);
            console.log('topBags length:', data.topBags ? data.topBags.length : 'undefined');
            
            if (!data.topBags || data.topBags.length === 0) {
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  No anglers yet!' + ANSIParser.reset());
            } else {
                this.terminal.println(ANSIParser.fg('bright-cyan') + '  Rank  Angler Name         Level  Total Weight' + ANSIParser.reset());
                this.terminal.println(ANSIParser.fg('bright-white') + '  ───────────────────────────────────────────' + ANSIParser.reset());
                
                data.topBags.forEach((entry, index) => {
                    const rank = (index + 1).toString().padStart(2);
                    const name = entry.playerName.padEnd(20);
                    const level = entry.level.toString().padStart(5);
                    const totalWeight = parseFloat(entry.totalWeight) || 0;
                    const weight = `${totalWeight.toFixed(2)} lbs`;
                    const color = index === 0 ? 'bright-yellow' : index < 3 ? 'bright-green' : 'bright-cyan';
                    this.terminal.println(ANSIParser.fg(color) + `  ${rank}.  ${name}  ${level}  ${weight}` + ANSIParser.reset());
                });
            }
        } catch (error) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Could not load leaderboard.' + ANSIParser.reset());
        }
        
        this.terminal.println('');
        this.terminal.println('  Press any key to continue...');
        await this.terminal.input();
    }

    async viewStats() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ANGLER STATISTICS' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-yellow') + `  Name: ${this.player.name}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + `  Level: ${this.player.level}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + `  Experience: ${this.player.experience}/${this.getExpNeeded()}` + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + `  Total Caught: ${this.player.totalCaught}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + `  Total Weight: ${(this.player.totalWeight || 0).toFixed(2)} lbs` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + `  Biggest Catch: ${this.player.biggestCatchName} (${(this.player.biggestCatch || 0).toFixed(2)} lbs)` + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-cyan') + `  Rare Catches: ${this.player.rareCatches}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + `  Legendary Catches: ${this.player.legendaryCatches}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-red') + `  Trophy Catches: ${this.player.trophyCatches}` + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-white') + `  Money: $${this.player.money}` + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-white') + `  Current Gear:` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + `    Rod: ${this.player.gear.rod}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + `    Reel: ${this.player.gear.reel}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + `    Line: ${this.player.gear.line}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + `    Hook: ${this.player.gear.hook}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + `    Bait: ${this.player.gear.bait}` + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-cyan') + `  Player Stats:` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + `    Accuracy: ${this.player.stats.accuracy}/100` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + `    Luck: ${this.player.stats.luck}/100` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + `    Patience: ${this.player.stats.patience}/100` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + `    Strength: ${this.player.stats.strength}/100` + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-yellow') + `  Locations Unlocked: ${this.player.locationUnlocks.length}/${this.locations.length}` + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println('  Press any key to continue...');
        await this.terminal.input();
    }

    async tackleShop() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  TACKLE SHOP' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-yellow') + `  Money: $${this.player.money}` + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [1] Rods' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [2] Reels' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [3] Lines' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [4] Hooks' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [5] Bait' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-red') + '  [0] Back' + ANSIParser.reset());
        this.terminal.println('');
        
        const choice = await this.terminal.input('  Your choice: ');
        
        if (choice === '1') {
            await this.buyRods();
        } else if (choice === '2') {
            await this.buyReels();
        } else if (choice === '3') {
            await this.buyLines();
        } else if (choice === '4') {
            await this.buyHooks();
        } else if (choice === '5') {
            await this.buyBait();
        }
    }

    async buyRods() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  RODS' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-yellow') + `  Money: $${this.player.money}` + ANSIParser.reset());
        this.terminal.println('');
        
        if (!this.tackle || !this.tackle.rods) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Tackle system not initialized!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
            return;
        }
        
        this.tackle.rods.forEach((rod, index) => {
            const canAfford = this.player.money >= rod.cost;
            const owned = this.player.gear.rod === rod.name;
            const unlocked = this.player.tackleUnlocks?.rods?.includes(index) || false;
            console.log(`Rod ${index} (${rod.name}): unlocked=${unlocked}, tackleUnlocks.rods=`, this.player.tackleUnlocks?.rods);
            
            let status = '';
            if (owned) status = ANSIParser.fg('bright-green') + ' [EQUIPPED]' + ANSIParser.reset();
            else if (!unlocked) status = ANSIParser.fg('bright-red') + ' [LOCKED]' + ANSIParser.reset();
            else if (!canAfford) status = ANSIParser.fg('bright-yellow') + ' [TOO EXPENSIVE]' + ANSIParser.reset();
            
            const color = owned ? 'bright-green' : (!unlocked || !canAfford) ? 'bright-black' : 'bright-white';
            this.terminal.println(ANSIParser.fg(color) + `  [${index + 1}] ${rod.name} - $${rod.cost} (+${rod.catchBonus}% catch, ${rod.strength} strength)${status}` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-black') + `      ${rod.description}` + ANSIParser.reset());
        });
        
        this.terminal.println(ANSIParser.fg('bright-red') + '  [0] Back' + ANSIParser.reset());
        this.terminal.println('');
        
        const choice = parseInt(await this.terminal.input('  Your choice: ')) - 1;
        
        if (choice >= 0 && choice < this.tackle.rods.length) {
            const rod = this.tackle.rods[choice];
            const canAfford = this.player.money >= rod.cost;
            const owned = this.player.gear.rod === rod.name;
            const unlocked = this.player.tackleUnlocks?.rods?.includes(choice) || false;
            
            if (owned) {
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  Already equipped!' + ANSIParser.reset());
            } else if (!unlocked) {
                this.terminal.println(ANSIParser.fg('bright-red') + '  Not unlocked yet!' + ANSIParser.reset());
            } else if (!canAfford) {
                this.terminal.println(ANSIParser.fg('bright-red') + '  Not enough money!' + ANSIParser.reset());
            } else {
                this.player.money -= rod.cost;
                this.player.gear.rod = rod.name;
                this.terminal.println(ANSIParser.fg('bright-green') + `  ${rod.name} purchased and equipped!` + ANSIParser.reset());
                await this.savePlayerData(true); // Force save when leaving
            }
        }
        
        await this.terminal.sleep(2000);
    }

    async buyReels() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  REELS' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-yellow') + `  Money: $${this.player.money}` + ANSIParser.reset());
        this.terminal.println('');
        
        if (!this.tackle || !this.tackle.reels) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Tackle system not initialized!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
            return;
        }
        
        this.tackle.reels.forEach((reel, index) => {
            const canAfford = this.player.money >= reel.cost;
            const owned = this.player.gear.reel === reel.name;
            const unlocked = this.player.tackleUnlocks?.reels?.includes(index) || false;
            
            let status = '';
            if (owned) status = ANSIParser.fg('bright-green') + ' [EQUIPPED]' + ANSIParser.reset();
            else if (!unlocked) status = ANSIParser.fg('bright-red') + ' [LOCKED]' + ANSIParser.reset();
            else if (!canAfford) status = ANSIParser.fg('bright-yellow') + ' [TOO EXPENSIVE]' + ANSIParser.reset();
            
            const color = owned ? 'bright-green' : (!unlocked || !canAfford) ? 'bright-black' : 'bright-white';
            this.terminal.println(ANSIParser.fg(color) + `  [${index + 1}] ${reel.name} - $${reel.cost} (+${reel.speedBonus}% speed, ${reel.smoothness} smoothness)${status}` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-black') + `      ${reel.description}` + ANSIParser.reset());
        });
        
        this.terminal.println(ANSIParser.fg('bright-red') + '  [0] Back' + ANSIParser.reset());
        this.terminal.println('');
        
        const choice = parseInt(await this.terminal.input('  Your choice: ')) - 1;
        
        if (choice >= 0 && choice < this.tackle.reels.length) {
            const reel = this.tackle.reels[choice];
            const canAfford = this.player.money >= reel.cost;
            const owned = this.player.gear.reel === reel.name;
            const unlocked = this.player.tackleUnlocks?.reels?.includes(choice) || false;
            
            if (owned) {
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  Already equipped!' + ANSIParser.reset());
            } else if (!unlocked) {
                this.terminal.println(ANSIParser.fg('bright-red') + '  Not unlocked yet!' + ANSIParser.reset());
            } else if (!canAfford) {
                this.terminal.println(ANSIParser.fg('bright-red') + '  Not enough money!' + ANSIParser.reset());
            } else {
                this.player.money -= reel.cost;
                this.player.gear.reel = reel.name;
                this.terminal.println(ANSIParser.fg('bright-green') + `  ${reel.name} purchased and equipped!` + ANSIParser.reset());
                await this.savePlayerData(true); // Force save when leaving
            }
        }
        
        await this.terminal.sleep(2000);
    }

    async buyLines() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  FISHING LINES' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-yellow') + `  Money: $${this.player.money}` + ANSIParser.reset());
        this.terminal.println('');
        
        if (!this.tackle || !this.tackle.lines) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Tackle system not initialized!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
            return;
        }
        
        this.tackle.lines.forEach((line, index) => {
            const canAfford = this.player.money >= line.cost;
            const owned = this.player.gear.line === line.name;
            const unlocked = this.player.tackleUnlocks?.lines?.includes(index) || false;
            
            let status = '';
            if (owned) status = ANSIParser.fg('bright-green') + ' [EQUIPPED]' + ANSIParser.reset();
            else if (!unlocked) status = ANSIParser.fg('bright-red') + ' [LOCKED]' + ANSIParser.reset();
            else if (!canAfford) status = ANSIParser.fg('bright-yellow') + ' [TOO EXPENSIVE]' + ANSIParser.reset();
            
            const color = owned ? 'bright-green' : (!unlocked || !canAfford) ? 'bright-black' : 'bright-white';
            this.terminal.println(ANSIParser.fg(color) + `  [${index + 1}] ${line.name} - $${line.cost} (${line.strength} strength, ${line.visibility} visibility)${status}` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-black') + `      ${line.description}` + ANSIParser.reset());
        });
        
        this.terminal.println(ANSIParser.fg('bright-red') + '  [0] Back' + ANSIParser.reset());
        this.terminal.println('');
        
        const choice = parseInt(await this.terminal.input('  Your choice: ')) - 1;
        
        if (choice >= 0 && choice < this.tackle.lines.length) {
            const line = this.tackle.lines[choice];
            const canAfford = this.player.money >= line.cost;
            const owned = this.player.gear.line === line.name;
            const unlocked = this.player.tackleUnlocks?.lines?.includes(choice) || false;
            
            if (owned) {
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  Already equipped!' + ANSIParser.reset());
            } else if (!unlocked) {
                this.terminal.println(ANSIParser.fg('bright-red') + '  Not unlocked yet!' + ANSIParser.reset());
            } else if (!canAfford) {
                this.terminal.println(ANSIParser.fg('bright-red') + '  Not enough money!' + ANSIParser.reset());
            } else {
                this.player.money -= line.cost;
                this.player.gear.line = line.name;
                this.terminal.println(ANSIParser.fg('bright-green') + `  ${line.name} purchased and equipped!` + ANSIParser.reset());
                await this.savePlayerData(true); // Force save when leaving
            }
        }
        
        await this.terminal.sleep(2000);
    }

    async buyHooks() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  HOOKS' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-yellow') + `  Money: $${this.player.money}` + ANSIParser.reset());
        this.terminal.println('');
        
        if (!this.tackle || !this.tackle.hooks) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Tackle system not initialized!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
            return;
        }
        
        this.tackle.hooks.forEach((hook, index) => {
            const canAfford = this.player.money >= hook.cost;
            const owned = this.player.gear.hook === hook.name;
            const unlocked = this.player.tackleUnlocks?.hooks?.includes(index) || false;
            
            let status = '';
            if (owned) status = ANSIParser.fg('bright-green') + ' [EQUIPPED]' + ANSIParser.reset();
            else if (!unlocked) status = ANSIParser.fg('bright-red') + ' [LOCKED]' + ANSIParser.reset();
            else if (!canAfford) status = ANSIParser.fg('bright-yellow') + ' [TOO EXPENSIVE]' + ANSIParser.reset();
            
            const color = owned ? 'bright-green' : (!unlocked || !canAfford) ? 'bright-black' : 'bright-white';
            this.terminal.println(ANSIParser.fg(color) + `  [${index + 1}] ${hook.name} - $${hook.cost} (+${hook.hookBonus}% hook rate, ${hook.size} size)${status}` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-black') + `      ${hook.description}` + ANSIParser.reset());
        });
        
        this.terminal.println(ANSIParser.fg('bright-red') + '  [0] Back' + ANSIParser.reset());
        this.terminal.println('');
        
        const choice = parseInt(await this.terminal.input('  Your choice: ')) - 1;
        
        if (choice >= 0 && choice < this.tackle.hooks.length) {
            const hook = this.tackle.hooks[choice];
            const canAfford = this.player.money >= hook.cost;
            const owned = this.player.gear.hook === hook.name;
            const unlocked = this.player.tackleUnlocks?.hooks?.includes(choice) || false;
            
            if (owned) {
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  Already equipped!' + ANSIParser.reset());
            } else if (!unlocked) {
                this.terminal.println(ANSIParser.fg('bright-red') + '  Not unlocked yet!' + ANSIParser.reset());
            } else if (!canAfford) {
                this.terminal.println(ANSIParser.fg('bright-red') + '  Not enough money!' + ANSIParser.reset());
            } else {
                this.player.money -= hook.cost;
                this.player.gear.hook = hook.name;
                this.terminal.println(ANSIParser.fg('bright-green') + `  ${hook.name} purchased and equipped!` + ANSIParser.reset());
                await this.savePlayerData(true); // Force save when leaving
            }
        }
        
        await this.terminal.sleep(2000);
    }

    async buyBait() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  BAIT' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-yellow') + `  Money: $${this.player.money}` + ANSIParser.reset());
        this.terminal.println('');
        
        if (!this.tackle || !this.tackle.bait) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Tackle system not initialized!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
            return;
        }
        
        this.tackle.bait.forEach((bait, index) => {
            const canAfford = this.player.money >= bait.cost;
            const owned = this.player.gear.bait === bait.name;
            const unlocked = this.player.tackleUnlocks?.bait?.includes(index) || false;
            
            let status = '';
            if (owned) status = ANSIParser.fg('bright-green') + ' [EQUIPPED]' + ANSIParser.reset();
            else if (!unlocked) status = ANSIParser.fg('bright-red') + ' [LOCKED]' + ANSIParser.reset();
            else if (!canAfford) status = ANSIParser.fg('bright-yellow') + ' [TOO EXPENSIVE]' + ANSIParser.reset();
            
            const color = owned ? 'bright-green' : (!unlocked || !canAfford) ? 'bright-black' : 'bright-white';
            this.terminal.println(ANSIParser.fg(color) + `  [${index + 1}] ${bait.name} - $${bait.cost} (+${bait.attractionBonus}% attraction, ${bait.durability} durability)${status}` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-black') + `      ${bait.description}` + ANSIParser.reset());
        });
        
        this.terminal.println(ANSIParser.fg('bright-red') + '  [0] Back' + ANSIParser.reset());
        this.terminal.println('');
        
        const choice = parseInt(await this.terminal.input('  Your choice: ')) - 1;
        
        if (choice >= 0 && choice < this.tackle.bait.length) {
            const bait = this.tackle.bait[choice];
            const canAfford = this.player.money >= bait.cost;
            const owned = this.player.gear.bait === bait.name;
            const unlocked = this.player.tackleUnlocks?.bait?.includes(choice) || false;
            
            if (owned) {
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  Already equipped!' + ANSIParser.reset());
            } else if (!unlocked) {
                this.terminal.println(ANSIParser.fg('bright-red') + '  Not unlocked yet!' + ANSIParser.reset());
            } else if (!canAfford) {
                this.terminal.println(ANSIParser.fg('bright-red') + '  Not enough money!' + ANSIParser.reset());
            } else {
                this.player.money -= bait.cost;
                this.player.gear.bait = bait.name;
                this.terminal.println(ANSIParser.fg('bright-green') + `  ${bait.name} purchased and equipped!` + ANSIParser.reset());
                await this.savePlayerData(true); // Force save when leaving
            }
        }
        
        await this.terminal.sleep(2000);
    }

    async changeLocation() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  FISHING LOCATIONS' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-yellow') + `  Money: $${this.player.money}` + ANSIParser.reset());
        this.terminal.println('');
        
        this.locations.forEach((location, index) => {
            const canAfford = this.player.money >= location.cost;
            const owned = this.player.locationUnlocks.includes(index);
            const canUnlock = this.player.level >= location.unlockLevel;
            
            let status = '';
            if (this.location === location) status = ANSIParser.fg('bright-green') + ' [CURRENT]' + ANSIParser.reset();
            else if (!owned) {
                if (!canUnlock) status = ANSIParser.fg('bright-red') + ` [LEVEL ${location.unlockLevel} REQUIRED]` + ANSIParser.reset();
                else if (!canAfford) status = ANSIParser.fg('bright-yellow') + ' [TOO EXPENSIVE]' + ANSIParser.reset();
                else status = ANSIParser.fg('bright-yellow') + ' [UNLOCK FOR $' + location.cost + ']' + ANSIParser.reset();
            }
            
            const color = (this.location === location) ? 'bright-green' : (!owned && (!canUnlock || !canAfford)) ? 'bright-black' : 'bright-white';
            this.terminal.println(ANSIParser.fg(color) + `  [${index + 1}] ${location.name} (${location.difficulty}) - $${location.cost}${status}` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-black') + `      ${location.description}` + ANSIParser.reset());
        });
        
        this.terminal.println(ANSIParser.fg('bright-red') + '  [0] Back' + ANSIParser.reset());
        this.terminal.println('');
        
        const choice = parseInt(await this.terminal.input('  Your choice: ')) - 1;
        
        if (choice >= 0 && choice < this.locations.length) {
            const location = this.locations[choice];
            const canAfford = this.player.money >= location.cost;
            const owned = this.player.locationUnlocks.includes(choice);
            const canUnlock = this.player.level >= location.unlockLevel;
            
            if (this.location === location) {
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  Already at this location!' + ANSIParser.reset());
            } else if (!owned) {
                if (!canUnlock) {
                    this.terminal.println(ANSIParser.fg('bright-red') + `  Need level ${location.unlockLevel} to unlock!` + ANSIParser.reset());
                } else if (!canAfford) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Not enough money!' + ANSIParser.reset());
                } else {
                    this.player.money -= location.cost;
                    this.player.locationUnlocks.push(choice);
                    this.location = location;
                    this.terminal.println(ANSIParser.fg('bright-green') + `  ${location.name} unlocked and selected!` + ANSIParser.reset());
                    await this.savePlayerData(true); // Force save when leaving
                }
            } else {
                this.location = location;
                this.terminal.println(ANSIParser.fg('bright-green') + `  Moved to ${location.name}!` + ANSIParser.reset());
                await this.savePlayerData(true); // Force save when leaving
            }
        }
        
        await this.terminal.sleep(2000);
    }

    async viewChallenges() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  FISHING CHALLENGES' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println('');
        
        const challenges = [
            { name: 'First Fish', description: 'Catch your first fish', reward: '$50', completed: this.player.totalCaught > 0 },
            { name: 'Big Catch', description: 'Catch a fish over 5 lbs', reward: '$100', completed: this.player.biggestCatch > 5 },
            { name: 'Rare Hunter', description: 'Catch 5 rare fish', reward: '$200', completed: this.player.rareCatches >= 5 },
            { name: 'Legend Seeker', description: 'Catch a legendary fish', reward: '$500', completed: this.player.legendaryCatches > 0 },
            { name: 'Trophy Master', description: 'Catch a trophy fish', reward: '$1000', completed: this.player.trophyCatches > 0 },
            { name: 'Money Maker', description: 'Earn $1000 total', reward: 'Premium Bait', completed: this.player.money >= 1000 },
            { name: 'Level Up', description: 'Reach level 10', reward: 'Pro Rod', completed: this.player.level >= 10 },
            { name: 'Location Explorer', description: 'Unlock 5 locations', reward: '$300', completed: this.player.locationUnlocks.length >= 5 }
        ];
        
        challenges.forEach((challenge, index) => {
            const status = challenge.completed ? 
                ANSIParser.fg('bright-green') + ' [COMPLETED]' + ANSIParser.reset() : 
                ANSIParser.fg('bright-yellow') + ' [IN PROGRESS]' + ANSIParser.reset();
            
            const color = challenge.completed ? 'bright-green' : 'bright-white';
            this.terminal.println(ANSIParser.fg(color) + `  ${index + 1}. ${challenge.name}${status}` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-black') + `     ${challenge.description} - Reward: ${challenge.reward}` + ANSIParser.reset());
            this.terminal.println('');
        });
        
        this.terminal.println('  Press any key to continue...');
        await this.terminal.input();
    }

    async viewAchievements() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ACHIEVEMENTS' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println('');
        
        const achievements = [
            { name: 'Novice Angler', description: 'Catch 10 fish', icon: '🎣', unlocked: this.player.totalCaught >= 10 },
            { name: 'Big Fish Hunter', description: 'Catch a fish over 10 lbs', icon: '🐟', unlocked: this.player.biggestCatch > 10 },
            { name: 'Rare Collector', description: 'Catch 10 rare fish', icon: '💎', unlocked: this.player.rareCatches >= 10 },
            { name: 'Legend Hunter', description: 'Catch 3 legendary fish', icon: '👑', unlocked: this.player.legendaryCatches >= 3 },
            { name: 'Trophy Collector', description: 'Catch 5 trophy fish', icon: '🏆', unlocked: this.player.trophyCatches >= 5 },
            { name: 'Master Angler', description: 'Reach level 20', icon: '🎖️', unlocked: this.player.level >= 20 },
            { name: 'Explorer', description: 'Unlock all locations', icon: '🗺️', unlocked: this.player.locationUnlocks.length >= this.locations.length },
            { name: 'Tackle Master', description: 'Own all tackle', icon: '🎒', unlocked: false } // Complex to check
        ];
        
        achievements.forEach((achievement, index) => {
            const status = achievement.unlocked ? 
                ANSIParser.fg('bright-green') + ' [UNLOCKED]' + ANSIParser.reset() : 
                ANSIParser.fg('bright-red') + ' [LOCKED]' + ANSIParser.reset();
            
            const color = achievement.unlocked ? 'bright-green' : 'bright-black';
            this.terminal.println(ANSIParser.fg(color) + `  ${achievement.icon} ${achievement.name}${status}` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-black') + `     ${achievement.description}` + ANSIParser.reset());
            this.terminal.println('');
        });
        
        this.terminal.println('  Press any key to continue...');
        await this.terminal.input();
    }

    getExpNeeded() {
        return this.player.level * 100;
    }

    checkLevelUp() {
        if (this.player.experience >= this.getExpNeeded()) {
            this.player.level++;
            this.player.experience = 0;
            
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-cyan') + '  ⭐ LEVEL UP! ⭐' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-cyan') + `  You are now level ${this.player.level}!` + ANSIParser.reset());
            
            // Level up bonuses
            const bonuses = this.getLevelUpBonuses();
            bonuses.forEach(bonus => {
                this.terminal.println(ANSIParser.fg('bright-green') + `  ${bonus}` + ANSIParser.reset());
            });
            
            // Unlock new tackle and locations
            this.unlockNewContent();
            
            this.terminal.println(ANSIParser.fg('bright-cyan') + '  Your fishing skills have improved!' + ANSIParser.reset());
        }
    }

    getLevelUpBonuses() {
        const bonuses = [];
        const level = this.player.level;
        
        // Stat improvements
        if (level % 2 === 0) {
            this.player.stats.accuracy = Math.min(100, this.player.stats.accuracy + 2);
            bonuses.push('+2 Accuracy');
        }
        if (level % 3 === 0) {
            this.player.stats.luck = Math.min(100, this.player.stats.luck + 3);
            bonuses.push('+3 Luck');
        }
        if (level % 4 === 0) {
            this.player.stats.patience = Math.min(100, this.player.stats.patience + 2);
            bonuses.push('+2 Patience');
        }
        if (level % 5 === 0) {
            this.player.stats.strength = Math.min(100, this.player.stats.strength + 4);
            bonuses.push('+4 Strength');
        }
        
        // Money bonus
        const moneyBonus = level * 50;
        this.player.money += moneyBonus;
        bonuses.push(`+$${moneyBonus} Bonus`);
        
        return bonuses;
    }

    unlockNewContent() {
        const level = this.player.level;
        
        // Unlock new tackle
        if (level >= 3 && !this.player.tackleUnlocks?.rods?.includes(1)) {
            if (!this.player.tackleUnlocks.rods) this.player.tackleUnlocks.rods = [];
            this.player.tackleUnlocks.rods.push(1);
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  🔓 Fiberglass Rod unlocked!' + ANSIParser.reset());
        }
        if (level >= 5 && !this.player.tackleUnlocks?.reels?.includes(1)) {
            if (!this.player.tackleUnlocks.reels) this.player.tackleUnlocks.reels = [];
            this.player.tackleUnlocks.reels.push(1);
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  🔓 Spinning Reel unlocked!' + ANSIParser.reset());
        }
        if (level >= 7 && !this.player.tackleUnlocks?.lines?.includes(1)) {
            if (!this.player.tackleUnlocks.lines) this.player.tackleUnlocks.lines = [];
            this.player.tackleUnlocks.lines.push(1);
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  🔓 Braided Line unlocked!' + ANSIParser.reset());
        }
        if (level >= 9 && !this.player.tackleUnlocks?.hooks?.includes(1)) {
            if (!this.player.tackleUnlocks.hooks) this.player.tackleUnlocks.hooks = [];
            this.player.tackleUnlocks.hooks.push(1);
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  🔓 Sharp Hook unlocked!' + ANSIParser.reset());
        }
        if (level >= 11 && !this.player.tackleUnlocks?.bait?.includes(1)) {
            if (!this.player.tackleUnlocks.bait) this.player.tackleUnlocks.bait = [];
            this.player.tackleUnlocks.bait.push(1);
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  🔓 Worms unlocked!' + ANSIParser.reset());
        }
        
        // Unlock new locations (check if already unlocked)
        this.locations.forEach((location, index) => {
            if (level >= location.unlockLevel && !this.player.locationUnlocks.includes(index)) {
                this.player.locationUnlocks.push(index);
                this.terminal.println(ANSIParser.fg('bright-yellow') + `  🔓 ${location.name} unlocked!` + ANSIParser.reset());
            }
        });
    }

    async loadGameState() {
        try {
            // Add timeout for Railway connectivity issues
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
            
            const response = await fetch('/api/game-state/fishing-hole', {
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) throw new Error('No saved game');
            const data = await response.json();
            this.player = data.player;
            this.location = data.location || this.locations[0];
        } catch (error) {
            if (error.name === 'AbortError' || error.message.includes('ERR_NAME_NOT_RESOLVED') || error.message.includes('Failed to fetch')) {
                console.warn('🚨 Railway server connectivity issue - starting new game');
            } else {
                console.log('Starting new game');
            }
        }
    }

    async saveGameState() {
        if (!this.player) return;
        
        try {
            const response = await fetch('/api/game-state/fishing-hole', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    player: this.player,
                    location: this.location
                })
            });
            
            if (!response.ok) {
                console.error('Failed to save game state:', response.status, response.statusText);
            }
        } catch (error) {
            console.error('Error saving game state:', error);
        }
    }

    async showCastingAnimation() {
        // Casting animation with line going out
        const castingFrames = [
            '  🎣 *',
            '  🎣 **',
            '  🎣 ***',
            '  🎣 ****',
            '  🎣 *****',
            '  🎣 ******',
            '  🎣 *******',
            '  🎣 ********',
            '  🎣 *********',
            '  🎣 **********',
        ];
        
        for (let frame of castingFrames) {
            this.terminal.clear();
            this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-cyan') + `  FISHING AT ${this.location.name.toUpperCase()}` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-yellow') + frame + ANSIParser.reset());
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-white') + '  Line going out...' + ANSIParser.reset());
            await this.terminal.sleep(100);
        }
    }

    async showWaitingAnimation() {
        // Waiting animation with floating bait
        const waitingFrames = [
            '  🎣 ~~~~~~~~~  🐟',
            '  🎣 ~~~~~~~~ 🐟',
            '  🎣 ~~~~~~~ 🐟',
            '  🎣 ~~~~~~ 🐟',
            '  🎣 ~~~~~ 🐟',
            '  🎣 ~~~~ 🐟',
            '  🎣 ~~~ 🐟',
            '  🎣 ~~ 🐟',
            '  🎣 ~ 🐟',
            '  🎣 🐟',
            '  🎣 ~ 🐟',
            '  🎣 ~~ 🐟',
            '  🎣 ~~~ 🐟',
            '  🎣 ~~~~ 🐟',
            '  🎣 ~~~~~ 🐟',
            '  🎣 ~~~~~~ 🐟',
            '  🎣 ~~~~~~~ 🐟',
            '  🎣 ~~~~~~~~ 🐟',
            '  🎣 ~~~~~~~~~ 🐟',
        ];
        
        for (let i = 0; i < 2; i++) {
            for (let frame of waitingFrames) {
                this.terminal.clear();
                this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
                this.terminal.println(ANSIParser.fg('bright-cyan') + `  FISHING AT ${this.location.name.toUpperCase()}` + ANSIParser.reset());
                this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
                this.terminal.println('');
                this.terminal.println(ANSIParser.fg('bright-yellow') + frame + ANSIParser.reset());
                this.terminal.println('');
                this.terminal.println(ANSIParser.fg('bright-white') + '  Waiting for a bite...' + ANSIParser.reset());
                await this.terminal.sleep(80);
            }
        }
    }

    async showCatchAnimation(fishName) {
        // Exciting catch animation
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + `  FISHING AT ${this.location.name.toUpperCase()}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println('');
        
        // Fish fighting animation
        const fightFrames = [
            '  🎣 ~~~~~~~~~ 🐟💥',
            '  🎣 ~~~~~~~~ 🐟💥💥',
            '  🎣 ~~~~~~~ 🐟💥💥💥',
            '  🎣 ~~~~~~~~ 🐟💥💥',
            '  🎣 ~~~~~~~~~ 🐟💥',
            '  🎣 ~~~~~~~~ 🐟💥💥',
            '  🎣 ~~~~~~~ 🐟💥💥💥',
            '  🎣 ~~~~~~~~ 🐟💥💥',
            '  🎣 ~~~~~~~~~ 🐟💥',
        ];
        
        this.terminal.println(ANSIParser.fg('bright-red') + '  💥 FISH ON THE LINE! 💥' + ANSIParser.reset());
        this.terminal.println('');
        
        for (let frame of fightFrames) {
            this.terminal.clear();
            this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-cyan') + `  FISHING AT ${this.location.name.toUpperCase()}` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-red') + '  💥 FISH ON THE LINE! 💥' + ANSIParser.reset());
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-yellow') + frame + ANSIParser.reset());
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-white') + '  Reeling in...' + ANSIParser.reset());
            await this.terminal.sleep(120);
        }
        
        // Success animation
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-green') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + '  🎣 YOU CAUGHT A FISH! 🎣' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println('');
        
        // Fish celebration animation
        const celebrationFrames = [
            '  🎣 🐟 🎉',
            '  🎣 🐟 🎉🎉',
            '  🎣 🐟 🎉🎉🎉',
            '  🎣 🐟 🎉🎉🎉🎉',
            '  🎣 🐟 🎉🎉🎉🎉🎉',
        ];
        
        for (let frame of celebrationFrames) {
            this.terminal.clear();
            this.terminal.println(ANSIParser.fg('bright-green') + '  ════════════════════════════════════════' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-green') + '  🎣 YOU CAUGHT A FISH! 🎣' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-green') + '  ════════════════════════════════════════' + ANSIParser.reset());
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-yellow') + frame + ANSIParser.reset());
            this.terminal.println('');
            await this.terminal.sleep(150);
        }
    }

    async showNoCatchAnimation() {
        // Disappointing no catch animation
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + `  FISHING AT ${this.location.name.toUpperCase()}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println('');
        
        const noCatchFrames = [
            '  🎣 ~~~~~~~~~ 💨',
            '  🎣 ~~~~~~~~ 💨💨',
            '  🎣 ~~~~~~~ 💨💨💨',
            '  🎣 ~~~~~~~~ 💨💨',
            '  🎣 ~~~~~~~~~ 💨',
            '  🎣 ~~~~~~~~ 💨💨',
            '  🎣 ~~~~~~~ 💨💨💨',
            '  🎣 ~~~~~~~~ 💨💨',
            '  🎣 ~~~~~~~~~ 💨',
        ];
        
        for (let frame of noCatchFrames) {
            this.terminal.clear();
            this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-cyan') + `  FISHING AT ${this.location.name.toUpperCase()}` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-yellow') + frame + ANSIParser.reset());
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-white') + '  Fish swam away...' + ANSIParser.reset());
            await this.terminal.sleep(120);
        }
    }

    async loadPlayerData(playerName) {
        try {
            const currentUser = this.authManager.getCurrentUser();
            const userId = currentUser ? currentUser.id : null;
            
            // Add timeout for Railway connectivity issues
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
            
            const response = await fetch('/api/fishing-hole/player', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    playerName: playerName,
                    userId: userId
                }),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
                const data = await response.json();
                console.log('Loaded player data:', data.player);
                console.log('Raw response from server:', JSON.stringify(data, null, 2));
                if (data.player) {
                    this.player = data.player;
                    console.log('Data location exists:', !!data.player.location);
                    console.log('Data location value:', data.player.location);
                    // Set location from saved data
                    if (data.player.location) {
                        console.log('Loading location data:', data.player.location);
                        // If location is a string (name), find by name
                        if (typeof data.player.location === 'string') {
                            this.location = this.locations.find(loc => loc.name === data.player.location) || this.locations[0];
                        } 
                        // If location is an object, find by name property
                        else if (data.player.location.name) {
                            console.log('Looking for location with name:', data.player.location.name);
                            const foundLocation = this.locations.find(loc => loc.name === data.player.location.name);
                            console.log('Found location:', foundLocation);
                            this.location = foundLocation || this.locations[0];
                        }
                        // If location is already a location object, use it directly
                        else if (data.player.location.difficulty) {
                            this.location = data.player.location;
                        }
                        else {
                            this.location = this.locations[0];
                        }
                        console.log('Set location to:', this.location.name);
                    }
                    // Ensure all required properties exist with defaults
                    this.player.name = this.player.name || playerName;
                    this.player.level = this.player.level || 1;
                    this.player.money = this.player.money || 100;
                    this.player.totalCaught = this.player.totalCaught || 0;
                    this.player.biggestCatch = this.player.biggestCatch || 0;
                    this.player.biggestCatchName = this.player.biggestCatchName || 'None';
                    
                    // Ensure stats are properly initialized with numbers
                    if (!this.player.stats || Object.keys(this.player.stats).length === 0) {
                        // If stats are empty, create default stats
                        this.player.stats = {
                            accuracy: 50,
                            luck: 50,
                            patience: 50,
                            strength: 50
                        };
                        console.log('Created default stats:', this.player.stats);
                    } else {
                        // If stats exist, ensure they're numbers
                        this.player.stats.accuracy = Number(this.player.stats.accuracy) || 50;
                        this.player.stats.luck = Number(this.player.stats.luck) || 50;
                        this.player.stats.patience = Number(this.player.stats.patience) || 50;
                        this.player.stats.strength = Number(this.player.stats.strength) || 50;
                        console.log('Processed existing stats:', this.player.stats);
                    }
                    
                    // Ensure gear is properly initialized
                    this.player.gear = this.player.gear || {
                        rod: 'Basic Rod',
                        reel: 'Basic Reel',
                        line: 'Monofilament',
                        hook: 'Basic Hook',
                        bait: 'Basic Bait'
                    };
                    
                    // Ensure tackleUnlocks is properly initialized
                    console.log('Raw tackleUnlocks from database:', this.player.tackleUnlocks);
                    if (!this.player.tackleUnlocks || Object.keys(this.player.tackleUnlocks).length === 0) {
                        this.player.tackleUnlocks = {
                            rods: [0],
                            reels: [0],
                            lines: [0],
                            hooks: [0],
                            bait: [0]
                        };
                        console.log('Initialized tackleUnlocks:', this.player.tackleUnlocks);
                    }
                    
                    this.terminal.println(ANSIParser.fg('bright-green') + `  Welcome back, ${this.player.name}!` + ANSIParser.reset());
                    this.terminal.println(ANSIParser.fg('bright-cyan') + `  Level: ${this.player.level} | Money: $${this.player.money} | Total Caught: ${this.player.totalCaught}` + ANSIParser.reset());
                    if (this.player.biggestCatch > 0) {
                        this.terminal.println(ANSIParser.fg('bright-yellow') + `  Biggest Catch: ${this.player.biggestCatchName} (${(this.player.biggestCatch || 0).toFixed(2)} lbs)` + ANSIParser.reset());
                    }
                    await this.terminal.sleep(2000);
                    return true; // Successfully loaded existing player
                } else {
                    // Create new player
                    this.createDefaultPlayer(playerName);
                    // Try to save new player to database
                    await this.savePlayerData(true); // Force save when leaving
                    return true; // Successfully created new player
                }
            } else {
                // Server responded but with error - this is safe to create new player
                console.log('Server responded with error, creating new player');
                this.createDefaultPlayer(playerName);
                return true; // Created new player successfully
            }
        } catch (error) {
            console.error('Error loading player data:', error);
            
            // Handle specific Railway connectivity issues
            if (error.name === 'AbortError' || error.message.includes('ERR_NAME_NOT_RESOLVED') || error.message.includes('Failed to fetch')) {
                console.warn('🚨 Railway server connectivity issue detected. Cannot load player data safely.');
                this.terminal.println(ANSIParser.fg('bright-red') + '  ⚠️  Server temporarily unavailable!' + ANSIParser.reset());
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  Cannot load your fishing progress safely.' + ANSIParser.reset());
                this.terminal.println(ANSIParser.fg('bright-white') + '  Please try again when the server is back online.' + ANSIParser.reset());
                this.terminal.println('');
                this.terminal.println(ANSIParser.fg('bright-cyan') + '  Press any key to return to the main menu...' + ANSIParser.reset());
                await this.terminal.input();
                return false; // Exit without creating new player
            } else {
                console.warn('Server error - cannot load player data safely');
                this.terminal.println(ANSIParser.fg('bright-red') + '  ❌ Unable to load your fishing progress!' + ANSIParser.reset());
                this.terminal.println(ANSIParser.fg('bright-white') + '  Please try again later or contact support.' + ANSIParser.reset());
                this.terminal.println('');
                this.terminal.println(ANSIParser.fg('bright-cyan') + '  Press any key to return to the main menu...' + ANSIParser.reset());
                await this.terminal.input();
                return false; // Exit without creating new player
            }
        }
    }

    createDefaultPlayer(playerName) {
        this.player = {
            name: playerName,
            userId: this.authManager.getCurrentUser().id,
            level: 1,
            experience: 0,
            money: 100,
            totalCaught: 0,
            totalWeight: 0,
            biggestCatch: 0,
            biggestCatchName: 'None',
            rareCatches: 0,
            legendaryCatches: 0,
            trophyCatches: 0,
            inventory: [],
            gear: {
                rod: 'Basic Rod',
                reel: 'Basic Reel',
                line: 'Monofilament',
                hook: 'Basic Hook',
                bait: 'Basic Bait'
            },
            stats: {
                accuracy: 50,
                luck: 50,
                patience: 50,
                strength: 50
            },
            achievements: [],
            challenges: [],
            seasonStats: {
                spring: { caught: 0, biggest: 0 },
                summer: { caught: 0, biggest: 0 },
                fall: { caught: 0, biggest: 0 },
                winter: { caught: 0, biggest: 0 }
            },
            locationUnlocks: [0, 1],
            tackleUnlocks: {
                rods: [0],
                reels: [0],
                lines: [0],
                hooks: [0],
                bait: [0]
            }
        };
    }

    async savePlayerData(force = false) {
        // Add to save queue
        this.saveQueue.push({
            player: JSON.parse(JSON.stringify(this.player)),
            location: JSON.parse(JSON.stringify(this.location)),
            tournament: JSON.parse(JSON.stringify(this.tournament))
        });

        // If forced or enough time has passed, save immediately
        const now = Date.now();
        if (force || (now - this.lastSaveTime) >= this.saveInterval) {
            await this.flushSaveQueue();
        } else {
            // Schedule a save if not already scheduled
            if (!this.saveTimeout) {
                this.saveTimeout = setTimeout(() => {
                    this.flushSaveQueue();
                }, this.saveInterval - (now - this.lastSaveTime));
            }
        }
    }

    async flushSaveQueue() {
        if (this.saveQueue.length === 0) return;

        // Clear any pending timeout
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
            this.saveTimeout = null;
        }

        // Get the latest data from the queue
        const latestData = this.saveQueue[this.saveQueue.length - 1];
        this.saveQueue = []; // Clear the queue

        try {
            const currentUser = this.authManager.getCurrentUser();
            const userId = currentUser ? currentUser.id : null;
            
            // Add timeout for Railway connectivity issues
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
            
            const response = await fetch('/api/fishing-hole/save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    player: latestData.player,
                    location: latestData.location,
                    tournament: latestData.tournament,
                    userId: userId
                }),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
                console.log('Player data saved successfully (batched)');
                this.lastSaveTime = Date.now();
            } else {
                console.log('Failed to save player data:', response.status, response.statusText);
            }
        } catch (error) {
            console.log('Error saving player data:', error);
            // Don't show error to user unless it's critical
            if (error.name === 'AbortError' || error.message.includes('ERR_NAME_NOT_RESOLVED') || error.message.includes('Failed to fetch')) {
                console.warn('🚨 Railway server connectivity issue - data will be saved when connection is restored');
            }
        }
    }

    async tournamentMode() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  🏆 FISHING TOURNAMENT MODE 🏆' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println('');
        
        if (this.tournament.active) {
            await this.joinActiveTournament();
        } else {
            await this.tournamentMenu();
        }
    }

    async tournamentMenu() {
        this.terminal.println(ANSIParser.fg('bright-white') + '  [1] Start New Tournament' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [2] Join Active Tournament' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [3] Tournament Rules' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [4] Tournament History & Stats' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-red') + '  [Q] Back to Main Menu' + ANSIParser.reset());
        this.terminal.println('');
        
        const choice = await this.terminal.input('  Your choice: ');
        
        switch (choice.toUpperCase()) {
            case '1':
                await this.selectTournamentDuration();
                break;
            case '2':
                await this.joinActiveTournament();
                break;
            case '3':
                await this.showTournamentRules();
                break;
            case '4':
                await this.showTournamentHistory();
                break;
            case 'Q':
                return;
            default:
                this.terminal.println(ANSIParser.fg('bright-red') + '  Invalid choice!' + ANSIParser.reset());
                await this.terminal.sleep(1000);
                await this.tournamentMenu();
        }
    }

    async selectTournamentDuration() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  🎣 SELECT TOURNAMENT DURATION 🎣' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-white') + '  Choose tournament duration:' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [1] Quick Tournament - 3 minutes' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [2] Standard Tournament - 5 minutes' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [3] Extended Tournament - 10 minutes' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [4] Marathon Tournament - 15 minutes' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-red') + '  [Q] Back to Tournament Menu' + ANSIParser.reset());
        this.terminal.println('');
        
        const choice = await this.terminal.input('  Your choice: ');
        
        let duration = 0;
        let durationText = '';
        
        switch (choice.toUpperCase()) {
            case '1':
                duration = 3 * 60 * 1000;
                durationText = '3 minutes';
                break;
            case '2':
                duration = 5 * 60 * 1000;
                durationText = '5 minutes';
                break;
            case '3':
                duration = 10 * 60 * 1000;
                durationText = '10 minutes';
                break;
            case '4':
                duration = 15 * 60 * 1000;
                durationText = '15 minutes';
                break;
            case 'Q':
                return;
            default:
                this.terminal.println(ANSIParser.fg('bright-red') + '  Invalid choice!' + ANSIParser.reset());
                await this.terminal.sleep(1000);
                await this.selectTournamentDuration();
                return;
        }
        
        this.tournament.duration = duration;
        await this.startTournament(durationText);
    }

    async startTournament(durationText = '5 minutes') {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  🎣 STARTING FISHING TOURNAMENT 🎣' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-white') + '  Tournament Rules:' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + `  • ${durationText} to catch the biggest fish` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  • Winner is determined by total weight' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  • All BBS users will be notified' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  • 60 seconds for players to join' + ANSIParser.reset());
        this.terminal.println('');
        
        const confirm = await this.terminal.input(ANSIParser.fg('bright-yellow') + '  Start tournament? (Y/N): ' + ANSIParser.reset());
        
        if (confirm.toUpperCase() === 'Y') {
            // Generate tournament ID and set up tournament
            this.tournament.tournamentId = Date.now().toString();
            this.tournament.phase = 'joining';
            this.tournament.joinEndTime = Date.now() + this.tournament.joinPeriod;
            
            // Broadcast tournament start to all BBS users
            if (this.socketClient && this.socketClient.socket) {
                this.socketClient.socket.emit('fishing-tournament-start', {
                    host: this.player.name,
                    duration: this.tournament.duration / (60 * 1000), // Convert to minutes
                    durationText: durationText,
                    tournamentId: this.tournament.tournamentId,
                    joinPeriod: 60
                });
            }
            
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-green') + '  Tournament announced to all BBS users!' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  Waiting 60 seconds for players to join...' + ANSIParser.reset());
            
            // Show join countdown
            await this.showJoinCountdown();
            
            // Start the actual tournament
            await this.runTournament();
        } else {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Tournament cancelled.' + ANSIParser.reset());
            await this.terminal.sleep(2000);
        }
    }

    async showJoinCountdown() {
        const joinEndTime = this.tournament.joinEndTime;
        const updateInterval = 1000; // Update every second
        
        while (Date.now() < joinEndTime) {
            const remaining = Math.ceil((joinEndTime - Date.now()) / 1000);
            
            this.terminal.clear();
            this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-cyan') + '  🎣 TOURNAMENT JOINING PERIOD 🎣' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
            this.terminal.println('');
            
            this.terminal.println(ANSIParser.fg('bright-white') + `  Tournament ID: ${this.tournament.tournamentId}` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-white') + `  Host: ${this.player.name}` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-white') + `  Duration: ${this.tournament.duration / (60 * 1000)} minutes` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-white') + `  Participants: ${this.tournament.participants.length}` + ANSIParser.reset());
            this.terminal.println('');
            
            this.terminal.println(ANSIParser.fg('bright-yellow') + `  Time remaining to join: ${remaining} seconds` + ANSIParser.reset());
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-cyan') + '  All BBS users have been notified!' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-white') + '  Players can join via Door Games → Fishing Hole → Tournament Mode' + ANSIParser.reset());
            
            await this.terminal.sleep(updateInterval);
        }
    }

    async viewActiveTournaments() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  🏆 ACTIVE TOURNAMENTS 🏆' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println('');
        
        if (this.tournament.active) {
            this.terminal.println(ANSIParser.fg('bright-green') + '  Active Tournament:' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-white') + `  ID: ${this.tournament.tournamentId}` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-white') + `  Phase: ${this.tournament.phase}` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-white') + `  Participants: ${this.tournament.participants.length}` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-white') + `  Duration: ${this.tournament.duration / (60 * 1000)} minutes` + ANSIParser.reset());
        } else {
            this.terminal.println(ANSIParser.fg('bright-red') + '  No active tournaments found.' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-white') + '  Start a new tournament or wait for one to begin.' + ANSIParser.reset());
        }
        
        this.terminal.println('');
        this.terminal.println('  Press any key to continue...');
        await this.terminal.input();
    }

    async joinActiveTournament() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  🎣 JOIN ACTIVE TOURNAMENT 🎣' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println('');
        
        if (this.tournament.active) {
            this.terminal.println(ANSIParser.fg('bright-green') + '  🎉 Found active tournament!' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-white') + `  Tournament ID: ${this.tournament.tournamentId}` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-white') + `  Phase: ${this.tournament.phase}` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-white') + `  Duration: ${this.tournament.duration / (60 * 1000)} minutes` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-white') + `  Participants: ${this.tournament.participants.length}` + ANSIParser.reset());
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  Joining tournament...' + ANSIParser.reset());
            await this.terminal.sleep(2000);
            
            // Check if tournament is still in joining phase
            if (this.tournament.phase === 'joining' && this.tournament.joinEndTime > Date.now()) {
                this.terminal.println(ANSIParser.fg('bright-cyan') + '  Waiting for tournament to start...' + ANSIParser.reset());
                await this.showJoinCountdown();
            } else {
                this.terminal.println(ANSIParser.fg('bright-red') + '  Tournament has already started or ended!' + ANSIParser.reset());
                await this.terminal.sleep(2000);
                return;
            }
            
            // Start the tournament interface
            await this.runTournament();
        } else {
            this.terminal.println(ANSIParser.fg('bright-red') + '  ❌ No active tournament found!' + ANSIParser.reset());
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-white') + '  To join a tournament:' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-white') + '  1. Wait for someone to start a tournament' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-white') + '  2. You\'ll see a BBS-wide announcement' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-white') + '  3. Come back here to join within 60 seconds' + ANSIParser.reset());
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-cyan') + '  Or start your own tournament with option [1]!' + ANSIParser.reset());
            this.terminal.println('');
            this.terminal.println('  Press any key to continue...');
            await this.terminal.input();
        }
    }

    async showTournamentRules() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  🏆 TOURNAMENT RULES 🏆' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-white') + '  Tournament Format:' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  • Duration: 3-15 minutes (your choice)' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  • Objective: Catch the heaviest total weight' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  • Winner: Highest total weight' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  🎣 FAIR PLAY SYSTEM 🎣' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  • Everyone gets the same great equipment' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  • 40% catch rate for all players (realistic pace)' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  • Special tournament fish with huge sizes!' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  • 5% chance for MASSIVE fish (2x normal size)' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  • 10% chance for big fish (1.5x normal size)' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  • 2-second delay between casts (realistic timing)' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-white') + '  How to Play:' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  • Press [F] to cast line during tournament' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  • Watch live leaderboard updates' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  • See other players\' catches in real-time' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  • Track your tournament stats!' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-white') + '  Tournament Stats Tracked:' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  • Tournaments Played & Won' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  • Biggest Tournament Fish' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  • Biggest Tournament Bag' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  • Total Tournament Weight' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println('  Press any key to continue...');
        await this.terminal.input();
    }

    setupTournamentAnnouncementListener() {
        if (this.socketClient && this.socketClient.socket) {
            this.socketClient.socket.on('fishing-tournament-announcement', (data) => {
                if (data.type === 'tournament-start') {
                    // Store tournament info for joining
                    this.tournament.tournamentId = data.tournamentId;
                    this.tournament.duration = data.duration * 60 * 1000; // Convert minutes to milliseconds
                    this.tournament.active = true;
                    this.tournament.phase = 'joining';
                    this.tournament.joinEndTime = Date.now() + (60 * 1000); // 60 seconds to join
                    
                    // Show announcement in fishing game
                    this.terminal.println('');
                    this.terminal.println(ANSIParser.fg('bright-yellow') + '  ════════════════════════════════════════' + ANSIParser.reset());
                    this.terminal.println(ANSIParser.fg('bright-yellow') + '  🏆 TOURNAMENT ANNOUNCEMENT 🏆' + ANSIParser.reset());
                    this.terminal.println(ANSIParser.fg('bright-yellow') + '  ════════════════════════════════════════' + ANSIParser.reset());
                    this.terminal.println('');
                    this.terminal.println(ANSIParser.fg('bright-white') + `  ${data.message}` + ANSIParser.reset());
                    this.terminal.println('');
                    this.terminal.println(ANSIParser.fg('bright-cyan') + '  Go to Tournament Mode → Join Active Tournament to participate!' + ANSIParser.reset());
                    this.terminal.println(ANSIParser.fg('bright-yellow') + `  You have 60 seconds to join!` + ANSIParser.reset());
                    this.terminal.println('');
                    this.terminal.println('  Press any key to continue...');
                } else if (data.type === 'tournament-join') {
                    // Handle tournament join - add participant if we're in the tournament
                    if (this.tournament.active && this.tournament.tournamentId === data.tournamentId) {
                        this.handleTournamentJoin({ player: data.player });
                    }
                }
            });
        }
    }

    async showTournamentHistory() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  📊 TOURNAMENT HISTORY & STATS 📊' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println('');
        
        // Show current tournament stats
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  🏆 YOUR TOURNAMENT RECORDS 🏆' + ANSIParser.reset());
        this.terminal.println('');
        
        if (this.tournament.stats.tournamentsPlayed > 0) {
            this.terminal.println(ANSIParser.fg('bright-white') + `  Tournaments Played: ${this.tournament.stats.tournamentsPlayed}` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-white') + `  Tournaments Won: ${this.tournament.stats.tournamentsWon}` + ANSIParser.reset());
            
            const winRate = this.tournament.stats.tournamentsPlayed > 0 ? 
                (this.tournament.stats.tournamentsWon / this.tournament.stats.tournamentsPlayed * 100).toFixed(1) : 0;
            this.terminal.println(ANSIParser.fg('bright-white') + `  Win Rate: ${winRate}%` + ANSIParser.reset());
            
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-cyan') + '  🐟 FISHING RECORDS 🐟' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-white') + `  Biggest Tournament Fish: ${this.tournament.stats.biggestTournamentFish.toFixed(2)} lbs` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-white') + `  Biggest Tournament Bag: ${this.tournament.stats.biggestTournamentBag.toFixed(2)} lbs` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-white') + `  Total Tournament Weight: ${this.tournament.stats.totalTournamentWeight.toFixed(2)} lbs` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-white') + `  Total Tournament Fish: ${this.tournament.stats.totalTournamentFish}` + ANSIParser.reset());
            
            if (this.tournament.stats.totalTournamentFish > 0) {
                const avgWeight = this.tournament.stats.totalTournamentWeight / this.tournament.stats.totalTournamentFish;
                this.terminal.println(ANSIParser.fg('bright-white') + `  Average Fish Weight: ${avgWeight.toFixed(2)} lbs` + ANSIParser.reset());
            }
            
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-magenta') + '  🎯 ACHIEVEMENTS 🎯' + ANSIParser.reset());
            
            // Achievement checks
            if (this.tournament.stats.biggestTournamentFish >= 50) {
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  🏆 MONSTER HUNTER - Caught a 50+ lb fish!' + ANSIParser.reset());
            }
            if (this.tournament.stats.biggestTournamentBag >= 200) {
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  🏆 BAG MASTER - 200+ lb tournament bag!' + ANSIParser.reset());
            }
            if (this.tournament.stats.tournamentsWon >= 5) {
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  🏆 CHAMPION - Won 5+ tournaments!' + ANSIParser.reset());
            }
            if (this.tournament.stats.tournamentsPlayed >= 10) {
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  🏆 VETERAN - Played 10+ tournaments!' + ANSIParser.reset());
            }
            if (this.tournament.stats.totalTournamentWeight >= 1000) {
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  🏆 TON MASTER - 1000+ lbs total caught!' + ANSIParser.reset());
            }
            
        } else {
            this.terminal.println(ANSIParser.fg('bright-red') + '  No tournament history found.' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-white') + '  Play some tournaments to build your stats!' + ANSIParser.reset());
        }
        
        this.terminal.println('');
        this.terminal.println('  Press any key to continue...');
        await this.terminal.input();
    }

    async runTournament() {
        // Set up tournament state
        this.tournament.active = true;
        this.tournament.phase = 'active';
        this.tournament.startTime = Date.now();
        this.tournament.participants = [{
            name: this.player.name,
            totalWeight: 0,
            fishCount: 0,
            biggestCatch: 0
        }];
        this.tournament.leaderboard = [...this.tournament.participants];
        this.tournament.tournamentMessages = [];
        
        // Join the tournament
        if (this.socketClient && this.socketClient.socket) {
            this.socketClient.socket.emit('fishing-tournament-join', {
                tournamentId: this.tournament.tournamentId,
                player: this.player.name
            });
            
            // Request current tournament state
            this.socketClient.socket.emit('fishing-tournament-sync', {
                tournamentId: this.tournament.tournamentId,
                player: this.player.name
            });
        }
        
        // Start the split-screen tournament interface
        await this.showTournamentInterface();
    }

    async showTournamentInterface() {
        const tournamentEndTime = this.tournament.startTime + this.tournament.duration;
        let tournamentRunning = true;
        
        // Set up tournament listeners
        this.setupTournamentListeners();
        
        while (tournamentRunning && Date.now() < tournamentEndTime) {
            this.terminal.clear();
            
            // Calculate time remaining
            const timeRemaining = Math.max(0, tournamentEndTime - Date.now());
            const minutes = Math.floor(timeRemaining / 60000);
            const seconds = Math.floor((timeRemaining % 60000) / 1000);
            
            // Add warning when time is running low
            if (timeRemaining <= 30000 && timeRemaining > 0) { // Last 30 seconds
                this.terminal.println(ANSIParser.fg('bright-red') + '  ⚠️  TOURNAMENT ENDING SOON! ⚠️' + ANSIParser.reset());
            }
            
            // Draw split-screen layout
            this.drawTournamentHeader(minutes, seconds);
            this.drawTournamentLeftPanel();
            this.drawTournamentRightPanel();
            
            // Check for input (non-blocking)
            const input = await this.terminal.inputWithTimeout(1000);
            console.log('Tournament input received:', input); // Debug log
            if (input) {
                console.log('Processing input:', input.toUpperCase()); // Debug log
                if (input.toUpperCase() === 'Q') {
                    tournamentRunning = false;
                    break;
                } else if (input.toUpperCase() === 'F') {
                    console.log('Casting line in tournament...'); // Debug log
                    // Cast line during tournament
                    await this.castLineInTournament();
                }
            }
            
            // Update leaderboard
            this.updateTournamentLeaderboard();
        }
        
        // Tournament ended
        await this.endTournament();
    }

    drawTournamentHeader(minutes, seconds) {
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  🏆 FISHING TOURNAMENT - TIME: ' + 
            String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0') + ' 🏆' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println('');
    }

    drawTournamentLeftPanel() {
        this.terminal.println(ANSIParser.fg('bright-green') + '  🎣 YOUR FISHING AREA 🎣' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  Location: ' + this.location.name + ANSIParser.reset());
        
        // Check if participants exist and have data
        if (this.tournament.participants && this.tournament.participants.length > 0 && this.tournament.participants[0]) {
            const participant = this.tournament.participants[0];
            this.terminal.println(ANSIParser.fg('bright-white') + '  Total Weight: ' + (participant.totalWeight || 0).toFixed(2) + ' lbs' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-white') + '  Fish Caught: ' + (participant.fishCount || 0) + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-white') + '  Biggest Catch: ' + (participant.biggestCatch || 0).toFixed(2) + ' lbs' + ANSIParser.reset());
        } else {
            this.terminal.println(ANSIParser.fg('bright-white') + '  Total Weight: 0.00 lbs' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-white') + '  Fish Caught: 0' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-white') + '  Biggest Catch: 0.00 lbs' + ANSIParser.reset());
        }
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [F] Cast Line  [Q] Quit Tournament' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-black') + '  (F = Fish, Q = Quit - be careful not to hit F after tournament ends!)' + ANSIParser.reset());
    }

    drawTournamentRightPanel() {
        this.terminal.println(ANSIParser.fg('bright-blue') + '  📊 LIVE LEADERBOARD 📊' + ANSIParser.reset());
        this.terminal.println('');
        
        // Show top 5 players
        for (let i = 0; i < Math.min(5, this.tournament.leaderboard.length); i++) {
            const player = this.tournament.leaderboard[i];
            const position = i + 1;
            let color = ANSIParser.fg('bright-white');
            if (position === 1) color = ANSIParser.fg('bright-yellow');
            else if (position === 2) color = ANSIParser.fg('bright-white');
            else if (position === 3) color = ANSIParser.fg('bright-cyan');
            
            this.terminal.println(color + `  ${position}. ${player.name}: ${player.totalWeight.toFixed(2)} lbs` + ANSIParser.reset());
        }
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-magenta') + '  📢 LIVE UPDATES 📢' + ANSIParser.reset());
        
        // Show recent tournament messages
        const recentMessages = this.tournament.tournamentMessages.slice(-3);
        for (const msg of recentMessages) {
            this.terminal.println(ANSIParser.fg('bright-white') + '  ' + msg + ANSIParser.reset());
        }
    }

    setupTournamentListeners() {
        if (this.socketClient && this.socketClient.socket) {
            this.socketClient.socket.on('fishing-tournament-update', (data) => {
                this.handleTournamentUpdate(data);
            });
            
            this.socketClient.socket.on('fishing-tournament-join', (data) => {
                this.handleTournamentJoin(data);
            });
            
            this.socketClient.socket.on('fishing-tournament-sync', (data) => {
                this.handleTournamentSync(data);
            });
        }
    }

    handleTournamentJoin(data) {
        // Add new participant if they don't exist
        const existingParticipant = this.tournament.participants.find(p => p.name === data.player);
        if (!existingParticipant) {
            this.tournament.participants.push({
                name: data.player,
                totalWeight: 0,
                fishCount: 0,
                biggestCatch: 0
            });
            console.log('Added tournament participant:', data.player);
        }
        
        // Update leaderboard
        this.updateTournamentLeaderboard();
    }

    handleTournamentSync(data) {
        // Sync tournament participants with current state
        if (data.participants) {
            this.tournament.participants = data.participants;
            this.updateTournamentLeaderboard();
            console.log('Synced tournament participants:', data.participants);
        }
    }

    handleTournamentUpdate(data) {
        // Update participant data
        let participant = this.tournament.participants.find(p => p.name === data.player);
        if (!participant) {
            // Add participant if they don't exist
            participant = {
                name: data.player,
                totalWeight: 0,
                fishCount: 0,
                biggestCatch: 0
            };
            this.tournament.participants.push(participant);
        }
        
        // Update participant stats
        participant.totalWeight = data.totalWeight;
        participant.position = data.position;
        
        // Add to tournament messages
        this.tournament.tournamentMessages.push(data.message);
        
        // Update leaderboard
        this.updateTournamentLeaderboard();
    }

    updateTournamentLeaderboard() {
        this.tournament.leaderboard = [...this.tournament.participants]
            .sort((a, b) => b.totalWeight - a.totalWeight);
    }

    async endTournament() {
        this.tournament.active = false;
        this.tournament.phase = 'ended';
        
        // Update tournament stats
        this.tournament.stats.tournamentsPlayed++;
        
        // Safely access participant data
        if (this.tournament.participants && this.tournament.participants.length > 0 && this.tournament.participants[0]) {
            const participant = this.tournament.participants[0];
            this.tournament.stats.totalTournamentWeight += participant.totalWeight || 0;
            this.tournament.stats.totalTournamentFish += participant.fishCount || 0;
            
            if ((participant.biggestCatch || 0) > this.tournament.stats.biggestTournamentFish) {
                this.tournament.stats.biggestTournamentFish = participant.biggestCatch || 0;
            }
            
            if ((participant.totalWeight || 0) > this.tournament.stats.biggestTournamentBag) {
                this.tournament.stats.biggestTournamentBag = participant.totalWeight || 0;
            }
        }
        
        // Calculate final results
        const results = this.tournament.leaderboard.map((player, index) => ({
            position: index + 1,
            player: player.name,
            weight: player.totalWeight,
            fishCount: player.fishCount
        }));
        
        // Check if player won
        if (results[0] && results[0].player === this.player.name) {
            this.tournament.stats.tournamentsWon++;
        }
        
        // Broadcast tournament end
        if (this.socketClient && this.socketClient.socket) {
            this.socketClient.socket.emit('fishing-tournament-end', {
                tournamentId: this.tournament.tournamentId,
                results: results
            });
        }
        
        // Show final results
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  🏆 TOURNAMENT RESULTS 🏆' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println('');
        
        for (const result of results.slice(0, 5)) {
            let color = ANSIParser.fg('bright-white');
            if (result.position === 1) color = ANSIParser.fg('bright-yellow');
            else if (result.position === 2) color = ANSIParser.fg('bright-white');
            else if (result.position === 3) color = ANSIParser.fg('bright-cyan');
            
            this.terminal.println(color + `  ${result.position}. ${result.player}: ${result.weight.toFixed(2)} lbs (${result.fishCount} fish)` + ANSIParser.reset());
        }
        
        // Show tournament stats
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  📊 YOUR TOURNAMENT STATS 📊' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + `  Tournaments Played: ${this.tournament.stats.tournamentsPlayed}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + `  Tournaments Won: ${this.tournament.stats.tournamentsWon}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + `  Biggest Tournament Fish: ${this.tournament.stats.biggestTournamentFish.toFixed(2)} lbs` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + `  Biggest Tournament Bag: ${this.tournament.stats.biggestTournamentBag.toFixed(2)} lbs` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + `  Total Tournament Weight: ${this.tournament.stats.totalTournamentWeight.toFixed(2)} lbs` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + `  Total Tournament Fish: ${this.tournament.stats.totalTournamentFish}` + ANSIParser.reset());
        
        // Add pause to let players read the results
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  🎉 Tournament Complete! 🎉' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-white') + '  Take a moment to review your results...' + ANSIParser.reset());
        await this.terminal.sleep(3000); // 3 second pause
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-red') + '  Press [Q] to return to Fishing Hole menu' + ANSIParser.reset());
        
        // Wait for Q key specifically
        let input = '';
        while (input.toUpperCase() !== 'Q') {
            input = await this.terminal.input();
            if (input.toUpperCase() !== 'Q') {
                this.terminal.println(ANSIParser.fg('bright-red') + '  Please press [Q] to continue...' + ANSIParser.reset());
            }
        }
    }

    async castLineInTournament() {
        console.log('castLineInTournament called'); // Debug log
        // Quick fishing during tournament
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Casting line...' + ANSIParser.reset());
        await this.terminal.sleep(1000);
        
        // Tournament fishing - everyone gets same great equipment and chance for huge fish
        const fish = this.getTournamentFish();
        console.log('Tournament fish generated:', fish); // Debug log
        const caught = Math.random() < 0.4; // 40% catch rate - more realistic tournament pace
        console.log('Fish caught:', caught); // Debug log
        
        if (caught) {
            // Get participant data safely
            let participant = null;
            if (this.tournament.participants && this.tournament.participants.length > 0 && this.tournament.participants[0]) {
                participant = this.tournament.participants[0];
                participant.totalWeight = (participant.totalWeight || 0) + fish.weight;
                participant.fishCount = (participant.fishCount || 0) + 1;
                if (fish.weight > (participant.biggestCatch || 0)) {
                    participant.biggestCatch = fish.weight;
                }
            }
            
            // Add to tournament messages with excitement for big fish
            let message = `🎣 ${this.player.name} caught a ${fish.name} (${fish.weight.toFixed(2)} lbs)!`;
            if (fish.weight > 10) {
                message = `🐟 ${this.player.name} caught a HUGE ${fish.name} (${fish.weight.toFixed(2)} lbs)!`;
            } else if (fish.weight > 5) {
                message = `🎣 ${this.player.name} caught a big ${fish.name} (${fish.weight.toFixed(2)} lbs)!`;
            }
            
            this.tournament.tournamentMessages.push(message);
            
            // Broadcast tournament update
            if (this.socketClient && this.socketClient.socket && participant) {
                this.socketClient.socket.emit('fishing-tournament-update', {
                    tournamentId: this.tournament.tournamentId,
                    player: this.player.name,
                    totalWeight: participant.totalWeight,
                    position: this.getPlayerPosition(),
                    message: message
                });
            }
            
            // Show excitement for big catches
            if (fish.weight > 10) {
                this.terminal.println(ANSIParser.fg('bright-yellow') + `  🐟 HUGE CATCH! ${fish.name} (${fish.weight.toFixed(2)} lbs)!` + ANSIParser.reset());
            } else if (fish.weight > 5) {
                this.terminal.println(ANSIParser.fg('bright-green') + `  🎣 Big ${fish.name}! (${fish.weight.toFixed(2)} lbs)` + ANSIParser.reset());
            } else {
                this.terminal.println(ANSIParser.fg('bright-green') + `  🎣 Caught a ${fish.name}! (${fish.weight.toFixed(2)} lbs)` + ANSIParser.reset());
            }
        } else {
            console.log('No fish caught this time'); // Debug log
            this.terminal.println(ANSIParser.fg('bright-red') + '  No fish this time...' + ANSIParser.reset());
        }
        
        // Longer delay between casts to slow down the pace
        await this.terminal.sleep(2000); // 2 seconds between casts
    }

    getPlayerPosition() {
        // Update leaderboard first
        this.updateTournamentLeaderboard();
        
        // Find current player's position in the sorted leaderboard
        const sorted = [...this.tournament.participants].sort((a, b) => b.totalWeight - a.totalWeight);
        const position = sorted.findIndex(p => p.name === this.player.name) + 1;
        
        return position || 1; // Default to position 1 if not found
    }

    getRandomFish() {
        // Select fish based on location
        const availableFish = this.location.fish;
        const fishIndex = availableFish[Math.floor(Math.random() * availableFish.length)];
        const fishTemplate = this.fish[fishIndex];
        
        // Calculate weight
        const weight = fishTemplate.minWeight + Math.random() * (fishTemplate.maxWeight - fishTemplate.minWeight);
        
        // Calculate value (based on weight)
        const value = Math.floor(fishTemplate.value * (1 + weight / fishTemplate.maxWeight));
        
        // Calculate experience
        const experience = Math.floor(fishTemplate.experience * (1 + weight / fishTemplate.maxWeight));
        
        // Create fish object
        return {
            name: fishTemplate.name,
            weight: weight,
            value: value,
            experience: experience,
            rarity: fishTemplate.rarity,
            location: this.location.name
        };
    }

    getTournamentFish() {
        // Tournament fish - everyone gets same great equipment and chance for huge fish
        const tournamentFish = [
            { name: 'Minnow', minWeight: 0.1, maxWeight: 1.0, value: 5, experience: 1, rarity: 'Common' },
            { name: 'Sunfish', minWeight: 0.5, maxWeight: 2.0, value: 10, experience: 2, rarity: 'Common' },
            { name: 'Bass', minWeight: 1.0, maxWeight: 8.0, value: 20, experience: 5, rarity: 'Common' },
            { name: 'Trout', minWeight: 0.8, maxWeight: 6.0, value: 18, experience: 4, rarity: 'Common' },
            { name: 'Pike', minWeight: 2.0, maxWeight: 15.0, value: 35, experience: 8, rarity: 'Uncommon' },
            { name: 'Catfish', minWeight: 3.0, maxWeight: 20.0, value: 45, experience: 10, rarity: 'Uncommon' },
            { name: 'Muskie', minWeight: 5.0, maxWeight: 25.0, value: 60, experience: 15, rarity: 'Rare' },
            { name: 'Sturgeon', minWeight: 10.0, maxWeight: 50.0, value: 100, experience: 25, rarity: 'Epic' },
            { name: 'Monster Bass', minWeight: 15.0, maxWeight: 40.0, value: 120, experience: 30, rarity: 'Legendary' },
            { name: 'Trophy Pike', minWeight: 20.0, maxWeight: 60.0, value: 150, experience: 40, rarity: 'Legendary' }
        ];
        
        // Select fish with weighted probability for bigger fish
        const fishIndex = Math.floor(Math.random() * tournamentFish.length);
        const fishTemplate = tournamentFish[fishIndex];
        
        // Calculate weight with chance for huge fish
        let weight;
        const random = Math.random();
        
        if (random < 0.05) {
            // 5% chance for MASSIVE fish (2x max weight)
            weight = fishTemplate.maxWeight + Math.random() * fishTemplate.maxWeight;
        } else if (random < 0.15) {
            // 10% chance for big fish (1.5x max weight)
            weight = fishTemplate.maxWeight + Math.random() * (fishTemplate.maxWeight * 0.5);
        } else if (random < 0.35) {
            // 20% chance for above average fish
            weight = fishTemplate.maxWeight * 0.8 + Math.random() * (fishTemplate.maxWeight * 0.4);
        } else {
            // 50% chance for normal fish
            weight = fishTemplate.minWeight + Math.random() * (fishTemplate.maxWeight - fishTemplate.minWeight);
        }
        
        // Calculate value and experience based on weight
        const value = Math.floor(fishTemplate.value * (1 + weight / fishTemplate.maxWeight));
        const experience = Math.floor(fishTemplate.experience * (1 + weight / fishTemplate.maxWeight));
        
        // Create fish object
        return {
            name: fishTemplate.name,
            weight: weight,
            value: value,
            experience: experience,
            rarity: fishTemplate.rarity,
            location: 'Tournament Waters'
        };
    }
}

// Export for use in other modules
window.FishingHole = FishingHole;


