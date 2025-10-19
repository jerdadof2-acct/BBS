// TradeWars 2002 - Classic BBS Space Trading Game
// The #1 most popular BBS door game!

class TradeWars {
    constructor(terminal, socketClient, authManager) {
        this.terminal = terminal;
        this.socketClient = socketClient;
        this.authManager = authManager;
        this.gameState = null;
        this.sectors = [];
        this.currentSector = 0;
        this.player = null;
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
                await this.viewSector();
            } else if (choice === '2') {
                await this.moveShip();
            } else if (choice === '3') {
                await this.tradeGoods();
            } else if (choice === '4') {
                await this.viewShip();
            } else if (choice === '5') {
                await this.viewPort();
            } else if (choice === '6') {
                await this.viewMap();
            } else if (choice === '7') {
                await this.viewStats();
            } else if (choice === '8') {
                await this.viewLeaderboard();
            }
        }
    }

    getTitleScreen() {
        return `
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║                       TRADEWARS 2002                                         ║
║                                                                              ║
║                    Classic Space Trading Game                                ║
║                                                                              ║
║                   Navigate the galaxy and trade!                             ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
`;
    }

    async createPlayer() {
        this.terminal.println(ANSIParser.fg('bright-cyan') + '\n  Welcome to TRADEWARS 2002!' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println('  You are a space trader in the galactic frontier.');
        this.terminal.println('');
        
        const playerName = await this.terminal.input('  Enter your trader name: ');
        
        this.player = {
            name: playerName,
            credits: 10000,
            shipType: 'Freighter',
            cargoCapacity: 100,
            cargo: {},
            currentCargo: 0,
            sectors: 0,
            turns: 0,
            trades: 0,
            profit: 0,
            kills: 0,
            deaths: 0
        };
        
        // Initialize galaxy
        this.initGalaxy();
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + `  Welcome to the galaxy, ${playerName}!` + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println('  Press any key to continue...');
        await this.terminal.input();
    }

    initGalaxy() {
        // Create a 10x10 galaxy (100 sectors)
        this.sectors = [];
        const goods = ['Food', 'Ore', 'Medicine', 'Weapons', 'Technology', 'Gems'];
        
        for (let i = 0; i < 100; i++) {
            const sector = {
                id: i,
                type: Math.random() > 0.7 ? 'Planet' : 'Space',
                port: null,
                explored: i === 0,
                neighbors: this.getNeighbors(i)
            };
            
            if (sector.type === 'Planet') {
                sector.port = {
                    name: `Port-${String.fromCharCode(65 + (i % 26))}${Math.floor(i / 26)}`,
                    goods: {}
                };
                
                // Randomly assign goods and prices
                const numGoods = Math.floor(Math.random() * 3) + 2;
                const availableGoods = [...goods].sort(() => Math.random() - 0.5).slice(0, numGoods);
                
                availableGoods.forEach(good => {
                    sector.port.goods[good] = {
                        buyPrice: Math.floor(Math.random() * 100) + 50,
                        sellPrice: Math.floor(Math.random() * 100) + 50
                    };
                });
            }
            
            this.sectors.push(sector);
        }
        
        this.currentSector = 0;
        this.sectors[0].explored = true;
    }

    getNeighbors(sectorId) {
        const neighbors = [];
        const row = Math.floor(sectorId / 10);
        const col = sectorId % 10;
        
        // North
        if (row > 0) neighbors.push(sectorId - 10);
        // South
        if (row < 9) neighbors.push(sectorId + 10);
        // West
        if (col > 0) neighbors.push(sectorId - 1);
        // East
        if (col < 9) neighbors.push(sectorId + 1);
        
        return neighbors;
    }

    async mainMenu() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-yellow') + this.getTitleScreen() + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-cyan') + `  Trader: ${this.player.name}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + `  Credits: $${this.player.credits.toLocaleString()}  |  Turns: ${this.player.turns}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + `  Sector: ${this.currentSector}  |  Ship: ${this.player.shipType}` + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [1] View Current Sector' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [2] Move Ship' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [3] Trade Goods' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [4] View Ship Status' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [5] View Port' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [6] View Galaxy Map' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [7] View Statistics' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [8] View Leaderboard' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-red') + '  [Q] Quit Game' + ANSIParser.reset());
        this.terminal.println('');
        
        const choice = await this.terminal.input('  Your choice: ');
        return choice.toUpperCase();
    }

    async viewSector() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '\n  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + `  SECTOR ${this.currentSector}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println('');
        
        const sector = this.sectors[this.currentSector];
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + `  Type: ${sector.type}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + `  Explored: ${sector.explored ? 'Yes' : 'No'}` + ANSIParser.reset());
        this.terminal.println('');
        
        if (sector.type === 'Planet') {
            this.terminal.println(ANSIParser.fg('bright-green') + `  Port Available: ${sector.port.name}` + ANSIParser.reset());
        } else {
            this.terminal.println(ANSIParser.fg('bright-red') + '  No port in this sector' + ANSIParser.reset());
        }
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-white') + '  Connected Sectors:' + ANSIParser.reset());
        sector.neighbors.forEach(neighborId => {
            const explored = this.sectors[neighborId].explored ? '✓' : '?';
            this.terminal.println(ANSIParser.fg('bright-cyan') + `    ${explored} Sector ${neighborId}` + ANSIParser.reset());
        });
        
        this.terminal.println('');
        this.terminal.println('  Press any key to continue...');
        await this.terminal.input();
    }

    async moveShip() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '\n  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  MOVE SHIP' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-yellow') + `  Current Sector: ${this.currentSector}` + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-white') + '  Connected Sectors:' + ANSIParser.reset());
        this.terminal.println('');
        
        const sector = this.sectors[this.currentSector];
        sector.neighbors.forEach((neighborId, index) => {
            const explored = this.sectors[neighborId].explored ? '✓' : '?';
            const type = this.sectors[neighborId].type;
            this.terminal.println(ANSIParser.fg('bright-green') + `  [${index + 1}] Sector ${neighborId} (${type}) ${explored}` + ANSIParser.reset());
        });
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-red') + '  [0] Cancel' + ANSIParser.reset());
        this.terminal.println('');
        
        const choice = await this.terminal.input('  Select sector to move to: ');
        
        if (choice === '0') return;
        
        const sectorIndex = parseInt(choice) - 1;
        if (sectorIndex < 0 || sectorIndex >= sector.neighbors.length) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Invalid choice!' + ANSIParser.reset());
            await this.terminal.sleep(1500);
            return;
        }
        
        const targetSector = sector.neighbors[sectorIndex];
        this.currentSector = targetSector;
        
        if (!this.sectors[targetSector].explored) {
            this.sectors[targetSector].explored = true;
            this.player.sectors++;
        }
        
        this.player.turns++;
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + `  Moved to Sector ${targetSector}!` + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println('  Press any key to continue...');
        await this.terminal.input();
    }

    async tradeGoods() {
        const sector = this.sectors[this.currentSector];
        
        if (sector.type !== 'Planet' || !sector.port) {
            this.terminal.println(ANSIParser.fg('bright-red') + '\n  No port in this sector!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
            return;
        }
        
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '\n  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + `  TRADING AT ${sector.port.name}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-yellow') + `  Credits: $${this.player.credits.toLocaleString()}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + `  Cargo: ${this.player.currentCargo}/${this.player.cargoCapacity}` + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-white') + '  Available Goods:' + ANSIParser.reset());
        this.terminal.println('');
        
        const goods = Object.keys(sector.port.goods);
        goods.forEach((good, index) => {
            const buyPrice = sector.port.goods[good].buyPrice;
            const sellPrice = sector.port.goods[good].sellPrice;
            const owned = this.player.cargo[good] || 0;
            this.terminal.println(ANSIParser.fg('bright-green') + `  [${index + 1}] ${good}` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-white') + `      Buy: $${buyPrice}  |  Sell: $${sellPrice}  |  You own: ${owned}` + ANSIParser.reset());
            this.terminal.println('');
        });
        
        this.terminal.println(ANSIParser.fg('bright-red') + '  [0] Back' + ANSIParser.reset());
        this.terminal.println('');
        
        const choice = await this.terminal.input('  Select good to trade: ');
        
        if (choice === '0') return;
        
        const goodIndex = parseInt(choice) - 1;
        if (goodIndex < 0 || goodIndex >= goods.length) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Invalid choice!' + ANSIParser.reset());
            await this.terminal.sleep(1500);
            return;
        }
        
        const selectedGood = goods[goodIndex];
        const buyPrice = sector.port.goods[selectedGood].buyPrice;
        const sellPrice = sector.port.goods[selectedGood].sellPrice;
        const owned = this.player.cargo[selectedGood] || 0;
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-yellow') + `  Trading ${selectedGood}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [1] Buy' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [2] Sell' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-red') + '  [0] Cancel' + ANSIParser.reset());
        this.terminal.println('');
        
        const action = await this.terminal.input('  Your choice: ');
        
        if (action === '1') {
            const quantity = parseInt(await this.terminal.input('  How many to buy? '));
            
            if (quantity <= 0) {
                this.terminal.println(ANSIParser.fg('bright-red') + '  Invalid quantity!' + ANSIParser.reset());
                await this.terminal.sleep(1500);
                return;
            }
            
            const cost = quantity * buyPrice;
            const newCargo = this.player.currentCargo + quantity;
            
            if (cost > this.player.credits) {
                this.terminal.println(ANSIParser.fg('bright-red') + '  Not enough credits!' + ANSIParser.reset());
                await this.terminal.sleep(1500);
                return;
            }
            
            if (newCargo > this.player.cargoCapacity) {
                this.terminal.println(ANSIParser.fg('bright-red') + '  Not enough cargo space!' + ANSIParser.reset());
                await this.terminal.sleep(1500);
                return;
            }
            
            this.player.credits -= cost;
            this.player.currentCargo += quantity;
            this.player.cargo[selectedGood] = (this.player.cargo[selectedGood] || 0) + quantity;
            this.player.trades++;
            
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-green') + `  Purchased ${quantity} ${selectedGood} for $${cost.toLocaleString()}!` + ANSIParser.reset());
            this.terminal.println('');
            this.terminal.println('  Press any key to continue...');
            await this.terminal.input();
            
        } else if (action === '2') {
            if (owned === 0) {
                this.terminal.println(ANSIParser.fg('bright-red') + '  You don\'t own any of this good!' + ANSIParser.reset());
                await this.terminal.sleep(1500);
                return;
            }
            
            const quantity = parseInt(await this.terminal.input(`  How many to sell? (max ${owned}) `));
            
            if (quantity <= 0 || quantity > owned) {
                this.terminal.println(ANSIParser.fg('bright-red') + '  Invalid quantity!' + ANSIParser.reset());
                await this.terminal.sleep(1500);
                return;
            }
            
            const revenue = quantity * sellPrice;
            const profit = revenue - (quantity * buyPrice);
            
            this.player.credits += revenue;
            this.player.currentCargo -= quantity;
            this.player.cargo[selectedGood] -= quantity;
            this.player.profit += profit;
            this.player.trades++;
            
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-green') + `  Sold ${quantity} ${selectedGood} for $${revenue.toLocaleString()}!` + ANSIParser.reset());
            if (profit > 0) {
                this.terminal.println(ANSIParser.fg('bright-cyan') + `  Profit: $${profit.toLocaleString()}` + ANSIParser.reset());
            }
            this.terminal.println('');
            this.terminal.println('  Press any key to continue...');
            await this.terminal.input();
        }
    }

    async viewShip() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '\n  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  SHIP STATUS' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-yellow') + `  Ship Type: ${this.player.shipType}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + `  Cargo Capacity: ${this.player.cargoCapacity}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + `  Current Cargo: ${this.player.currentCargo}/${this.player.cargoCapacity}` + ANSIParser.reset());
        this.terminal.println('');
        
        if (this.player.currentCargo > 0) {
            this.terminal.println(ANSIParser.fg('bright-white') + '  Cargo Hold:' + ANSIParser.reset());
            Object.keys(this.player.cargo).forEach(good => {
                const quantity = this.player.cargo[good];
                if (quantity > 0) {
                    this.terminal.println(ANSIParser.fg('bright-green') + `    ${good}: ${quantity}` + ANSIParser.reset());
                }
            });
        } else {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Cargo hold is empty' + ANSIParser.reset());
        }
        
        this.terminal.println('');
        this.terminal.println('  Press any key to continue...');
        await this.terminal.input();
    }

    async viewPort() {
        const sector = this.sectors[this.currentSector];
        
        if (sector.type !== 'Planet' || !sector.port) {
            this.terminal.println(ANSIParser.fg('bright-red') + '\n  No port in this sector!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
            return;
        }
        
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '\n  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + `  ${sector.port.name}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-white') + '  Goods Available:' + ANSIParser.reset());
        this.terminal.println('');
        
        const goods = Object.keys(sector.port.goods);
        goods.forEach(good => {
            const buyPrice = sector.port.goods[good].buyPrice;
            const sellPrice = sector.port.goods[good].sellPrice;
            this.terminal.println(ANSIParser.fg('bright-green') + `  ${good}` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-white') + `    Buy: $${buyPrice.toLocaleString()}  |  Sell: $${sellPrice.toLocaleString()}` + ANSIParser.reset());
            this.terminal.println('');
        });
        
        this.terminal.println('  Press any key to continue...');
        await this.terminal.input();
    }

    async viewMap() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '\n  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  GALAXY MAP' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-white') + '  Legend: [You] [Explored] ? [Unexplored]' + ANSIParser.reset());
        this.terminal.println('');
        
        for (let row = 0; row < 10; row++) {
            let line = '  ';
            for (let col = 0; col < 10; col++) {
                const sectorId = row * 10 + col;
                const sector = this.sectors[sectorId];
                
                if (sectorId === this.currentSector) {
                    line += ANSIParser.fg('bright-cyan') + '[YOU]' + ANSIParser.reset();
                } else if (sector.explored) {
                    line += sector.type === 'Planet' ? ANSIParser.fg('bright-green') + '[P]' + ANSIParser.reset() : ANSIParser.fg('bright-white') + '[*]' + ANSIParser.reset();
                } else {
                    line += ANSIParser.fg('bright-black') + '[?]' + ANSIParser.reset();
                }
                line += ' ';
            }
            this.terminal.println(line);
        }
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + '  P = Planet (Port Available)' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  * = Space (No Port)' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println('  Press any key to continue...');
        await this.terminal.input();
    }

    async viewStats() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '\n  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  TRADER STATISTICS' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-yellow') + `  Trader Name: ${this.player.name}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + `  Current Credits: $${this.player.credits.toLocaleString()}` + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + `  Sectors Explored: ${this.player.sectors}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + `  Turns Taken: ${this.player.turns}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + `  Trades Made: ${this.player.trades}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + `  Total Profit: $${this.player.profit.toLocaleString()}` + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-cyan') + `  Current Sector: ${this.currentSector}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + `  Ship Type: ${this.player.shipType}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + `  Cargo Capacity: ${this.player.cargoCapacity}` + ANSIParser.reset());
        this.terminal.println('');
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
            const response = await fetch('/api/game-state/tradewars/leaderboard');
            const leaderboard = await response.json();
            
            if (leaderboard.length === 0) {
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  No traders yet!' + ANSIParser.reset());
            } else {
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  Rank  Trader Name          Credits      Profit' + ANSIParser.reset());
                this.terminal.println(ANSIParser.fg('bright-white') + '  ────────────────────────────────────────────────────' + ANSIParser.reset());
                
                leaderboard.forEach((entry, index) => {
                    const rank = (index + 1).toString().padStart(2);
                    const name = entry.playerName.padEnd(20);
                    const credits = entry.credits.toLocaleString().padStart(12);
                    const profit = entry.profit.toLocaleString().padStart(10);
                    this.terminal.println(ANSIParser.fg('bright-green') + `  ${rank}.  ${name}  ${credits}  ${profit}` + ANSIParser.reset());
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
            const response = await fetch('/api/game-state/tradewars');
            if (!response.ok) throw new Error('No saved game');
            const data = await response.json();
            this.player = data.player;
            this.sectors = data.sectors;
            this.currentSector = data.currentSector;
        } catch (error) {
            console.log('Starting new game');
        }
    }

    async saveGameState() {
        if (!this.player) return;
        
        try {
            await fetch('/api/game-state/tradewars', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    player: this.player,
                    sectors: this.sectors,
                    currentSector: this.currentSector
                })
            });
        } catch (error) {
            console.error('Error saving game state:', error);
        }
    }
}

// Export for use in other modules
window.TradeWars = TradeWars;





