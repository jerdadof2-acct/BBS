// Hangman - Word Guessing Game
class Hangman {
    constructor(terminal, socketClient, authManager) {
        this.terminal = terminal;
        this.socketClient = socketClient;
        this.authManager = authManager;
        this.gameState = null;
        this.currentWord = '';
        this.guessedLetters = [];
        this.wrongGuesses = 0;
        this.maxWrongGuesses = 6;
        this.categories = {
            tech: ['computer', 'software', 'internet', 'keyboard', 'monitor', 'processor', 'database', 'network', 'server', 'programming'],
            gaming: ['arcade', 'console', 'controller', 'joystick', 'pixels', 'quest', 'level', 'boss', 'powerup', 'achievement'],
            bbs: ['modem', 'terminal', 'door', 'sysop', 'handle', 'download', 'upload', 'message', 'board', 'ascii'],
            movies: ['cinema', 'director', 'actor', 'screenplay', 'oscar', 'premiere', 'sequel', 'remake', 'documentary', 'animation'],
            animals: ['elephant', 'giraffe', 'penguin', 'dolphin', 'kangaroo', 'tiger', 'leopard', 'cheetah', 'rhinoceros', 'hippopotamus']
        };
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
            
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [P]' + ANSIParser.reset() + ' Play Game');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [S]' + ANSIParser.reset() + ' Statistics');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [X]' + ANSIParser.reset() + ' Exit');
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
            
            const choice = (await this.terminal.input()).toLowerCase();
            
