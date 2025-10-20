// Number Guess Game
class NumberGuess {
    constructor(terminal, socketClient, authManager) {
        this.terminal = terminal;
        this.socketClient = socketClient;
        this.authManager = authManager;
        this.gameState = {
            number: Math.floor(Math.random() * 100) + 1,
            attempts: 0,
            maxAttempts: 10,
            won: false
        };
    }

    async play() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + this.getTitle() + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-white') + '  I\'m thinking of a number between 1 and 100.' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + `  You have ${this.gameState.maxAttempts} attempts to guess it!` + ANSIParser.reset());
        this.terminal.println('');
        
        // Load today's score
        await this.loadHighScores();
        
        while (this.gameState.attempts < this.gameState.maxAttempts && !this.gameState.won) {
            this.terminal.println(ANSIParser.fg('bright-green') + `  Attempt ${this.gameState.attempts + 1}/${this.gameState.maxAttempts}` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-green') + '  Your guess: ' + ANSIParser.reset());
            
            const guess = parseInt(await this.terminal.input());
            
            if (isNaN(guess) || guess < 1 || guess > 100) {
                this.terminal.println(ANSIParser.fg('bright-red') + '  Please enter a number between 1 and 100!' + ANSIParser.reset());
                continue;
            }
            
            this.gameState.attempts++;
            
            if (guess === this.gameState.number) {
                this.gameState.won = true;
                this.terminal.println('');
                this.terminal.println(ANSIParser.fg('bright-green') + '  CONGRATULATIONS! You guessed it!' + ANSIParser.reset());
                this.terminal.println(ANSIParser.fg('bright-green') + `  It took you ${this.gameState.attempts} attempts.` + ANSIParser.reset());
                
                // Save high score
                await this.saveHighScore(this.gameState.attempts);
                await this.showHighScores();
            } else if (guess < this.gameState.number) {
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  Too low! Try again.' + ANSIParser.reset());
            } else {
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  Too high! Try again.' + ANSIParser.reset());
            }
            
            this.terminal.println('');
        }
        
        if (!this.gameState.won) {
            this.terminal.println(ANSIParser.fg('bright-red') + `  Game Over! The number was ${this.gameState.number}.` + ANSIParser.reset());
        }
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Press any key to continue...' + ANSIParser.reset());
        await this.terminal.input();
        
        return 'doors';
    }

    async loadHighScores() {
        try {
            const response = await fetch('/api/high-scores/number-guess');
            const scores = await response.json();
            
            if (scores.length > 0) {
                this.terminal.println(ANSIParser.fg('bright-cyan') + '  Today\'s Best Scores:' + ANSIParser.reset());
                scores.slice(0, 5).forEach((score, index) => {
                    this.terminal.println(ANSIParser.fg('bright-yellow') + `  ${index + 1}. ${score.user_handle} - ${score.score} attempts` + ANSIParser.reset());
                });
                this.terminal.println('');
            }
        } catch (error) {
            console.error('Error loading high scores:', error);
        }
    }

    async saveHighScore(attempts) {
        try {
            await fetch('/api/high-scores', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    game_name: 'number-guess',
                    score: attempts,
                    details: `${attempts} attempts`
                })
            });
        } catch (error) {
            console.error('Error saving high score:', error);
        }
    }

    async showHighScores() {
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  High Scores:' + ANSIParser.reset());
        
        try {
            const response = await fetch('/api/high-scores/number-guess');
            const scores = await response.json();
            
            if (scores.length > 0) {
                scores.slice(0, 10).forEach((score, index) => {
                    this.terminal.println(ANSIParser.fg('bright-yellow') + `  ${index + 1}. ${score.user_handle} - ${score.score} attempts` + ANSIParser.reset());
                });
            }
        } catch (error) {
            console.error('Error loading high scores:', error);
        }
    }

    getTitle() {
        return `
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║                         NUMBER GUESS                                         ║
║                                                                              ║
║              "Can you guess my number?"                                     ║
╚══════════════════════════════════════════════════════════════════════════════╝
`;
    }
}

// Export for use in other modules
window.NumberGuess = NumberGuess;












