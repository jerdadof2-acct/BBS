// Barren Realms Elite (BRE) - Economic Strategy Game
// Classic BBS corporate warfare game

class BRE {
    constructor(terminal, socketClient, authManager) {
        this.terminal = terminal;
        this.socketClient = socketClient;
        this.authManager = authManager;
        this.gameState = null;
        this.corporation = null;
        this.territories = [];
    }

    async play() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-yellow') + this.getTitleScreen() + ANSIParser.reset());
        this.terminal.println('');
        
        await this.loadGameState();
        
        if (!this.corporation) {
            await this.createCorporation();
        }
        
        while (true) {
            const choice = await this.mainMenu();
            
            if (choice === 'Q') {
                await this.saveGameState();
                return 'doors';
            } else if (choice === '1') {
                await this.viewStatus();
            } else if (choice === '2') {
                await this.manageResources();
            } else if (choice === '3') {
                await this.attackTerritory();
            } else if (choice === '4') {
                await this.viewMap();
            } else if (choice === '5') {
                await this.researchTech();
            } else if (choice === '6') {
                await this.diplomacy();
            } else if (choice === '7') {
                await this.viewLeaderboard();
            } else if (choice === '8') {
                await this.viewStats();
            }
        }
    }

    getTitleScreen() {
        return `
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║                    BARREN REALMS ELITE (BRE)                                  ║
║                                                                              ║
║                  Economic Strategy & Corporate Warfare                        ║
║                                                                              ║
║                   Build your corporate empire!                                ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
`;
    }

    async createCorporation() {
        this.terminal.println(ANSIParser.fg('bright-cyan') + '\n  Welcome to BARREN REALMS ELITE!' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println('  You are the CEO of a new corporation.');
        this.terminal.println('  Build your empire through conquest and trade!');
        this.terminal.println('');
        
        const corpName = await this.terminal.input('  Enter your corporation name: ');
        
        this.corporation = {
            name: corpName,
            credits: 50000,
            oil: 1000,
            food: 1000,
            technology: 500,
            territories: [],
            military: 1000,
            research: 0,
            level: 1,
            turns: 0,
            attacks: 0,
            victories: 0,
            defeats: 0
        };
        
        // Initialize world
        this.initWorld();
        
        // Give player starting territory
        const startTerritory = this.territories[0];
        startTerritory.owner = this.corporation.name;
        startTerritory.defense = 500;
        this.corporation.territories.push(0);
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + `  ${corpName} is ready to conquer the world!` + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println('  Press any key to continue...');
        await this.terminal.input();
    }

    initWorld() {
        // Create a 10x10 world (100 territories)
        this.territories = [];
        const territoryNames = [
            'North Sector', 'South Sector', 'East Sector', 'West Sector',
            'Central Plains', 'Desert Wastes', 'Mountain Pass', 'River Valley',
            'Coastal Region', 'Forest Territory', 'Industrial Zone', 'Tech Hub',
            'Oil Fields', 'Farm Lands', 'Mining District', 'Trading Post'
        ];
        
        for (let i = 0; i < 100; i++) {
            const territory = {
                id: i,
                name: territoryNames[i % territoryNames.length] + ` ${i}`,
                owner: 'Unclaimed',
                oil: Math.floor(Math.random() * 500) + 100,
                food: Math.floor(Math.random() * 500) + 100,
                technology: Math.floor(Math.random() * 200) + 50,
                defense: 0,
                population: Math.floor(Math.random() * 1000) + 100,
                neighbors: this.getNeighbors(i)
            };
            
            this.territories.push(territory);
        }
    }

    getNeighbors(territoryId) {
        const neighbors = [];
        const row = Math.floor(territoryId / 10);
        const col = territoryId % 10;
        
        // North
        if (row > 0) neighbors.push(territoryId - 10);
        // South
        if (row < 9) neighbors.push(territoryId + 10);
        // West
        if (col > 0) neighbors.push(territoryId - 1);
        // East
        if (col < 9) neighbors.push(territoryId + 1);
        
        return neighbors;
    }

    async mainMenu() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-yellow') + this.getTitleScreen() + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-cyan') + `  Corporation: ${this.corporation.name}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + `  Credits: $${this.corporation.credits.toLocaleString()}  |  Territories: ${this.corporation.territories.length}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + `  Oil: ${this.corporation.oil}  |  Food: ${this.corporation.food}  |  Tech: ${this.corporation.technology}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + `  Military: ${this.corporation.military}  |  Research: ${this.corporation.research}  |  Turns: ${this.corporation.turns}` + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [1] View Status' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [2] Manage Resources' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [3] Attack Territory' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [4] View World Map' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [5] Research Technology' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [6] Diplomacy' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [7] View Leaderboard' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [8] View Statistics' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-red') + '  [Q] Quit Game' + ANSIParser.reset());
        this.terminal.println('');
        
        const choice = await this.terminal.input('  Your choice: ');
        return choice.toUpperCase();
    }

    async viewStatus() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '\n  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  CORPORATION STATUS' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-yellow') + `  Name: ${this.corporation.name}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + `  Level: ${this.corporation.level}` + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + `  Credits: $${this.corporation.credits.toLocaleString()}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + `  Territories: ${this.corporation.territories.length}` + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-white') + '  Resources:' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + `    Oil: ${this.corporation.oil}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + `    Food: ${this.corporation.food}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + `    Technology: ${this.corporation.technology}` + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-cyan') + `  Military: ${this.corporation.military}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + `  Research Points: ${this.corporation.research}` + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-yellow') + `  Attacks: ${this.corporation.attacks}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + `  Victories: ${this.corporation.victories}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + `  Defeats: ${this.corporation.defeats}` + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println('  Press any key to continue...');
        await this.terminal.input();
    }

    async manageResources() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '\n  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  RESOURCE MANAGEMENT' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println('');
        
        // Collect resources from territories
        let oilIncome = 0;
        let foodIncome = 0;
        let techIncome = 0;
        
        this.corporation.territories.forEach(territoryId => {
            const territory = this.territories[territoryId];
            oilIncome += territory.oil;
            foodIncome += territory.food;
            techIncome += territory.technology;
        });
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  Income This Turn:' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + `    Oil: +${oilIncome}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + `    Food: +${foodIncome}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + `    Technology: +${techIncome}` + ANSIParser.reset());
        this.terminal.println('');
        
        this.corporation.oil += oilIncome;
        this.corporation.food += foodIncome;
        this.corporation.technology += techIncome;
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  New Totals:' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + `    Oil: ${this.corporation.oil}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + `    Food: ${this.corporation.food}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + `    Technology: ${this.corporation.technology}` + ANSIParser.reset());
        this.terminal.println('');
        
        // Options
        this.terminal.println(ANSIParser.fg('bright-white') + '  [1] Build Military (Costs: 100 Oil, 50 Food)' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [2] Build Defense (Costs: 50 Oil, 100 Food)' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [3] Sell Resources for Credits' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-red') + '  [0] Back' + ANSIParser.reset());
        this.terminal.println('');
        
        const choice = await this.terminal.input('  Your choice: ');
        
        if (choice === '1') {
            if (this.corporation.oil < 100 || this.corporation.food < 50) {
                this.terminal.println(ANSIParser.fg('bright-red') + '  Not enough resources!' + ANSIParser.reset());
            } else {
                this.corporation.oil -= 100;
                this.corporation.food -= 50;
                this.corporation.military += 100;
                this.terminal.println(ANSIParser.fg('bright-green') + '  Military increased by 100!' + ANSIParser.reset());
            }
            await this.terminal.sleep(2000);
        } else if (choice === '2') {
            if (this.corporation.oil < 50 || this.corporation.food < 100) {
                this.terminal.println(ANSIParser.fg('bright-red') + '  Not enough resources!' + ANSIParser.reset());
            } else {
                this.corporation.oil -= 50;
                this.corporation.food -= 100;
                // Add defense to all territories
                this.corporation.territories.forEach(territoryId => {
                    this.territories[territoryId].defense += 50;
                });
                this.terminal.println(ANSIParser.fg('bright-green') + '  Defense increased by 50 for all territories!' + ANSIParser.reset());
            }
            await this.terminal.sleep(2000);
        } else if (choice === '3') {
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-white') + '  Sell Prices:' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-white') + '    Oil: $10 per unit' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-white') + '    Food: $5 per unit' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-white') + '    Technology: $20 per unit' + ANSIParser.reset());
            this.terminal.println('');
            const resource = await this.terminal.input('  Sell [O]il, [F]ood, or [T]echnology? ').toUpperCase();
            const quantity = parseInt(await this.terminal.input('  How many units? '));
            
            if (resource === 'O' && this.corporation.oil >= quantity) {
                this.corporation.oil -= quantity;
                this.corporation.credits += quantity * 10;
                this.terminal.println(ANSIParser.fg('bright-green') + `  Sold ${quantity} oil for $${(quantity * 10).toLocaleString()}!` + ANSIParser.reset());
            } else if (resource === 'F' && this.corporation.food >= quantity) {
                this.corporation.food -= quantity;
                this.corporation.credits += quantity * 5;
                this.terminal.println(ANSIParser.fg('bright-green') + `  Sold ${quantity} food for $${(quantity * 5).toLocaleString()}!` + ANSIParser.reset());
            } else if (resource === 'T' && this.corporation.technology >= quantity) {
                this.corporation.technology -= quantity;
                this.corporation.credits += quantity * 20;
                this.terminal.println(ANSIParser.fg('bright-green') + `  Sold ${quantity} technology for $${(quantity * 20).toLocaleString()}!` + ANSIParser.reset());
            } else {
                this.terminal.println(ANSIParser.fg('bright-red') + '  Invalid or insufficient resources!' + ANSIParser.reset());
            }
            await this.terminal.sleep(2000);
        }
        
        this.corporation.turns++;
    }

    async attackTerritory() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '\n  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ATTACK TERRITORY' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println('');
        
        // Show territories adjacent to player's territories
        const attackableTerritories = [];
        this.corporation.territories.forEach(territoryId => {
            const territory = this.territories[territoryId];
            territory.neighbors.forEach(neighborId => {
                const neighbor = this.territories[neighborId];
                if (neighbor.owner !== this.corporation.name && !attackableTerritories.includes(neighborId)) {
                    attackableTerritories.push(neighborId);
                }
            });
        });
        
        if (attackableTerritories.length === 0) {
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  No territories available to attack!' + ANSIParser.reset());
            this.terminal.println('');
            this.terminal.println('  Press any key to continue...');
            await this.terminal.input();
            return;
        }
        
        this.terminal.println(ANSIParser.fg('bright-white') + '  Available Territories to Attack:' + ANSIParser.reset());
        this.terminal.println('');
        
        attackableTerritories.forEach((territoryId, index) => {
            const territory = this.territories[territoryId];
            this.terminal.println(ANSIParser.fg('bright-green') + `  [${index + 1}] ${territory.name}` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-white') + `      Owner: ${territory.owner}` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-white') + `      Defense: ${territory.defense}` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-white') + `      Resources: Oil ${territory.oil}, Food ${territory.food}, Tech ${territory.technology}` + ANSIParser.reset());
            this.terminal.println('');
        });
        
        this.terminal.println(ANSIParser.fg('bright-red') + '  [0] Cancel' + ANSIParser.reset());
        this.terminal.println('');
        
        const choice = await this.terminal.input('  Select territory to attack: ');
        
        if (choice === '0') return;
        
        const territoryIndex = parseInt(choice) - 1;
        if (territoryIndex < 0 || territoryIndex >= attackableTerritories.length) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Invalid choice!' + ANSIParser.reset());
            await this.terminal.sleep(1500);
            return;
        }
        
        const targetId = attackableTerritories[territoryIndex];
        const target = this.territories[targetId];
        
        // Battle calculation
        const attackPower = this.corporation.military;
        const defensePower = target.defense;
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  BATTLE' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-cyan') + `  Attacking: ${target.name}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + `  Your Attack Power: ${attackPower}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + `  Enemy Defense: ${defensePower}` + ANSIParser.reset());
        this.terminal.println('');
        
        const victory = attackPower > defensePower;
        
        if (victory) {
            this.terminal.println(ANSIParser.fg('bright-green') + '  ★★★ VICTORY! ★★★' + ANSIParser.reset());
            this.terminal.println('');
            
            target.owner = this.corporation.name;
            target.defense = Math.floor(attackPower * 0.5);
            this.corporation.territories.push(targetId);
            this.corporation.victories++;
            this.corporation.level++;
            
            this.terminal.println(ANSIParser.fg('bright-green') + `  Territory captured!` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-green') + `  New resources gained!` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-green') + `  Level increased to ${this.corporation.level}!` + ANSIParser.reset());
        } else {
            this.terminal.println(ANSIParser.fg('bright-red') + '  ★★★ DEFEAT! ★★★' + ANSIParser.reset());
            this.terminal.println('');
            
            this.corporation.military = Math.floor(this.corporation.military * 0.8);
            this.corporation.defeats++;
            
            this.terminal.println(ANSIParser.fg('bright-red') + `  Attack failed!` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-red') + `  Military reduced to ${this.corporation.military}!` + ANSIParser.reset());
        }
        
        this.corporation.attacks++;
        this.corporation.turns++;
        
        this.terminal.println('');
        this.terminal.println('  Press any key to continue...');
        await this.terminal.input();
    }

    async viewMap() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '\n  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  WORLD MAP' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-white') + '  Legend: [YOU] [ENEMY] [NEUTRAL]' + ANSIParser.reset());
        this.terminal.println('');
        
        for (let row = 0; row < 10; row++) {
            let line = '  ';
            for (let col = 0; col < 10; col++) {
                const territoryId = row * 10 + col;
                const territory = this.territories[territoryId];
                
                if (territory.owner === this.corporation.name) {
                    line += ANSIParser.fg('bright-green') + '[Y]' + ANSIParser.reset();
                } else if (territory.owner === 'Unclaimed') {
                    line += ANSIParser.fg('bright-white') + '[N]' + ANSIParser.reset();
                } else {
                    line += ANSIParser.fg('bright-red') + '[E]' + ANSIParser.reset();
                }
                line += ' ';
            }
            this.terminal.println(line);
        }
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + '  Y = Your Territory' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-red') + '  E = Enemy Territory' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  N = Neutral Territory' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println('  Press any key to continue...');
        await this.terminal.input();
    }

    async researchTech() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '\n  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  RESEARCH TECHNOLOGY' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-yellow') + `  Current Research Points: ${this.corporation.research}` + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-white') + '  Available Technologies:' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + '  [1] Military Enhancement (100 Tech Points)' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '      +20% attack power' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + '  [2] Defense Systems (100 Tech Points)' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '      +20% defense power' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + '  [3] Resource Efficiency (150 Tech Points)' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '      +25% resource production' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-red') + '  [0] Back' + ANSIParser.reset());
        this.terminal.println('');
        
        const choice = await this.terminal.input('  Your choice: ');
        
        if (choice === '1' && this.corporation.research >= 100) {
            this.corporation.research -= 100;
            this.corporation.military = Math.floor(this.corporation.military * 1.2);
            this.terminal.println(ANSIParser.fg('bright-green') + '  Military Enhancement researched!' + ANSIParser.reset());
        } else if (choice === '2' && this.corporation.research >= 100) {
            this.corporation.research -= 100;
            this.corporation.territories.forEach(territoryId => {
                this.territories[territoryId].defense = Math.floor(this.territories[territoryId].defense * 1.2);
            });
            this.terminal.println(ANSIParser.fg('bright-green') + '  Defense Systems researched!' + ANSIParser.reset());
        } else if (choice === '3' && this.corporation.research >= 150) {
            this.corporation.research -= 150;
            this.territories.forEach(territory => {
                if (this.corporation.territories.includes(territory.id)) {
                    territory.oil = Math.floor(territory.oil * 1.25);
                    territory.food = Math.floor(territory.food * 1.25);
                    territory.technology = Math.floor(territory.technology * 1.25);
                }
            });
            this.terminal.println(ANSIParser.fg('bright-green') + '  Resource Efficiency researched!' + ANSIParser.reset());
        } else if (choice !== '0') {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Not enough research points!' + ANSIParser.reset());
        }
        
        await this.terminal.sleep(2000);
    }

    async diplomacy() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '\n  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  DIPLOMACY' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Earn Research Points by trading resources!' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-white') + '  Trade Options:' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '    100 Oil → 10 Research Points' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '    100 Food → 10 Research Points' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '    50 Technology → 10 Research Points' + ANSIParser.reset());
        this.terminal.println('');
        
        const resource = await this.terminal.input('  Trade [O]il, [F]ood, or [T]echnology? ').toUpperCase();
        const quantity = parseInt(await this.terminal.input('  How many units? '));
        
        if (resource === 'O' && this.corporation.oil >= quantity && quantity >= 100) {
            const researchGain = Math.floor(quantity / 100) * 10;
            this.corporation.oil -= quantity;
            this.corporation.research += researchGain;
            this.terminal.println(ANSIParser.fg('bright-green') + `  Traded ${quantity} oil for ${researchGain} research points!` + ANSIParser.reset());
        } else if (resource === 'F' && this.corporation.food >= quantity && quantity >= 100) {
            const researchGain = Math.floor(quantity / 100) * 10;
            this.corporation.food -= quantity;
            this.corporation.research += researchGain;
            this.terminal.println(ANSIParser.fg('bright-green') + `  Traded ${quantity} food for ${researchGain} research points!` + ANSIParser.reset());
        } else if (resource === 'T' && this.corporation.technology >= quantity && quantity >= 50) {
            const researchGain = Math.floor(quantity / 50) * 10;
            this.corporation.technology -= quantity;
            this.corporation.research += researchGain;
            this.terminal.println(ANSIParser.fg('bright-green') + `  Traded ${quantity} technology for ${researchGain} research points!` + ANSIParser.reset());
        } else {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Invalid or insufficient resources!' + ANSIParser.reset());
        }
        
        await this.terminal.sleep(2000);
    }

    async viewLeaderboard() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '\n  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  LEADERBOARD' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println('');
        
        try {
            const response = await fetch('/api/game-state/bre/leaderboard');
            const leaderboard = await response.json();
            
            if (leaderboard.length === 0) {
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  No corporations yet!' + ANSIParser.reset());
            } else {
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  Rank  Corporation          Territories  Level' + ANSIParser.reset());
                this.terminal.println(ANSIParser.fg('bright-white') + '  ────────────────────────────────────────────────────' + ANSIParser.reset());
                
                leaderboard.forEach((entry, index) => {
                    const rank = (index + 1).toString().padStart(2);
                    const name = entry.corporationName.padEnd(20);
                    const territories = entry.territories.toString().padStart(12);
                    const level = entry.level.toString().padStart(5);
                    this.terminal.println(ANSIParser.fg('bright-green') + `  ${rank}.  ${name}  ${territories}  ${level}` + ANSIParser.reset());
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
        this.terminal.println(ANSIParser.fg('bright-cyan') + '\n  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  CORPORATION STATISTICS' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-yellow') + `  Corporation: ${this.corporation.name}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + `  Level: ${this.corporation.level}` + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + `  Territories Controlled: ${this.corporation.territories.length}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + `  Total Credits: $${this.corporation.credits.toLocaleString()}` + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-white') + `  Total Attacks: ${this.corporation.attacks}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + `  Victories: ${this.corporation.victories}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + `  Defeats: ${this.corporation.defeats}` + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-cyan') + `  Turns Taken: ${this.corporation.turns}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + `  Current Military: ${this.corporation.military}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + `  Research Points: ${this.corporation.research}` + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println('  Press any key to continue...');
        await this.terminal.input();
    }

    async loadGameState() {
        try {
            const response = await fetch('/api/game-state/bre');
            if (!response.ok) throw new Error('No saved game');
            const data = await response.json();
            this.corporation = data.corporation;
            this.territories = data.territories;
        } catch (error) {
            console.log('Starting new game');
        }
    }

    async saveGameState() {
        if (!this.corporation) return;
        
        try {
            await fetch('/api/game-state/bre', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    corporation: this.corporation,
                    territories: this.territories
                })
            });
        } catch (error) {
            console.error('Error saving game state:', error);
        }
    }
}

// Export for use in other modules
window.BRE = BRE;








