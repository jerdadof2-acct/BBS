// Operation Overkill II - Post-Apocalyptic Wasteland Survival
// Classic BBS adventure game

class Overkill {
    constructor(terminal, socketClient, authManager) {
        this.terminal = terminal;
        this.socketClient = socketClient;
        this.authManager = authManager;
        this.gameState = null;
        this.player = null;
        this.location = null;
        this.world = [];
    }

    async play() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-yellow') + this.getTitleScreen() + ANSIParser.reset());
        this.terminal.println('');
        
        await this.loadGameState();
        
        if (!this.player) {
            await this.createPlayer();
        }
        
        while (true) {
            const choice = await this.mainMenu();
            
            if (choice === 'Q') {
                await this.saveGameState();
                return 'doors';
            } else if (choice === '1') {
                await this.viewStatus();
            } else if (choice === '2') {
                await this.explore();
            } else if (choice === '3') {
                await this.fight();
            } else if (choice === '4') {
                await this.shop();
            } else if (choice === '5') {
                await this.rest();
            } else if (choice === '6') {
                await this.viewInventory();
            } else if (choice === '7') {
                await this.viewMap();
            } else if (choice === '8') {
                await this.viewLeaderboard();
            }
        }
    }

    getTitleScreen() {
        return `
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║                    OPERATION OVERKILL II                                      ║
║                                                                              ║
║               Post-Apocalyptic Wasteland Survival                              ║
║                                                                              ║
║                   Survive the wasteland!                                      ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
`;
    }

    async createPlayer() {
        this.terminal.println(ANSIParser.fg('bright-cyan') + '\n  Welcome to OPERATION OVERKILL II!' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println('  The world has ended. Mutants roam the wasteland.');
        this.terminal.println('  You must survive and find the legendary Vault!');
        this.terminal.println('');
        
        const playerName = await this.terminal.input('  Enter your survivor name: ');
        
        this.player = {
            name: playerName,
            level: 1,
            experience: 0,
            hp: 100,
            maxHp: 100,
            strength: 10,
            agility: 10,
            intelligence: 10,
            luck: 10,
            credits: 100,
            kills: 0,
            deaths: 0,
            locationsVisited: 0,
            inventory: {
                weapons: [],
                armor: [],
                items: []
            }
        };
        
        // Initialize world
        this.initWorld();
        this.location = this.world[0];
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + `  Welcome to the wasteland, ${playerName}!` + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println('  Press any key to continue...');
        await this.terminal.input();
    }

    initWorld() {
        this.world = [
            { id: 0, name: 'Starting Camp', type: 'Safe', description: 'A small camp with basic supplies.', explored: true },
            { id: 1, name: 'Abandoned Town', type: 'Dangerous', description: 'Ruins of an old town. Mutants roam here.', explored: false },
            { id: 2, name: 'Mutant Lair', type: 'Dangerous', description: 'A dark cave filled with mutants.', explored: false },
            { id: 3, name: 'Scavenger Market', type: 'Safe', description: 'Traders sell weapons and supplies.', explored: false },
            { id: 4, name: 'Radiation Zone', type: 'Dangerous', description: 'Highly radioactive area. Extreme danger!', explored: false },
            { id: 5, name: 'Old Military Base', type: 'Dangerous', description: 'Abandoned military installation.', explored: false },
            { id: 6, name: 'The Vault', type: 'Safe', description: 'The legendary Vault! Final destination!', explored: false }
        ];
    }

    async mainMenu() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-yellow') + this.getTitleScreen() + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-cyan') + `  Survivor: ${this.player.name}  |  Level: ${this.player.level}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + `  HP: ${this.player.hp}/${this.player.maxHp}  |  Credits: $${this.player.credits.toLocaleString()}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + `  Location: ${this.location.name} (${this.location.type})` + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [1] View Status' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [2] Explore' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [3] Fight Mutants' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [4] Visit Shop' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [5] Rest' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [6] View Inventory' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [7] View Map' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [8] View Leaderboard' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-red') + '  [Q] Quit Game' + ANSIParser.reset());
        this.terminal.println('');
        
        const choice = await this.terminal.input('  Your choice: ');
        return choice.toUpperCase();
    }

    async viewStatus() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '\n  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  SURVIVOR STATUS' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-yellow') + `  Name: ${this.player.name}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + `  Level: ${this.player.level}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + `  Experience: ${this.player.experience}/${this.getExpNeeded()}` + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + `  HP: ${this.player.hp}/${this.player.maxHp}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + `  Credits: $${this.player.credits.toLocaleString()}` + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-white') + '  Attributes:' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + `    Strength: ${this.player.strength}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + `    Agility: ${this.player.agility}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + `    Intelligence: ${this.player.intelligence}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + `    Luck: ${this.player.luck}` + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-cyan') + `  Kills: ${this.player.kills}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + `  Deaths: ${this.player.deaths}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + `  Locations Visited: ${this.player.locationsVisited}` + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println('  Press any key to continue...');
        await this.terminal.input();
    }

    getExpNeeded() {
        return this.player.level * 100;
    }

    async explore() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '\n  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  EXPLORE' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-yellow') + `  Current Location: ${this.location.name}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + `  ${this.location.description}` + ANSIParser.reset());
        this.terminal.println('');
        
        const availableLocations = this.world.filter(loc => loc.id !== this.location.id && loc.explored);
        
        if (availableLocations.length === 0) {
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  You can explore nearby areas!' + ANSIParser.reset());
            this.terminal.println('');
            
            // Reveal new locations
            const newLocations = this.world.filter(loc => !loc.explored && loc.id !== this.location.id);
            if (newLocations.length > 0) {
                const randomLocation = newLocations[Math.floor(Math.random() * newLocations.length)];
                randomLocation.explored = true;
                
                this.terminal.println(ANSIParser.fg('bright-green') + `  You discovered: ${randomLocation.name}!` + ANSIParser.reset());
                this.terminal.println(ANSIParser.fg('bright-white') + `  ${randomLocation.description}` + ANSIParser.reset());
                this.terminal.println('');
                
                this.player.experience += 10;
                this.player.locationsVisited++;
                
                this.checkLevelUp();
            }
        } else {
            this.terminal.println(ANSIParser.fg('bright-white') + '  Available Locations:' + ANSIParser.reset());
            this.terminal.println('');
            
            availableLocations.forEach((loc, index) => {
                this.terminal.println(ANSIParser.fg('bright-green') + `  [${index + 1}] ${loc.name} (${loc.type})` + ANSIParser.reset());
                this.terminal.println(ANSIParser.fg('bright-white') + `      ${loc.description}` + ANSIParser.reset());
                this.terminal.println('');
            });
            
            this.terminal.println(ANSIParser.fg('bright-red') + '  [0] Stay Here' + ANSIParser.reset());
            this.terminal.println('');
            
            const choice = await this.terminal.input('  Select location: ');
            
            if (choice !== '0') {
                const locationIndex = parseInt(choice) - 1;
                if (locationIndex >= 0 && locationIndex < availableLocations.length) {
                    this.location = availableLocations[locationIndex];
                    this.terminal.println('');
                    this.terminal.println(ANSIParser.fg('bright-green') + `  Moved to ${this.location.name}!` + ANSIParser.reset());
                    await this.terminal.sleep(1500);
                }
            }
        }
        
        this.terminal.println('');
        this.terminal.println('  Press any key to continue...');
        await this.terminal.input();
    }

    async fight() {
        if (this.location.type !== 'Dangerous') {
            this.terminal.println(ANSIParser.fg('bright-yellow') + '\n  This location is safe. No mutants here!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
            return;
        }
        
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '\n  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  FIGHT MUTANTS' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println('');
        
        const mutants = [
            { name: 'Rad-Rat', hp: 20, attack: 5, exp: 10, credits: 20 },
            { name: 'Mutant Dog', hp: 40, attack: 10, exp: 20, credits: 40 },
            { name: 'Ghoul', hp: 60, attack: 15, exp: 30, credits: 60 },
            { name: 'Deathclaw', hp: 100, attack: 25, exp: 50, credits: 100 },
            { name: 'Super Mutant', hp: 150, attack: 35, exp: 75, credits: 150 }
        ];
        
        const mutant = mutants[Math.floor(Math.random() * mutants.length)];
        
        this.terminal.println(ANSIParser.fg('bright-red') + `  A ${mutant.name} attacks!` + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-yellow') + `  Mutant HP: ${mutant.hp}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + `  Mutant Attack: ${mutant.attack}` + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + `  Your HP: ${this.player.hp}/${this.player.maxHp}` + ANSIParser.reset());
        this.terminal.println('');
        
        let mutantHp = mutant.hp;
        
        while (mutantHp > 0 && this.player.hp > 0) {
            // Player attack
            const playerDamage = Math.floor(this.player.strength * (0.8 + Math.random() * 0.4));
            mutantHp -= playerDamage;
            
            this.terminal.println(ANSIParser.fg('bright-green') + `  You hit the ${mutant.name} for ${playerDamage} damage!` + ANSIParser.reset());
            
            if (mutantHp <= 0) {
                this.terminal.println(ANSIParser.fg('bright-cyan') + `  You defeated the ${mutant.name}!` + ANSIParser.reset());
                break;
            }
            
            // Mutant attack
            const mutantDamage = Math.floor(mutant.attack * (0.8 + Math.random() * 0.4));
            this.player.hp -= mutantDamage;
            
            this.terminal.println(ANSIParser.fg('bright-red') + `  The ${mutant.name} hits you for ${mutantDamage} damage!` + ANSIParser.reset());
            
            if (this.player.hp <= 0) {
                this.terminal.println(ANSIParser.fg('bright-red') + '  You died!' + ANSIParser.reset());
                this.player.deaths++;
                this.player.hp = Math.floor(this.player.maxHp / 2);
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  You respawn with 50% HP.' + ANSIParser.reset());
                break;
            }
        }
        
        if (mutantHp <= 0) {
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-green') + `  Experience gained: ${mutant.exp}` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-green') + `  Credits gained: $${mutant.credits}` + ANSIParser.reset());
            
            this.player.experience += mutant.exp;
            this.player.credits += mutant.credits;
            this.player.kills++;
            
            this.checkLevelUp();
        }
        
        this.terminal.println('');
        this.terminal.println('  Press any key to continue...');
        await this.terminal.input();
    }

    checkLevelUp() {
        if (this.player.experience >= this.getExpNeeded()) {
            this.player.level++;
            this.player.experience = 0;
            this.player.maxHp += 20;
            this.player.hp = this.player.maxHp;
            this.player.strength += 2;
            this.player.agility += 2;
            this.player.intelligence += 2;
            this.player.luck += 2;
            
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-cyan') + '  ★★★ LEVEL UP! ★★★' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-cyan') + `  You are now level ${this.player.level}!` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-cyan') + '  All stats increased!' + ANSIParser.reset());
        }
    }

    async shop() {
        if (this.location.name !== 'Scavenger Market') {
            this.terminal.println(ANSIParser.fg('bright-yellow') + '\n  No shop here! Visit the Scavenger Market.' + ANSIParser.reset());
            await this.terminal.sleep(2000);
            return;
        }
        
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '\n  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  SCAVENGER MARKET' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-yellow') + `  Credits: $${this.player.credits.toLocaleString()}` + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-white') + '  Items for Sale:' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + '  [1] Health Pack - $50 (Restores 50 HP)' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + '  [2] Combat Knife - $100 (+5 Attack)' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + '  [3] Leather Armor - $150 (+10 Defense)' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + '  [4] Assault Rifle - $300 (+15 Attack)' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + '  [5] Power Armor - $500 (+25 Defense)' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + '  [6] Plasma Rifle - $750 (+25 Attack)' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-red') + '  [0] Exit' + ANSIParser.reset());
        this.terminal.println('');
        
        const choice = await this.terminal.input('  Select item: ');
        
        if (choice === '1' && this.player.credits >= 50) {
            this.player.credits -= 50;
            this.player.hp = Math.min(this.player.maxHp, this.player.hp + 50);
            this.terminal.println(ANSIParser.fg('bright-green') + '  Health restored!' + ANSIParser.reset());
        } else if (choice === '2' && this.player.credits >= 100) {
            this.player.credits -= 100;
            this.player.strength += 5;
            this.terminal.println(ANSIParser.fg('bright-green') + '  Combat Knife purchased!' + ANSIParser.reset());
        } else if (choice === '3' && this.player.credits >= 150) {
            this.player.credits -= 150;
            this.player.maxHp += 10;
            this.terminal.println(ANSIParser.fg('bright-green') + '  Leather Armor purchased!' + ANSIParser.reset());
        } else if (choice === '4' && this.player.credits >= 300) {
            this.player.credits -= 300;
            this.player.strength += 15;
            this.terminal.println(ANSIParser.fg('bright-green') + '  Assault Rifle purchased!' + ANSIParser.reset());
        } else if (choice === '5' && this.player.credits >= 500) {
            this.player.credits -= 500;
            this.player.maxHp += 25;
            this.terminal.println(ANSIParser.fg('bright-green') + '  Power Armor purchased!' + ANSIParser.reset());
        } else if (choice === '6' && this.player.credits >= 750) {
            this.player.credits -= 750;
            this.player.strength += 25;
            this.terminal.println(ANSIParser.fg('bright-green') + '  Plasma Rifle purchased!' + ANSIParser.reset());
        } else if (choice !== '0') {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Not enough credits!' + ANSIParser.reset());
        }
        
        await this.terminal.sleep(2000);
    }

    async rest() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '\n  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  REST' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println('');
        
        if (this.player.hp >= this.player.maxHp) {
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  You are already at full health!' + ANSIParser.reset());
        } else {
            const hpRestored = Math.min(50, this.player.maxHp - this.player.hp);
            this.player.hp += hpRestored;
            this.terminal.println(ANSIParser.fg('bright-green') + `  You rest and restore ${hpRestored} HP!` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-green') + `  Current HP: ${this.player.hp}/${this.player.maxHp}` + ANSIParser.reset());
        }
        
        this.terminal.println('');
        this.terminal.println('  Press any key to continue...');
        await this.terminal.input();
    }

    async viewInventory() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '\n  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  INVENTORY' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-yellow') + `  Credits: $${this.player.credits.toLocaleString()}` + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-white') + '  Equipment:' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + `    Strength: ${this.player.strength}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + `    Max HP: ${this.player.maxHp}` + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + `  Kills: ${this.player.kills}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + `  Locations Visited: ${this.player.locationsVisited}` + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println('  Press any key to continue...');
        await this.terminal.input();
    }

    async viewMap() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '\n  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  WASTELAND MAP' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println('');
        
        this.world.forEach(location => {
            const status = location.id === this.location.id ? ANSIParser.fg('bright-cyan') + '[YOU ARE HERE]' : ANSIParser.reset();
            const explored = location.explored ? ANSIParser.fg('bright-green') + '✓' : ANSIParser.fg('bright-red') + '?';
            const type = location.type === 'Safe' ? ANSIParser.fg('bright-green') : ANSIParser.fg('bright-red');
            
            this.terminal.println(ANSIParser.fg('bright-yellow') + `  ${location.name} (${type}${location.type}${ANSIParser.reset()}) ${explored} ${status}`);
            this.terminal.println(ANSIParser.fg('bright-white') + `    ${location.description}` + ANSIParser.reset());
            this.terminal.println('');
        });
        
        this.terminal.println('  Press any key to continue...');
        await this.terminal.input();
    }

    async viewLeaderboard() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '\n  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  LEADERBOARD' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println('');
        
        try {
            const response = await fetch('/api/game-state/overkill/leaderboard');
            const leaderboard = await response.json();
            
            if (leaderboard.length === 0) {
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  No survivors yet!' + ANSIParser.reset());
            } else {
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  Rank  Survivor Name        Level  Kills  Locations' + ANSIParser.reset());
                this.terminal.println(ANSIParser.fg('bright-white') + '  ────────────────────────────────────────────────────' + ANSIParser.reset());
                
                leaderboard.forEach((entry, index) => {
                    const rank = (index + 1).toString().padStart(2);
                    const name = entry.playerName.padEnd(20);
                    const level = entry.level.toString().padStart(5);
                    const kills = entry.kills.toString().padStart(5);
                    const locations = entry.locationsVisited.toString().padStart(9);
                    this.terminal.println(ANSIParser.fg('bright-green') + `  ${rank}.  ${name}  ${level}  ${kills}  ${locations}` + ANSIParser.reset());
                });
            }
        } catch (error) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Could not load leaderboard.' + ANSIParser.reset());
        }
        
        this.terminal.println('');
        this.terminal.println('  Press any key to continue...');
        await this.terminal.input();
    }

    async loadGameState() {
        try {
            const response = await fetch('/api/game-state/overkill');
            if (!response.ok) throw new Error('No saved game');
            const data = await response.json();
            this.player = data.player;
            this.location = data.location;
            this.world = data.world;
        } catch (error) {
            console.log('Starting new game');
        }
    }

    async saveGameState() {
        if (!this.player) return;
        
        try {
            await fetch('/api/game-state/overkill', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    player: this.player,
                    location: this.location,
                    world: this.world
                })
            });
        } catch (error) {
            console.error('Error saving game state:', error);
        }
    }
}

// Export for use in other modules
window.Overkill = Overkill;








