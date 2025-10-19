// The Pit - PvP Combat Game
class ThePit {
    constructor(terminal, socketClient, authManager) {
        this.terminal = terminal;
        this.socketClient = socketClient;
        this.authManager = authManager;
        this.gameState = {
            level: 1,
            gold: 100,
            strength: 10,
            defense: 10,
            hp: 100,
            maxHp: 100,
            experience: 0,
            wins: 0,
            losses: 0
        };
        this.monsters = [
            { name: 'Goblin', strength: 5, defense: 3, hp: 30, gold: 20, exp: 10 },
            { name: 'Orc', strength: 8, defense: 5, hp: 50, gold: 40, exp: 25 },
            { name: 'Troll', strength: 12, defense: 8, hp: 80, gold: 70, exp: 50 },
            { name: 'Dragon', strength: 20, defense: 15, hp: 150, gold: 200, exp: 150 }
        ];
    }

    async play() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + this.getTitle() + ANSIParser.reset());
        this.terminal.println('');
        
        // Load game state
        await this.loadGameState();
        
        while (true) {
            this.terminal.clear();
            this.showStatus();
            this.terminal.println('');
            
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [F]' + ANSIParser.reset() + ' Fight a monster');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [P]' + ANSIParser.reset() + ' PvP - Fight another player');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [S]' + ANSIParser.reset() + ' Shop');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [H]' + ANSIParser.reset() + ' Heal at hospital');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [Q]' + ANSIParser.reset() + ' Quit game');
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
            
            const choice = (await this.terminal.input()).toLowerCase();
            
            if (choice === 'f') {
                await this.fight();
            } else if (choice === 'p') {
                await this.pvpFight();
            } else if (choice === 's') {
                await this.shop();
            } else if (choice === 'h') {
                await this.heal();
            } else if (choice === 'q') {
                await this.saveGameState();
                return 'doors';
            }
            
            // Check for death
            if (this.gameState.hp <= 0) {
                this.terminal.println('');
                this.terminal.println(ANSIParser.fg('bright-red') + '  YOU DIED!' + ANSIParser.reset());
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  You have been revived at the hospital.' + ANSIParser.reset());
                this.gameState.hp = this.gameState.maxHp;
                this.gameState.gold = Math.max(0, this.gameState.gold - 50);
                this.gameState.losses++;
                await this.terminal.sleep(3000);
            }
        }
    }

    async fight() {
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  Select opponent:' + ANSIParser.reset());
        this.terminal.println('');
        
        this.monsters.forEach((monster, index) => {
            this.terminal.println(ANSIParser.fg('bright-yellow') + `  [${index}]` + ANSIParser.reset() + 
                ` ${monster.name} - HP: ${monster.hp}, STR: ${monster.strength}, DEF: ${monster.defense}`);
        });
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
        const choice = parseInt(await this.terminal.input());
        
        if (choice >= 0 && choice < this.monsters.length) {
            const monster = { ...this.monsters[choice] };
            await this.combat(monster);
        }
    }

    async combat(monster) {
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-red') + `  Fighting ${monster.name}!` + ANSIParser.reset());
        this.terminal.println('');
        
        while (this.gameState.hp > 0 && monster.hp > 0) {
            // Player attacks
            const playerDamage = Math.max(1, this.gameState.strength - monster.defense + Math.floor(Math.random() * 5));
            monster.hp -= playerDamage;
            this.terminal.println(ANSIParser.fg('bright-green') + `  You attack for ${playerDamage} damage!` + ANSIParser.reset());
            
            if (monster.hp <= 0) break;
            
            // Monster attacks
            const monsterDamage = Math.max(1, monster.strength - this.gameState.defense + Math.floor(Math.random() * 5));
            this.gameState.hp -= monsterDamage;
            this.terminal.println(ANSIParser.fg('bright-red') + `  ${monster.name} attacks for ${monsterDamage} damage!` + ANSIParser.reset());
            
            this.terminal.println(ANSIParser.fg('bright-cyan') + `  Your HP: ${Math.max(0, this.gameState.hp)}/${this.gameState.maxHp}  |  ${monster.name} HP: ${Math.max(0, monster.hp)}` + ANSIParser.reset());
            this.terminal.println('');
            
            await this.terminal.sleep(1000);
        }
        
        if (this.gameState.hp > 0) {
            this.terminal.println(ANSIParser.fg('bright-green') + `  Victory! You defeated ${monster.name}!` + ANSIParser.reset());
            this.gameState.gold += monster.gold;
            this.gameState.experience += monster.exp;
            this.gameState.wins++;
            
            // Level up
            const expNeeded = this.gameState.level * 100;
            if (this.gameState.experience >= expNeeded) {
                this.gameState.level++;
                this.gameState.strength += 2;
                this.gameState.defense += 2;
                this.gameState.maxHp += 20;
                this.gameState.hp = this.gameState.maxHp;
                this.terminal.println(ANSIParser.fg('bright-yellow') + `  LEVEL UP! You are now level ${this.gameState.level}!` + ANSIParser.reset());
            }
        } else {
            this.terminal.println(ANSIParser.fg('bright-red') + `  Defeat! ${monster.name} has defeated you!` + ANSIParser.reset());
        }
        
        await this.terminal.sleep(3000);
    }

    async shop() {
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  Shop:' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [1]' + ANSIParser.reset() + ' Health Potion - 50 gold (Restore 50 HP)');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [2]' + ANSIParser.reset() + ' Strength Potion - 100 gold (+5 STR)');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [3]' + ANSIParser.reset() + ' Defense Potion - 100 gold (+5 DEF)');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [B]' + ANSIParser.reset() + ' Back');
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
        
        const choice = (await this.terminal.input()).toLowerCase();
        
        if (choice === '1' && this.gameState.gold >= 50) {
            this.gameState.gold -= 50;
            this.gameState.hp = Math.min(this.gameState.maxHp, this.gameState.hp + 50);
            this.terminal.println(ANSIParser.fg('bright-green') + '  Bought Health Potion!' + ANSIParser.reset());
        } else if (choice === '2' && this.gameState.gold >= 100) {
            this.gameState.gold -= 100;
            this.gameState.strength += 5;
            this.terminal.println(ANSIParser.fg('bright-green') + '  Bought Strength Potion!' + ANSIParser.reset());
        } else if (choice === '3' && this.gameState.gold >= 100) {
            this.gameState.gold -= 100;
            this.gameState.defense += 5;
            this.terminal.println(ANSIParser.fg('bright-green') + '  Bought Defense Potion!' + ANSIParser.reset());
        } else if (choice !== 'b') {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Cannot afford or invalid choice!' + ANSIParser.reset());
        }
        
        await this.terminal.sleep(2000);
    }

    async heal() {
        if (this.gameState.gold >= 100) {
            this.gameState.gold -= 100;
            this.gameState.hp = this.gameState.maxHp;
            this.terminal.println(ANSIParser.fg('bright-green') + '  Fully healed!' + ANSIParser.reset());
        } else {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Not enough gold! (Need 100 gold)' + ANSIParser.reset());
        }
        await this.terminal.sleep(2000);
    }

    showStatus() {
        this.terminal.println(ANSIParser.fg('bright-cyan') + '╔══════════════════════════════════════════════════════════════════════════════╗' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '║' + ANSIParser.reset() + 
            ANSIParser.fg('bright-white') + '  THE PIT - ARENA OF COMBAT' + ANSIParser.reset() + 
            ' '.repeat(51) + ANSIParser.fg('bright-cyan') + '║' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '╚══════════════════════════════════════════════════════════════════════════════╝' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + `  Level: ${this.gameState.level}  |  HP: ${this.gameState.hp}/${this.gameState.maxHp}  |  Gold: ${this.gameState.gold}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + `  Strength: ${this.gameState.strength}  |  Defense: ${this.gameState.defense}  |  Exp: ${this.gameState.experience}/${this.gameState.level * 100}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + `  Wins: ${this.gameState.wins}  |  Losses: ${this.gameState.losses}` + ANSIParser.reset());
    }

    async loadGameState() {
        try {
            const response = await fetch(`/api/game-state/the-pit`);
            const state = await response.json();
            if (state && state.game_data) {
                this.gameState = { ...this.gameState, ...JSON.parse(state.game_data) };
            }
        } catch (error) {
            // No saved game state yet, start fresh
            console.log('Starting new game');
        }
    }

    async pvpFight() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  PVP COMBAT - FIGHT ANOTHER PLAYER' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println('');
        
        try {
            const response = await fetch('/api/users/online');
            
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
                await this.challengePlayer(opponent);
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

    async challengePlayer(opponent) {
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-yellow') + `  Challenging ${opponent.handle} to a duel!` + ANSIParser.reset());
        this.terminal.println('');
        
        // Send challenge via Socket.io
        if (window.socketClient && window.socketClient.socket) {
            window.socketClient.socket.emit('pit-challenge', {
                targetUserId: opponent.id,
                challengerHandle: this.authManager.getCurrentUser().handle,
                challengerStats: {
                    level: this.gameState.level,
                    hp: this.gameState.hp,
                    maxHp: this.gameState.maxHp,
                    strength: this.gameState.strength,
                    defense: this.gameState.defense
                }
            });
            
            this.terminal.println(ANSIParser.fg('bright-green') + `  Challenge sent to ${opponent.handle}!` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-white') + '  Waiting for response...' + ANSIParser.reset());
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  (Press any key to cancel)' + ANSIParser.reset());
            
            // Wait for response (with timeout)
            const timeout = setTimeout(() => {
                this.terminal.println('');
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  Challenge timed out.' + ANSIParser.reset());
                this.terminal.println('  Press any key to continue...');
                this.terminal.input();
            }, 30000);
            
            // Listen for challenge response
            const responseHandler = (data) => {
                clearTimeout(timeout);
                window.socketClient.socket.off('pit-challenge-response', responseHandler);
                
                if (data.accepted) {
                    this.terminal.println('');
                    this.terminal.println(ANSIParser.fg('bright-green') + `  ${opponent.handle} accepted your challenge!` + ANSIParser.reset());
                    this.terminal.println('');
                    this.terminal.println('  Press any key to continue...');
                    this.terminal.input().then(() => {
                        this.startPvPCombat(opponent, data.opponentStats);
                    });
                } else {
                    this.terminal.println('');
                    this.terminal.println(ANSIParser.fg('bright-red') + `  ${opponent.handle} declined your challenge.` + ANSIParser.reset());
                    this.terminal.println('');
                    this.terminal.println('  Press any key to continue...');
                    this.terminal.input();
                }
            };
            
            window.socketClient.socket.on('pit-challenge-response', responseHandler);
        } else {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Error: Socket connection not available!' + ANSIParser.reset());
            this.terminal.println('');
            this.terminal.println('  Press any key to continue...');
            await this.terminal.input();
        }
    }

    async startPvPCombat(opponent, opponentStats) {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + `  PVP COMBAT: ${this.authManager.getCurrentUser().handle} vs ${opponent.handle}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println('');
        
        let playerHp = this.gameState.hp;
        let opponentHp = opponentStats.hp;
        
        this.terminal.println(ANSIParser.fg('bright-green') + `  You: HP ${playerHp}/${this.gameState.maxHp} | STR ${this.gameState.strength} | DEF ${this.gameState.defense}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-red') + `  ${opponent.handle}: HP ${opponentHp}/${opponentStats.maxHp} | STR ${opponentStats.strength} | DEF ${opponentStats.defense}` + ANSIParser.reset());
        this.terminal.println('');
        
        let turn = 0;
        
        while (playerHp > 0 && opponentHp > 0) {
            turn++;
            this.terminal.println(ANSIParser.fg('bright-yellow') + `  Round ${turn}` + ANSIParser.reset());
            
            // Player attacks
            const playerDamage = Math.max(1, this.gameState.strength - opponentStats.defense + Math.floor(Math.random() * 5));
            opponentHp -= playerDamage;
            this.terminal.println(ANSIParser.fg('bright-green') + `  You hit ${opponent.handle} for ${playerDamage} damage!` + ANSIParser.reset());
            
            if (opponentHp <= 0) {
                this.terminal.println('');
                this.terminal.println(ANSIParser.fg('bright-cyan') + '  ★★★ VICTORY! ★★★' + ANSIParser.reset());
                this.terminal.println(ANSIParser.fg('bright-green') + `  You defeated ${opponent.handle}!` + ANSIParser.reset());
                
                const goldReward = 50 + (opponentStats.level * 10);
                const expReward = 25 + (opponentStats.level * 5);
                
                this.gameState.gold += goldReward;
                this.gameState.experience += expReward;
                this.gameState.wins++;
                
                this.terminal.println(ANSIParser.fg('bright-yellow') + `  Gold gained: ${goldReward}` + ANSIParser.reset());
                this.terminal.println(ANSIParser.fg('bright-yellow') + `  Experience gained: ${expReward}` + ANSIParser.reset());
                break;
            }
            
            // Opponent attacks
            const opponentDamage = Math.max(1, opponentStats.strength - this.gameState.defense + Math.floor(Math.random() * 5));
            playerHp -= opponentDamage;
            this.terminal.println(ANSIParser.fg('bright-red') + `  ${opponent.handle} hits you for ${opponentDamage} damage!` + ANSIParser.reset());
            
            if (playerHp <= 0) {
                this.terminal.println('');
                this.terminal.println(ANSIParser.fg('bright-red') + '  ★★★ DEFEAT! ★★★' + ANSIParser.reset());
                this.terminal.println(ANSIParser.fg('bright-red') + `  ${opponent.handle} defeated you!` + ANSIParser.reset());
                
                this.gameState.hp = 0;
                this.gameState.gold = Math.max(0, this.gameState.gold - 25);
                this.gameState.losses++;
                break;
            }
            
            await this.terminal.sleep(1000);
        }
        
        this.terminal.println('');
        this.terminal.println('  Press any key to continue...');
        await this.terminal.input();
    }

    async saveGameState() {
        try {
            await fetch(`/api/game-state/the-pit`, {
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
║                            THE PIT                                            ║
║                                                                              ║
║                  "Enter if you dare, leave if you can!"                     ║
╚══════════════════════════════════════════════════════════════════════════════╝
`;
    }
}

// Export for use in other modules
window.ThePit = ThePit;

