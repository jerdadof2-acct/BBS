// Usurper - Medieval Fantasy RPG
class Usurper {
    constructor(terminal, socketClient, authManager) {
        this.terminal = terminal;
        this.socketClient = socketClient;
        this.authManager = authManager;
        this.gameState = null;
        
        this.classes = {
            warrior: { hp: 120, strength: 18, defense: 15, magic: 0, gold: 100 },
            wizard: { hp: 80, strength: 8, defense: 8, magic: 20, gold: 80 },
            thief: { hp: 100, strength: 14, defense: 12, magic: 5, gold: 120 },
            paladin: { hp: 110, strength: 16, defense: 18, magic: 10, gold: 90 }
        };
        
        this.monsters = [
            { name: 'Goblin', hp: 40, strength: 10, defense: 5, exp: 20, gold: 30, level: 1 },
            { name: 'Orc', hp: 70, strength: 16, defense: 8, exp: 40, gold: 60, level: 2 },
            { name: 'Skeleton', hp: 90, strength: 20, defense: 10, exp: 60, gold: 80, level: 3 },
            { name: 'Troll', hp: 130, strength: 28, defense: 15, exp: 90, gold: 120, level: 4 },
            { name: 'Vampire', hp: 180, strength: 36, defense: 20, exp: 130, gold: 180, level: 5 },
            { name: 'Dragon', hp: 300, strength: 50, defense: 30, exp: 250, gold: 500, level: 8 }
        ];
        
        this.dungeons = [
            { name: 'Goblin Cave', level: 1, monsters: ['Goblin', 'Orc'], exp: 30, gold: 50 },
            { name: 'Haunted Crypt', level: 2, monsters: ['Skeleton', 'Vampire'], exp: 60, gold: 100 },
            { name: 'Troll Den', level: 3, monsters: ['Troll', 'Orc'], exp: 90, gold: 150 },
            { name: 'Dragon Lair', level: 5, monsters: ['Dragon'], exp: 250, gold: 500 }
        ];
    }

