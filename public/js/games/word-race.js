// WORD RACE - Multiplayer Typing Competition
// Race against other players in real-time typing challenges!

class WordRace {
    constructor(terminal, socketClient, authManager) {
        this.terminal = terminal;
        this.socketClient = socketClient;
        this.authManager = authManager;
        this.gameState = {
            active: false,
            players: [],
            currentText: '',
            startTime: null,
            results: [],
            waitingForPlayers: false
        };
        
        // Player statistics
        this.playerStats = {
            bestWPM: 0,
            totalRaces: 0,
            wins: 0,
            losses: 0,
            totalWordsTyped: 0,
            totalTimeTyping: 0,
            averageWPM: 0,
            perfectRaces: 0,
            achievements: []
        };
        
        this.texts = [
            "The quick brown fox jumps over the lazy dog.",
            "To be or not to be, that is the question.",
            "In the beginning was the Word, and the Word was with God.",
            "It was the best of times, it was the worst of times.",
            "Call me Ishmael. Some years ago—never mind how long precisely.",
            "The sun was shining on the sea, shining with all his might.",
            "Once upon a time in a galaxy far, far away.",
            "Elementary, my dear Watson.",
            "May the Force be with you.",
            "Live long and prosper.",
            "Beam me up, Scotty!",
            "I'll be back.",
            "Houston, we have a problem.",
            "That's one small step for man, one giant leap for mankind.",
            "The answer is 42.",
            "In space, no one can hear you scream.",
            "I'm going to make him an offer he can't refuse.",
            "Here's looking at you, kid.",
            "Frankly, my dear, I don't give a damn.",
            "You can't handle the truth!"
        ];
    }

