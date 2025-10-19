// Rock Star - Classic BBS Door Game
// Manage your rock band to stardom!

class RockStar {
    constructor(terminal, socketClient, authManager) {
        this.terminal = terminal;
        this.socketClient = socketClient;
        this.authManager = authManager;
        this.band = null;
        this.gameState = null;
        this.autoSaveInterval = null;
    }

    async play() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-yellow') + this.getTitleScreen() + ANSIParser.reset());
        this.terminal.println('');
        
        await this.loadGameState();
        
        if (!this.band) {
            await this.createBand();
        }
        
        // Start auto-save every 2 minutes
        this.startAutoSave();
        
        while (true) {
            const choice = await this.mainMenu();
            
            if (choice === 'Q') {
                this.stopAutoSave();
                await this.saveGameState();
                return 'doors';
            } else if (choice === '1') {
                await this.viewBandStatus();
            } else if (choice === '2') {
                await this.bookGig();
                await this.saveGameState(); // Auto-save after gig
            } else if (choice === '3') {
                await this.recordAlbum();
                await this.saveGameState(); // Auto-save after album
            } else if (choice === '4') {
                await this.practice();
                await this.saveGameState(); // Auto-save after practice
            } else if (choice === '5') {
                await this.manageBand();
                await this.saveGameState(); // Auto-save after band management
            } else if (choice === '6') {
                await this.viewLeaderboard();
            } else if (choice === '7') {
                await this.buyEquipment();
                await this.saveGameState(); // Auto-save after equipment purchase
            } else if (choice === '8') {
                await this.viewStats();
            } else if (choice === '9') {
                await this.newGame();
            }
        }
    }

    getTitleScreen() {
        return `
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║                        🎸  ROCK STAR  🎸                                      ║
║                                                                              ║
║                    Classic Band Management Game                              ║
║                                                                              ║
║                   Manage your band to superstardom!                          ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
`;
    }

    async createBand() {
        this.terminal.println(ANSIParser.fg('bright-cyan') + '\n  Welcome to ROCK STAR!' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println('  You\'re starting a new band. Let\'s get you set up!');
        this.terminal.println('');
        
        const bandName = await this.terminal.input('  Enter your band name: ');
        const memberCount = parseInt(await this.terminal.input('  How many band members (3-5)? '));
        
        this.band = {
            name: bandName,
            members: Math.min(5, Math.max(3, memberCount)),
            fans: 0,
            money: 1000,
            fame: 0,
            skill: 50,
            energy: 100,
            albums: 0,
            gigsPlayed: 0,
            totalEarnings: 0,
            equipment: {
                guitars: 2,
                drums: 1,
                amps: 2,
                microphones: 2
            },
            equipmentQuality: 1,
            day: 1
        };
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + `  Great! ${bandName} is ready to rock!` + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println('  Press any key to continue...');
        await this.terminal.input();
    }

    async newGame() {
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  START NEW GAME' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-white') + '  This will create a new band and reset all progress.' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-red') + '  Your current progress will be lost!' + ANSIParser.reset());
        this.terminal.println('');
        
        const confirm = await this.terminal.input('  Are you sure? (y/N): ');
        
        if (confirm.toLowerCase() === 'y' || confirm.toLowerCase() === 'yes') {
            // Reset band to null so createBand() will be called
            this.band = null;
            
            // Clear the saved game state
            try {
                await fetch('/api/game-state/rock-star', {
                    method: 'DELETE',
                    credentials: 'include'
                });
                console.log('🔍 DEBUG: Cleared saved game state');
            } catch (error) {
                console.log('🔍 DEBUG: Error clearing saved game state:', error);
            }
            
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-green') + '  Starting new game...' + ANSIParser.reset());
            await this.terminal.sleep(1000);
            
            // Create new band
            await this.createBand();
            
            // Save the new band
            await this.saveGameState();
        } else {
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  New game cancelled.' + ANSIParser.reset());
            await this.terminal.sleep(1000);
        }
    }

    async mainMenu() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-yellow') + this.getTitleScreen() + ANSIParser.reset());
        this.terminal.println('');
        
        // Safety check for band object
        if (!this.band) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Error: Band data not loaded. Please restart the game.' + ANSIParser.reset());
            await this.terminal.sleep(2000);
            return 'Q';
        }
        
        this.terminal.println(ANSIParser.fg('bright-cyan') + `  Band: ${this.band.name || 'Unknown'}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + `  Fans: ${(this.band.fans || 0).toLocaleString()}  |  Money: $${(this.band.money || 0).toLocaleString()}  |  Fame: ${this.band.fame || 0}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + `  Skill: ${this.band.skill || 0}%  |  Energy: ${this.band.energy || 0}%  |  Day: ${this.band.day || 1}` + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [1] View Band Status' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [2] Book a Gig' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [3] Record an Album' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [4] Practice' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [5] Manage Band' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [6] View Leaderboard' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [7] Buy Equipment' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [8] View Statistics' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [9] New Game' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-red') + '  [Q] Quit Game' + ANSIParser.reset());
        this.terminal.println('');
        
        const choice = await this.terminal.input('  Your choice: ');
        return choice.toUpperCase();
    }

    async viewBandStatus() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '\n  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + `  BAND STATUS: ${this.band.name}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-yellow') + `  Members: ${this.band.members}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + `  Fans: ${(this.band.fans || 0).toLocaleString()}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + `  Money: $${(this.band.money || 0).toLocaleString()}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + `  Fame: ${this.band.fame}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + `  Skill: ${this.band.skill}%` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + `  Energy: ${this.band.energy}%` + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + `  Albums Released: ${this.band.albums}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + `  Gigs Played: ${this.band.gigsPlayed}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + `  Total Earnings: $${(this.band.totalEarnings || 0).toLocaleString()}` + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  Equipment Quality: ' + this.getQualityName(this.band.equipmentQuality) + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println('  Press any key to continue...');
        await this.terminal.input();
    }

    async bookGig() {
        // Safety check for band object
        if (!this.band) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Error: Band data not loaded. Please restart the game.' + ANSIParser.reset());
            await this.terminal.sleep(2000);
            return;
        }
        
        if (this.band.energy < 20) {
            this.terminal.println(ANSIParser.fg('bright-red') + '\n  Your band is too tired! Rest first.' + ANSIParser.reset());
            await this.terminal.sleep(2000);
            return;
        }

        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '\n  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  BOOK A GIG' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println('');
        
        const gigs = [
            { name: 'Local Bar', fans: 50, pay: 200, energy: 20 },
            { name: 'Club Venue', fans: 150, pay: 500, energy: 30 },
            { name: 'Concert Hall', fans: 500, pay: 1500, energy: 40 },
            { name: 'Stadium Show', fans: 2000, pay: 5000, energy: 50 },
            { name: 'Music Festival', fans: 5000, pay: 10000, energy: 60 }
        ];

        for (let i = 0; i < gigs.length; i++) {
            const gig = gigs[i];
            const available = this.band.fame >= i * 100 && this.band.energy >= gig.energy;
            const status = available ? ANSIParser.fg('bright-green') + '[AVAILABLE]' : ANSIParser.fg('bright-red') + '[LOCKED]';
            this.terminal.println(ANSIParser.fg('bright-yellow') + `  [${i + 1}] ${gig.name}` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-white') + `      Fans: ${(gig.fans || 0).toLocaleString()} | Pay: $${(gig.pay || 0).toLocaleString()} | Energy: ${gig.energy || 0}% | ${status}` + ANSIParser.reset());
            this.terminal.println('');
        }
        
        this.terminal.println(ANSIParser.fg('bright-red') + '  [0] Cancel' + ANSIParser.reset());
        this.terminal.println('');
        
        const choice = await this.terminal.input('  Select gig: ');
        
        if (choice === '0') return;
        
        const gigIndex = parseInt(choice) - 1;
        if (gigIndex < 0 || gigIndex >= gigs.length) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Invalid choice!' + ANSIParser.reset());
            await this.terminal.sleep(1500);
            return;
        }
        
        const selectedGig = gigs[gigIndex];
        
        // Safety check for selectedGig
        if (!selectedGig) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Invalid gig selection!' + ANSIParser.reset());
            await this.terminal.sleep(1500);
            return;
        }
        
        if (this.band.fame < gigIndex * 100) {
            this.terminal.println(ANSIParser.fg('bright-red') + `  You need ${gigIndex * 100} fame to play this venue!` + ANSIParser.reset());
            await this.terminal.sleep(2000);
            return;
        }
        
        if (this.band.energy < selectedGig.energy) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Your band is too tired!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
            return;
        }
        
        // Calculate performance
        const performance = Math.floor((this.band.skill + this.band.equipmentQuality * 10) / 2);
        const fanGain = Math.floor(selectedGig.fans * (performance / 100));
        const payBonus = Math.floor(selectedGig.pay * (performance / 100));
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  GIG PERFORMANCE' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println('');
        // Fame based on gig size and performance
        const fameGain = Math.floor(selectedGig.fans / 50) + Math.floor(performance / 10);
        
        this.terminal.println(ANSIParser.fg('bright-green') + `  Performance Quality: ${performance}%` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + `  New Fans: ${(fanGain || 0).toLocaleString()}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + `  Earnings: $${(payBonus || 0).toLocaleString()}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + `  Fame Gained: ${fameGain}` + ANSIParser.reset());
        this.terminal.println('');
        
        this.band.fans += fanGain;
        this.band.money += payBonus;
        this.band.totalEarnings += payBonus;
        this.band.fame += fameGain;
        this.band.energy -= selectedGig.energy;
        this.band.gigsPlayed++;
        this.band.day++;
        
        if (fanGain > selectedGig.fans * 0.8) {
            this.terminal.println(ANSIParser.fg('bright-cyan') + '  ★★★ AMAZING PERFORMANCE! ★★★' + ANSIParser.reset());
            this.band.fame += 5;
        } else if (fanGain > selectedGig.fans * 0.5) {
            this.terminal.println(ANSIParser.fg('bright-green') + '  ★★ Great show! ★★' + ANSIParser.reset());
        }
        
        this.terminal.println('');
        this.terminal.println('  Press any key to continue...');
        await this.terminal.input();
    }

    async recordAlbum() {
        // Safety check for band object
        if (!this.band) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Error: Band data not loaded. Please restart the game.' + ANSIParser.reset());
            await this.terminal.sleep(2000);
            return;
        }
        
        if (this.band.money < 5000) {
            this.terminal.println(ANSIParser.fg('bright-red') + '\n  You need at least $5,000 to record an album!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
            return;
        }
        
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '\n  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  RECORD AN ALBUM' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println('');
        
        const studios = [
            { name: 'Basement Studio', cost: 5000, quality: 50, fans: 1000 },
            { name: 'Professional Studio', cost: 10000, quality: 75, fans: 3000 },
            { name: 'Legendary Studio', cost: 25000, quality: 95, fans: 8000 }
        ];
        
        for (let i = 0; i < studios.length; i++) {
            const studio = studios[i];
            this.terminal.println(ANSIParser.fg('bright-yellow') + `  [${i + 1}] ${studio.name}` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-white') + `      Cost: $${(studio.cost || 0).toLocaleString()} | Quality: ${studio.quality || 0}% | Estimated Fans: ${(studio.fans || 0).toLocaleString()}` + ANSIParser.reset());
            this.terminal.println('');
        }
        
        this.terminal.println(ANSIParser.fg('bright-red') + '  [0] Cancel' + ANSIParser.reset());
        this.terminal.println('');
        
        const choice = await this.terminal.input('  Select studio: ');
        
        if (choice === '0') return;
        
        const studioIndex = parseInt(choice) - 1;
        if (studioIndex < 0 || studioIndex >= studios.length) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Invalid choice!' + ANSIParser.reset());
            await this.terminal.sleep(1500);
            return;
        }
        
        const selectedStudio = studios[studioIndex];
        
        // Safety check for selectedStudio
        if (!selectedStudio) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Invalid studio selection!' + ANSIParser.reset());
            await this.terminal.sleep(1500);
            return;
        }
        
        if (this.band.money < selectedStudio.cost) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  You don\'t have enough money!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
            return;
        }
        
        this.band.money -= selectedStudio.cost;
        
        const albumQuality = Math.floor((this.band.skill + selectedStudio.quality) / 2);
        const fanGain = Math.floor(selectedStudio.fans * (albumQuality / 100));
        const sales = Math.floor(fanGain * 2);
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  ALBUM RELEASE' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + `  Album Quality: ${albumQuality}%` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + `  New Fans: ${(fanGain || 0).toLocaleString()}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + `  Album Sales: $${(sales || 0).toLocaleString()}` + ANSIParser.reset());
        this.terminal.println('');
        
        this.band.fans += fanGain;
        this.band.money += sales;
        this.band.fame += Math.floor(fanGain / 100);
        this.band.albums++;
        this.band.day++;
        
        if (albumQuality >= 90) {
            this.terminal.println(ANSIParser.fg('bright-cyan') + '  ★★★ CRITICAL ACCLAIM! ★★★' + ANSIParser.reset());
            this.band.fame += 10;
        } else if (albumQuality >= 75) {
            this.terminal.println(ANSIParser.fg('bright-green') + '  ★★ Great album! ★★' + ANSIParser.reset());
        }
        
        this.terminal.println('');
        this.terminal.println('  Press any key to continue...');
        await this.terminal.input();
    }

    async practice() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '\n  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  PRACTICE' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println('');
        
        // Safety check for band object
        if (!this.band) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Error: Band data not loaded. Please restart the game.' + ANSIParser.reset());
            await this.terminal.sleep(2000);
            return;
        }
        this.terminal.println('  Practice improves your band\'s skill!');
        this.terminal.println('');
        
        const skillGain = Math.floor(Math.random() * 5) + 3;
        const energyCost = 10;
        
        if (this.band.energy < energyCost) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Your band is too tired to practice!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
            return;
        }
        
        this.band.skill = Math.min(100, this.band.skill + skillGain);
        this.band.energy -= energyCost;
        this.band.day++;
        
        this.terminal.println(ANSIParser.fg('bright-green') + `  Skill increased by ${skillGain}%!` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + `  New skill level: ${this.band.skill}%` + ANSIParser.reset());
        this.terminal.println('');
        
        if (this.band.skill >= 100) {
            this.terminal.println(ANSIParser.fg('bright-cyan') + '  ★★★ MASTER MUSICIANS! ★★★' + ANSIParser.reset());
        }
        
        this.terminal.println('');
        this.terminal.println('  Press any key to continue...');
        await this.terminal.input();
    }

    async manageBand() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '\n  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  MANAGE BAND' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println('');
        
        // Safety check for band object
        if (!this.band) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Error: Band data not loaded. Please restart the game.' + ANSIParser.reset());
            await this.terminal.sleep(2000);
            return;
        }
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [1] Rest (Restore Energy)' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [2] Fire Member (Costs $500)' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [3] Hire Member (Costs $1000)' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-red') + '  [0] Back' + ANSIParser.reset());
        this.terminal.println('');
        
        const choice = await this.terminal.input('  Your choice: ');
        
        if (choice === '1') {
            if (this.band.energy >= 100) {
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  Your band is already well-rested!' + ANSIParser.reset());
            } else {
                this.band.energy = 100;
                this.band.day++;
                this.terminal.println(ANSIParser.fg('bright-green') + '  Your band is fully rested!' + ANSIParser.reset());
            }
            await this.terminal.sleep(1500);
        } else if (choice === '2') {
            if (this.band.members <= 3) {
                this.terminal.println(ANSIParser.fg('bright-red') + '  You need at least 3 members!' + ANSIParser.reset());
            } else if (this.band.money < 500) {
                this.terminal.println(ANSIParser.fg('bright-red') + '  You need $500 to fire a member!' + ANSIParser.reset());
            } else {
                this.band.members--;
                this.band.money -= 500;
                this.terminal.println(ANSIParser.fg('bright-green') + '  Member fired. Current members: ' + this.band.members + ANSIParser.reset());
            }
            await this.terminal.sleep(1500);
        } else if (choice === '3') {
            if (this.band.members >= 5) {
                this.terminal.println(ANSIParser.fg('bright-red') + '  You already have the maximum number of members!' + ANSIParser.reset());
            } else if (this.band.money < 1000) {
                this.terminal.println(ANSIParser.fg('bright-red') + '  You need $1,000 to hire a new member!' + ANSIParser.reset());
            } else {
                this.band.members++;
                this.band.money -= 1000;
                this.terminal.println(ANSIParser.fg('bright-green') + '  New member hired! Current members: ' + this.band.members + ANSIParser.reset());
            }
            await this.terminal.sleep(1500);
        }
    }

    async viewLeaderboard() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '\n  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  LEADERBOARD' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println('');
        
        try {
            const response = await fetch('/api/game-state/rock-star/leaderboard');
            const leaderboard = await response.json();
            
            if (leaderboard.length === 0) {
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  No other bands yet!' + ANSIParser.reset());
            } else {
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  Rank  Band Name              Fans        Fame' + ANSIParser.reset());
                this.terminal.println(ANSIParser.fg('bright-white') + '  ────────────────────────────────────────────────────' + ANSIParser.reset());
                
                leaderboard.forEach((entry, index) => {
                    const rank = (index + 1).toString().padStart(2);
                    const name = entry.bandName.padEnd(20);
                    const fans = (entry.fans || 0).toLocaleString().padStart(10);
                    const fame = entry.fame.toString().padStart(5);
                    this.terminal.println(ANSIParser.fg('bright-green') + `  ${rank}.  ${name}  ${fans}  ${fame}` + ANSIParser.reset());
                });
            }
        } catch (error) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Could not load leaderboard.' + ANSIParser.reset());
        }
        
        this.terminal.println('');
        this.terminal.println('  Press any key to continue...');
        await this.terminal.input();
    }

    async buyEquipment() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '\n  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  BUY EQUIPMENT' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println('');
        
        // Safety check for band object
        if (!this.band) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Error: Band data not loaded. Please restart the game.' + ANSIParser.reset());
            await this.terminal.sleep(2000);
            return;
        }
        
        const upgrades = [
            { name: 'Better Guitars', cost: 2000, quality: 1 },
            { name: 'Pro Drums', cost: 3000, quality: 1 },
            { name: 'Power Amps', cost: 2500, quality: 1 },
            { name: 'Studio Mics', cost: 2000, quality: 1 },
            { name: 'Lighting System', cost: 5000, quality: 2 },
            { name: 'Sound System', cost: 10000, quality: 3 }
        ];
        
        for (let i = 0; i < upgrades.length; i++) {
            const upgrade = upgrades[i];
            this.terminal.println(ANSIParser.fg('bright-yellow') + `  [${i + 1}] ${upgrade.name}` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-white') + `      Cost: $${(upgrade.cost || 0).toLocaleString()} | Quality +${upgrade.quality || 0}` + ANSIParser.reset());
            this.terminal.println('');
        }
        
        this.terminal.println(ANSIParser.fg('bright-red') + '  [0] Back' + ANSIParser.reset());
        this.terminal.println('');
        
        const choice = await this.terminal.input('  Select equipment: ');
        
        if (choice === '0') return;
        
        const upgradeIndex = parseInt(choice) - 1;
        if (upgradeIndex < 0 || upgradeIndex >= upgrades.length) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Invalid choice!' + ANSIParser.reset());
            await this.terminal.sleep(1500);
            return;
        }
        
        const selectedUpgrade = upgrades[upgradeIndex];
        
        // Safety check for selectedUpgrade
        if (!selectedUpgrade) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Invalid equipment selection!' + ANSIParser.reset());
            await this.terminal.sleep(1500);
            return;
        }
        
        if (this.band.money < selectedUpgrade.cost) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  You don\'t have enough money!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
            return;
        }
        
        this.band.money -= selectedUpgrade.cost;
        this.band.equipmentQuality += selectedUpgrade.quality;
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + `  ${selectedUpgrade.name} purchased!` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + `  New equipment quality: ${this.getQualityName(this.band.equipmentQuality)}` + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println('  Press any key to continue...');
        await this.terminal.input();
    }

    async viewStats() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '\n  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  BAND STATISTICS' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-yellow') + `  Band Name: ${this.band.name}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + `  Members: ${this.band.members}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + `  Days Active: ${this.band.day}` + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + `  Total Fans: ${(this.band.fans || 0).toLocaleString()}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + `  Albums Released: ${this.band.albums}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + `  Gigs Played: ${this.band.gigsPlayed}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + `  Total Earnings: $${(this.band.totalEarnings || 0).toLocaleString()}` + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-cyan') + `  Current Fame: ${this.band.fame}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + `  Current Skill: ${this.band.skill}%` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + `  Equipment Quality: ${this.getQualityName(this.band.equipmentQuality)}` + ANSIParser.reset());
        this.terminal.println('');
        
        // Calculate achievements
        const achievements = [];
        if (this.band.fans >= 100000) achievements.push('★ Rock Legend ★');
        if (this.band.fame >= 1000) achievements.push('★ Superstar ★');
        if (this.band.albums >= 10) achievements.push('★ Prolific Artist ★');
        if (this.band.gigsPlayed >= 50) achievements.push('★ Touring Veteran ★');
        
        if (achievements.length > 0) {
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  Achievements:' + ANSIParser.reset());
            achievements.forEach(achievement => {
                this.terminal.println(ANSIParser.fg('bright-cyan') + `    ${achievement}` + ANSIParser.reset());
            });
        }
        
        this.terminal.println('');
        this.terminal.println('  Press any key to continue...');
        await this.terminal.input();
    }

    getQualityName(quality) {
        if (quality <= 1) return 'Basic';
        if (quality <= 3) return 'Good';
        if (quality <= 5) return 'Professional';
        if (quality <= 8) return 'Studio Quality';
        return 'Legendary';
    }

    async loadGameState() {
        console.log('🔍 DEBUG: Starting loadGameState()');
        try {
            console.log('🔍 DEBUG: Fetching from /api/game-state/rock-star');
            const response = await fetch('/api/game-state/rock-star');
            console.log('🔍 DEBUG: Response status:', response.status, response.statusText);
            
            if (!response.ok) {
                console.log('🔍 DEBUG: No saved game found, status:', response.status);
                throw new Error('No saved game');
            }
            
            const data = await response.json();
            console.log('🔍 DEBUG: Loaded data:', data);
            
            // Check if this is a valid saved game (not just default data)
            if (data.game_data) {
                const parsedData = JSON.parse(data.game_data);
                console.log('🔍 DEBUG: Parsed game data:', parsedData);
                
                // Load the saved game data (even if name is "Unknown Band")
                if (parsedData) {
                    // Validate and ensure all required properties exist
                    this.band = {
                        name: parsedData.name || 'Unknown Band',
                        members: parsedData.members || 3,
                        fans: parsedData.fans || 0,
                        money: parsedData.money || 1000,
                        fame: parsedData.fame || 0,
                        skill: parsedData.skill || 50,
                        energy: parsedData.energy || 100,
                        albums: parsedData.albums || 0,
                        gigsPlayed: parsedData.gigsPlayed || 0,
                        totalEarnings: parsedData.totalEarnings || 0,
                        equipment: parsedData.equipment || {
                            guitars: 2,
                            drums: 1,
                            amps: 2,
                            microphones: 2
                        },
                        equipmentQuality: parsedData.equipmentQuality || 1,
                        day: parsedData.day || 1
                    };
                    
                    console.log('🔍 DEBUG: Band object created from saved data:', this.band);
                    
                    // Show that saved game was loaded
                    this.terminal.println(ANSIParser.fg('bright-green') + '  ✓ Saved game loaded successfully!' + ANSIParser.reset());
                    await this.terminal.sleep(1000);
                } else {
                    console.log('🔍 DEBUG: Invalid saved game (Unknown Band), starting new game');
                    throw new Error('Invalid saved game');
                }
            } else {
                console.log('🔍 DEBUG: No game_data in response, starting new game');
                throw new Error('No game data');
            }
        } catch (error) {
            console.log('🔍 DEBUG: Error loading game state:', error);
            console.log('Starting new game');
            this.band = null; // Ensure it's null so createBand() will be called
        }
    }

    startAutoSave() {
        // Auto-save every 2 minutes (120,000 ms)
        this.autoSaveInterval = setInterval(() => {
            if (this.band) {
                this.autoSave();
            }
        }, 120000);
    }
    
    stopAutoSave() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
            this.autoSaveInterval = null;
        }
    }
    
    async autoSave() {
        console.log('🔍 DEBUG: Auto-save triggered');
        if (!this.band) {
            console.log('🔍 DEBUG: No band object, skipping auto-save');
            return;
        }
        
        console.log('🔍 DEBUG: Auto-saving band data:', this.band);
        
        try {
            const response = await fetch('/api/game-state/rock-star', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(this.band)
            });
            
            console.log('🔍 DEBUG: Auto-save response status:', response.status, response.statusText);
            
            if (response.ok) {
                console.log('🔍 DEBUG: Auto-save completed successfully');
            } else {
                console.log('🔍 DEBUG: Auto-save failed with status:', response.status);
                const errorText = await response.text();
                console.log('🔍 DEBUG: Auto-save error response:', errorText);
            }
        } catch (error) {
            console.error('🔍 DEBUG: Auto-save error:', error);
        }
    }

    async saveGameState() {
        console.log('🔍 DEBUG: saveGameState() called');
        if (!this.band) {
            console.log('🔍 DEBUG: No band object, cannot save');
            return;
        }
        
        console.log('🔍 DEBUG: Band object to save:', this.band);
        
        try {
            // Show saving indicator
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  Saving progress...' + ANSIParser.reset());
            
            console.log('🔍 DEBUG: Sending POST request to /api/game-state/rock-star');
            const response = await fetch('/api/game-state/rock-star', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(this.band)
            });
            
            console.log('🔍 DEBUG: Save response status:', response.status, response.statusText);
            
            if (response.ok) {
                console.log('🔍 DEBUG: Save successful');
                this.terminal.println(ANSIParser.fg('bright-green') + '  Progress saved!' + ANSIParser.reset());
            } else {
                console.log('🔍 DEBUG: Save failed with status:', response.status);
                const errorText = await response.text();
                console.log('🔍 DEBUG: Save error response:', errorText);
                this.terminal.println(ANSIParser.fg('bright-red') + '  Save failed! Status: ' + response.status + ANSIParser.reset());
            }
        } catch (error) {
            console.error('🔍 DEBUG: Error saving game state:', error);
            this.terminal.println(ANSIParser.fg('bright-red') + '  Save error: ' + error.message + ANSIParser.reset());
        }
    }
}

// Export for use in other modules
window.RockStar = RockStar;