    async play() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + this.getTitle() + ANSIParser.reset());
        this.terminal.println('');
        
        // Load game state
        await this.loadGameState();
        
        // Check if new game
        if (!this.gameState || !this.gameState.characterCreated) {
            await this.characterCreation();
        }
        
        // Main game loop
        while (true) {
            this.terminal.clear();
            this.showStatus();
            this.terminal.println('');
            
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [E]' + ANSIParser.reset() + ' Explore Dungeon');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [T]' + ANSIParser.reset() + ' Train (increase stats)');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [S]' + ANSIParser.reset() + ' Shop (buy equipment)');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [I]' + ANSIParser.reset() + ' Inn (rest and heal)');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [B]' + ANSIParser.reset() + ' Bank (deposit/withdraw)');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [P]' + ANSIParser.reset() + ' Player Stats');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [X]' + ANSIParser.reset() + ' Exit');
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
            
            const choice = (await this.terminal.input()).toLowerCase();
            
            if (choice === 'e') {
                await this.exploreDungeon();
            } else if (choice === 't') {
                await this.train();
            } else if (choice === 's') {
                await this.shop();
            } else if (choice === 'i') {
                await this.inn();
            } else if (choice === 'b') {
                await this.bank();
            } else if (choice === 'p') {
                await this.showPlayerStats();
            } else if (choice === 'x') {
                await this.saveGameState();
                return 'doors';
            }
            
            // Check for death
            if (this.gameState.hp <= 0) {
                await this.handleDeath();
            }
            
            // Check for level up
            await this.checkLevelUp();
        }
    }

    async characterCreation() {
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  CHARACTER CREATION' + ANSIParser.reset());
        this.terminal.println('');
        
        // Class selection
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Select your class:' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [W]' + ANSIParser.reset() + ' Warrior (balanced fighter)');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [M]' + ANSIParser.reset() + ' Wizard (powerful magic)');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [T]' + ANSIParser.reset() + ' Thief (agile and fast)');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [P]' + ANSIParser.reset() + ' Paladin (holy warrior)');
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
        
        const classChoice = (await this.terminal.input()).toLowerCase();
        let classType = 'warrior';
        if (classChoice === 'm') classType = 'wizard';
        else if (classChoice === 't') classType = 'thief';
        else if (classChoice === 'p') classType = 'paladin';
        
        // Initialize character
        const classStats = this.classes[classType];
        this.gameState = {
            characterCreated: true,
            class: classType,
            level: 1,
            experience: 0,
            gold: classStats.gold,
            hp: classStats.hp,
            maxHp: classStats.hp,
            strength: classStats.strength,
            defense: classStats.defense,
            magic: classStats.magic,
            bankGold: 0,
            monstersKilled: 0,
            deaths: 0,
            dungeonsCleared: 0
        };
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + '  Character created successfully!' + ANSIParser.reset());
        await this.terminal.sleep(2000);
    }

    async exploreDungeon() {
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  Select Dungeon:' + ANSIParser.reset());
        this.terminal.println('');
        
        const availableDungeons = this.dungeons.filter(d => d.level <= this.gameState.level + 2);
        
        availableDungeons.forEach((dungeon, index) => {
            this.terminal.println(ANSIParser.fg('bright-yellow') + `  [${index}]` + ANSIParser.reset() + 
                ` ${dungeon.name} - Level ${dungeon.level} (${dungeon.exp} exp, ${dungeon.gold} gold)`);
        });
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
        const choice = parseInt(await this.terminal.input());
        
        if (choice >= 0 && choice < availableDungeons.length) {
            const dungeon = availableDungeons[choice];
            await this.enterDungeon(dungeon);
        }
    }

    async enterDungeon(dungeon) {
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-cyan') + `  Entering ${dungeon.name}...` + ANSIParser.reset());
        this.terminal.println('');
        
        // Random encounters
        const numEncounters = 3 + Math.floor(Math.random() * 3);
        
        for (let i = 0; i < numEncounters; i++) {
            const monsterName = dungeon.monsters[Math.floor(Math.random() * dungeon.monsters.length)];
            const monster = { ...this.monsters.find(m => m.name === monsterName) };
            
            this.terminal.println(ANSIParser.fg('bright-red') + `  A ${monster.name} appears!` + ANSIParser.reset());
            this.terminal.println('');
            
            const result = await this.combat(monster);
            
            if (!result) {
                // Player died
                return;
            }
            
            await this.terminal.sleep(1500);
        }
        
        // Dungeon cleared
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + `  Dungeon cleared! Bonus: ${dungeon.exp} exp, ${dungeon.gold} gold!` + ANSIParser.reset());
        this.gameState.experience += dungeon.exp;
        this.gameState.gold += dungeon.gold;
        this.gameState.dungeonsCleared++;
        
        await this.terminal.sleep(3000);
    }

    async combat(monster) {
        let playerTurn = true;
        
        while (this.gameState.hp > 0 && monster.hp > 0) {
            if (playerTurn) {
                this.terminal.println(ANSIParser.fg('bright-cyan') + '  Your turn!' + ANSIParser.reset());
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  [A]' + ANSIParser.reset() + ' Attack');
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  [D]' + ANSIParser.reset() + ' Defend');
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  [M]' + ANSIParser.reset() + ' Magic (if available)');
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  [F]' + ANSIParser.reset() + ' Flee');
                this.terminal.println('');
                this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
                
                const choice = (await this.terminal.input()).toLowerCase();
                
                if (choice === 'a') {
                    const damage = Math.max(1, this.gameState.strength + Math.floor(Math.random() * 10) - monster.defense);
                    monster.hp -= damage;
                    this.terminal.println(ANSIParser.fg('bright-green') + `  You attack for ${damage} damage!` + ANSIParser.reset());
                } else if (choice === 'd') {
                    this.terminal.println(ANSIParser.fg('bright-cyan') + '  You take a defensive stance!' + ANSIParser.reset());
                    // Defense bonus applied in monster turn
                } else if (choice === 'm' && this.gameState.magic > 0) {
                    const damage = Math.max(1, this.gameState.magic * 2 + Math.floor(Math.random() * 15));
                    monster.hp -= damage;
                    this.terminal.println(ANSIParser.fg('bright-yellow') + `  You cast a spell for ${damage} damage!` + ANSIParser.reset());
                } else if (choice === 'f') {
                    if (Math.random() < 0.5) {
                        this.terminal.println(ANSIParser.fg('bright-green') + '  You successfully flee!' + ANSIParser.reset());
                        return false;
                    } else {
                        this.terminal.println(ANSIParser.fg('bright-red') + '  You failed to flee!' + ANSIParser.reset());
                    }
                }
            } else {
                // Monster turn
                const damage = Math.max(1, monster.strength + Math.floor(Math.random() * 10) - this.gameState.defense);
                this.gameState.hp -= damage;
                this.terminal.println(ANSIParser.fg('bright-red') + `  ${monster.name} attacks for ${damage} damage!` + ANSIParser.reset());
            }
            
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-cyan') + 
                `  Your HP: ${Math.max(0, this.gameState.hp)}/${this.gameState.maxHp}  |  ${monster.name} HP: ${Math.max(0, monster.hp)}` + 
                ANSIParser.reset());
            this.terminal.println('');
            
            playerTurn = !playerTurn;
            await this.terminal.sleep(1000);
        }
        
        if (this.gameState.hp > 0) {
            this.terminal.println(ANSIParser.fg('bright-green') + `  Victory! You defeated ${monster.name}!` + ANSIParser.reset());
            this.gameState.gold += monster.gold;
            this.gameState.experience += monster.exp;
            this.gameState.monstersKilled++;
            return true;
        } else {
            this.terminal.println(ANSIParser.fg('bright-red') + `  Defeat! ${monster.name} has defeated you!` + ANSIParser.reset());
            this.gameState.deaths++;
            return false;
        }
    }

    async train() {
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  Training Grounds:' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [S]' + ANSIParser.reset() + ' Train Strength (100 gold)');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [D]' + ANSIParser.reset() + ' Train Defense (100 gold)');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [H]' + ANSIParser.reset() + ' Train HP (150 gold)');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [M]' + ANSIParser.reset() + ' Train Magic (150 gold) - Wizards only');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [B]' + ANSIParser.reset() + ' Back');
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
        
        const choice = (await this.terminal.input()).toLowerCase();
        
        if (choice === 's' && this.gameState.gold >= 100) {
            this.gameState.gold -= 100;
            this.gameState.strength += 3;
            this.terminal.println(ANSIParser.fg('bright-green') + '  Strength increased by 3!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
        } else if (choice === 'd' && this.gameState.gold >= 100) {
            this.gameState.gold -= 100;
            this.gameState.defense += 3;
            this.terminal.println(ANSIParser.fg('bright-green') + '  Defense increased by 3!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
        } else if (choice === 'h' && this.gameState.gold >= 150) {
            this.gameState.gold -= 150;
            this.gameState.maxHp += 15;
            this.gameState.hp += 15;
            this.terminal.println(ANSIParser.fg('bright-green') + '  Max HP increased by 15!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
        } else if (choice === 'm' && this.gameState.gold >= 150 && this.gameState.class === 'wizard') {
            this.gameState.gold -= 150;
            this.gameState.magic += 5;
            this.terminal.println(ANSIParser.fg('bright-green') + '  Magic increased by 5!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
        } else if (choice !== 'b') {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Cannot afford or not available!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
        }
    }

    async shop() {
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  Shop:' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [1]' + ANSIParser.reset() + ' Iron Sword - 200 gold (+5 STR)');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [2]' + ANSIParser.reset() + ' Iron Armor - 200 gold (+5 DEF)');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [3]' + ANSIParser.reset() + ' Health Potion - 50 gold (Restore 50 HP)');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [4]' + ANSIParser.reset() + ' Steel Sword - 500 gold (+10 STR)');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [5]' + ANSIParser.reset() + ' Steel Armor - 500 gold (+10 DEF)');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [B]' + ANSIParser.reset() + ' Back');
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
        
        const choice = (await this.terminal.input()).toLowerCase();
        
        if (choice === '1' && this.gameState.gold >= 200) {
            this.gameState.gold -= 200;
            this.gameState.strength += 5;
            this.terminal.println(ANSIParser.fg('bright-green') + '  Bought Iron Sword!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
        } else if (choice === '2' && this.gameState.gold >= 200) {
            this.gameState.gold -= 200;
            this.gameState.defense += 5;
            this.terminal.println(ANSIParser.fg('bright-green') + '  Bought Iron Armor!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
        } else if (choice === '3' && this.gameState.gold >= 50) {
            this.gameState.gold -= 50;
            this.gameState.hp = Math.min(this.gameState.maxHp, this.gameState.hp + 50);
            this.terminal.println(ANSIParser.fg('bright-green') + '  Bought Health Potion!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
        } else if (choice === '4' && this.gameState.gold >= 500) {
            this.gameState.gold -= 500;
            this.gameState.strength += 10;
            this.terminal.println(ANSIParser.fg('bright-green') + '  Bought Steel Sword!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
        } else if (choice === '5' && this.gameState.gold >= 500) {
            this.gameState.gold -= 500;
            this.gameState.defense += 10;
            this.terminal.println(ANSIParser.fg('bright-green') + '  Bought Steel Armor!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
        } else if (choice !== 'b') {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Cannot afford!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
        }
    }

    async inn() {
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  Welcome to the Inn!' + ANSIParser.reset());
        this.terminal.println('');
        
        if (this.gameState.gold >= 100) {
            this.gameState.gold -= 100;
            this.gameState.hp = this.gameState.maxHp;
            this.terminal.println(ANSIParser.fg('bright-green') + '  You rest and are fully healed!' + ANSIParser.reset());
        } else {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Not enough gold! (Need 100 gold)' + ANSIParser.reset());
        }
        await this.terminal.sleep(2000);
    }

    async bank() {
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  Bank:' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + `  Gold on hand: ${this.gameState.gold}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + `  Gold in bank: ${this.gameState.bankGold || 0}` + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [D]' + ANSIParser.reset() + ' Deposit');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [W]' + ANSIParser.reset() + ' Withdraw');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [B]' + ANSIParser.reset() + ' Back');
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
        
        const choice = (await this.terminal.input()).toLowerCase();
        
        if (choice === 'd') {
            this.terminal.println(ANSIParser.fg('bright-green') + '  How much to deposit? ' + ANSIParser.reset());
            const amount = parseInt(await this.terminal.input());
            if (amount > 0 && amount <= this.gameState.gold) {
                this.gameState.gold -= amount;
                this.gameState.bankGold = (this.gameState.bankGold || 0) + amount;
                this.terminal.println(ANSIParser.fg('bright-green') + `  Deposited ${amount} gold!` + ANSIParser.reset());
            }
        } else if (choice === 'w') {
            this.terminal.println(ANSIParser.fg('bright-green') + '  How much to withdraw? ' + ANSIParser.reset());
            const amount = parseInt(await this.terminal.input());
            if (amount > 0 && amount <= (this.gameState.bankGold || 0)) {
                this.gameState.gold += amount;
                this.gameState.bankGold -= amount;
                this.terminal.println(ANSIParser.fg('bright-green') + `  Withdrew ${amount} gold!` + ANSIParser.reset());
            }
        }
        await this.terminal.sleep(2000);
    }

    async showPlayerStats() {
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  Your Character:' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + `  Class: ${this.gameState.class.charAt(0).toUpperCase() + this.gameState.class.slice(1)}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + `  Level: ${this.gameState.level}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + `  Experience: ${this.gameState.experience}/${this.gameState.level * 100}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + `  Gold: ${this.gameState.gold}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + `  HP: ${this.gameState.hp}/${this.gameState.maxHp}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + `  Strength: ${this.gameState.strength}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + `  Defense: ${this.gameState.defense}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + `  Magic: ${this.gameState.magic}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + `  Monsters Killed: ${this.gameState.monstersKilled}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + `  Dungeons Cleared: ${this.gameState.dungeonsCleared}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + `  Deaths: ${this.gameState.deaths}` + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Press any key to continue...' + ANSIParser.reset());
        await this.terminal.input();
    }

    async handleDeath() {
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-red') + '  YOU DIED!' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  You have been revived at the inn.' + ANSIParser.reset());
        this.gameState.hp = this.gameState.maxHp;
        this.gameState.gold = Math.max(0, this.gameState.gold - 100);
        this.gameState.deaths++;
        await this.terminal.sleep(3000);
    }

    async checkLevelUp() {
        const expNeeded = this.gameState.level * 100;
        if (this.gameState.experience >= expNeeded) {
            this.gameState.level++;
            this.gameState.strength += 3;
            this.gameState.defense += 2;
            this.gameState.maxHp += 15;
            this.gameState.hp = this.gameState.maxHp;
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-yellow') + `  LEVEL UP! You are now level ${this.gameState.level}!` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-green') + '  +3 Strength, +2 Defense, +15 Max HP!' + ANSIParser.reset());
            await this.terminal.sleep(3000);
        }
    }

    showStatus() {
        this.terminal.println(ANSIParser.fg('bright-cyan') + '╔══════════════════════════════════════════════════════════════════════════════╗' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '║' + ANSIParser.reset() + 
            ANSIParser.fg('bright-white') + '  USURPER' + ANSIParser.reset() + 
            ' '.repeat(70) + ANSIParser.fg('bright-cyan') + '║' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '╚══════════════════════════════════════════════════════════════════════════════╝' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + `  Class: ${this.gameState.class}  |  Level: ${this.gameState.level}  |  HP: ${this.gameState.hp}/${this.gameState.maxHp}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + `  Gold: ${this.gameState.gold}  |  STR: ${this.gameState.strength}  |  DEF: ${this.gameState.defense}  |  MAG: ${this.gameState.magic}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + `  Exp: ${this.gameState.experience}/${this.gameState.level * 100}  |  Kills: ${this.gameState.monstersKilled}  |  Dungeons: ${this.gameState.dungeonsCleared}` + ANSIParser.reset());
    }

    async loadGameState() {
        try {
            const response = await fetch(`/api/game-state/usurper`);
            const state = await response.json();
            if (state && state.game_data) {
                this.gameState = { ...this.gameState, ...JSON.parse(state.game_data) };
            }
        } catch (error) {
            console.log('Starting new Usurper game');
        }
    }

    async saveGameState() {
        try {
            await fetch(`/api/game-state/usurper`, {
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
║                               USURPER                                         ║
║                                                                              ║
║                      Medieval Fantasy RPG Adventure                           ║
║                                                                              ║
║  Explore dungeons, defeat monsters, and become the ultimate warrior!         ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
`;
    }
}

// Export for use in other modules
window.Usurper = Usurper;