            if (choice === 'p') {
                await this.playGame();
            } else if (choice === 's') {
                await this.showStats();
            } else if (choice === 'x') {
                await this.saveGameState();
                return 'doors';
            }
        }
    }

    async playGame() {
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Select category:' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [1]' + ANSIParser.reset() + ' Tech');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [2]' + ANSIParser.reset() + ' Gaming');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [3]' + ANSIParser.reset() + ' BBS');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [4]' + ANSIParser.reset() + ' Movies');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [5]' + ANSIParser.reset() + ' Animals');
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
        
        const categoryChoice = parseInt(await this.terminal.input());
        
        let category;
        if (categoryChoice === 1) category = 'tech';
        else if (categoryChoice === 2) category = 'gaming';
        else if (categoryChoice === 3) category = 'bbs';
        else if (categoryChoice === 4) category = 'movies';
        else if (categoryChoice === 5) category = 'animals';
        else return;
        
        // Select random word
        const words = this.categories[category];
        this.currentWord = words[Math.floor(Math.random() * words.length)].toUpperCase();
        this.guessedLetters = [];
        this.wrongGuesses = 0;
        
        this.gameState.gamesPlayed++;
        
        while (true) {
            this.terminal.clear();
            this.terminal.println(ANSIParser.fg('bright-cyan') + '  HANGMAN' + ANSIParser.reset());
            this.terminal.println('');
            
            // Draw hangman
            this.drawHangman();
            this.terminal.println('');
            
            // Show word
            let displayWord = '';
            for (let char of this.currentWord) {
                if (this.guessedLetters.includes(char)) {
                    displayWord += char + ' ';
                } else {
                    displayWord += '_ ';
                }
            }
            
            this.terminal.println(ANSIParser.fg('bright-white') + '  ' + displayWord + ANSIParser.reset());
            this.terminal.println('');
            
            // Show guessed letters
            if (this.guessedLetters.length > 0) {
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  Guessed: ' + this.guessedLetters.join(', ') + ANSIParser.reset());
                this.terminal.println('');
            }
            
            // Check win condition
            if (this.isWordComplete()) {
                this.terminal.println('');
                this.terminal.println(ANSIParser.fg('bright-green') + '  You win! The word was: ' + this.currentWord + ANSIParser.reset());
                this.terminal.println(ANSIParser.fg('bright-green') + '  You earned 50 credits!' + ANSIParser.reset());
                this.gameState.credits += 50;
                this.gameState.gamesWon++;
                await this.terminal.sleep(3000);
                return;
            }
            
            // Check lose condition
            if (this.wrongGuesses >= this.maxWrongGuesses) {
                this.terminal.println('');
                this.terminal.println(ANSIParser.fg('bright-red') + '  Game Over! The word was: ' + this.currentWord + ANSIParser.reset());
                this.gameState.gamesLost++;
                await this.terminal.sleep(3000);
                return;
            }
            
            this.terminal.println(ANSIParser.fg('bright-green') + '  Guess a letter: ' + ANSIParser.reset());
            const guess = (await this.terminal.input()).toUpperCase();
            
            if (guess.length !== 1 || !/[A-Z]/.test(guess)) {
                this.terminal.println(ANSIParser.fg('bright-red') + '  Invalid input! Enter a single letter.' + ANSIParser.reset());
                await this.terminal.sleep(2000);
                continue;
            }
            
            if (this.guessedLetters.includes(guess)) {
                this.terminal.println(ANSIParser.fg('bright-red') + '  You already guessed that letter!' + ANSIParser.reset());
                await this.terminal.sleep(2000);
                continue;
            }
            
            this.guessedLetters.push(guess);
            
            if (!this.currentWord.includes(guess)) {
                this.wrongGuesses++;
            }
        }
    }

    isWordComplete() {
        for (let char of this.currentWord) {
            if (!this.guessedLetters.includes(char)) {
                return false;
            }
        }
        return true;
    }

    drawHangman() {
        const stages = [
            '',
            '    |\n    |\n    |\n    |\n    |\n    |\n____|____',
            '    |\n    |\n    O\n    |\n    |\n    |\n____|____',
            '    |\n    |\n    O\n   /|\n    |\n    |\n____|____',
            '    |\n    |\n    O\n   /|\\\n    |\n    |\n____|____',
            '    |\n    |\n    O\n   /|\\\n    |\n   /\n____|____',
            '    |\n    |\n    O\n   /|\\\n    |\n   / \\\n____|____'
        ];
        
        this.terminal.println(ANSIParser.fg('bright-white') + stages[this.wrongGuesses] + ANSIParser.reset());
    }

    async showStats() {
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  Your Hangman Statistics:' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-white') + `  Games Played: ${this.gameState.gamesPlayed}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + `  Games Won: ${this.gameState.gamesWon}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-red') + `  Games Lost: ${this.gameState.gamesLost}` + ANSIParser.reset());
        
        if (this.gameState.gamesPlayed > 0) {
            const winRate = ((this.gameState.gamesWon / this.gameState.gamesPlayed) * 100).toFixed(1);
            this.terminal.println(ANSIParser.fg('bright-yellow') + `  Win Rate: ${winRate}%` + ANSIParser.reset());
        }
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Press any key to continue...' + ANSIParser.reset());
        await this.terminal.input();
    }

    showStatus() {
        this.terminal.println(ANSIParser.fg('bright-cyan') + '╔══════════════════════════════════════════════════════════════════════════════╗' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '║' + ANSIParser.reset() + 
            ANSIParser.fg('bright-white') + '  HANGMAN' + ANSIParser.reset() + 
            ' '.repeat(69) + ANSIParser.fg('bright-cyan') + '║' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '╚══════════════════════════════════════════════════════════════════════════════╝' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + `  Credits: ${this.gameState.credits}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + `  Games Played: ${this.gameState.gamesPlayed}  |  Won: ${this.gameState.gamesWon}  |  Lost: ${this.gameState.gamesLost}` + ANSIParser.reset());
    }

    async loadGameState() {
        try {
            const response = await fetch(`/api/game-state/hangman`);
            const state = await response.json();
            if (state && state.game_data) {
                this.gameState = { ...this.gameState, ...JSON.parse(state.game_data) };
            } else {
                this.gameState = {
                    credits: 100,
                    gamesPlayed: 0,
                    gamesWon: 0,
                    gamesLost: 0
                };
            }
        } catch (error) {
            console.log('Starting new Hangman game');
            this.gameState = {
                credits: 100,
                gamesPlayed: 0,
                gamesWon: 0,
                gamesLost: 0
            };
        }
    }

    async saveGameState() {
        try {
            await fetch(`/api/game-state/hangman`, {
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
║                               HANGMAN                                         ║
║                                                                              ║
║                        Guess the Word Game!                                   ║
║                                                                              ║
║  Guess letters to reveal the word!                                           ║
║  Win: 50 credits!                                                             ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
`;
    }
}

// Export for use in other modules
window.Hangman = Hangman;