    async play() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + this.getHeader() + ANSIParser.reset());
        
        // Load player statistics
        await this.loadPlayerStats();
        
        this.terminal.println(ANSIParser.fg('bright-white') + '  Welcome to WORD RACE!' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Race against other players in real-time typing challenges!' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + '  [1]' + ANSIParser.reset() + ' Join Race');
        this.terminal.println(ANSIParser.fg('bright-green') + '  [2]' + ANSIParser.reset() + ' Create New Race');
        this.terminal.println(ANSIParser.fg('bright-green') + '  [3]' + ANSIParser.reset() + ' Practice Mode (Solo)');
        this.terminal.println(ANSIParser.fg('bright-green') + '  [4]' + ANSIParser.reset() + ' View Leaderboard');
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  [5]' + ANSIParser.reset() + ' View My Statistics');
        this.terminal.println(ANSIParser.fg('bright-red') + '  [0]' + ANSIParser.reset() + ' Back to Games');
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  Select option: ' + ANSIParser.reset());
        
        const choice = await this.terminal.input();
        
        switch(choice) {
            case '1':
                return await this.joinRace();
            case '2':
                return await this.createRace();
            case '3':
                return await this.practiceMode();
            case '4':
                return await this.showLeaderboard();
            case '5':
                await this.showPlayerStats();
                await this.terminal.input();
                return 'doors';
            case '0':
                return 'doors';
            default:
                this.terminal.println(ANSIParser.fg('bright-red') + '  Invalid selection.' + ANSIParser.reset());
                await this.terminal.sleep(1500);
                return 'doors';
        }
    }

    async joinRace() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + this.getHeader() + ANSIParser.reset());
        
        // Listen for race events
        this.socketClient.socket.on('word-race-start', (data) => {
            this.startRace(data);
        });
        
        this.socketClient.socket.on('word-race-update', (data) => {
            this.updateRace(data);
        });
        
        this.socketClient.socket.on('word-race-finish', (data) => {
            this.finishRace(data);
        });
        
        // Join the race
        this.socketClient.socket.emit('join-word-race', {
            player: this.authManager.getCurrentUser().handle
        });
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Waiting for other players...' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  Players in lobby:' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-red') + '  Type QUIT to exit waiting room' + ANSIParser.reset());
        
        // Wait for race to start with exit option
        let exitRequested = false;
        const inputPromise = this.terminal.input().then(input => {
            if (input.toUpperCase() === 'QUIT') {
                exitRequested = true;
            }
        });
        
        while (!this.gameState.active && !exitRequested) {
            const timeoutPromise = new Promise(resolve => setTimeout(resolve, 1000));
            const result = await Promise.race([inputPromise, timeoutPromise]);
            
            if (exitRequested) {
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  Leaving waiting room...' + ANSIParser.reset());
                break;
            }
            
            if (this.gameState.waitingForPlayers) {
                this.terminal.println(ANSIParser.fg('bright-green') + `  ${this.gameState.players.length} player(s) waiting...` + ANSIParser.reset());
            }
        }
        
        if (exitRequested) {
            return 'doors';
        }
        
        return 'doors';
    }

    async createRace() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + this.getHeader() + ANSIParser.reset());
        
        this.terminal.println(ANSIParser.fg('bright-white') + '  Creating new race...' + ANSIParser.reset());
        
        // Select text for race
        const randomText = this.texts[Math.floor(Math.random() * this.texts.length)];
        
        // Start race
        this.socketClient.socket.emit('create-word-race', {
            text: randomText,
            creator: this.authManager.getCurrentUser().handle
        });
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  Race created! Waiting for players...' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  Text to type:' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + `  "${randomText}"` + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Press ENTER to start race (minimum 2 players)...' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-red') + '  Type QUIT to cancel race' + ANSIParser.reset());
        
        const input = await this.terminal.input();
        if (input.toUpperCase() === 'QUIT') {
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  Race cancelled.' + ANSIParser.reset());
            await this.terminal.sleep(1000);
            return 'doors';
        }
        
        // Start the race
        this.socketClient.socket.emit('start-word-race');
        
        return 'doors';
    }

    async startRace(data) {
        this.gameState.active = true;
        this.gameState.currentText = data.text;
        this.gameState.startTime = Date.now();
        this.gameState.players = data.players;
        
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + this.getHeader() + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  RACE STARTING IN 3...' + ANSIParser.reset());
        await this.terminal.sleep(1000);
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  RACE STARTING IN 2...' + ANSIParser.reset());
        await this.terminal.sleep(1000);
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  RACE STARTING IN 1...' + ANSIParser.reset());
        await this.terminal.sleep(1000);
        
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + this.getHeader() + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + '  GO! Type this text as fast as you can:' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-white') + `  "${this.gameState.currentText}"` + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  Type here: ' + ANSIParser.reset());
        
        const startTime = Date.now();
        const userInput = await this.terminal.input();
        const endTime = Date.now();
        const timeTaken = (endTime - startTime) / 1000;
        
        // Calculate WPM and accuracy
        const words = this.gameState.currentText.split(' ').length;
        const wpm = Math.round((words / timeTaken) * 60);
        const accuracy = this.calculateAccuracy(this.gameState.currentText, userInput);
        
        // Send results
        this.socketClient.socket.emit('word-race-result', {
            player: this.authManager.getCurrentUser().handle,
            time: timeTaken,
            wpm: wpm,
            accuracy: accuracy,
            text: userInput
        });
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + `  Your time: ${timeTaken.toFixed(2)} seconds` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + `  Your WPM: ${wpm}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + `  Your accuracy: ${accuracy}%` + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Waiting for other players to finish...' + ANSIParser.reset());
    }

    calculateAccuracy(original, typed) {
        const originalChars = original.toLowerCase().split('');
        const typedChars = typed.toLowerCase().split('');
        
        let correct = 0;
        const maxLength = Math.max(originalChars.length, typedChars.length);
        
        for (let i = 0; i < maxLength; i++) {
            if (originalChars[i] === typedChars[i]) {
                correct++;
            }
        }
        
        return Math.round((correct / maxLength) * 100);
    }

    updateRace(data) {
        // Update player progress
        this.terminal.println(ANSIParser.fg('bright-cyan') + `  ${data.player} finished! Time: ${data.time.toFixed(2)}s, WPM: ${data.wpm}` + ANSIParser.reset());
    }

    async finishRace(data) {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + this.getHeader() + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  RACE RESULTS:' + ANSIParser.reset());
        this.terminal.println('');
        
        // Sort results by WPM
        const sortedResults = data.results.sort((a, b) => b.wpm - a.wpm);
        
        for (let i = 0; i < sortedResults.length; i++) {
            const result = sortedResults[i];
            const position = i + 1;
            let positionColor = ANSIParser.fg('bright-white');
            
            if (position === 1) positionColor = ANSIParser.fg('bright-yellow');
            else if (position === 2) positionColor = ANSIParser.fg('bright-black');
            else if (position === 3) positionColor = ANSIParser.fg('bright-red');
            
            this.terminal.println(positionColor + `  ${position}. ${result.player}` + ANSIParser.reset() + 
                ANSIParser.fg('bright-cyan') + ` - ${result.wpm} WPM` + ANSIParser.reset() + 
                ANSIParser.fg('bright-green') + ` (${result.accuracy}% accuracy)` + ANSIParser.reset() + 
                ANSIParser.fg('bright-black') + ` - ${result.time.toFixed(2)}s` + ANSIParser.reset());
        }
        
        // Update player statistics
        const currentUser = this.authManager.getCurrentUser();
        if (currentUser && data.results) {
            const playerResult = data.results.find(r => r.player === currentUser.handle);
            if (playerResult) {
                const wordsTyped = this.gameState.currentText.split(' ').length;
                const won = data.results.sort((a, b) => b.wpm - a.wpm)[0].player === currentUser.handle;
                const perfect = playerResult.accuracy === 100;
                
                this.updateStats(playerResult.wpm, playerResult.accuracy, wordsTyped, playerResult.time, won, perfect);
            }
        }
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  Press ENTER to continue...' + ANSIParser.reset());
        await this.terminal.input();
        
        // Clean up
        this.gameState.active = false;
        this.gameState.players = [];
        this.gameState.results = [];
    }

    async practiceMode() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + this.getHeader() + ANSIParser.reset());
        
        this.terminal.println(ANSIParser.fg('bright-white') + '  Practice Mode - Solo Typing Challenge!' + ANSIParser.reset());
        this.terminal.println('');
        
        // Select random text
        const randomText = this.texts[Math.floor(Math.random() * this.texts.length)];
        
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  Type this text as fast as you can:' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-white') + `  "${randomText}"` + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Ready? Press ENTER to start...' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-red') + '  Type QUIT to exit' + ANSIParser.reset());
        
        const input = await this.terminal.input();
        if (input.toUpperCase() === 'QUIT') {
            return 'doors';
        }
        
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + this.getHeader() + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + '  GO! Type this text:' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-white') + `  "${randomText}"` + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  Type here: ' + ANSIParser.reset());
        
        const startTime = Date.now();
        const userInput = await this.terminal.input();
        const endTime = Date.now();
        const timeTaken = (endTime - startTime) / 1000;
        
        // Calculate WPM and accuracy
        const words = randomText.split(' ').length;
        const wpm = Math.round((words / timeTaken) * 60);
        const accuracy = this.calculateAccuracy(randomText, userInput);
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  PRACTICE RESULTS:' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + `  Time: ${timeTaken.toFixed(2)} seconds` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + `  WPM: ${wpm}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + `  Accuracy: ${accuracy}%` + ANSIParser.reset());
        this.terminal.println('');
        
        if (wpm >= 60) {
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  Excellent typing speed!' + ANSIParser.reset());
        } else if (wpm >= 40) {
            this.terminal.println(ANSIParser.fg('bright-green') + '  Good typing speed!' + ANSIParser.reset());
        } else {
            this.terminal.println(ANSIParser.fg('bright-cyan') + '  Keep practicing to improve your speed!' + ANSIParser.reset());
        }
        
        // Update practice statistics (not counted as wins/losses)
        const perfect = accuracy === 100;
        this.updateStats(wpm, accuracy, words, timeTaken, false, perfect);
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  Press ENTER to continue...' + ANSIParser.reset());
        await this.terminal.input();
        
        return 'doors';
    }

    async showLeaderboard() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + this.getHeader() + ANSIParser.reset());
        
        this.terminal.println(ANSIParser.fg('bright-white') + '  WORD RACE LEADERBOARD' + ANSIParser.reset());
        this.terminal.println('');
        
        // Get leaderboard from server
        try {
            const response = await fetch('/api/word-race/leaderboard');
            const leaderboard = await response.json();
            
            if (leaderboard.length === 0) {
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  No races completed yet!' + ANSIParser.reset());
            } else {
                for (let i = 0; i < Math.min(leaderboard.length, 10); i++) {
                    const player = leaderboard[i];
                    const position = i + 1;
                    let positionColor = ANSIParser.fg('bright-white');
                    
                    if (position === 1) positionColor = ANSIParser.fg('bright-yellow');
                    else if (position === 2) positionColor = ANSIParser.fg('bright-black');
                    else if (position === 3) positionColor = ANSIParser.fg('bright-red');
                    
                    this.terminal.println(positionColor + `  ${position}. ${player.handle}` + ANSIParser.reset() + 
                        ANSIParser.fg('bright-cyan') + ` - Best WPM: ${player.best_wpm}` + ANSIParser.reset() + 
                        ANSIParser.fg('bright-green') + ` (${player.races_won} wins)` + ANSIParser.reset());
                }
            }
        } catch (error) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Error loading leaderboard.' + ANSIParser.reset());
        }
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  Press ENTER to continue...' + ANSIParser.reset());
        await this.terminal.input();
        
        return 'doors';
    }

    async loadPlayerStats() {
        try {
            const currentUser = this.authManager.getCurrentUser();
            if (!currentUser || !currentUser.id) {
                // Not logged in, use default stats
                return;
            }
            
            const response = await fetch('/api/game-state/word-race-stats', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'load',
                    userId: currentUser.id
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.stats) {
                    this.playerStats = { ...this.playerStats, ...JSON.parse(data.stats.game_data) };
                }
            }
        } catch (error) {
            // Use default stats if loading fails
            console.log('Using default Word Race stats');
        }
    }

    async savePlayerStats() {
        try {
            const currentUser = this.authManager.getCurrentUser();
            if (!currentUser || !currentUser.id) {
                // Not logged in, skip saving
                return;
            }
            
            await fetch('/api/game-state/word-race-stats', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'save',
                    userId: currentUser.id,
                    stats: this.playerStats
                })
            });
        } catch (error) {
            console.log('Word Race stats saving not available');
        }
    }

    updateStats(wpm, accuracy, wordsTyped, timeSpent, won = false, perfect = false) {
        // Update best WPM
        if (wpm > this.playerStats.bestWPM) {
            this.playerStats.bestWPM = wpm;
        }
        
        // Update totals
        this.playerStats.totalRaces++;
        this.playerStats.totalWordsTyped += wordsTyped;
        this.playerStats.totalTimeTyping += timeSpent;
        
        // Update win/loss record
        if (won) {
            this.playerStats.wins++;
        } else {
            this.playerStats.losses++;
        }
        
        // Update perfect races
        if (perfect) {
            this.playerStats.perfectRaces++;
        }
        
        // Calculate average WPM
        if (this.playerStats.totalTimeTyping > 0) {
            this.playerStats.averageWPM = Math.round(
                (this.playerStats.totalWordsTyped / 5) / (this.playerStats.totalTimeTyping / 60)
            );
        }
        
        // Check for achievements
        this.checkAchievements();
        
        // Save stats
        this.savePlayerStats();
    }

    checkAchievements() {
        const achievements = this.playerStats.achievements || [];
        
        // Speed achievements
        if (this.playerStats.bestWPM >= 50 && !achievements.includes('speed_demon')) {
            achievements.push('speed_demon');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  🏆 Achievement Unlocked: Speed Demon (50+ WPM)!' + ANSIParser.reset());
        }
        
        if (this.playerStats.bestWPM >= 100 && !achievements.includes('typing_master')) {
            achievements.push('typing_master');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  🏆 Achievement Unlocked: Typing Master (100+ WPM)!' + ANSIParser.reset());
        }
        
        // Win achievements
        if (this.playerStats.wins >= 10 && !achievements.includes('race_champion')) {
            achievements.push('race_champion');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  🏆 Achievement Unlocked: Race Champion (10+ wins)!' + ANSIParser.reset());
        }
        
        if (this.playerStats.wins >= 50 && !achievements.includes('typing_legend')) {
            achievements.push('typing_legend');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  🏆 Achievement Unlocked: Typing Legend (50+ wins)!' + ANSIParser.reset());
        }
        
        // Perfect race achievements
        if (this.playerStats.perfectRaces >= 5 && !achievements.includes('perfectionist')) {
            achievements.push('perfectionist');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  🏆 Achievement Unlocked: Perfectionist (5+ perfect races)!' + ANSIParser.reset());
        }
        
        this.playerStats.achievements = achievements;
    }

    showPlayerStats() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  YOUR WORD RACE STATISTICS' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Performance:' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + `    Best WPM: ${this.playerStats.bestWPM}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + `    Average WPM: ${this.playerStats.averageWPM}` + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Racing Record:' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + `    Total Races: ${this.playerStats.totalRaces}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + `    Wins: ${this.playerStats.wins}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-red') + `    Losses: ${this.playerStats.losses}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + `    Perfect Races: ${this.playerStats.perfectRaces}` + ANSIParser.reset());
        this.terminal.println('');
        
        if (this.playerStats.achievements && this.playerStats.achievements.length > 0) {
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  Achievements:' + ANSIParser.reset());
            this.playerStats.achievements.forEach(achievement => {
                this.terminal.println(ANSIParser.fg('bright-green') + `    🏆 ${achievement.replace(/_/g, ' ').toUpperCase()}` + ANSIParser.reset());
            });
        }
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  Press ENTER to continue...' + ANSIParser.reset());
    }

    getHeader() {
        return `
╔══════════════════════════════════════════════════════════════════════════════╗
║                         WORD RACE                                           ║
║                    Multiplayer Typing Competition                           ║
╚══════════════════════════════════════════════════════════════════════════════╝
        `;
    }
}

// Export for use in other modules
window.WordRace = WordRace;
