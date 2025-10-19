// Galactic Trader Game
class GalacticTrader {
    constructor(terminal, socketClient, authManager) {
        this.terminal = terminal;
        this.socketClient = socketClient;
        this.authManager = authManager;
        this.gameState = {
            credits: 10000,
            cargo: [],
            location: 'Earth',
            turns: 20,
            ship: { name: 'Starter Ship', cargoSpace: 50, speed: 1 }
        };
        this.planets = [
            { name: 'Earth', commodities: { ore: 100, food: 50, medicine: 200, weapons: 300, tech: 500 } },
            { name: 'Mars', commodities: { ore: 50, food: 150, medicine: 250, weapons: 400, tech: 450 } },
            { name: 'Jupiter', commodities: { ore: 150, food: 200, medicine: 150, weapons: 250, tech: 600 } },
            { name: 'Saturn', commodities: { ore: 200, food: 100, medicine: 300, weapons: 200, tech: 550 } },
            { name: 'Neptune', commodities: { ore: 80, food: 300, medicine: 400, weapons: 150, tech: 700 } }
        ];
        this.commodities = ['ore', 'food', 'medicine', 'weapons', 'tech'];
    }

    async play() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + this.getTitle() + ANSIParser.reset());
        this.terminal.println('');
        
        // Load game state
        await this.loadGameState();
        
        while (this.gameState.turns > 0) {
            this.terminal.clear();
            this.showStatus();
            this.terminal.println('');
            
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [T]' + ANSIParser.reset() + ' Travel to another planet');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [B]' + ANSIParser.reset() + ' Buy commodities');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [S]' + ANSIParser.reset() + ' Sell commodities');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [C]' + ANSIParser.reset() + ' Check cargo');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [Q]' + ANSIParser.reset() + ' Quit game');
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
            
            const choice = (await this.terminal.input()).toLowerCase();
            
            if (choice === 't') {
                await this.travel();
            } else if (choice === 'b') {
                await this.buy();
            } else if (choice === 's') {
                await this.sell();
            } else if (choice === 'c') {
                await this.checkCargo();
            } else if (choice === 'q') {
                await this.saveGameState();
                return 'doors';
            }
            
            this.gameState.turns--;
            
            if (this.gameState.turns <= 0) {
                this.terminal.println('');
                this.terminal.println(ANSIParser.fg('bright-red') + '  Out of turns!' + ANSIParser.reset());
                await this.terminal.sleep(2000);
                await this.saveGameState();
                return 'doors';
            }
        }
        
        return 'doors';
    }

    async travel() {
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  Available planets:' + ANSIParser.reset());
        this.terminal.println('');
        
        this.planets.forEach((planet, index) => {
            if (planet.name !== this.gameState.location) {
                this.terminal.println(ANSIParser.fg('bright-yellow') + `  [${index}]` + ANSIParser.reset() + ` ${planet.name}`);
            }
        });
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + '  Select planet: ' + ANSIParser.reset());
        const choice = parseInt(await this.terminal.input());
        
        if (choice >= 0 && choice < this.planets.length) {
            const planet = this.planets[choice];
            if (planet.name !== this.gameState.location) {
                this.gameState.location = planet.name;
                this.terminal.println(ANSIParser.fg('bright-green') + `  Traveling to ${planet.name}...` + ANSIParser.reset());
                await this.terminal.sleep(1000);
                
                // Random event
                if (Math.random() < 0.3) {
                    await this.randomEvent();
                }
            }
        }
    }

    async buy() {
        const planet = this.planets.find(p => p.name === this.gameState.location);
        const availableSpace = this.gameState.ship.cargoSpace - this.getCargoWeight();
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-cyan') + `  Commodities at ${planet.name}:` + ANSIParser.reset());
        this.terminal.println('');
        
        this.commodities.forEach((commodity, index) => {
            const price = planet.commodities[commodity];
            this.terminal.println(ANSIParser.fg('bright-yellow') + `  [${index}]` + ANSIParser.reset() + 
                ` ${commodity.padEnd(10)} ${price} credits`);
        });
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + '  Select commodity: ' + ANSIParser.reset());
        const choice = parseInt(await this.terminal.input());
        
        if (choice >= 0 && choice < this.commodities.length) {
            const commodity = this.commodities[choice];
            const price = planet.commodities[commodity];
            
            this.terminal.println(ANSIParser.fg('bright-green') + '  How many units? ' + ANSIParser.reset());
            const amount = parseInt(await this.terminal.input());
            
            const cost = amount * price;
            const weight = amount;
            
            if (cost <= this.gameState.credits && weight <= availableSpace) {
                this.gameState.credits -= cost;
                this.gameState.cargo.push({ commodity, amount, buyPrice: price });
                this.terminal.println(ANSIParser.fg('bright-green') + `  Purchased ${amount} units of ${commodity}!` + ANSIParser.reset());
            } else {
                this.terminal.println(ANSIParser.fg('bright-red') + '  Cannot afford or no space!' + ANSIParser.reset());
            }
        }
        
        await this.terminal.sleep(2000);
    }

    async sell() {
        if (this.gameState.cargo.length === 0) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  No cargo to sell!' + ANSIParser.reset());
            await this.terminal.sleep(1500);
            return;
        }
        
        const planet = this.planets.find(p => p.name === this.gameState.location);
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  Your cargo:' + ANSIParser.reset());
        this.terminal.println('');
        
        this.gameState.cargo.forEach((item, index) => {
            const sellPrice = planet.commodities[item.commodity];
            const profit = (sellPrice - item.buyPrice) * item.amount;
            this.terminal.println(ANSIParser.fg('bright-yellow') + `  [${index}]` + ANSIParser.reset() + 
                ` ${item.amount}x ${item.commodity} - Buy: ${item.buyPrice}, Sell: ${sellPrice} (${profit > 0 ? '+' : ''}${profit} profit)`);
        });
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + '  Select cargo to sell: ' + ANSIParser.reset());
        const choice = parseInt(await this.terminal.input());
        
        if (choice >= 0 && choice < this.gameState.cargo.length) {
            const item = this.gameState.cargo[choice];
            const sellPrice = planet.commodities[item.commodity];
            const profit = (sellPrice - item.buyPrice) * item.amount;
            
            this.gameState.credits += sellPrice * item.amount;
            this.gameState.cargo.splice(choice, 1);
            
            this.terminal.println(ANSIParser.fg('bright-green') + `  Sold for ${sellPrice * item.amount} credits! (${profit > 0 ? '+' : ''}${profit} profit)` + ANSIParser.reset());
        }
        
        await this.terminal.sleep(2000);
    }

    async checkCargo() {
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  Your cargo:' + ANSIParser.reset());
        this.terminal.println('');
        
        if (this.gameState.cargo.length === 0) {
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  Empty' + ANSIParser.reset());
        } else {
            const totalWeight = this.getCargoWeight();
            this.gameState.cargo.forEach(item => {
                this.terminal.println(ANSIParser.fg('bright-white') + `  ${item.amount}x ${item.commodity}` + ANSIParser.reset());
            });
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-cyan') + `  Total weight: ${totalWeight}/${this.gameState.ship.cargoSpace}` + ANSIParser.reset());
        }
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Press any key to continue...' + ANSIParser.reset());
        await this.terminal.input();
    }

    async randomEvent() {
        const events = [
            { message: 'Found a derelict ship! +500 credits', credits: 500 },
            { message: 'Space pirates! Lost 1000 credits', credits: -1000 },
            { message: 'Trading opportunity! +300 credits', credits: 300 },
            { message: 'Solar storm! Lost 500 credits', credits: -500 }
        ];
        
        const event = events[Math.floor(Math.random() * events.length)];
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-yellow') + `  ${event.message}` + ANSIParser.reset());
        this.gameState.credits += event.credits;
        await this.terminal.sleep(2000);
    }

    showStatus() {
        this.terminal.println(ANSIParser.fg('bright-cyan') + '╔══════════════════════════════════════════════════════════════════════════════╗' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '║' + ANSIParser.reset() + 
            ANSIParser.fg('bright-white') + '  GALACTIC TRADER' + ANSIParser.reset() + 
            ' '.repeat(63) + ANSIParser.fg('bright-cyan') + '║' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '╚══════════════════════════════════════════════════════════════════════════════╝' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + `  Credits: ${this.gameState.credits}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + `  Location: ${this.gameState.location}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + `  Turns remaining: ${this.gameState.turns}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + `  Cargo space: ${this.getCargoWeight()}/${this.gameState.ship.cargoSpace}` + ANSIParser.reset());
    }

    getCargoWeight() {
        return this.gameState.cargo.reduce((total, item) => total + item.amount, 0);
    }

    async loadGameState() {
        try {
            const response = await fetch(`/api/game-state/galactic-trader`);
            const state = await response.json();
            if (state && state.game_data) {
                this.gameState = { ...this.gameState, ...JSON.parse(state.game_data) };
            }
        } catch (error) {
            // No saved game state yet, start fresh
            console.log('Starting new game');
        }
    }

    async saveGameState() {
        try {
            await fetch(`/api/game-state/galactic-trader`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(this.gameState)
            });
        } catch (error) {
            console.error('Error saving game state:', error);
        }
    }

    getTitle() {
        return `
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║                      GALACTIC TRADER                                         ║
║                                                                              ║
║              "Trade your way across the galaxy!"                             ║
╚══════════════════════════════════════════════════════════════════════════════╝
`;
    }
}

// Export for use in other modules
window.GalacticTrader = GalacticTrader;

