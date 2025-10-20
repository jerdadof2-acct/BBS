// FISHING HOLE - Multiplayer Fishing Game
// Fish alone or with friends! See what others catch in real-time!

class FishingHole {
    constructor(terminal, socketClient, authManager) {
        this.terminal = terminal;
        this.socketClient = socketClient;
        this.authManager = authManager;
        this.player = null;
        this.location = null;
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
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + this.getTitleScreen() + ANSIParser.reset());
        this.terminal.println('');
        
        await this.loadGameState();
        
        if (!this.player) {
            await this.createPlayer();
        }
        
        // Register with socket system for multiplayer
        this.registerWithSocket();
        
        // Listen for other fishers' catches
        this.setupFishingListeners();
        
        while (true) {
            const choice = await this.mainMenu();
            
            if (choice === 'Q') {
                await this.savePlayerData();
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

    registerWithSocket() {
        // Register fishing player with socket system for multiplayer
        if (window.socketClient && window.socketClient.socket) {
            console.log('Registering fishing player with socket system');
            window.socketClient.socket.emit('user-login', {
                userId: `fishing_${this.player.name}_${Date.now()}`,
                handle: this.player.name,
                accessLevel: 1
            });
        }
    }

    setupFishingListeners() {
        // Listen for other players fishing
        if (window.socketClient && window.socketClient.socket) {
            console.log('Registering fish-caught listener');
            window.socketClient.socket.on('fish-caught', (data) => {
                console.log('fish-caught event received:', data);
                if (data.handle !== this.player.name) {
                    this.terminal.println('');
                    this.terminal.println(ANSIParser.fg('bright-cyan') + `  🎣 ${data.handle} caught a ${data.fishName} (${data.weight.toFixed(2)} lbs)!` + ANSIParser.reset());
                    this.terminal.println(ANSIParser.fg('bright-white') + `     Location: ${data.location} | Value: $${data.value} | XP: ${data.experience}` + ANSIParser.reset());
                }
            });
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
        await this.loadPlayerData(playerName);
        
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
        if (window.socketClient && window.socketClient.socket) {
            window.socketClient.socket.emit('fish-caught', {
                userId: `fishing_${this.player.name}_${Date.now()}`,
                handle: this.player.name,
                fishName: caughtFish.name,
                weight: weight,
                location: this.location.name,
                value: value,
                experience: experience,
                rarity: caughtFish.rarity
            });
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
                await this.savePlayerData();
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
                await this.savePlayerData();
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
                await this.savePlayerData();
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
                await this.savePlayerData();
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
                await this.savePlayerData();
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
                    await this.savePlayerData();
                }
            } else {
                this.location = location;
                this.terminal.println(ANSIParser.fg('bright-green') + `  Moved to ${location.name}!` + ANSIParser.reset());
                await this.savePlayerData();
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
            const response = await fetch('/api/game-state/fishing-hole', {
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            if (!response.ok) throw new Error('No saved game');
            const data = await response.json();
            this.player = data.player;
            this.location = data.location || this.locations[0];
        } catch (error) {
            console.log('Starting new game');
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
            
            const response = await fetch('/api/fishing-hole/player', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    playerName: playerName,
                    userId: userId
                })
            });
            
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
                } else {
                    // Create new player
                    this.createDefaultPlayer(playerName);
                    // Try to save new player to database
                    await this.savePlayerData();
                }
            } else {
                // Fallback to default player if API fails
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  Note: Progress saving is not available. Playing in offline mode.' + ANSIParser.reset());
                this.createDefaultPlayer(playerName);
            }
        } catch (error) {
            console.error('Error loading player data:', error);
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  Note: Progress saving is not available. Playing in offline mode.' + ANSIParser.reset());
            this.createDefaultPlayer(playerName);
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

    async savePlayerData() {
        try {
            const currentUser = this.authManager.getCurrentUser();
            const userId = currentUser ? currentUser.id : null;
            
            console.log('Saving player data:', {
                playerName: this.player.name,
                userId: userId,
                level: this.player.level,
                money: this.player.money,
                totalCaught: this.player.totalCaught,
                stats: this.player.stats,
                statsStringified: JSON.stringify(this.player.stats)
            });
            
            // Also log the full player object being saved
            console.log('Full player object being saved:', JSON.stringify(this.player, null, 2));
            
            const response = await fetch('/api/fishing-hole/save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    player: this.player,
                    location: this.location,
                    userId: userId
                })
            });
            
            if (response.ok) {
                console.log('Player data saved successfully');
            } else {
                console.log('Failed to save player data:', response.status, response.statusText);
            }
        } catch (error) {
            console.log('Error saving player data:', error);
        }
    }
}

// Export for use in other modules
window.FishingHole = FishingHole;


