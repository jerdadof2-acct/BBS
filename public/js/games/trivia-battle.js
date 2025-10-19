// TRIVIA BATTLE - Multiplayer Trivia Competition
// Challenge other players in real-time trivia battles!

class TriviaBattle {
    constructor(terminal, socketClient, authManager) {
        this.terminal = terminal;
        this.socketClient = socketClient;
        this.authManager = authManager;
        this.gameState = {
            active: false,
            players: [],
            currentQuestion: null,
            questionStartTime: null,
            results: [],
            waitingForPlayers: false,
            round: 0,
            maxRounds: 10
        };
        
        this.questions = [
            {
                question: "What is the capital of France?",
                options: ["London", "Berlin", "Paris", "Madrid"],
                correct: 2,
                category: "Geography"
            },
            {
                question: "Who painted the Mona Lisa?",
                options: ["Vincent van Gogh", "Pablo Picasso", "Leonardo da Vinci", "Michelangelo"],
                correct: 2,
                category: "Art"
            },
            {
                question: "What is the largest planet in our solar system?",
                options: ["Earth", "Saturn", "Jupiter", "Neptune"],
                correct: 2,
                category: "Science"
            },
            {
                question: "In which year did World War II end?",
                options: ["1944", "1945", "1946", "1947"],
                correct: 1,
                category: "History"
            },
            {
                question: "What is the chemical symbol for gold?",
                options: ["Go", "Gd", "Au", "Ag"],
                correct: 2,
                category: "Science"
            },
            {
                question: "Who wrote 'To Kill a Mockingbird'?",
                options: ["Harper Lee", "Mark Twain", "Ernest Hemingway", "F. Scott Fitzgerald"],
                correct: 0,
                category: "Literature"
            },
            {
                question: "What is the smallest country in the world?",
                options: ["Monaco", "Vatican City", "San Marino", "Liechtenstein"],
                correct: 1,
                category: "Geography"
            },
            {
                question: "In which ocean is the Bermuda Triangle?",
                options: ["Pacific", "Atlantic", "Indian", "Arctic"],
                correct: 1,
                category: "Geography"
            },
            {
                question: "What is the hardest natural substance on Earth?",
                options: ["Gold", "Iron", "Diamond", "Platinum"],
                correct: 2,
                category: "Science"
            },
            {
                question: "Who directed the movie 'Jaws'?",
                options: ["Steven Spielberg", "George Lucas", "Martin Scorsese", "Francis Ford Coppola"],
                correct: 0,
                category: "Movies"
            },
            {
                question: "What is the currency of Japan?",
                options: ["Won", "Yuan", "Yen", "Dong"],
                correct: 2,
                category: "Geography"
            },
            {
                question: "In which sport would you perform a slam dunk?",
                options: ["Tennis", "Basketball", "Volleyball", "Soccer"],
                correct: 1,
                category: "Sports"
            },
            {
                question: "What is the largest mammal in the world?",
                options: ["African Elephant", "Blue Whale", "Giraffe", "Polar Bear"],
                correct: 1,
                category: "Science"
            },
            {
                question: "Who composed 'The Four Seasons'?",
                options: ["Johann Sebastian Bach", "Wolfgang Amadeus Mozart", "Antonio Vivaldi", "Ludwig van Beethoven"],
                correct: 2,
                category: "Music"
            },
            {
                question: "What is the longest river in the world?",
                options: ["Amazon", "Nile", "Mississippi", "Yangtze"],
                correct: 1,
                category: "Geography"
            },
            {
                question: "In which country is the Great Wall located?",
                options: ["Japan", "China", "India", "Korea"],
                correct: 1,
                category: "Geography"
            },
            {
                question: "What is the speed of light?",
                options: ["300,000 km/s", "150,000 km/s", "450,000 km/s", "600,000 km/s"],
                correct: 0,
                category: "Science"
            },
            {
                question: "Who played the role of Jack in Titanic?",
                options: ["Brad Pitt", "Tom Cruise", "Leonardo DiCaprio", "Matt Damon"],
                correct: 2,
                category: "Movies"
            },
            {
                question: "What is the largest desert in the world?",
                options: ["Gobi", "Sahara", "Antarctic", "Arabian"],
                correct: 2,
                category: "Geography"
            },
            {
                question: "In which year was the first iPhone released?",
                options: ["2006", "2007", "2008", "2009"],
                correct: 1,
                category: "Technology"
            }
        ];
    }

