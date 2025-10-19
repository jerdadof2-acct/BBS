// High Noon Duel - Western Shootout Game
class HighNoonDuel {
    constructor(terminal, socketClient, authManager) {
        this.terminal = terminal;
        this.socketClient = socketClient;
        this.authManager = authManager;
        this.gameState = {
            wins: 0,
            losses: 0,
            draws: 0,
            fastestDraw: 0,
            totalDuels: 0,
            accuracy: 100
        };
    }

    async play() {
        await this.loadGameState();
        
        while (true) {
            this.terminal.clear();
            await this.showWelcomeScreen();
            
            const choice = (await this.terminal.input()).toLowerCase();
            
            if (choice === '1') {
                await this.quickDuel();
            } else if (choice === '2') {
                await this.tournament();
            } else if (choice === '3') {
                await this.stats();
            } else if (choice === 'q') {
                await this.saveGameState();
                return 'doors';
            }
        }
    }

    async showWelcomeScreen() {
        await this.showIntroAnimation();
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + this.getTitle() + ANSIParser.reset());
        this.terminal.println('');
        
        // Rules explanation
        this.terminal.println(ANSIParser.fg('bright-white') + '  ═══════════════════════════════════════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  HOW TO PLAY:' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  ═══════════════════════════════════════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('white') + '  1. Wait for the countdown: "3... 2... 1..."' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('white') + '  2. When you see "DRAW!", press SPACE as fast as you can!' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('white') + '  3. The fastest draw wins the duel!' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-red') + '  4. WARNING: Draw too early and you LOSE automatically!' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  TIP: Stay focused and wait for "DRAW!" before pressing SPACE' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-white') + '  ═══════════════════════════════════════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println('');
        
        // Menu options
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [1]' + ANSIParser.reset() + ' Quick Duel (vs AI)');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [2]' + ANSIParser.reset() + ' Tournament Mode');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [3]' + ANSIParser.reset() + ' Your Statistics');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [Q]' + ANSIParser.reset() + ' Quit to Door Games');
        this.terminal.println('');
        
        if (this.gameState.totalDuels > 0) {
            this.terminal.println(ANSIParser.fg('bright-green') + 
                `  Record: ${this.gameState.wins}W - ${this.gameState.losses}L - ${this.gameState.draws}D  |  ` +
                `Fastest: ${this.gameState.fastestDraw > 0 ? this.gameState.fastestDraw.toFixed(3) + 's' : 'N/A'}` + 
                ANSIParser.reset());
            this.terminal.println('');
        }
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
    }

    async quickDuel() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-yellow') + '╔══════════════════════════════════════════════════════════════════════════════╗' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '║' + ANSIParser.reset() + 
            ANSIParser.fg('bright-white') + '  QUICK DUEL - SELECT YOUR OPPONENT' + ANSIParser.reset() + 
            ' '.repeat(40) + ANSIParser.fg('bright-yellow') + '║' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '╚══════════════════════════════════════════════════════════════════════════════╝' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  [1]' + ANSIParser.reset() + ' Rookie Randy (Easy)');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [2]' + ANSIParser.reset() + ' Quick-Draw Quinn (Medium)');
        this.terminal.println(ANSIParser.fg('bright-red') + '  [3]' + ANSIParser.reset() + ' Lightning Luke (Hard)');
        this.terminal.println(ANSIParser.fg('bright-magenta') + '  [4]' + ANSIParser.reset() + ' Deadeye Dan (Expert)');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [B]' + ANSIParser.reset() + ' Back to Main Menu');
        this.terminal.println('');
        
        const choice = (await this.terminal.input()).toLowerCase();
        
        if (choice === '1') {
            await this.startDuel('Rookie Randy', 0.4, 0.6);
        } else if (choice === '2') {
            await this.startDuel('Quick-Draw Quinn', 0.25, 0.4);
        } else if (choice === '3') {
            await this.startDuel('Lightning Luke', 0.15, 0.3);
        } else if (choice === '4') {
            await this.startDuel('Deadeye Dan', 0.1, 0.2);
        }
    }

    async startDuel(opponentName, minTime, maxTime) {
        this.terminal.clear();
        
        // Animated duel setup
        await this.showDuelSetup(opponentName);
        
        // Atmospheric setup with animations
        await this.showAtmosphere();
        
        // Animated countdown
        await this.showCountdown();
        
        // Random delay before DRAW
        const drawDelay = 500 + Math.random() * 1500;
        
        // Start timing
        const startTime = Date.now();
        let playerPressed = false;
        let playerTime = 0;
        let tooEarly = false;
        
        // Set up key listener
        const keyHandler = (e) => {
            if (e.key === ' ' && !playerPressed) {
                playerPressed = true;
                playerTime = (Date.now() - startTime) / 1000;
                
                if (playerTime < drawDelay / 1000) {
                    tooEarly = true;
                }
            }
        };
        
        document.addEventListener('keydown', keyHandler);
        
        // Wait for draw delay
        await this.terminal.sleep(drawDelay);
        
        // Show dramatic DRAW animation
        await this.showDrawAnimation();
        
        // Wait for player input (max 2 seconds)
        const maxWaitTime = 2000;
        const waitStart = Date.now();
        
        while (!playerPressed && (Date.now() - waitStart) < maxWaitTime) {
            await this.terminal.sleep(50);
        }
        
        document.removeEventListener('keydown', keyHandler);
        
        // Calculate opponent time
        const opponentTime = minTime + Math.random() * (maxTime - minTime);
        
        // Determine winner and show result animation
        await this.terminal.sleep(500);
        
        if (tooEarly) {
            await this.showResultAnimation('defeat', 0, 0, opponentName);
            this.terminal.println(ANSIParser.fg('bright-red') + '  💀 YOU DREW TOO EARLY! DISQUALIFIED! 💀' + ANSIParser.reset());
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-yellow') + `  ${opponentName} wins by default!` + ANSIParser.reset());
            this.gameState.losses++;
        } else if (!playerPressed) {
            await this.showResultAnimation('defeat', 0, opponentTime, opponentName);
            this.terminal.println(ANSIParser.fg('bright-red') + '  💀 TOO SLOW! YOU DIDN\'T DRAW IN TIME! 💀' + ANSIParser.reset());
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-yellow') + `  ${opponentName} drew in ${opponentTime.toFixed(3)}s` + ANSIParser.reset());
            this.gameState.losses++;
        } else {
            const adjustedPlayerTime = playerTime - (drawDelay / 1000);
            
            this.terminal.clear();
            this.terminal.println(ANSIParser.fg('bright-cyan') + '  ═══════════════════════════════════════════════════════════════════════════' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-white') + `  Your draw time: ${adjustedPlayerTime.toFixed(3)}s` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-white') + `  ${opponentName}'s time: ${opponentTime.toFixed(3)}s` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-cyan') + '  ═══════════════════════════════════════════════════════════════════════════' + ANSIParser.reset());
            this.terminal.println('');
            
            if (adjustedPlayerTime < opponentTime) {
                await this.showResultAnimation('victory', adjustedPlayerTime, opponentTime, opponentName);
                this.terminal.println(ANSIParser.fg('bright-green') + '  🎉 VICTORY! YOU WIN THE DUEL! 🎉' + ANSIParser.reset());
                this.terminal.println('');
                this.terminal.println(ANSIParser.fg('bright-yellow') + `  You were ${(opponentTime - adjustedPlayerTime).toFixed(3)}s faster!` + ANSIParser.reset());
                this.gameState.wins++;
                
                if (this.gameState.fastestDraw === 0 || adjustedPlayerTime < this.gameState.fastestDraw) {
                    this.gameState.fastestDraw = adjustedPlayerTime;
                    this.terminal.println(ANSIParser.fg('bright-green') + '  ⚡ NEW PERSONAL BEST! ⚡' + ANSIParser.reset());
                }
            } else if (adjustedPlayerTime > opponentTime) {
                await this.showResultAnimation('defeat', adjustedPlayerTime, opponentTime, opponentName);
                this.terminal.println(ANSIParser.fg('bright-red') + '  💀 DEFEAT! YOU LOSE THE DUEL! 💀' + ANSIParser.reset());
                this.terminal.println('');
                this.terminal.println(ANSIParser.fg('bright-yellow') + `  ${opponentName} was ${(adjustedPlayerTime - opponentTime).toFixed(3)}s faster!` + ANSIParser.reset());
                this.gameState.losses++;
            } else {
                await this.showResultAnimation('draw', adjustedPlayerTime, opponentTime, opponentName);
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  🤝 DRAW! BOTH DREW AT THE SAME TIME! 🤝' + ANSIParser.reset());
                this.gameState.draws++;
            }
        }
        
        this.gameState.totalDuels++;
        
        this.terminal.println('');
        this.terminal.println('  Press any key to continue...');
        await this.terminal.input();
    }

    async showDuelSetup(opponentName) {
        // Animated title with gun smoke effect
        this.terminal.println(ANSIParser.fg('bright-yellow') + '╔══════════════════════════════════════════════════════════════════════════════╗' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '║' + ANSIParser.reset() + 
            ANSIParser.fg('bright-white') + `  HIGH NOON DUEL: YOU vs ${opponentName.toUpperCase()}` + ANSIParser.reset() + 
            ' '.repeat(78 - 30 - opponentName.length) + ANSIParser.fg('bright-yellow') + '║' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '╚══════════════════════════════════════════════════════════════════════════════╝' + ANSIParser.reset());
        this.terminal.println('');
        
        // Animated gun smoke
        for (let i = 0; i < 3; i++) {
            this.terminal.println(ANSIParser.fg('bright-black') + '  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░' + ANSIParser.reset());
            await this.terminal.sleep(300);
        }
        this.terminal.println('');
    }

    async showAtmosphere() {
        // Dust clouds animation
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  ☀️ The sun beats down on the dusty street...' + ANSIParser.reset());
        await this.terminal.sleep(1500);
        
        // Animated dust particles
        for (let i = 0; i < 5; i++) {
            const dust = '░'.repeat(Math.floor(Math.random() * 20) + 10);
            this.terminal.println(ANSIParser.fg('bright-black') + `  ${dust}` + ANSIParser.reset());
            await this.terminal.sleep(200);
        }
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-white') + '  🤠 Both gunslingers face each other...' + ANSIParser.reset());
        await this.terminal.sleep(1500);
        
        // Show duelists with animations
        await this.showDuelists();
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  ⚡ Get ready to draw! ⚡' + ANSIParser.reset());
        await this.terminal.sleep(1000);
        this.terminal.println('');
    }

    async showDuelists() {
        // Simple, clear duelist display
        const frames = [
            // Frame 1 - Ready
            `  🤠 YOU                    💀 OPPONENT`,
            `  [STANDING READY]          [STANDING READY]`,
            `  Hands at sides            Hands at sides`,
            ``,
            // Frame 2 - Tense
            `  🤠 YOU                    💀 OPPONENT`,
            `  [GETTING TENSE]           [GETTING TENSE]`,
            `  Eyes locked               Eyes locked`,
            ``,
            // Frame 3 - Ready to draw
            `  🤠 YOU                    💀 OPPONENT`,
            `  [READY TO DRAW]           [READY TO DRAW]`,
            `  Hands near holster        Hands near holster`,
        ];
        
        for (let i = 0; i < frames.length; i += 4) {
            this.terminal.clear();
            this.terminal.println(ANSIParser.fg('bright-yellow') + '╔══════════════════════════════════════════════════════════════════════════════╗' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-yellow') + '║' + ANSIParser.reset() + 
                ANSIParser.fg('bright-white') + '  HIGH NOON DUEL - GETTING READY' + ANSIParser.reset() + 
                ' '.repeat(47) + ANSIParser.fg('bright-yellow') + '║' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-yellow') + '╚══════════════════════════════════════════════════════════════════════════════╝' + ANSIParser.reset());
            this.terminal.println('');
            
            for (let j = 0; j < 4; j++) {
                if (frames[i + j]) {
                    this.terminal.println(ANSIParser.fg('bright-white') + frames[i + j] + ANSIParser.reset());
                }
            }
            
            await this.terminal.sleep(1000);
        }
    }

    async showCountdown() {
        // Simple, clear countdown
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-yellow') + '╔══════════════════════════════════════════════════════════════════════════════╗' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '║' + ANSIParser.reset() + 
            ANSIParser.fg('bright-white') + '  COUNTDOWN TO DRAW!' + ANSIParser.reset() + 
            ' '.repeat(55) + ANSIParser.fg('bright-yellow') + '║' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '╚══════════════════════════════════════════════════════════════════════════════╝' + ANSIParser.reset());
        this.terminal.println('');
        
        // Countdown 3
        this.terminal.println(ANSIParser.fg('bright-red') + '                    ╔══════════════════════════════════╗' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-red') + '                    ║                                  ║' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-red') + '                    ║             3...                  ║' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-red') + '                    ║                                  ║' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-red') + '                    ╚══════════════════════════════════╝' + ANSIParser.reset());
        await this.terminal.sleep(1000);
        
        // Countdown 2
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-yellow') + '╔══════════════════════════════════════════════════════════════════════════════╗' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '║' + ANSIParser.reset() + 
            ANSIParser.fg('bright-white') + '  COUNTDOWN TO DRAW!' + ANSIParser.reset() + 
            ' '.repeat(55) + ANSIParser.fg('bright-yellow') + '║' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '╚══════════════════════════════════════════════════════════════════════════════╝' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-orange') + '                    ╔══════════════════════════════════╗' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-orange') + '                    ║                                  ║' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-orange') + '                    ║             2...                  ║' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-orange') + '                    ║                                  ║' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-orange') + '                    ╚══════════════════════════════════╝' + ANSIParser.reset());
        await this.terminal.sleep(1000);
        
        // Countdown 1
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-yellow') + '╔══════════════════════════════════════════════════════════════════════════════╗' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '║' + ANSIParser.reset() + 
            ANSIParser.fg('bright-white') + '  COUNTDOWN TO DRAW!' + ANSIParser.reset() + 
            ' '.repeat(55) + ANSIParser.fg('bright-yellow') + '║' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '╚══════════════════════════════════════════════════════════════════════════════╝' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '                    ╔══════════════════════════════════╗' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '                    ║                                  ║' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '                    ║             1...                  ║' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '                    ║                                  ║' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '                    ╚══════════════════════════════════╝' + ANSIParser.reset());
        await this.terminal.sleep(1000);
        
        this.terminal.println('');
    }

    async showDrawAnimation() {
        this.terminal.clear();
        
        // Simple, clear DRAW animation
        this.terminal.println(ANSIParser.fg('bright-yellow') + '╔══════════════════════════════════════════════════════════════════════════════╗' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '║' + ANSIParser.reset() + 
            ANSIParser.fg('bright-white') + '  DRAW YOUR WEAPON!' + ANSIParser.reset() + 
            ' '.repeat(56) + ANSIParser.fg('bright-yellow') + '║' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '╚══════════════════════════════════════════════════════════════════════════════╝' + ANSIParser.reset());
        this.terminal.println('');
        
        // Big, clear DRAW text
        this.terminal.println(ANSIParser.fg('bright-red') + '                    ╔══════════════════════════════════╗' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-red') + '                    ║                                  ║' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-red') + '                    ║          ⚡ DRAW! ⚡              ║' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-red') + '                    ║                                  ║' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-red') + '                    ╚══════════════════════════════════╝' + ANSIParser.reset());
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-white') + '  🤠 YOU                    💀 OPPONENT' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [DRAWING GUN]             [DRAWING GUN]' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  PRESS SPACE NOW TO DRAW AND SHOOT!' + ANSIParser.reset());
    }

    async showResultAnimation(result, playerTime, opponentTime, opponentName) {
        this.terminal.clear();
        
        if (result === 'victory') {
            // Simple victory display
            this.terminal.println(ANSIParser.fg('bright-green') + '╔══════════════════════════════════════════════════════════════════════════════╗' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-green') + '║' + ANSIParser.reset() + 
                ANSIParser.fg('bright-white') + '  🎉 VICTORY! YOU WIN THE DUEL! 🎉' + ANSIParser.reset() + 
                ' '.repeat(35) + ANSIParser.fg('bright-green') + '║' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-green') + '╚══════════════════════════════════════════════════════════════════════════════╝' + ANSIParser.reset());
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-green') + '  🏆 You were faster on the draw!' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-green') + '  🤠 You are the fastest gun in town!' + ANSIParser.reset());
            
        } else if (result === 'defeat') {
            // Simple defeat display
            this.terminal.println(ANSIParser.fg('bright-red') + '╔══════════════════════════════════════════════════════════════════════════════╗' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-red') + '║' + ANSIParser.reset() + 
                ANSIParser.fg('bright-white') + `  💀 DEFEAT! ${opponentName.toUpperCase()} WINS! 💀` + ANSIParser.reset() + 
                ' '.repeat(78 - 35 - opponentName.length) + ANSIParser.fg('bright-red') + '║' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-red') + '╚══════════════════════════════════════════════════════════════════════════════╝' + ANSIParser.reset());
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-red') + '  💀 You were too slow on the draw!' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-red') + '  🔫 Practice more to improve your speed!' + ANSIParser.reset());
            
        } else if (result === 'draw') {
            // Simple draw display
            this.terminal.println(ANSIParser.fg('bright-yellow') + '╔══════════════════════════════════════════════════════════════════════════════╗' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-yellow') + '║' + ANSIParser.reset() + 
                ANSIParser.fg('bright-white') + '  🤝 DRAW! BOTH DREW AT THE SAME TIME! 🤝' + ANSIPParser.reset() + 
                ' '.repeat(30) + ANSIParser.fg('bright-yellow') + '║' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-yellow') + '╚══════════════════════════════════════════════════════════════════════════════╝' + ANSIParser.reset());
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  ⚖️ Perfect timing match!' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  🤝 Both gunslingers are equally skilled!' + ANSIParser.reset());
        }
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-black') + '  [Gun smoke clears...]' + ANSIParser.reset());
        await this.terminal.sleep(1000);
    }

    async tournament() {
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Tournament mode coming soon!' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  Challenge other players in real-time duels!' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println('  Press any key to continue...');
        await this.terminal.input();
    }

    async stats() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-yellow') + '╔══════════════════════════════════════════════════════════════════════════════╗' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '║' + ANSIParser.reset() + 
            ANSIParser.fg('bright-white') + '  YOUR GUNSLINGER STATISTICS' + ANSIParser.reset() + 
            ' '.repeat(48) + ANSIParser.fg('bright-yellow') + '║' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '╚══════════════════════════════════════════════════════════════════════════════╝' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-green') + `  Total Duels: ${this.gameState.totalDuels}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + `  Victories: ${this.gameState.wins}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-red') + `  Defeats: ${this.gameState.losses}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + `  Draws: ${this.gameState.draws}` + ANSIParser.reset());
        
        if (this.gameState.totalDuels > 0) {
            const winRate = (this.gameState.wins / this.gameState.totalDuels * 100).toFixed(1);
            this.terminal.println(ANSIParser.fg('bright-cyan') + `  Win Rate: ${winRate}%` + ANSIParser.reset());
        }
        
        if (this.gameState.fastestDraw > 0) {
            this.terminal.println(ANSIParser.fg('bright-magenta') + `  Fastest Draw: ${this.gameState.fastestDraw.toFixed(3)}s` + ANSIParser.reset());
        }
        
        this.terminal.println('');
        this.terminal.println('  Press any key to continue...');
        await this.terminal.input();
    }

    async loadGameState() {
        try {
            const response = await fetch(`/api/game-state/high-noon-duel`, {
                credentials: 'include'
            });
            const state = await response.json();
            if (state && state.game_data) {
                this.gameState = { ...this.gameState, ...JSON.parse(state.game_data) };
            }
        } catch (error) {
            console.log('Starting new gunslinger career');
        }
    }

    async saveGameState() {
        try {
            const response = await fetch(`/api/game-state/high-noon-duel`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(this.gameState)
            });
            
            if (!response.ok) {
                console.error('Failed to save game state:', response.status, response.statusText);
            }
        } catch (error) {
            console.error('Error saving game state:', error);
        }
    }

    getTitle() {
        return `
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║                          🤠 HIGH NOON DUEL 🤠                                ║
║                                                                              ║
║                    "The Fastest Gun in the West Wins!"                      ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
`;
    }

    async showIntroAnimation() {
        // Dramatic intro animation
        const introFrames = [
            '  🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵',
            '  🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵',
            '  🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵',
            '  🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵',
            '  🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵',
            '  🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵',
            '  🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵',
            '  🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵',
            '  🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵',
            '  🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵',
            '  🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵',
            '  🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵',
            '  🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵',
            '  🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵',
            '  🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵',
            '  🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵',
            '  🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵',
            '  🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵',
            '  🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵',
            '  🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵🌵',
        ];

        for (let frame of introFrames) {
            this.terminal.clear();
            this.terminal.println(ANSIParser.fg('bright-green') + frame + ANSIParser.reset());
            await this.terminal.sleep(100);
        }

        // Dust cloud animation
        const dustFrames = [
            '  💨💨💨💨💨💨💨💨💨💨💨💨💨💨💨💨💨💨💨💨',
            '  💨💨💨💨💨💨💨💨💨💨💨💨💨💨💨💨💨💨💨💨',
            '  💨💨💨💨💨💨💨💨💨💨💨💨💨💨💨💨💨💨💨💨',
            '  💨💨💨💨💨💨💨💨💨💨💨💨💨💨💨💨💨💨💨💨',
            '  💨💨💨💨💨💨💨💨💨💨💨💨💨💨💨💨💨💨💨💨',
        ];

        for (let frame of dustFrames) {
            this.terminal.clear();
            this.terminal.println(ANSIParser.fg('bright-black') + frame + ANSIParser.reset());
            await this.terminal.sleep(150);
        }

        // Sunset animation
        const sunsetFrames = [
            '  🌅🌅🌅🌅🌅🌅🌅🌅🌅🌅🌅🌅🌅🌅🌅🌅🌅🌅🌅🌅',
            '  🌅🌅🌅🌅🌅🌅🌅🌅🌅🌅🌅🌅🌅🌅🌅🌅🌅🌅🌅🌅',
            '  🌅🌅🌅🌅🌅🌅🌅🌅🌅🌅🌅🌅🌅🌅🌅🌅🌅🌅🌅🌅',
            '  🌅🌅🌅🌅🌅🌅🌅🌅🌅🌅🌅🌅🌅🌅🌅🌅🌅🌅🌅🌅',
            '  🌅🌅🌅🌅🌅🌅🌅🌅🌅🌅🌅🌅🌅🌅🌅🌅🌅🌅🌅🌅',
        ];

        for (let frame of sunsetFrames) {
            this.terminal.clear();
            this.terminal.println(ANSIParser.fg('bright-orange') + frame + ANSIParser.reset());
            await this.terminal.sleep(200);
        }

        // Title reveal animation
        const titleFrames = [
            '  🤠',
            '  🤠 HIGH',
            '  🤠 HIGH NOON',
            '  🤠 HIGH NOON DUEL',
            '  🤠 HIGH NOON DUEL 🤠',
        ];

        for (let frame of titleFrames) {
            this.terminal.clear();
            this.terminal.println(ANSIParser.fg('bright-yellow') + frame + ANSIParser.reset());
            await this.terminal.sleep(300);
        }

        await this.terminal.sleep(1000);
    }

    async showGunfightAnimation() {
        // Gunfight animation
        const gunfightFrames = [
            '  🤠     💀',
            '  🤠 💥  💀',
            '  🤠  💥  💀',
            '  🤠   💥  💀',
            '  🤠    💥  💀',
            '  🤠     💥  💀',
            '  🤠      💥  💀',
            '  🤠       💥  💀',
            '  🤠        💥  💀',
            '  🤠         💥  💀',
        ];

        for (let frame of gunfightFrames) {
            this.terminal.clear();
            this.terminal.println(ANSIParser.fg('bright-red') + frame + ANSIParser.reset());
            await this.terminal.sleep(100);
        }
    }
}

// Export for use in other modules
window.HighNoonDuel = HighNoonDuel;

