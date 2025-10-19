// CYBER ARENA - Epic Multiplayer Arena Combat Game
// Real-time multiplayer PvP combat with power-ups, special abilities, and team battles!

class CyberArena {
    constructor(terminal, socketClient, authManager) {
        this.terminal = terminal;
        this.socketClient = socketClient;
        this.authManager = authManager;
        this.player = null;
        this.arena = null;
        this.gameState = null;
        this.abilities = [
            { name: 'Fire Blast', damage: 20, cooldown: 3, cost: 10 },
            { name: 'Ice Freeze', damage: 15, cooldown: 2, cost: 8, effect: 'freeze' },
            { name: 'Lightning Strike', damage: 25, cooldown: 4, cost: 15 },
            { name: 'Heal', damage: 0, healing: 30, cooldown: 5, cost: 20 }
        ];
        this.powerUps = [
            { name: 'Damage Boost', effect: 'damage', value: 1.5, duration: 5 },
            { name: 'Speed Boost', effect: 'speed', value: 2, duration: 5 },
            { name: 'Shield', effect: 'shield', value: 50, duration: 3 }
        ];
    }

    async play() {
        this.terminal.clear();
        await this.showIntroAnimation();
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
                await this.enterArena();
            } else if (choice === '2') {
                await this.viewProfile();
            } else if (choice === '3') {
                await this.viewLeaderboard();
            } else if (choice === '4') {
                await this.viewAbilities();
            } else if (choice === '5') {
                await this.customizeCharacter();
            }
        }
    }

    getTitleScreen() {
        return `
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║                          ⚡ CYBER ARENA ⚡                                     ║
║                                                                              ║
║                    Real-Time Multiplayer Arena Combat                          ║
║                                                                              ║
║                 Enter the arena and prove your dominance!                      ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
`;
    }

    async createPlayer() {
        this.terminal.println(ANSIParser.fg('bright-cyan') + '\n  Welcome to CYBER ARENA!' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println('  You are a cyber warrior entering the arena.');
        this.terminal.println('  Fight other players in real-time combat!');
        this.terminal.println('');
        
        const playerName = await this.terminal.input('  Enter your warrior name: ');
        
        this.player = {
            name: playerName,
            level: 1,
            experience: 0,
            hp: 100,
            maxHp: 100,
            energy: 50,
            maxEnergy: 50,
            damage: 10,
            defense: 5,
            speed: 10,
            wins: 0,
            losses: 0,
            kills: 0,
            deaths: 0,
            money: 100,
            equipped: {
                weapon: 'Basic Blaster',
                armor: 'Basic Suit',
                special: 'None'
            },
            inventory: {
                weapons: ['Basic Blaster'],
                armor: ['Basic Suit'],
                specials: []
            }
        };
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + `  Welcome to the arena, ${playerName}!` + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println('  Press any key to continue...');
        await this.terminal.input();
    }

    async mainMenu() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-yellow') + this.getTitleScreen() + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-cyan') + `  Warrior: ${this.player.name}  |  Level: ${this.player.level}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + `  Wins: ${this.player.wins}  |  Losses: ${this.player.losses}  |  K/D: ${this.player.kills}/${this.player.deaths}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + `  Money: $${this.player.money}  |  Experience: ${this.player.experience}/${this.getExpNeeded()}` + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [1] Enter Arena (Quick Match)' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [2] View Profile & Stats' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [3] View Leaderboard' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [4] View Abilities' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [5] Customize Character' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-red') + '  [Q] Quit Game' + ANSIParser.reset());
        this.terminal.println('');
        
        const choice = await this.terminal.input('  Your choice: ');
        return choice.toUpperCase();
    }

    async enterArena() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ENTERING ARENA' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println('');
        
        try {
            const response = await fetch('/api/users/online', {
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const onlineUsers = await response.json();
            const currentUser = this.authManager.getCurrentUser();
            
            // Filter out current user
            const opponents = onlineUsers.filter(u => u.id !== currentUser.id);
            
            if (opponents.length === 0) {
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  No other players online to fight!' + ANSIParser.reset());
                this.terminal.println('');
                this.terminal.println('  Press any key to continue...');
                await this.terminal.input();
                return;
            }
            
            this.terminal.println(ANSIParser.fg('bright-white') + '  Select opponent:' + ANSIParser.reset());
            this.terminal.println('');
            
            opponents.forEach((user, index) => {
                this.terminal.println(ANSIParser.fg('bright-green') + `  [${index + 1}] ${user.handle}` + ANSIParser.reset());
            });
            
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-red') + '  [0] Cancel' + ANSIParser.reset());
            this.terminal.println('');
            
            const choice = await this.terminal.input('  Select opponent: ');
            
            if (choice === '0') return;
            
            const opponentIndex = parseInt(choice) - 1;
            if (opponentIndex >= 0 && opponentIndex < opponents.length) {
                const opponent = opponents[opponentIndex];
                await this.startArenaBattle(opponent);
            } else {
                this.terminal.println(ANSIParser.fg('bright-red') + '  Invalid selection!' + ANSIParser.reset());
                await this.terminal.sleep(1500);
            }
        } catch (error) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Error loading online players!' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-yellow') + `  ${error.message}` + ANSIParser.reset());
            this.terminal.println('');
            this.terminal.println('  Press any key to continue...');
            await this.terminal.input();
        }
    }

    async startArenaBattle(opponent) {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + `  ARENA BATTLE: ${this.player.name} vs ${opponent.handle}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println('');
        
        // Send challenge
        if (window.socketClient && window.socketClient.socket) {
            window.socketClient.socket.emit('arena-challenge', {
                targetUserId: opponent.id,
                challengerHandle: this.player.name,
                challengerStats: {
                    hp: this.player.hp,
                    maxHp: this.player.maxHp,
                    energy: this.player.energy,
                    maxEnergy: this.player.maxEnergy,
                    damage: this.player.damage,
                    defense: this.player.defense,
                    speed: this.player.speed,
                    level: this.player.level
                }
            });
            
            this.terminal.println(ANSIParser.fg('bright-green') + `  Challenge sent to ${opponent.handle}!` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-white') + '  Waiting for response...' + ANSIParser.reset());
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  (Press any key to cancel)' + ANSIParser.reset());
            
            // Wait for response
            const timeout = setTimeout(() => {
                this.terminal.println('');
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  Challenge timed out.' + ANSIParser.reset());
                this.terminal.println('  Press any key to continue...');
                this.terminal.input();
            }, 30000);
            
            // Listen for challenge response
            const responseHandler = (data) => {
                clearTimeout(timeout);
                window.socketClient.socket.off('arena-challenge-response', responseHandler);
                
                if (data.accepted) {
                    this.terminal.println('');
                    this.terminal.println(ANSIParser.fg('bright-green') + `  ${opponent.handle} accepted your challenge!` + ANSIParser.reset());
                    this.terminal.println('');
                    this.terminal.println('  Press any key to start battle...');
                    this.terminal.input().then(() => {
                        this.beginArenaCombat(opponent, data.opponentStats);
                    });
                } else {
                    this.terminal.println('');
                    this.terminal.println(ANSIParser.fg('bright-red') + `  ${opponent.handle} declined your challenge.` + ANSIParser.reset());
                    this.terminal.println('');
                    this.terminal.println('  Press any key to continue...');
                    this.terminal.input();
                }
            };
            
            window.socketClient.socket.on('arena-challenge-response', responseHandler);
        } else {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Error: Socket connection not available!' + ANSIParser.reset());
            this.terminal.println('');
            this.terminal.println('  Press any key to continue...');
            await this.terminal.input();
        }
    }

    async beginArenaCombat(opponent, opponentStats) {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  ⚡ ARENA COMBAT ⚡' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println('');
        
        let playerHp = this.player.hp;
        let playerEnergy = this.player.energy;
        let opponentHp = opponentStats.hp;
        let opponentEnergy = opponentStats.energy;
        
        let turn = 0;
        let playerPowerUp = null;
        let opponentPowerUp = null;
        
        while (playerHp > 0 && opponentHp > 0) {
            turn++;
            this.terminal.clear();
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  ════════════════════════════════════════' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-yellow') + `  ⚡ ROUND ${turn} ⚡` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  ════════════════════════════════════════' + ANSIParser.reset());
            this.terminal.println('');
            
            // Display stats
            this.terminal.println(ANSIParser.fg('bright-green') + `  ${this.player.name}: HP ${playerHp}/${this.player.maxHp} | Energy ${playerEnergy}/${this.player.maxEnergy}` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-red') + `  ${opponent.handle}: HP ${opponentHp}/${opponentStats.maxHp} | Energy ${opponentEnergy}/${opponentStats.maxEnergy}` + ANSIParser.reset());
            this.terminal.println('');
            
            // Player's turn
            this.terminal.println(ANSIParser.fg('bright-cyan') + '  Your turn!' + ANSIParser.reset());
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-white') + '  [1] Attack (Basic)' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-white') + '  [2] Fire Blast (20 dmg, 10 energy)' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-white') + '  [3] Ice Freeze (15 dmg, 8 energy)' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-white') + '  [4] Lightning Strike (25 dmg, 15 energy)' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-white') + '  [5] Heal (+30 HP, 20 energy)' + ANSIParser.reset());
            this.terminal.println('');
            
            const action = await this.terminal.input('  Your action: ');
            
            let playerDamage = 0;
            let playerHealing = 0;
            
            if (action === '1') {
                // Basic attack
                playerDamage = this.player.damage + Math.floor(Math.random() * 5);
                this.terminal.println(ANSIParser.fg('bright-green') + `  You attack for ${playerDamage} damage!` + ANSIParser.reset());
            } else if (action === '2' && playerEnergy >= 10) {
                // Fire Blast
                playerEnergy -= 10;
                playerDamage = 20 + Math.floor(Math.random() * 5);
                this.terminal.println(ANSIParser.fg('bright-red') + `  🔥 FIRE BLAST! ${playerDamage} damage!` + ANSIParser.reset());
            } else if (action === '3' && playerEnergy >= 8) {
                // Ice Freeze
                playerEnergy -= 8;
                playerDamage = 15 + Math.floor(Math.random() * 5);
                this.terminal.println(ANSIParser.fg('bright-cyan') + `  ❄️ ICE FREEZE! ${playerDamage} damage!` + ANSIParser.reset());
            } else if (action === '4' && playerEnergy >= 15) {
                // Lightning Strike
                playerEnergy -= 15;
                playerDamage = 25 + Math.floor(Math.random() * 5);
                this.terminal.println(ANSIParser.fg('bright-yellow') + `  ⚡ LIGHTNING STRIKE! ${playerDamage} damage!` + ANSIParser.reset());
            } else if (action === '5' && playerEnergy >= 20) {
                // Heal
                playerEnergy -= 20;
                playerHealing = 30;
                playerHp = Math.min(this.player.maxHp, playerHp + playerHealing);
                this.terminal.println(ANSIParser.fg('bright-green') + `  💚 HEAL! +${playerHealing} HP!` + ANSIParser.reset());
            } else {
                this.terminal.println(ANSIParser.fg('bright-red') + '  Not enough energy or invalid action!' + ANSIParser.reset());
                await this.terminal.sleep(1500);
                continue;
            }
            
            // Apply damage
            if (playerDamage > 0) {
                opponentHp -= playerDamage;
                this.terminal.println(ANSIParser.fg('bright-green') + `  ${opponent.handle} takes ${playerDamage} damage!` + ANSIParser.reset());
            }
            
            // Regen energy
            playerEnergy = Math.min(this.player.maxEnergy, playerEnergy + 5);
            
            if (opponentHp <= 0) {
                this.terminal.println('');
                this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
                this.terminal.println(ANSIParser.fg('bright-cyan') + '  ⚡ VICTORY! ⚡' + ANSIParser.reset());
                this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
                this.terminal.println('');
                this.terminal.println(ANSIParser.fg('bright-green') + `  You defeated ${opponent.handle}!` + ANSIParser.reset());
                
                const expReward = 50 + (opponentStats.level * 10);
                const moneyReward = 100 + (opponentStats.level * 20);
                
                this.player.experience += expReward;
                this.player.money += moneyReward;
                this.player.wins++;
                this.player.kills++;
                
                this.terminal.println(ANSIParser.fg('bright-yellow') + `  Experience gained: ${expReward}` + ANSIParser.reset());
                this.terminal.println(ANSIParser.fg('bright-yellow') + `  Money gained: $${moneyReward}` + ANSIParser.reset());
                
                this.checkLevelUp();
                break;
            }
            
            // Opponent's turn (AI)
            await this.terminal.sleep(1000);
            
            const opponentAction = Math.floor(Math.random() * 5) + 1;
            let opponentDamage = 0;
            let opponentHealing = 0;
            
            if (opponentAction === 1) {
                // Basic attack
                opponentDamage = opponentStats.damage + Math.floor(Math.random() * 5);
                this.terminal.println(ANSIParser.fg('bright-red') + `  ${opponent.handle} attacks for ${opponentDamage} damage!` + ANSIParser.reset());
            } else if (opponentAction === 2 && opponentEnergy >= 10) {
                // Fire Blast
                opponentEnergy -= 10;
                opponentDamage = 20 + Math.floor(Math.random() * 5);
                this.terminal.println(ANSIParser.fg('bright-red') + `  ${opponent.handle} uses FIRE BLAST! ${opponentDamage} damage!` + ANSIParser.reset());
            } else if (opponentAction === 3 && opponentEnergy >= 8) {
                // Ice Freeze
                opponentEnergy -= 8;
                opponentDamage = 15 + Math.floor(Math.random() * 5);
                this.terminal.println(ANSIParser.fg('bright-cyan') + `  ${opponent.handle} uses ICE FREEZE! ${opponentDamage} damage!` + ANSIParser.reset());
            } else if (opponentAction === 4 && opponentEnergy >= 15) {
                // Lightning Strike
                opponentEnergy -= 15;
                opponentDamage = 25 + Math.floor(Math.random() * 5);
                this.terminal.println(ANSIParser.fg('bright-yellow') + `  ${opponent.handle} uses LIGHTNING STRIKE! ${opponentDamage} damage!` + ANSIParser.reset());
            } else if (opponentAction === 5 && opponentEnergy >= 20 && opponentHp < opponentStats.maxHp * 0.5) {
                // Heal
                opponentEnergy -= 20;
                opponentHealing = 30;
                opponentHp = Math.min(opponentStats.maxHp, opponentHp + opponentHealing);
                this.terminal.println(ANSIParser.fg('bright-green') + `  ${opponent.handle} heals for ${opponentHealing} HP!` + ANSIParser.reset());
            } else {
                // Basic attack as fallback
                opponentDamage = opponentStats.damage + Math.floor(Math.random() * 5);
                this.terminal.println(ANSIParser.fg('bright-red') + `  ${opponent.handle} attacks for ${opponentDamage} damage!` + ANSIParser.reset());
            }
            
            // Apply damage
            if (opponentDamage > 0) {
                playerHp -= opponentDamage;
                this.terminal.println(ANSIParser.fg('bright-red') + `  You take ${opponentDamage} damage!` + ANSIParser.reset());
            }
            
            // Regen energy
            opponentEnergy = Math.min(opponentStats.maxEnergy, opponentEnergy + 5);
            
            if (playerHp <= 0) {
                this.terminal.println('');
                this.terminal.println(ANSIParser.fg('bright-red') + '  ════════════════════════════════════════' + ANSIParser.reset());
                this.terminal.println(ANSIParser.fg('bright-red') + '  ⚡ DEFEAT! ⚡' + ANSIParser.reset());
                this.terminal.println(ANSIParser.fg('bright-red') + '  ════════════════════════════════════════' + ANSIParser.reset());
                this.terminal.println('');
                this.terminal.println(ANSIParser.fg('bright-red') + `  ${opponent.handle} defeated you!` + ANSIParser.reset());
                
                this.player.money = Math.max(0, this.player.money - 50);
                this.player.losses++;
                this.player.deaths++;
                break;
            }
            
            await this.terminal.sleep(2000);
        }
        
        this.terminal.println('');
        this.terminal.println('  Press any key to continue...');
        await this.terminal.input();
    }

    async viewProfile() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  WARRIOR PROFILE' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-yellow') + `  Name: ${this.player.name}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + `  Level: ${this.player.level}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + `  Experience: ${this.player.experience}/${this.getExpNeeded()}` + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + `  Wins: ${this.player.wins}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-red') + `  Losses: ${this.player.losses}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + `  Kills: ${this.player.kills}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-red') + `  Deaths: ${this.player.deaths}` + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-white') + `  HP: ${this.player.hp}/${this.player.maxHp}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + `  Energy: ${this.player.energy}/${this.player.maxEnergy}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + `  Damage: ${this.player.damage}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + `  Defense: ${this.player.defense}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + `  Speed: ${this.player.speed}` + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-yellow') + `  Money: $${this.player.money}` + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println('  Press any key to continue...');
        await this.terminal.input();
    }

    async viewLeaderboard() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ARENA LEADERBOARD' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println('');
        
        try {
            const response = await fetch('/api/game-state/cyber-arena/leaderboard', {
                credentials: 'include'
            });
            const leaderboard = await response.json();
            
            if (leaderboard.length === 0) {
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  No warriors yet!' + ANSIParser.reset());
            } else {
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  Rank  Warrior Name        Level  Wins  K/D Ratio' + ANSIParser.reset());
                this.terminal.println(ANSIParser.fg('bright-white') + '  ────────────────────────────────────────────────────' + ANSIParser.reset());
                
                leaderboard.forEach((entry, index) => {
                    const rank = (index + 1).toString().padStart(2);
                    const name = entry.playerName.padEnd(20);
                    const level = entry.level.toString().padStart(5);
                    const wins = entry.wins.toString().padStart(4);
                    const kd = `${entry.kills}/${entry.deaths}`.padStart(8);
                    this.terminal.println(ANSIParser.fg('bright-green') + `  ${rank}.  ${name}  ${level}  ${wins}  ${kd}` + ANSIParser.reset());
                });
            }
        } catch (error) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Could not load leaderboard.' + ANSIParser.reset());
        }
        
        this.terminal.println('');
        this.terminal.println('  Press any key to continue...');
        await this.terminal.input();
    }

    async viewAbilities() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ABILITIES & SKILLS' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println('');
        
        this.abilities.forEach((ability, index) => {
            this.terminal.println(ANSIParser.fg('bright-yellow') + `  [${index + 1}] ${ability.name}` + ANSIParser.reset());
            if (ability.damage > 0) {
                this.terminal.println(ANSIParser.fg('bright-white') + `      Damage: ${ability.damage}` + ANSIParser.reset());
            }
            if (ability.healing > 0) {
                this.terminal.println(ANSIParser.fg('bright-white') + `      Healing: ${ability.healing}` + ANSIParser.reset());
            }
            this.terminal.println(ANSIParser.fg('bright-white') + `      Energy Cost: ${ability.cost}` + ANSIParser.reset());
            this.terminal.println('');
        });
        
        this.terminal.println('  Press any key to continue...');
        await this.terminal.input();
    }

    async customizeCharacter() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  CUSTOMIZE CHARACTER' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-yellow') + `  Money: $${this.player.money}` + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [1] Buy Weapon ($200)' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [2] Buy Armor ($200)' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [3] Upgrade Stats ($100 each)' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-red') + '  [0] Back' + ANSIParser.reset());
        this.terminal.println('');
        
        const choice = await this.terminal.input('  Your choice: ');
        
        if (choice === '1' && this.player.money >= 200) {
            this.player.money -= 200;
            this.player.damage += 5;
            this.terminal.println(ANSIParser.fg('bright-green') + '  Weapon purchased! +5 damage!' + ANSIParser.reset());
        } else if (choice === '2' && this.player.money >= 200) {
            this.player.money -= 200;
            this.player.defense += 3;
            this.player.maxHp += 20;
            this.terminal.println(ANSIParser.fg('bright-green') + '  Armor purchased! +3 defense, +20 max HP!' + ANSIParser.reset());
        } else if (choice === '3' && this.player.money >= 100) {
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-white') + '  [1] +5 Damage' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-white') + '  [2] +3 Defense' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-white') + '  [3] +10 Max HP' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-white') + '  [4] +5 Max Energy' + ANSIParser.reset());
            this.terminal.println('');
            const upgrade = await this.terminal.input('  Select upgrade: ');
            
            if (upgrade === '1') {
                this.player.money -= 100;
                this.player.damage += 5;
                this.terminal.println(ANSIParser.fg('bright-green') + '  +5 damage!' + ANSIParser.reset());
            } else if (upgrade === '2') {
                this.player.money -= 100;
                this.player.defense += 3;
                this.terminal.println(ANSIParser.fg('bright-green') + '  +3 defense!' + ANSIParser.reset());
            } else if (upgrade === '3') {
                this.player.money -= 100;
                this.player.maxHp += 10;
                this.player.hp += 10;
                this.terminal.println(ANSIParser.fg('bright-green') + '  +10 max HP!' + ANSIParser.reset());
            } else if (upgrade === '4') {
                this.player.money -= 100;
                this.player.maxEnergy += 5;
                this.player.energy += 5;
                this.terminal.println(ANSIParser.fg('bright-green') + '  +5 max energy!' + ANSIParser.reset());
            }
        } else if (choice !== '0') {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Not enough money!' + ANSIParser.reset());
        }
        
        await this.terminal.sleep(2000);
    }

    getExpNeeded() {
        return this.player.level * 100;
    }

    checkLevelUp() {
        if (this.player.experience >= this.getExpNeeded()) {
            this.player.level++;
            this.player.experience = 0;
            this.player.maxHp += 20;
            this.player.hp = this.player.maxHp;
            this.player.maxEnergy += 10;
            this.player.energy = this.player.maxEnergy;
            this.player.damage += 3;
            this.player.defense += 2;
            
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-cyan') + '  ⚡ LEVEL UP! ⚡' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-cyan') + `  You are now level ${this.player.level}!` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-cyan') + '  All stats increased!' + ANSIParser.reset());
        }
    }

    async loadGameState() {
        try {
            const response = await fetch('/api/game-state/cyber-arena', {
                credentials: 'include'
            });
            if (!response.ok) throw new Error('No saved game');
            const data = await response.json();
            this.player = data;
        } catch (error) {
            console.log('Starting new game');
        }
    }

    async saveGameState() {
        if (!this.player) return;
        
        try {
            const response = await fetch('/api/game-state/cyber-arena', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(this.player)
            });
            
            if (!response.ok) {
                console.error('Failed to save game state:', response.status, response.statusText);
            }
        } catch (error) {
            console.error('Error saving game state:', error);
        }
    }

    async showIntroAnimation() {
        // Cyber matrix-style intro
        const matrixFrames = [
            '01010101010101010101010101010101010101010101010101',
            '10101010101010101010101010101010101010101010101010',
            '01010101010101010101010101010101010101010101010101',
            '10101010101010101010101010101010101010101010101010',
            '01010101010101010101010101010101010101010101010101',
            '10101010101010101010101010101010101010101010101010',
            '01010101010101010101010101010101010101010101010101',
            '10101010101010101010101010101010101010101010101010',
            '01010101010101010101010101010101010101010101010101',
            '10101010101010101010101010101010101010101010101010',
        ];

        for (let frame of matrixFrames) {
            this.terminal.clear();
            this.terminal.println(ANSIParser.fg('bright-green') + frame + ANSIParser.reset());
            await this.terminal.sleep(100);
        }

        // Cyber loading animation
        const loadingFrames = [
            '⚡ CYBER ARENA ⚡',
            '⚡ CYBER ARENA ⚡ INITIALIZING...',
            '⚡ CYBER ARENA ⚡ INITIALIZING... [██░░░░░░░░] 20%',
            '⚡ CYBER ARENA ⚡ INITIALIZING... [████░░░░░░] 40%',
            '⚡ CYBER ARENA ⚡ INITIALIZING... [██████░░░░] 60%',
            '⚡ CYBER ARENA ⚡ INITIALIZING... [████████░░] 80%',
            '⚡ CYBER ARENA ⚡ INITIALIZING... [██████████] 100%',
            '⚡ CYBER ARENA ⚡ READY FOR COMBAT! ⚡',
        ];

        for (let frame of loadingFrames) {
            this.terminal.clear();
            this.terminal.println(ANSIParser.fg('bright-cyan') + frame + ANSIParser.reset());
            await this.terminal.sleep(300);
        }

        // Combat preview animation
        const combatFrames = [
            '🤖 VS 🤖',
            '🤖 ⚔️  🤖',
            '🤖 ⚔️💥 🤖',
            '🤖 ⚔️💥💥🤖',
            '🤖 ⚔️💥💥💥🤖',
            '🤖 ⚔️💥💥💥💥🤖',
        ];

        for (let frame of combatFrames) {
            this.terminal.clear();
            this.terminal.println(ANSIParser.fg('bright-red') + frame + ANSIParser.reset());
            await this.terminal.sleep(200);
        }

        await this.terminal.sleep(500);
    }

    async showCombatAnimation(attacker, target, ability) {
        // Combat animation
        const combatFrames = [
            `🤖 ${attacker} ⚔️  🤖 ${target}`,
            `🤖 ${attacker} ⚔️💥 🤖 ${target}`,
            `🤖 ${attacker} ⚔️💥💥🤖 ${target}`,
            `🤖 ${attacker} ⚔️💥💥💥🤖 ${target}`,
        ];

        for (let frame of combatFrames) {
            this.terminal.clear();
            this.terminal.println(ANSIParser.fg('bright-red') + frame + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-yellow') + `  ${ability.name} hits for ${ability.damage} damage!` + ANSIParser.reset());
            await this.terminal.sleep(200);
        }
    }
}

// Export for use in other modules
window.CyberArena = CyberArena;


