// Trivia - Quiz Game
class Trivia {
    constructor(terminal, socketClient, authManager) {
        this.terminal = terminal;
        this.socketClient = socketClient;
        this.authManager = authManager;
        this.gameState = null;
        this.questions = this.loadQuestions();
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
            
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [P]' + ANSIParser.reset() + ' Play Trivia');
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
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Select difficulty:' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [1]' + ANSIParser.reset() + ' Easy (5 questions, 10 credits each)');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [2]' + ANSIParser.reset() + ' Medium (10 questions, 25 credits each)');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [3]' + ANSIParser.reset() + ' Hard (15 questions, 50 credits each)');
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
        
        const difficulty = parseInt(await this.terminal.input());
        
        let numQuestions, creditsPerQuestion;
        if (difficulty === 1) {
            numQuestions = 5;
            creditsPerQuestion = 10;
        } else if (difficulty === 2) {
            numQuestions = 10;
            creditsPerQuestion = 25;
        } else if (difficulty === 3) {
            numQuestions = 15;
            creditsPerQuestion = 50;
        } else {
            return;
        }
        
        // Select random questions
        const selectedQuestions = this.shuffleArray([...this.questions]).slice(0, numQuestions);
        let correct = 0;
        
        for (let i = 0; i < selectedQuestions.length; i++) {
            const question = selectedQuestions[i];
            
            this.terminal.clear();
            this.terminal.println(ANSIParser.fg('bright-cyan') + `  Question ${i + 1} of ${numQuestions}` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-cyan') + `  Category: ${question.category}` + ANSIParser.reset());
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-white') + `  ${question.question}` + ANSIParser.reset());
            this.terminal.println('');
            
            question.options.forEach((option, index) => {
                this.terminal.println(ANSIParser.fg('bright-yellow') + `  [${index + 1}]` + ANSIParser.reset() + ` ${option}`);
            });
            
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-green') + '  Your answer: ' + ANSIParser.reset());
            
            const answer = parseInt(await this.terminal.input());
            
            if (answer === question.correct) {
                this.terminal.println('');
                this.terminal.println(ANSIParser.fg('bright-green') + '  Correct! +' + creditsPerQuestion + ' credits' + ANSIParser.reset());
                correct++;
                this.gameState.credits += creditsPerQuestion;
                this.gameState.questionsCorrect++;
            } else {
                this.terminal.println('');
                this.terminal.println(ANSIParser.fg('bright-red') + '  Wrong! The correct answer was: ' + question.options[question.correct - 1] + ANSIParser.reset());
                this.gameState.questionsIncorrect++;
            }
            
            this.gameState.questionsAnswered++;
            await this.terminal.sleep(2500);
        }
        
        // Results
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  GAME OVER!' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-white') + `  You got ${correct} out of ${numQuestions} correct!` + ANSIParser.reset());
        
        const percentage = ((correct / numQuestions) * 100).toFixed(1);
        this.terminal.println(ANSIParser.fg('bright-white') + `  Score: ${percentage}%` + ANSIParser.reset());
        
        const winnings = correct * creditsPerQuestion;
        this.terminal.println(ANSIParser.fg('bright-green') + `  Total Winnings: ${winnings} credits` + ANSIParser.reset());
        
        this.gameState.gamesPlayed++;
        
        if (percentage === 100) {
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  PERFECT SCORE! Bonus 100 credits!' + ANSIParser.reset());
            this.gameState.credits += 100;
            this.gameState.perfectScores++;
        }
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Press any key to continue...' + ANSIParser.reset());
        await this.terminal.input();
    }

    loadQuestions() {
        return [
            // Tech Questions
            { category: 'Tech', question: 'What does CPU stand for?', options: ['Central Processing Unit', 'Computer Personal Unit', 'Central Program Utility', 'Computer Processing Unit'], correct: 1 },
            { category: 'Tech', question: 'What year was the first iPhone released?', options: ['2005', '2006', '2007', '2008'], correct: 3 },
            { category: 'Tech', question: 'What does HTTP stand for?', options: ['HyperText Transfer Protocol', 'High Tech Transfer Protocol', 'HyperText Transmission Protocol', 'High Tech Transmission Protocol'], correct: 1 },
            { category: 'Tech', question: 'What is the most popular programming language?', options: ['Python', 'JavaScript', 'Java', 'C++'], correct: 2 },
            { category: 'Tech', question: 'What does RAM stand for?', options: ['Random Access Memory', 'Read Access Memory', 'Random Allocation Memory', 'Read Allocation Memory'], correct: 1 },
            
            // Gaming Questions
            { category: 'Gaming', question: 'What was the first video game ever created?', options: ['Pong', 'Spacewar!', 'Tennis for Two', 'Pac-Man'], correct: 3 },
            { category: 'Gaming', question: 'What company created the original PlayStation?', options: ['Nintendo', 'Sega', 'Sony', 'Microsoft'], correct: 3 },
            { category: 'Gaming', question: 'What year was the original Nintendo Entertainment System (NES) released?', options: ['1983', '1984', '1985', '1986'], correct: 3 },
            { category: 'Gaming', question: 'What is the best-selling video game of all time?', options: ['Minecraft', 'Tetris', 'Grand Theft Auto V', 'Wii Sports'], correct: 1 },
            { category: 'Gaming', question: 'What does RPG stand for?', options: ['Role Playing Game', 'Real Playing Game', 'Rapid Playing Game', 'Random Playing Game'], correct: 1 },
            
            // BBS Questions
            { category: 'BBS', question: 'What does BBS stand for?', options: ['Bulletin Board System', 'Binary Board System', 'Broadcast Board System', 'Basic Board System'], correct: 1 },
            { category: 'BBS', question: 'What was the typical modem speed for BBS systems in the 1980s?', options: ['1200 baud', '2400 baud', '9600 baud', '14400 baud'], correct: 1 },
            { category: 'BBS', question: 'What was the most popular BBS door game?', options: ['TradeWars 2002', 'Legend of the Red Dragon', 'Barren Realms Elite', 'Usurper'], correct: 1 },
            { category: 'BBS', question: 'What year did BBS systems become popular?', options: ['Early 1970s', 'Late 1970s', 'Early 1980s', 'Late 1980s'], correct: 3 },
            { category: 'BBS', question: 'What was the typical number of phone lines a BBS had?', options: ['1-4', '5-10', '10-20', '20+'], correct: 1 },
            
            // History Questions
            { category: 'History', question: 'What year did World War II end?', options: ['1943', '1944', '1945', '1946'], correct: 3 },
            { category: 'History', question: 'Who was the first person to walk on the moon?', options: ['Buzz Aldrin', 'Neil Armstrong', 'John Glenn', 'Alan Shepard'], correct: 2 },
            { category: 'History', question: 'What year did the Berlin Wall fall?', options: ['1987', '1988', '1989', '1990'], correct: 3 },
            { category: 'History', question: 'What was the name of the first computer?', options: ['ENIAC', 'UNIVAC', 'Colossus', 'Harvard Mark I'], correct: 1 },
            { category: 'History', question: 'What year was the internet invented?', options: ['1965', '1969', '1973', '1980'], correct: 2 },
            
            // Science Questions
            { category: 'Science', question: 'What is the chemical symbol for gold?', options: ['Go', 'Gd', 'Au', 'Ag'], correct: 3 },
            { category: 'Science', question: 'What is the speed of light?', options: ['186,000 miles per second', '300,000 miles per second', '186,000 km per second', '300,000 km per second'], correct: 1 },
            { category: 'Science', question: 'What is the hardest natural substance on Earth?', options: ['Gold', 'Iron', 'Diamond', 'Platinum'], correct: 3 },
            { category: 'Science', question: 'What is the largest planet in our solar system?', options: ['Saturn', 'Jupiter', 'Neptune', 'Uranus'], correct: 2 },
            { category: 'Science', question: 'How many bones are in the human body?', options: ['196', '206', '216', '226'], correct: 2 },
            
            // Pop Culture Questions
            { category: 'Pop Culture', question: 'What was the first movie to gross over $1 billion?', options: ['Titanic', 'Jurassic Park', 'The Lion King', 'Terminator 2'], correct: 1 },
            { category: 'Pop Culture', question: 'What year did MTV launch?', options: ['1980', '1981', '1982', '1983'], correct: 2 },
            { category: 'Pop Culture', question: 'Who painted the Mona Lisa?', options: ['Vincent van Gogh', 'Pablo Picasso', 'Leonardo da Vinci', 'Michelangelo'], correct: 3 },
            { category: 'Pop Culture', question: 'What was the first video played on MTV?', options: ['Video Killed the Radio Star', 'Thriller', 'Billie Jean', 'Beat It'], correct: 1 },
            { category: 'Pop Culture', question: 'What was the highest-grossing movie of the 1980s?', options: ['E.T.', 'Return of the Jedi', 'Ghostbusters', 'Back to the Future'], correct: 1 }
        ];
    }

    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    async showStats() {
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  Your Trivia Statistics:' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-white') + `  Games Played: ${this.gameState.gamesPlayed}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + `  Questions Answered: ${this.gameState.questionsAnswered}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + `  Correct: ${this.gameState.questionsCorrect}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-red') + `  Incorrect: ${this.gameState.questionsIncorrect}` + ANSIParser.reset());
        
        if (this.gameState.questionsAnswered > 0) {
            const accuracy = ((this.gameState.questionsCorrect / this.gameState.questionsAnswered) * 100).toFixed(1);
            this.terminal.println(ANSIParser.fg('bright-yellow') + `  Accuracy: ${accuracy}%` + ANSIParser.reset());
        }
        
        this.terminal.println(ANSIParser.fg('bright-green') + `  Perfect Scores: ${this.gameState.perfectScores}` + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Press any key to continue...' + ANSIParser.reset());
        await this.terminal.input();
    }

    showStatus() {
        this.terminal.println(ANSIParser.fg('bright-cyan') + '╔══════════════════════════════════════════════════════════════════════════════╗' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '║' + ANSIParser.reset() + 
            ANSIParser.fg('bright-white') + '  TRIVIA' + ANSIParser.reset() + 
            ' '.repeat(71) + ANSIParser.fg('bright-cyan') + '║' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '╚══════════════════════════════════════════════════════════════════════════════╝' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + `  Credits: ${this.gameState.credits}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + `  Games Played: ${this.gameState.gamesPlayed}  |  Questions: ${this.gameState.questionsAnswered}  |  Perfect: ${this.gameState.perfectScores}` + ANSIParser.reset());
    }

    async loadGameState() {
        try {
            const response = await fetch(`/api/game-state/trivia`);
            const state = await response.json();
            if (state && state.game_data) {
                this.gameState = { ...this.gameState, ...JSON.parse(state.game_data) };
            } else {
                this.gameState = {
                    credits: 100,
                    gamesPlayed: 0,
                    questionsAnswered: 0,
                    questionsCorrect: 0,
                    questionsIncorrect: 0,
                    perfectScores: 0
                };
            }
        } catch (error) {
            console.log('Starting new Trivia game');
            this.gameState = {
                credits: 100,
                gamesPlayed: 0,
                questionsAnswered: 0,
                questionsCorrect: 0,
                questionsIncorrect: 0,
                perfectScores: 0
            };
        }
    }

    async saveGameState() {
        try {
            await fetch(`/api/game-state/trivia`, {
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
║                               TRIVIA                                          ║
║                                                                              ║
║                          Test Your Knowledge!                                 ║
║                                                                              ║
║  Answer questions correctly to earn credits!                                 ║
║  Perfect score bonus: 100 credits!                                           ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
`;
    }
}

// Export for use in other modules
window.Trivia = Trivia;