    async play() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + this.getHeader() + ANSIParser.reset());
        
        this.terminal.println(ANSIParser.fg('bright-white') + '  Welcome to TRIVIA BATTLE!' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Challenge other players in real-time trivia battles!' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + '  [1]' + ANSIParser.reset() + ' Join Battle');
        this.terminal.println(ANSIParser.fg('bright-green') + '  [2]' + ANSIParser.reset() + ' Create New Battle');
        this.terminal.println(ANSIParser.fg('bright-green') + '  [3]' + ANSIParser.reset() + ' View Leaderboard');
        this.terminal.println(ANSIParser.fg('bright-red') + '  [0]' + ANSIParser.reset() + ' Back to Games');
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  Select option: ' + ANSIParser.reset());
        
        const choice = await this.terminal.input();
        
        switch(choice) {
            case '1':
                return await this.joinBattle();
            case '2':
                return await this.createBattle();
            case '3':
                return await this.showLeaderboard();
            case '0':
                return 'doors';
            default:
                this.terminal.println(ANSIParser.fg('bright-red') + '  Invalid selection.' + ANSIParser.reset());
                await this.terminal.sleep(1500);
                return 'doors';
        }
    }

    async joinBattle() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + this.getHeader() + ANSIParser.reset());
        
        // Listen for battle events
        this.socketClient.socket.on('trivia-battle-start', (data) => {
            this.startBattle(data);
        });
        
        this.socketClient.socket.on('trivia-battle-question', (data) => {
            this.showQuestion(data);
        });
        
        this.socketClient.socket.on('trivia-battle-answer', (data) => {
            this.showAnswer(data);
        });
        
        this.socketClient.socket.on('trivia-battle-finish', (data) => {
            this.finishBattle(data);
        });
        
        // Join the battle
        this.socketClient.socket.emit('join-trivia-battle', {
            player: this.authManager.getCurrentUser().handle
        });
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Waiting for other players...' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  Players in lobby:' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-red') + '  Type QUIT to exit waiting room' + ANSIParser.reset());
        
        // Wait for battle to start with exit option
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

    async createBattle() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + this.getHeader() + ANSIParser.reset());
        
        this.terminal.println(ANSIParser.fg('bright-white') + '  Creating new trivia battle...' + ANSIParser.reset());
        
        // Create battle
        this.socketClient.socket.emit('create-trivia-battle', {
            creator: this.authManager.getCurrentUser().handle,
            maxRounds: this.gameState.maxRounds
        });
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  Battle created! Waiting for players...' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  Battle Settings:' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  • 10 questions per battle' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  • 30 seconds per question' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  • Multiple choice format' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Press ENTER to start battle (minimum 2 players)...' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-red') + '  Type QUIT to cancel battle' + ANSIParser.reset());
        
        const input = await this.terminal.input();
        if (input.toUpperCase() === 'QUIT') {
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  Battle cancelled.' + ANSIParser.reset());
            await this.terminal.sleep(1000);
            return 'doors';
        }
        
        // Start the battle
        this.socketClient.socket.emit('start-trivia-battle');
        
        return 'doors';
    }

    async startBattle(data) {
        this.gameState.active = true;
        this.gameState.players = data.players;
        this.gameState.round = 0;
        
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + this.getHeader() + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  BATTLE STARTING IN 3...' + ANSIParser.reset());
        await this.terminal.sleep(1000);
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  BATTLE STARTING IN 2...' + ANSIParser.reset());
        await this.terminal.sleep(1000);
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  BATTLE STARTING IN 1...' + ANSIParser.reset());
        await this.terminal.sleep(1000);
        
        // Battle will continue with question events
    }

    async showQuestion(data) {
        this.gameState.currentQuestion = data.question;
        this.gameState.questionStartTime = Date.now();
        this.gameState.round++;
        
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + this.getHeader() + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-white') + `  Round ${this.gameState.round} of ${this.gameState.maxRounds}` + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-cyan') + `  Category: ${this.gameState.currentQuestion.category}` + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-yellow') + `  Question: ${this.gameState.currentQuestion.question}` + ANSIParser.reset());
        this.terminal.println('');
        
        for (let i = 0; i < this.gameState.currentQuestion.options.length; i++) {
            this.terminal.println(ANSIParser.fg('bright-green') + `  [${i + 1}]` + ANSIParser.reset() + ` ${this.gameState.currentQuestion.options[i]}`);
        }
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-red') + '  You have 30 seconds to answer!' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  Your answer (1-4): ' + ANSIParser.reset());
        
        const startTime = Date.now();
        const answer = await this.terminal.input();
        const endTime = Date.now();
        const timeTaken = (endTime - startTime) / 1000;
        
        // Send answer
        this.socketClient.socket.emit('trivia-battle-answer', {
            player: this.authManager.getCurrentUser().handle,
            answer: parseInt(answer) - 1,
            time: timeTaken
        });
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + `  Answer submitted in ${timeTaken.toFixed(1)} seconds!` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Waiting for other players...' + ANSIParser.reset());
    }

    showAnswer(data) {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + this.getHeader() + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-white') + '  QUESTION RESULTS:' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-yellow') + `  Question: ${data.question.question}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + `  Correct Answer: ${data.question.options[data.question.correct]}` + ANSIParser.reset());
        this.terminal.println('');
        
        // Show player results
        for (const result of data.results) {
            let status = ANSIParser.fg('bright-red') + 'WRONG';
            if (result.correct) {
                status = ANSIParser.fg('bright-green') + 'CORRECT';
            }
            
            this.terminal.println(ANSIParser.fg('bright-white') + `  ${result.player}:` + ANSIParser.reset() + 
                ` ${status}` + ANSIParser.reset() + 
                ANSIParser.fg('bright-black') + ` (${result.time.toFixed(1)}s)` + ANSIParser.reset());
        }
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  Press ENTER to continue...' + ANSIParser.reset());
    }

    async finishBattle(data) {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + this.getHeader() + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  BATTLE RESULTS:' + ANSIParser.reset());
        this.terminal.println('');
        
        // Sort results by score
        const sortedResults = data.results.sort((a, b) => b.score - a.score);
        
        for (let i = 0; i < sortedResults.length; i++) {
            const result = sortedResults[i];
            const position = i + 1;
            let positionColor = ANSIParser.fg('bright-white');
            
            if (position === 1) positionColor = ANSIParser.fg('bright-yellow');
            else if (position === 2) positionColor = ANSIParser.fg('bright-black');
            else if (position === 3) positionColor = ANSIParser.fg('bright-red');
            
            this.terminal.println(positionColor + `  ${position}. ${result.player}` + ANSIParser.reset() + 
                ANSIParser.fg('bright-cyan') + ` - ${result.score}/${this.gameState.maxRounds} correct` + ANSIParser.reset() + 
                ANSIParser.fg('bright-green') + ` (${Math.round((result.score / this.gameState.maxRounds) * 100)}%)` + ANSIParser.reset());
        }
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  Press ENTER to continue...' + ANSIParser.reset());
        await this.terminal.input();
        
        // Clean up
        this.gameState.active = false;
        this.gameState.players = [];
        this.gameState.results = [];
    }

    async showLeaderboard() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + this.getHeader() + ANSIParser.reset());
        
        this.terminal.println(ANSIParser.fg('bright-white') + '  TRIVIA BATTLE LEADERBOARD' + ANSIParser.reset());
        this.terminal.println('');
        
        // Get leaderboard from server
        try {
            const response = await fetch('/api/trivia-battle/leaderboard');
            const leaderboard = await response.json();
            
            if (leaderboard.length === 0) {
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  No battles completed yet!' + ANSIParser.reset());
            } else {
                for (let i = 0; i < Math.min(leaderboard.length, 10); i++) {
                    const player = leaderboard[i];
                    const position = i + 1;
                    let positionColor = ANSIParser.fg('bright-white');
                    
                    if (position === 1) positionColor = ANSIParser.fg('bright-yellow');
                    else if (position === 2) positionColor = ANSIParser.fg('bright-black');
                    else if (position === 3) positionColor = ANSIParser.fg('bright-red');
                    
                    this.terminal.println(positionColor + `  ${position}. ${player.handle}` + ANSIParser.reset() + 
                        ANSIParser.fg('bright-cyan') + ` - ${player.battles_won} wins` + ANSIParser.reset() + 
                        ANSIParser.fg('bright-green') + ` (${player.avg_score}% avg)` + ANSIParser.reset());
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

    getHeader() {
        return `
╔══════════════════════════════════════════════════════════════════════════════╗
║                         TRIVIA BATTLE                                       ║
║                    Multiplayer Trivia Competition                           ║
╚══════════════════════════════════════════════════════════════════════════════╝
`;
    }
}

// Export for use in other modules
window.TriviaBattle = TriviaBattle;
