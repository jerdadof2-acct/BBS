// Legend of the Red Dragon - Classic BBS RPG
// Accurate recreation of the original LORD by Seth Robinson

class LORD {
    constructor(terminal, socketClient, authManager) {
        this.terminal = terminal;
        this.socketClient = socketClient;
        this.authManager = authManager;
        this.gameState = null;
        this.currentDay = 1;
        this.actionsRemaining = 0;
        this.inCombat = false;
        
        // Original LORD stats
        this.classes = {
            warrior: { strength: 20, defense: 20, hp: 100, gold: 100 },
            thief: { strength: 15, defense: 15, hp: 80, gold: 150 },
            paladin: { strength: 18, defense: 22, hp: 110, gold: 80 },
            ninja: { strength: 22, defense: 18, hp: 90, gold: 120 }
        };
        
        // Original LORD monsters (with proper stats)
        this.monsters = [
            { name: 'Snake', level: 1, hp: 20, strength: 5, defense: 3, exp: 10, gold: 10, alignment: 'neutral' },
            { name: 'Bandit', level: 2, hp: 35, strength: 8, defense: 5, exp: 20, gold: 25, alignment: 'evil' },
            { name: 'Wolf', level: 3, hp: 50, strength: 12, defense: 7, exp: 35, gold: 40, alignment: 'neutral' },
            { name: 'Orc', level: 4, hp: 70, strength: 16, defense: 10, exp: 55, gold: 60, alignment: 'evil' },
            { name: 'Troll', level: 5, hp: 100, strength: 22, defense: 14, exp: 85, gold: 90, alignment: 'evil' },
            { name: 'Dragon Knight', level: 6, hp: 130, strength: 28, defense: 18, exp: 120, gold: 130, alignment: 'evil' },
            { name: 'Dark Warrior', level: 7, hp: 170, strength: 35, defense: 22, exp: 160, gold: 180, alignment: 'evil' },
            { name: 'Demon', level: 8, hp: 220, strength: 42, defense: 28, exp: 210, gold: 250, alignment: 'evil' },
            { name: 'Death Knight', level: 9, hp: 280, strength: 50, defense: 35, exp: 270, gold: 350, alignment: 'evil' },
            { name: 'Red Dragon', level: 10, hp: 500, strength: 70, defense: 50, exp: 1000, gold: 1000, alignment: 'evil', isBoss: true }
        ];
        
        // NPCs
        this.npcs = {
            violet: { name: 'Violet', type: 'barmaid', romanceLevel: 0, location: 'tavern' },
            priest: { name: 'Priest', type: 'healer', location: 'temple' },
            shopkeeper: { name: 'Shopkeeper', type: 'merchant', location: 'shop' },
            innkeeper: { name: 'Innkeeper', type: 'innkeeper', location: 'inn' }
        };
        
        // Quests
        this.quests = [
            { id: 1, name: 'Kill 10 Snakes', target: 'snake', count: 10, reward: 100, exp: 50, completed: false },
            { id: 2, name: 'Defeat 5 Bandits', target: 'bandit', count: 5, reward: 150, exp: 75, completed: false },
            { id: 3, name: 'Slay the Orc Chief', target: 'orc', count: 1, reward: 200, exp: 100, completed: false },
            { id: 4, name: 'Defeat the Red Dragon', target: 'red_dragon', count: 1, reward: 5000, exp: 500, completed: false }
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
            // Save after character creation
            await this.saveGameState();
        } else {
            // Check if existing character needs a name (for players created before the name system)
            if (!this.gameState.name) {
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  Your character needs a name!' + ANSIParser.reset());
                this.terminal.println(ANSIParser.fg('bright-white') + '  (This is how other players will see you)' + ANSIParser.reset());
                this.terminal.println('');
                this.terminal.println(ANSIParser.fg('bright-green') + '  Enter your hero name: ' + ANSIParser.reset());
                const heroName = await this.terminal.input();
                
                if (!heroName || heroName.trim().length === 0) {
                    this.terminal.println(ANSIParser.fg('bright-red') + '  Invalid hero name!' + ANSIParser.reset());
                    await this.terminal.sleep(2000);
                    return;
                }
                
                // Get login username
                const currentUser = this.authManager.getCurrentUser();
                const loginUsername = currentUser ? currentUser.username : 'Guest';
                
                // Update character with name
                this.gameState.name = heroName.trim();
                this.gameState.loginUsername = loginUsername;
                
                // Save the updated character
                await this.saveGameState();
                
                this.terminal.println(ANSIParser.fg('bright-green') + `  Character name set to: ${heroName.trim()}` + ANSIParser.reset());
                await this.terminal.sleep(2000);
            }
            
            // Show welcome back message
            const heroName = this.gameState.name || 'Hero';
            const loginUser = this.gameState.loginUsername || 'Guest';
            this.terminal.println(ANSIParser.fg('bright-green') + `  Welcome back, ${heroName}!` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-white') + `  (Logged in as: ${loginUser})` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-cyan') + `  Level: ${this.gameState.level} | HP: ${this.gameState.hp}/${this.gameState.maxHp} | Gold: ${this.gameState.gold}` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-yellow') + `  Day: ${this.gameState.day || this.currentDay} | Actions: ${this.actionsRemaining}` + ANSIParser.reset());
            await this.terminal.sleep(2000);
        }
        
        // Check for new day
        await this.checkNewDay();
        
        // Main game loop
        while (true) {
            this.terminal.clear();
            this.showStatus();
            this.terminal.println('');
            
            // Show actions remaining
            this.terminal.println(ANSIParser.fg('bright-yellow') + `  Actions remaining today: ${this.actionsRemaining}` + ANSIParser.reset());
            this.terminal.println('');
            
            // Main menu
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [F]' + ANSIParser.reset() + ' Go to Forest (fight monsters)');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [T]' + ANSIParser.reset() + ' Go to Tavern (meet Violet)');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [S]' + ANSIParser.reset() + ' Go to Shop (buy equipment)');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [H]' + ANSIParser.reset() + ' Go to Temple (heal)');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [I]' + ANSIParser.reset() + ' Go to Inn (rest for the night)');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [G]' + ANSIParser.reset() + ' Go to Gym (train)');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [B]' + ANSIParser.reset() + ' Go to Bank (deposit/withdraw)');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [Q]' + ANSIParser.reset() + ' View Quests');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [P]' + ANSIParser.reset() + ' View Player Stats');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [L]' + ANSIParser.reset() + ' View Leaderboards');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [A]' + ANSIParser.reset() + ' Arena (PvP Combat)');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [X]' + ANSIParser.reset() + ' Exit game');
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
            
            const choice = (await this.terminal.input()).toLowerCase();
            
            if (choice === 'f') {
                await this.forest();
            } else if (choice === 't') {
                await this.tavern();
            } else if (choice === 's') {
                await this.shop();
            } else if (choice === 'h') {
                await this.temple();
            } else if (choice === 'i') {
                await this.inn();
            } else if (choice === 'g') {
                await this.gym();
            } else if (choice === 'b') {
                await this.bank();
            } else if (choice === 'q') {
                await this.showQuests();
            } else if (choice === 'p') {
                await this.showPlayerStats();
            } else if (choice === 'l') {
                await this.viewLeaderboards();
            } else if (choice === 'a') {
                await this.enterArena();
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
            
            // Check if day is over
            if (this.actionsRemaining <= 0) {
                await this.endOfDay();
            }
        }
    }

    async characterCreation() {
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  CHARACTER CREATION' + ANSIParser.reset());
        this.terminal.println('');
        
        // Character Name
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Enter your hero name:' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  (This is how other players will see you)' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + '  Hero name: ' + ANSIParser.reset());
        const heroName = await this.terminal.input();
        
        if (!heroName || heroName.trim().length === 0) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Invalid hero name!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
            return await this.characterCreation(); // Retry
        }
        
        // Get login username as fallback
        const currentUser = this.authManager.getCurrentUser();
        const loginUsername = currentUser ? currentUser.username : 'Guest';
        
        // Gender
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Select your gender:' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [M]' + ANSIParser.reset() + ' Male');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [F]' + ANSIParser.reset() + ' Female');
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
        const genderChoice = (await this.terminal.input()).toLowerCase();
        const gender = genderChoice === 'f' ? 'female' : 'male';
        
        // Alignment
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Select your alignment:' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [G]' + ANSIParser.reset() + ' Good (bonus to defense)');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [N]' + ANSIParser.reset() + ' Neutral (balanced)');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [E]' + ANSIParser.reset() + ' Evil (bonus to strength)');
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
        const alignChoice = (await this.terminal.input()).toLowerCase();
        let alignment = 'neutral';
        if (alignChoice === 'g') alignment = 'good';
        else if (alignChoice === 'e') alignment = 'evil';
        
        // Class
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Select your class:' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [W]' + ANSIParser.reset() + ' Warrior (balanced, 100 gold)');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [T]' + ANSIParser.reset() + ' Thief (fast, 150 gold)');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [P]' + ANSIParser.reset() + ' Paladin (tank, 80 gold)');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [N]' + ANSIParser.reset() + ' Ninja (damage, 120 gold)');
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
        const classChoice = (await this.terminal.input()).toLowerCase();
        let classType = 'warrior';
        if (classChoice === 't') classType = 'thief';
        else if (classChoice === 'p') classType = 'paladin';
        else if (classChoice === 'n') classType = 'ninja';
        
        // Initialize character
        const classStats = this.classes[classType];
        this.gameState = {
            characterCreated: true,
            name: heroName.trim(),
            loginUsername: loginUsername,
            gender: gender,
            alignment: alignment,
            class: classType,
            level: 1,
            experience: 0,
            gold: classStats.gold,
            hp: classStats.hp,
            maxHp: classStats.hp,
            strength: classStats.strength,
            defense: classStats.defense,
            charisma: 10,
            bankGold: 0,
            daysPlayed: 0,
            lastPlayed: null,
            monstersKilled: 0,
            deaths: 0,
            questsCompleted: 0,
            violetRomance: 0,
            equipment: {
                weapon: null,
                armor: null,
                accessory: null
            }
        };
        
        // Apply alignment bonuses
        if (alignment === 'good') {
            this.gameState.defense += 5;
        } else if (alignment === 'evil') {
            this.gameState.strength += 5;
        }
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + '  Character created successfully!' + ANSIParser.reset());
        await this.terminal.sleep(2000);
    }

    async checkNewDay() {
        const today = new Date().toDateString();
        if (!this.gameState.lastPlayed || this.gameState.lastPlayed !== today) {
            this.gameState.daysPlayed++;
            this.gameState.lastPlayed = today;
            this.currentDay = this.gameState.daysPlayed;
            this.actionsRemaining = 10; // 10 actions per day (original LORD had 10)
            this.gameState.hp = this.gameState.maxHp; // Full heal for new day
            
            this.terminal.println(ANSIParser.fg('bright-green') + `  Day ${this.currentDay} begins! You are fully healed.` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-yellow') + `  You have ${this.actionsRemaining} actions remaining today.` + ANSIParser.reset());
            await this.terminal.sleep(3000);
        } else {
            // Same day, restore actions
            this.actionsRemaining = 10;
        }
    }

    async forest() {
        if (this.actionsRemaining <= 0) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  You are too tired! Rest for the night.' + ANSIParser.reset());
            await this.terminal.sleep(2000);
            return;
        }
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  You enter the dark forest...' + ANSIParser.reset());
        this.terminal.println('');
        
        // Random monster encounter
        const availableMonsters = this.monsters.filter(m => 
            m.level <= this.gameState.level + 2 && 
            (!m.isBoss || this.gameState.level >= 8)
        );
        const monster = { ...availableMonsters[Math.floor(Math.random() * availableMonsters.length)] };
        
        this.terminal.println(ANSIParser.fg('bright-red') + `  A ${monster.name} appears!` + ANSIParser.reset());
        this.terminal.println('');
        
        this.actionsRemaining--;
        await this.combat(monster);
    }

    async combat(monster) {
        this.inCombat = true;
        let playerTurn = true;
        let playerDefending = false;
        
        while (this.gameState.hp > 0 && monster.hp > 0) {
            if (playerTurn) {
                this.terminal.println(ANSIParser.fg('bright-cyan') + '  Your turn!' + ANSIParser.reset());
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  [A]' + ANSIParser.reset() + ' Attack');
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  [D]' + ANSIParser.reset() + ' Defend');
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  [F]' + ANSIParser.reset() + ' Flee (50% chance)');
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  [S]' + ANSIParser.reset() + ' Special Move');
                this.terminal.println('');
                this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
                
                const choice = (await this.terminal.input()).toLowerCase();
                
                if (choice === 'a') {
                    // Attack
                    const baseDamage = this.gameState.strength;
                    const variance = Math.floor(Math.random() * 10) - 5;
                    const damage = Math.max(1, baseDamage + variance - monster.defense);
                    monster.hp -= damage;
                    this.terminal.println(ANSIParser.fg('bright-green') + `  You attack for ${damage} damage!` + ANSIParser.reset());
                    playerDefending = false;
                } else if (choice === 'd') {
                    // Defend
                    playerDefending = true;
                    this.terminal.println(ANSIParser.fg('bright-cyan') + '  You take a defensive stance!' + ANSIParser.reset());
                } else if (choice === 'f') {
                    // Flee
                    if (Math.random() < 0.5) {
                        this.terminal.println(ANSIParser.fg('bright-green') + '  You successfully flee!' + ANSIParser.reset());
                        await this.terminal.sleep(2000);
                        this.inCombat = false;
                        return;
                    } else {
                        this.terminal.println(ANSIParser.fg('bright-red') + '  You failed to flee!' + ANSIParser.reset());
                    }
                } else if (choice === 's') {
                    // Special move (critical hit)
                    const criticalChance = this.gameState.charisma / 100;
                    if (Math.random() < criticalChance) {
                        const damage = Math.max(1, this.gameState.strength * 2 - monster.defense);
                        monster.hp -= damage;
                        this.terminal.println(ANSIParser.fg('bright-yellow') + `  CRITICAL HIT! ${damage} damage!` + ANSIParser.reset());
                    } else {
                        const damage = Math.max(1, this.gameState.strength - monster.defense);
                        monster.hp -= damage;
                        this.terminal.println(ANSIParser.fg('bright-green') + `  You attack for ${damage} damage!` + ANSIParser.reset());
                    }
                    playerDefending = false;
                }
            } else {
                // Monster turn
                if (monster.hp > 0) {
                    const baseDamage = monster.strength;
                    const variance = Math.floor(Math.random() * 10) - 5;
                    let damage = Math.max(1, baseDamage + variance - this.gameState.defense);
                    
                    if (playerDefending) {
                        damage = Math.floor(damage / 2);
                        this.terminal.println(ANSIParser.fg('bright-cyan') + '  Your defense reduced the damage!' + ANSIParser.reset());
                    }
                    
                    this.gameState.hp -= damage;
                    this.terminal.println(ANSIParser.fg('bright-red') + `  ${monster.name} attacks for ${damage} damage!` + ANSIParser.reset());
                }
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
            
            // Special handling for Red Dragon defeat
            if (monster.name === 'Red Dragon') {
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  🐉 CONGRATULATIONS! YOU HAVE SLAIN THE RED DRAGON! 🐉' + ANSIParser.reset());
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  You are now a LEGENDARY HERO!' + ANSIParser.reset());
                this.gameState.redDragonDefeated = true;
                this.gameState.redDragonDefeatedAt = new Date().toISOString();
                this.gameState.gold += 5000; // Bonus gold for dragon slaying
                this.gameState.experience += 500; // Bonus experience
            }
            
            // Update quest progress
            this.updateQuestProgress(monster.name.toLowerCase());
            
            // Random loot
            if (Math.random() < 0.2) {
                const bonusGold = Math.floor(Math.random() * 50) + 20;
                this.gameState.gold += bonusGold;
                this.terminal.println(ANSIParser.fg('bright-yellow') + `  Found ${bonusGold} gold!` + ANSIParser.reset());
            }
            
            // Rare drop
            if (Math.random() < 0.05) {
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  You found a rare item!' + ANSIParser.reset());
                this.gameState.charisma += 1;
            }
        } else {
            this.terminal.println(ANSIParser.fg('bright-red') + `  Defeat! ${monster.name} has defeated you!` + ANSIParser.reset());
            this.gameState.deaths++;
        }
        
        this.inCombat = false;
        await this.terminal.sleep(3000);
    }

    async tavern() {
        if (this.actionsRemaining <= 0) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  You are too tired! Rest for the night.' + ANSIParser.reset());
            await this.terminal.sleep(2000);
            return;
        }
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  The Tavern' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-white') + '  You enter the tavern and see Violet the barmaid.' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [T]' + ANSIParser.reset() + ' Talk to Violet');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [B]' + ANSIParser.reset() + ' Buy a drink (10 gold)');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [G]' + ANSIParser.reset() + ' Give Violet a gift (50 gold)');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [K]' + ANSIParser.reset() + ' Kiss Violet');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [L]' + ANSIParser.reset() + ' Leave');
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
        
        const choice = (await this.terminal.input()).toLowerCase();
        
        if (choice === 't') {
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-white') + '  Violet: "Hello there, adventurer! How can I help you?"' + ANSIParser.reset());
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  Press any key to continue...' + ANSIParser.reset());
            await this.terminal.input();
            this.actionsRemaining--;
        } else if (choice === 'b') {
            if (this.gameState.gold >= 10) {
                this.gameState.gold -= 10;
                this.terminal.println('');
                this.terminal.println(ANSIParser.fg('bright-green') + '  You buy a drink and chat with Violet.' + ANSIParser.reset());
                this.terminal.println(ANSIParser.fg('bright-white') + '  Violet: "Thank you! Come back soon!"' + ANSIParser.reset());
                this.gameState.violetRomance += 1;
                this.actionsRemaining--;
                await this.terminal.sleep(2000);
            } else {
                this.terminal.println(ANSIParser.fg('bright-red') + '  Not enough gold!' + ANSIParser.reset());
                await this.terminal.sleep(2000);
            }
        } else if (choice === 'g') {
            if (this.gameState.gold >= 50) {
                this.gameState.gold -= 50;
                this.terminal.println('');
                this.terminal.println(ANSIParser.fg('bright-green') + '  You give Violet a beautiful flower.' + ANSIParser.reset());
                this.terminal.println(ANSIParser.fg('bright-white') + '  Violet: "Oh, thank you! You are so kind!"' + ANSIParser.reset());
                this.gameState.violetRomance += 5;
                this.actionsRemaining--;
                await this.terminal.sleep(2000);
            } else {
                this.terminal.println(ANSIParser.fg('bright-red') + '  Not enough gold!' + ANSIParser.reset());
                await this.terminal.sleep(2000);
            }
        } else if (choice === 'k') {
            if (this.gameState.violetRomance >= 20) {
                this.terminal.println('');
                this.terminal.println(ANSIParser.fg('bright-green') + '  You kiss Violet!' + ANSIParser.reset());
                this.terminal.println(ANSIParser.fg('bright-white') + '  Violet: "I love you!"' + ANSIParser.reset());
                this.gameState.violetRomance += 10;
                this.actionsRemaining--;
                await this.terminal.sleep(2000);
            } else {
                this.terminal.println('');
                this.terminal.println(ANSIParser.fg('bright-red') + '  Violet: "I barely know you!"' + ANSIParser.reset());
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  (You need more romance points!)' + ANSIParser.reset());
                await this.terminal.sleep(2000);
            }
        }
    }

    async shop() {
        if (this.actionsRemaining <= 0) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  You are too tired! Rest for the night.' + ANSIParser.reset());
            await this.terminal.sleep(2000);
            return;
        }
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  The Shop' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-white') + '  Shopkeeper: "Welcome! What can I get for you?"' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [1]' + ANSIParser.reset() + ' Iron Sword - 100 gold (+5 STR)');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [2]' + ANSIParser.reset() + ' Steel Armor - 100 gold (+5 DEF)');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [3]' + ANSIParser.reset() + ' Health Potion - 50 gold (Restore 50 HP)');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [4]' + ANSIParser.reset() + ' Dragon Scale Armor - 500 gold (+15 DEF)');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [5]' + ANSIParser.reset() + ' Legendary Sword - 1000 gold (+20 STR)');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [6]' + ANSIParser.reset() + ' Ring of Power - 800 gold (+10 STR, +10 DEF)');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [B]' + ANSIParser.reset() + ' Back');
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
        
        const choice = (await this.terminal.input()).toLowerCase();
        
        if (choice === '1' && this.gameState.gold >= 100) {
            this.gameState.gold -= 100;
            this.gameState.strength += 5;
            this.terminal.println(ANSIParser.fg('bright-green') + '  Bought Iron Sword!' + ANSIParser.reset());
            this.actionsRemaining--;
            await this.terminal.sleep(2000);
        } else if (choice === '2' && this.gameState.gold >= 100) {
            this.gameState.gold -= 100;
            this.gameState.defense += 5;
            this.terminal.println(ANSIParser.fg('bright-green') + '  Bought Steel Armor!' + ANSIParser.reset());
            this.actionsRemaining--;
            await this.terminal.sleep(2000);
        } else if (choice === '3' && this.gameState.gold >= 50) {
            this.gameState.gold -= 50;
            this.gameState.hp = Math.min(this.gameState.maxHp, this.gameState.hp + 50);
            this.terminal.println(ANSIParser.fg('bright-green') + '  Bought Health Potion!' + ANSIParser.reset());
            this.actionsRemaining--;
            await this.terminal.sleep(2000);
        } else if (choice === '4' && this.gameState.gold >= 500) {
            this.gameState.gold -= 500;
            this.gameState.defense += 15;
            this.terminal.println(ANSIParser.fg('bright-green') + '  Bought Dragon Scale Armor!' + ANSIParser.reset());
            this.actionsRemaining--;
            await this.terminal.sleep(2000);
        } else if (choice === '5' && this.gameState.gold >= 1000) {
            this.gameState.gold -= 1000;
            this.gameState.strength += 20;
            this.terminal.println(ANSIParser.fg('bright-green') + '  Bought Legendary Sword!' + ANSIParser.reset());
            this.actionsRemaining--;
            await this.terminal.sleep(2000);
        } else if (choice === '6' && this.gameState.gold >= 800) {
            this.gameState.gold -= 800;
            this.gameState.strength += 10;
            this.gameState.defense += 10;
            this.terminal.println(ANSIParser.fg('bright-green') + '  Bought Ring of Power!' + ANSIParser.reset());
            this.actionsRemaining--;
            await this.terminal.sleep(2000);
        } else if (choice !== 'b') {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Cannot afford!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
        }
    }

    async temple() {
        if (this.actionsRemaining <= 0) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  You are too tired! Rest for the night.' + ANSIParser.reset());
            await this.terminal.sleep(2000);
            return;
        }
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  The Temple' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-white') + '  Priest: "May the gods bless you, my child."' + ANSIParser.reset());
        this.terminal.println('');
        
        if (this.gameState.gold >= 50) {
            this.gameState.gold -= 50;
            this.gameState.hp = this.gameState.maxHp;
            this.terminal.println(ANSIParser.fg('bright-green') + '  You are fully healed!' + ANSIParser.reset());
            this.actionsRemaining--;
            await this.terminal.sleep(2000);
        } else {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Not enough gold! (Need 50 gold)' + ANSIParser.reset());
            await this.terminal.sleep(2000);
        }
    }

    async inn() {
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  The Inn' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-white') + '  Innkeeper: "Welcome! Would you like a room?"' + ANSIParser.reset());
        this.terminal.println('');
        
        if (this.actionsRemaining > 0) {
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [Y]' + ANSIParser.reset() + ' Yes, rest for the night (ends day)');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [N]' + ANSIParser.reset() + ' No, not yet');
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
            
            const choice = (await this.terminal.input()).toLowerCase();
            
            if (choice === 'y') {
                this.terminal.println('');
                this.terminal.println(ANSIParser.fg('bright-green') + '  You rest for the night and are fully healed!' + ANSIParser.reset());
                this.gameState.hp = this.gameState.maxHp;
                this.actionsRemaining = 0;
                await this.terminal.sleep(2000);
            }
        } else {
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  You are already tired. Resting for the night...' + ANSIParser.reset());
            this.gameState.hp = this.gameState.maxHp;
            await this.terminal.sleep(2000);
        }
    }

    async gym() {
        if (this.actionsRemaining <= 0) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  You are too tired! Rest for the night.' + ANSIParser.reset());
            await this.terminal.sleep(2000);
            return;
        }
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  The Gym' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [S]' + ANSIParser.reset() + ' Train Strength (50 gold)');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [D]' + ANSIParser.reset() + ' Train Defense (50 gold)');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [H]' + ANSIParser.reset() + ' Train HP (100 gold)');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [C]' + ANSIParser.reset() + ' Train Charisma (100 gold)');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [B]' + ANSIParser.reset() + ' Back');
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
        
        const choice = (await this.terminal.input()).toLowerCase();
        
        if (choice === 's' && this.gameState.gold >= 50) {
            this.gameState.gold -= 50;
            this.gameState.strength += 2;
            this.terminal.println(ANSIParser.fg('bright-green') + '  Strength increased by 2!' + ANSIParser.reset());
            this.actionsRemaining--;
            await this.terminal.sleep(2000);
        } else if (choice === 'd' && this.gameState.gold >= 50) {
            this.gameState.gold -= 50;
            this.gameState.defense += 2;
            this.terminal.println(ANSIParser.fg('bright-green') + '  Defense increased by 2!' + ANSIParser.reset());
            this.actionsRemaining--;
            await this.terminal.sleep(2000);
        } else if (choice === 'h' && this.gameState.gold >= 100) {
            this.gameState.gold -= 100;
            this.gameState.maxHp += 10;
            this.gameState.hp += 10;
            this.terminal.println(ANSIParser.fg('bright-green') + '  Max HP increased by 10!' + ANSIParser.reset());
            this.actionsRemaining--;
            await this.terminal.sleep(2000);
        } else if (choice === 'c' && this.gameState.gold >= 100) {
            this.gameState.gold -= 100;
            this.gameState.charisma += 2;
            this.terminal.println(ANSIParser.fg('bright-green') + '  Charisma increased by 2!' + ANSIParser.reset());
            this.actionsRemaining--;
            await this.terminal.sleep(2000);
        } else if (choice !== 'b') {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Cannot afford!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
        }
    }

    async bank() {
        if (this.actionsRemaining <= 0) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  You are too tired! Rest for the night.' + ANSIParser.reset());
            await this.terminal.sleep(2000);
            return;
        }
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  The Bank' + ANSIParser.reset());
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
                this.actionsRemaining--;
                await this.terminal.sleep(2000);
            }
        } else if (choice === 'w') {
            this.terminal.println(ANSIParser.fg('bright-green') + '  How much to withdraw? ' + ANSIParser.reset());
            const amount = parseInt(await this.terminal.input());
            if (amount > 0 && amount <= (this.gameState.bankGold || 0)) {
                this.gameState.gold += amount;
                this.gameState.bankGold -= amount;
                this.terminal.println(ANSIParser.fg('bright-green') + `  Withdrew ${amount} gold!` + ANSIParser.reset());
                this.actionsRemaining--;
                await this.terminal.sleep(2000);
            }
        }
    }

    async showQuests() {
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  Available Quests:' + ANSIParser.reset());
        this.terminal.println('');
        
        this.quests.forEach(quest => {
            const status = quest.completed ? ANSIParser.fg('bright-green') + '[COMPLETED]' : ANSIParser.fg('bright-yellow') + '[ACTIVE]';
            this.terminal.println(`${status}${ANSIParser.reset()} ${quest.name}`);
            this.terminal.println(ANSIParser.fg('bright-white') + `    Reward: ${quest.reward} gold, ${quest.exp} XP` + ANSIParser.reset());
            this.terminal.println('');
        });
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Press any key to continue...' + ANSIParser.reset());
        await this.terminal.input();
    }

    async showPlayerStats() {
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  Your Character:' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + `  Name: ${this.gameState.gender === 'male' ? 'Hero' : 'Heroine'}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + `  Class: ${this.gameState.class.charAt(0).toUpperCase() + this.gameState.class.slice(1)}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + `  Alignment: ${this.gameState.alignment.charAt(0).toUpperCase() + this.gameState.alignment.slice(1)}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + `  Level: ${this.gameState.level}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + `  Experience: ${this.gameState.experience}/${this.gameState.level * 100}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + `  Gold: ${this.gameState.gold}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + `  HP: ${this.gameState.hp}/${this.gameState.maxHp}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + `  Strength: ${this.gameState.strength}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + `  Defense: ${this.gameState.defense}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + `  Charisma: ${this.gameState.charisma}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + `  Monsters Killed: ${this.gameState.monstersKilled}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + `  Deaths: ${this.gameState.deaths}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + `  Violet Romance: ${this.gameState.violetRomance}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + `  Days Played: ${this.gameState.daysPlayed}` + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Press any key to continue...' + ANSIParser.reset());
        await this.terminal.input();
    }

    updateQuestProgress(monsterName) {
        this.quests.forEach(quest => {
            if (!quest.completed && monsterName.includes(quest.target)) {
                quest.count--;
                if (quest.count <= 0) {
                    quest.completed = true;
                    this.gameState.gold += quest.reward;
                    this.gameState.experience += quest.exp;
                    this.gameState.questsCompleted++;
                    this.terminal.println('');
                    this.terminal.println(ANSIParser.fg('bright-yellow') + `  QUEST COMPLETED: ${quest.name}!` + ANSIParser.reset());
                    this.terminal.println(ANSIParser.fg('bright-green') + `  Received ${quest.reward} gold and ${quest.exp} XP!` + ANSIParser.reset());
                }
            }
        });
    }

    async handleDeath() {
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-red') + '  YOU DIED!' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  You have been revived at the temple.' + ANSIParser.reset());
        this.gameState.hp = this.gameState.maxHp;
        this.gameState.gold = Math.max(0, this.gameState.gold - 50);
        this.gameState.deaths++;
        await this.terminal.sleep(3000);
    }

    async checkLevelUp() {
        const expNeeded = this.gameState.level * 100;
        if (this.gameState.experience >= expNeeded) {
            this.gameState.level++;
            this.gameState.strength += 3;
            this.gameState.defense += 2;
            this.gameState.maxHp += 20;
            this.gameState.hp = this.gameState.maxHp;
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-yellow') + `  LEVEL UP! You are now level ${this.gameState.level}!` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-green') + '  +3 Strength, +2 Defense, +20 Max HP!' + ANSIParser.reset());
            await this.terminal.sleep(3000);
        }
    }

    async endOfDay() {
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  The day comes to an end...' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  You must rest at the inn to continue.' + ANSIParser.reset());
        await this.terminal.sleep(2000);
    }

    showStatus() {
        this.terminal.println(ANSIParser.fg('bright-cyan') + '╔══════════════════════════════════════════════════════════════════════════════╗' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '║' + ANSIParser.reset() + 
            ANSIParser.fg('bright-white') + '  LEGEND OF THE RED DRAGON' + ANSIParser.reset() + 
            ' '.repeat(55) + ANSIParser.fg('bright-cyan') + '║' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '╚══════════════════════════════════════════════════════════════════════════════╝' + ANSIParser.reset());
        this.terminal.println('');
        const heroName = this.gameState.name || 'Hero';
        const loginUser = this.gameState.loginUsername || 'Guest';
        this.terminal.println(ANSIParser.fg('bright-yellow') + `  Hero: ${heroName} (${loginUser})  |  Class: ${this.gameState.class.charAt(0).toUpperCase() + this.gameState.class.slice(1)}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + `  Level: ${this.gameState.level}  |  HP: ${this.gameState.hp}/${this.gameState.maxHp}  |  Gold: ${this.gameState.gold}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + `  Strength: ${this.gameState.strength}  |  Defense: ${this.gameState.defense}  |  Charisma: ${this.gameState.charisma}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + `  Exp: ${this.gameState.experience}/${this.gameState.level * 100}  |  Day: ${this.currentDay}  |  Violet: ${this.gameState.violetRomance}` + ANSIParser.reset());
    }

    async loadGameState() {
        try {
            const currentUser = this.authManager.getCurrentUser();
            const userId = currentUser ? currentUser.id : null;
            
            // First try to load from LORD-specific API
            if (this.gameState && this.gameState.name) {
                const response = await fetch('/api/lord/player', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        playerName: this.gameState.name,
                        userId: userId
                    })
                });
                
                if (response.ok) {
                    const data = await response.json();
                    if (data.player) {
                        this.gameState = { ...this.gameState, ...data.player };
                        console.log('Loaded LORD player data:', data.player.name);
                        return;
                    }
                }
            }
            
            // Fallback to general game state API
            const response = await fetch(`/api/game-state/lord`);
            const state = await response.json();
            if (state && state.game_data) {
                this.gameState = { ...this.gameState, ...JSON.parse(state.game_data) };
            }
        } catch (error) {
            // No saved game state yet, start fresh
            console.log('Starting new LORD game');
        }
    }

    async saveGameState() {
        try {
            // Save to LORD-specific API if we have a character name
            if (this.gameState && this.gameState.name) {
                const currentUser = this.authManager.getCurrentUser();
                const userId = currentUser ? currentUser.id : null;
                
                const response = await fetch('/api/lord/save', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        player: this.gameState,
                        userId: userId
                    })
                });
                
                if (response.ok) {
                    console.log('Saved LORD player data:', this.gameState.name);
                    return;
                }
            }
            
            // Fallback to general game state API
            await fetch(`/api/game-state/lord`, {
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
║                    LEGEND OF THE RED DRAGON                                   ║
║                                                                              ║
║                      "The Classic BBS RPG"                                    ║
║                                                                              ║
║  Welcome to the realm of adventure! Fight monsters, gain experience,        ║
║  level up, and become the legendary hero who slays the Red Dragon!          ║
║                                                                              ║
║  By Seth Robinson - Recreated for Modern BBS                                 ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
`;
    }

    async viewLeaderboards() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + this.getTitle() + ANSIParser.reset());
        this.terminal.println('');
        
        try {
            const response = await fetch('/api/game-state/lord/leaderboard', {
                credentials: 'include'
            });
            const data = await response.json();
            
            // Show Top Levels Leaderboard
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  🏆 TOP LEVELS LEADERBOARD' + ANSIParser.reset());
            this.terminal.println('');
            
            if (data.topLevels.length === 0) {
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  No heroes yet!' + ANSIParser.reset());
            } else {
                this.terminal.println(ANSIParser.fg('bright-cyan') + '  Rank  Hero Name         Class     Level  Experience  Gold    Dragon Slayer' + ANSIParser.reset());
                this.terminal.println(ANSIParser.fg('bright-white') + '  ────────────────────────────────────────────────────────────────────────' + ANSIParser.reset());
                
                data.topLevels.forEach((entry, index) => {
                    const rank = (index + 1).toString().padStart(2);
                    const name = entry.playerName.padEnd(16);
                    const className = entry.class.padEnd(8);
                    const level = entry.level.toString().padStart(5);
                    const exp = entry.experience.toString().padStart(10);
                    const gold = entry.gold.toString().padStart(8);
                    const dragonSlayer = entry.redDragonDefeated ? '🐉' : '';
                    const color = index === 0 ? 'bright-yellow' : index < 3 ? 'bright-green' : 'bright-cyan';
                    this.terminal.println(ANSIParser.fg(color) + `  ${rank}.  ${name}  ${className}  ${level}  ${exp}  ${gold}  ${dragonSlayer}` + ANSIParser.reset());
                });
            }
            
            this.terminal.println('');
            
            // Show Top Gold Leaderboard
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  💰 RICHEST HEROES LEADERBOARD' + ANSIParser.reset());
            this.terminal.println('');
            
            if (data.topGold.length === 0) {
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  No heroes yet!' + ANSIParser.reset());
            } else {
                this.terminal.println(ANSIParser.fg('bright-cyan') + '  Rank  Hero Name         Class     Level  Gold        Dragon Slayer' + ANSIParser.reset());
                this.terminal.println(ANSIParser.fg('bright-white') + '  ────────────────────────────────────────────────────────────────' + ANSIParser.reset());
                
                data.topGold.forEach((entry, index) => {
                    const rank = (index + 1).toString().padStart(2);
                    const name = entry.playerName.padEnd(16);
                    const className = entry.class.padEnd(8);
                    const level = entry.level.toString().padStart(5);
                    const gold = entry.gold.toString().padStart(10);
                    const dragonSlayer = entry.redDragonDefeated ? '🐉' : '';
                    const color = index === 0 ? 'bright-yellow' : index < 3 ? 'bright-green' : 'bright-cyan';
                    this.terminal.println(ANSIParser.fg(color) + `  ${rank}.  ${name}  ${className}  ${level}  ${gold}  ${dragonSlayer}` + ANSIParser.reset());
                });
            }
            
            this.terminal.println('');
            
            // Show Dragon Slayers
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  🐉 RED DRAGON SLAYERS (Chronological Order)' + ANSIParser.reset());
            this.terminal.println('');
            
            if (data.dragonSlayers.length === 0) {
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  No dragon slayers yet! Be the first to defeat the Red Dragon!' + ANSIParser.reset());
            } else {
                this.terminal.println(ANSIParser.fg('bright-cyan') + '  Rank  Hero Name         Class     Level  Defeated At' + ANSIParser.reset());
                this.terminal.println(ANSIParser.fg('bright-white') + '  ────────────────────────────────────────────────────' + ANSIParser.reset());
                
                data.dragonSlayers.forEach((entry, index) => {
                    const rank = (index + 1).toString().padStart(2);
                    const name = entry.playerName.padEnd(16);
                    const className = entry.class.padEnd(8);
                    const level = entry.level.toString().padStart(5);
                    const defeatedAt = entry.defeatedAt ? new Date(entry.defeatedAt).toLocaleDateString() : 'Unknown';
                    const color = index === 0 ? 'bright-yellow' : index < 3 ? 'bright-green' : 'bright-cyan';
                    this.terminal.println(ANSIParser.fg(color) + `  ${rank}.  ${name}  ${className}  ${level}  ${defeatedAt}` + ANSIParser.reset());
                });
            }
            
        } catch (error) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Could not load leaderboards.' + ANSIParser.reset());
        }
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + '  Press any key to continue...' + ANSIParser.reset());
        await this.terminal.input();
    }

    async enterArena() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + this.getTitle() + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  ⚔️  ARENA - PvP COMBAT  ⚔️' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-white') + '  Welcome to the Arena, where heroes test their might!' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  Challenge other players to combat and prove your worth!' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-cyan') + `  Your Stats:` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + `    Level: ${this.gameState.level}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + `    HP: ${this.gameState.hp}/${this.gameState.maxHp}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + `    Strength: ${this.gameState.strength}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + `    Defense: ${this.gameState.defense}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + `    Gold: ${this.gameState.gold}` + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [C]' + ANSIParser.reset() + ' Challenge a player');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [S]' + ANSIParser.reset() + ' View arena stats');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [B]' + ANSIParser.reset() + ' Back to main menu');
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
        
        const choice = (await this.terminal.input()).toLowerCase();
        
        if (choice === 'c') {
            await this.challengePlayer();
        } else if (choice === 's') {
            await this.viewArenaStats();
        } else if (choice === 'b') {
            return;
        }
    }

    async challengePlayer() {
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  ⚔️  CHALLENGE PLAYER' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-white') + '  Enter the name of the player you want to challenge:' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + '  Player name: ' + ANSIParser.reset());
        
        const playerName = await this.terminal.input();
        
        if (!playerName.trim()) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Invalid player name!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
            return;
        }
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-yellow') + `  Challenging ${playerName} to combat...` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  (This feature is coming soon - PvP system in development!)' + ANSIParser.reset());
        
        await this.terminal.sleep(3000);
    }

    async viewArenaStats() {
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  📊  ARENA STATISTICS' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-white') + '  Arena statistics will be available once PvP is fully implemented!' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  Features coming soon:' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + '    • Win/Loss record' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + '    • Combat rating' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + '    • Tournament brackets' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + '    • Arena rankings' + ANSIParser.reset());
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + '  Press any key to continue...' + ANSIParser.reset());
        await this.terminal.input();
    }
}

// Export for use in other modules
window.LORD = LORD;
