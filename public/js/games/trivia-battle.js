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
            maxRounds: 10,
            // Player stats
            totalGames: 0,
            totalWins: 0,
            totalCorrect: 0,
            totalQuestions: 0,
            bestStreak: 0,
            averageTime: 0
        };
        this.tournament = {
            active: false,
            tournamentId: null,
            host: null,
            participants: [],
            bracket: [],
            currentRound: 0,
            maxRounds: 0,
            phase: 'waiting', // waiting, joining, active, finished
            joinEndTime: null,
            currentBattle: null,
            winner: null,
            stats: {
                tournamentsPlayed: 0,
                tournamentsWon: 0,
                biggestTournamentWin: 0,
                totalTournamentQuestions: 0,
                totalTournamentCorrect: 0
            }
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

    async loadGameState() {
        try {
            const currentUser = this.authManager.getCurrentUser();
            const userId = currentUser ? currentUser.id : null;
            
            const response = await fetch('/api/game-state/trivia-battle', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: userId
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.gameState) {
                    this.gameState = { ...this.gameState, ...data.gameState };
                    console.log('Loaded trivia battle game state:', this.gameState);
                }
                if (data.tournament) {
                    this.tournament = { ...this.tournament, ...data.tournament };
                    console.log('Loaded trivia battle tournament state:', this.tournament);
                }
            }
        } catch (error) {
            console.error('Failed to load trivia battle game state:', error);
        }
    }

    async saveGameState() {
        try {
            const currentUser = this.authManager.getCurrentUser();
            const userId = currentUser ? currentUser.id : null;
            
            const response = await fetch('/api/game-state/trivia-battle', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: userId,
                    gameState: this.gameState,
                    tournament: this.tournament
                })
            });
            
            if (response.ok) {
                console.log('Saved trivia battle game state');
            }
        } catch (error) {
            console.error('Failed to save trivia battle game state:', error);
        }
    }

    async play() {
        console.log('Trivia Battle - Starting play method'); // Debug log
        await this.loadGameState();
        this.setupTournamentListeners();
        
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + this.getHeader() + ANSIParser.reset());
        
        this.terminal.println(ANSIParser.fg('bright-white') + '  Welcome to TRIVIA BATTLE!' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Challenge other players in real-time trivia battles!' + ANSIParser.reset());
        this.terminal.println('');
        
        // Show player stats
        if (this.gameState.totalGames > 0) {
            this.terminal.println(ANSIParser.fg('bright-cyan') + '  Your Stats:' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-white') + `  Games Played: ${this.gameState.totalGames} | Wins: ${this.gameState.totalWins} | Accuracy: ${this.gameState.totalQuestions > 0 ? ((this.gameState.totalCorrect / this.gameState.totalQuestions) * 100).toFixed(1) : 0}%` + ANSIParser.reset());
            this.terminal.println('');
        }
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  [1]' + ANSIParser.reset() + ' Quick Battle (vs AI)');
        this.terminal.println(ANSIParser.fg('bright-green') + '  [2]' + ANSIParser.reset() + ' Tournament Mode');
        this.terminal.println(ANSIParser.fg('bright-green') + '  [3]' + ANSIParser.reset() + ' View Leaderboard');
        this.terminal.println(ANSIParser.fg('bright-green') + '  [4]' + ANSIParser.reset() + ' Your Statistics');
        this.terminal.println(ANSIParser.fg('bright-red') + '  [Q/X]' + ANSIParser.reset() + ' Quit to Door Games');
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  Select option: ' + ANSIParser.reset());
        
        const choice = (await this.terminal.input()).toLowerCase().trim();
        
        switch(choice) {
            case '1':
                return await this.quickBattle();
            case '2':
                return await this.tournament();
            case '3':
                return await this.showLeaderboard();
            case '4':
                return await this.showStats();
            case 'q':
            case 'quit':
            case 'x':
            case 'exit':
                await this.saveGameState();
                return 'doors';
            default:
                this.terminal.println(ANSIParser.fg('bright-red') + '  Invalid selection.' + ANSIParser.reset());
                await this.terminal.sleep(1500);
                return await this.play();
        }
    }

    async tournament() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '╔══════════════════════════════════════════════════════════════════════════════╗' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '║' + ANSIParser.reset() + 
            ANSIParser.fg('bright-white') + '  🧠 TRIVIA TOURNAMENT 🧠' + ANSIParser.reset() + 
            ' '.repeat(40) + ANSIParser.fg('bright-cyan') + '║' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '╚══════════════════════════════════════════════════════════════════════════════╝' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  Tournament Rules:' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  • Elimination bracket format' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  • Fastest correct answer wins each round' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  • Winner advances to next round' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  • Last brain standing wins!' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  [1]' + ANSIParser.reset() + ' Host Tournament');
        this.terminal.println(ANSIParser.fg('bright-blue') + '  [2]' + ANSIParser.reset() + ' Join Tournament');
        this.terminal.println(ANSIParser.fg('bright-white') + '  [B]' + ANSIParser.reset() + ' Back to Main Menu');
        this.terminal.println('');
        
        const choice = (await this.terminal.input()).toLowerCase().trim();
        
        if (choice === '1') {
            await this.hostTournament();
        } else if (choice === '2') {
            await this.joinTournament();
        } else if (choice === 'b') {
            return; // Go back to main menu
        } else {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Invalid choice! Please try again.' + ANSIParser.reset());
            await this.terminal.sleep(1000);
            await this.tournament();
        }
    }

    async hostTournament() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '╔══════════════════════════════════════════════════════════════════════════════╗' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '║' + ANSIParser.reset() + 
            ANSIParser.fg('bright-white') + '  🏆 HOST TOURNAMENT 🏆' + ANSIParser.reset() + 
            ' '.repeat(45) + ANSIParser.fg('bright-cyan') + '║' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '╚══════════════════════════════════════════════════════════════════════════════╝' + ANSIParser.reset());
        this.terminal.println('');
        
        // Generate tournament ID
        this.tournament.tournamentId = Date.now().toString();
        this.tournament.host = this.authManager.getCurrentUser().handle;
        this.tournament.phase = 'joining';
        this.tournament.joinEndTime = Date.now() + (60 * 1000); // 60 seconds to join
        this.tournament.participants = [{
            name: this.authManager.getCurrentUser().handle,
            userId: this.authManager.getCurrentUser().id,
            ready: true,
            score: 0,
            correctAnswers: 0,
            totalTime: 0
        }];
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  Tournament created!' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + `  Tournament ID: ${this.tournament.tournamentId}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + `  Host: ${this.tournament.host}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + `  Join Period: 60 seconds` + ANSIParser.reset());
        this.terminal.println('');
        
        // Broadcast tournament start
        if (this.socketClient && this.socketClient.socket) {
            this.socketClient.socket.emit('trivia-tournament-start', {
                tournamentId: this.tournament.tournamentId,
                host: this.tournament.host,
                joinPeriod: 60
            });
        }
        
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  Waiting for players to join...' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  Players can join by selecting "Join Tournament"' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Press any key to continue...' + ANSIParser.reset());
        await this.terminal.input();
        
        // Start the tournament
        await this.runTournament();
    }

    async joinTournament() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '╔══════════════════════════════════════════════════════════════════════════════╗' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '║' + ANSIParser.reset() + 
            ANSIParser.fg('bright-white') + '  🎯 JOIN TOURNAMENT 🎯' + ANSIParser.reset() + 
            ' '.repeat(45) + ANSIParser.fg('bright-cyan') + '║' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '╚══════════════════════════════════════════════════════════════════════════════╝' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-white') + '  Enter Tournament ID:' + ANSIParser.reset());
        const tournamentId = (await this.terminal.input()).trim();
        
        if (!tournamentId) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  No tournament ID entered!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
            return;
        }
        
        // Join the tournament
        if (this.socketClient && this.socketClient.socket) {
            this.socketClient.socket.emit('trivia-tournament-join', {
                tournamentId: tournamentId,
                player: this.authManager.getCurrentUser().handle,
                userId: this.authManager.getCurrentUser().id
            });
        }
        
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  Joining tournament...' + ANSIParser.reset());
        await this.terminal.sleep(2000);
        
        // For now, just show a message (we'll implement the full system later)
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Tournament joining system coming soon!' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  This will connect you to the tournament lobby.' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Press any key to continue...' + ANSIParser.reset());
        await this.terminal.input();
    }

    async runTournament() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '╔══════════════════════════════════════════════════════════════════════════════╗' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '║' + ANSIParser.reset() + 
            ANSIParser.fg('bright-white') + '  🏆 TOURNAMENT IN PROGRESS 🏆' + ANSIParser.reset() + 
            ' '.repeat(40) + ANSIParser.fg('bright-cyan') + '║' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '╚══════════════════════════════════════════════════════════════════════════════╝' + ANSIParser.reset());
        this.terminal.println('');
        
        // Generate bracket based on participant count
        this.generateBracket();
        
        this.terminal.println(ANSIParser.fg('bright-cyan') + `  Participants: ${this.tournament.participants.length}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + `  Rounds: ${this.tournament.maxRounds}` + ANSIParser.reset());
        this.terminal.println('');
        
        // Show bracket
        this.showBracket();
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Press any key to start the tournament...' + ANSIParser.reset());
        await this.terminal.input();
        
        // Run the tournament rounds
        await this.runTournamentRounds();
    }

    generateBracket() {
        const participantCount = this.tournament.participants.length;
        
        // Determine bracket size (2, 4, 8, 16)
        let bracketSize = 2;
        if (participantCount <= 2) bracketSize = 2;
        else if (participantCount <= 4) bracketSize = 4;
        else if (participantCount <= 8) bracketSize = 8;
        else bracketSize = 16;
        
        // Calculate rounds needed
        this.tournament.maxRounds = Math.log2(bracketSize);
        
        // Create bracket structure
        this.tournament.bracket = [];
        for (let round = 0; round < this.tournament.maxRounds; round++) {
            this.tournament.bracket[round] = [];
            const matchesInRound = bracketSize / Math.pow(2, round + 1);
            
            for (let match = 0; match < matchesInRound; match++) {
                this.tournament.bracket[round][match] = {
                    player1: null,
                    player2: null,
                    winner: null,
                    completed: false
                };
            }
        }
        
        // Assign participants to first round
        const shuffledParticipants = [...this.tournament.participants].sort(() => Math.random() - 0.5);
        let participantIndex = 0;
        
        for (let match = 0; match < this.tournament.bracket[0].length; match++) {
            if (participantIndex < shuffledParticipants.length) {
                this.tournament.bracket[0][match].player1 = shuffledParticipants[participantIndex];
                participantIndex++;
            }
            if (participantIndex < shuffledParticipants.length) {
                this.tournament.bracket[0][match].player2 = shuffledParticipants[participantIndex];
                participantIndex++;
            }
        }
    }

    showBracket() {
        this.terminal.println(ANSIParser.fg('bright-white') + '  Tournament Bracket:' + ANSIParser.reset());
        this.terminal.println('');
        
        for (let round = 0; round < this.tournament.bracket.length; round++) {
            this.terminal.println(ANSIParser.fg('bright-cyan') + `  Round ${round + 1}:` + ANSIParser.reset());
            
            for (let match = 0; match < this.tournament.bracket[round].length; match++) {
                const matchData = this.tournament.bracket[round][match];
                let matchText = `    Match ${match + 1}: `;
                
                if (matchData.player1 && matchData.player2) {
                    matchText += `${matchData.player1.name} vs ${matchData.player2.name}`;
                } else if (matchData.player1) {
                    matchText += `${matchData.player1.name} vs BYE`;
                } else if (matchData.player2) {
                    matchText += `BYE vs ${matchData.player2.name}`;
                } else {
                    matchText += `TBD vs TBD`;
                }
                
                if (matchData.winner) {
                    matchText += ` → ${matchData.winner.name}`;
                }
                
                this.terminal.println(ANSIParser.fg('bright-white') + matchText + ANSIParser.reset());
            }
            this.terminal.println('');
        }
    }

    async runTournamentRounds() {
        for (let round = 0; round < this.tournament.maxRounds; round++) {
            this.tournament.currentRound = round;
            
            this.terminal.clear();
            this.terminal.println(ANSIParser.fg('bright-cyan') + `╔══════════════════════════════════════════════════════════════════════════════╗` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-cyan') + `║` + ANSIParser.reset() + 
                ANSIParser.fg('bright-white') + `  ROUND ${round + 1} OF ${this.tournament.maxRounds}` + ANSIParser.reset() + 
                ' '.repeat(45) + ANSIParser.fg('bright-cyan') + `║` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-cyan') + `╚══════════════════════════════════════════════════════════════════════════════╝` + ANSIParser.reset());
            this.terminal.println('');
            
            // Run all matches in this round
            for (let match = 0; match < this.tournament.bracket[round].length; match++) {
                const matchData = this.tournament.bracket[round][match];
                
                if (matchData.player1 && matchData.player2) {
                    // Both players present - run the trivia battle
                    await this.runTriviaMatch(round, match, matchData);
                } else if (matchData.player1) {
                    // Only player1 - they get a bye
                    matchData.winner = matchData.player1;
                    matchData.completed = true;
                    this.terminal.println(ANSIParser.fg('bright-green') + `  ${matchData.player1.name} gets a BYE and advances!` + ANSIParser.reset());
                } else if (matchData.player2) {
                    // Only player2 - they get a bye
                    matchData.winner = matchData.player2;
                    matchData.completed = true;
                    this.terminal.println(ANSIParser.fg('bright-green') + `  ${matchData.player2.name} gets a BYE and advances!` + ANSIParser.reset());
                }
                
                await this.terminal.sleep(2000);
            }
            
            // Advance winners to next round
            this.advanceWinners(round);
        }
        
        // Tournament finished
        await this.endTournament();
    }

    async runTriviaMatch(round, match, matchData) {
        this.terminal.println(ANSIParser.fg('bright-cyan') + `  Match ${match + 1}: ${matchData.player1.name} vs ${matchData.player2.name}` + ANSIParser.reset());
        this.terminal.println('');
        
        // For now, simulate the trivia battle (we'll add real-time trivia later)
        const player1Score = Math.floor(Math.random() * 10) + 1; // 1-10
        const player2Score = Math.floor(Math.random() * 10) + 1; // 1-10
        
        this.terminal.println(ANSIParser.fg('bright-white') + '  Battle in progress...' + ANSIParser.reset());
        await this.terminal.sleep(2000);
        
        if (player1Score > player2Score) {
            matchData.winner = matchData.player1;
            this.terminal.println(ANSIParser.fg('bright-green') + `  ${matchData.player1.name} wins! (${player1Score}-${player2Score})` + ANSIParser.reset());
        } else if (player2Score > player1Score) {
            matchData.winner = matchData.player2;
            this.terminal.println(ANSIParser.fg('bright-green') + `  ${matchData.player2.name} wins! (${player2Score}-${player1Score})` + ANSIParser.reset());
        } else {
            // Tie - random winner
            const winner = Math.random() < 0.5 ? matchData.player1 : matchData.player2;
            matchData.winner = winner;
            this.terminal.println(ANSIParser.fg('bright-green') + `  ${winner.name} wins in tiebreaker! (${player1Score}-${player2Score})` + ANSIParser.reset());
        }
        
        matchData.completed = true;
        
        // Broadcast the result
        if (this.socketClient && this.socketClient.socket) {
            this.socketClient.socket.emit('trivia-tournament-update', {
                tournamentId: this.tournament.tournamentId,
                message: `🧠 ${matchData.winner.name} won their trivia battle in Round ${round + 1}!`
            });
        }
    }

    advanceWinners(round) {
        if (round < this.tournament.maxRounds - 1) {
            const nextRound = round + 1;
            let nextMatch = 0;
            
            for (let match = 0; match < this.tournament.bracket[round].length; match++) {
                const matchData = this.tournament.bracket[round][match];
                if (matchData.winner) {
                    if (nextMatch < this.tournament.bracket[nextRound].length) {
                        if (!this.tournament.bracket[nextRound][nextMatch].player1) {
                            this.tournament.bracket[nextRound][nextMatch].player1 = matchData.winner;
                        } else {
                            this.tournament.bracket[nextRound][nextMatch].player2 = matchData.winner;
                            nextMatch++;
                        }
                    }
                }
            }
        }
    }

    async endTournament() {
        // Find the final winner
        const finalRound = this.tournament.maxRounds - 1;
        const finalMatch = this.tournament.bracket[finalRound][0];
        this.tournament.winner = finalMatch.winner;
        
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '╔══════════════════════════════════════════════════════════════════════════════╗' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '║' + ANSIParser.reset() + 
            ANSIParser.fg('bright-white') + '  🏆 TOURNAMENT COMPLETE! 🏆' + ANSIParser.reset() + 
            ' '.repeat(40) + ANSIParser.fg('bright-cyan') + '║' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '╚══════════════════════════════════════════════════════════════════════════════╝' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-green') + `  🥇 WINNER: ${this.tournament.winner.name}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  The smartest brain in the west!' + ANSIParser.reset());
        this.terminal.println('');
        
        // Show final bracket
        this.showBracket();
        
        // Broadcast tournament end
        if (this.socketClient && this.socketClient.socket) {
            this.socketClient.socket.emit('trivia-tournament-end', {
                tournamentId: this.tournament.tournamentId,
                winner: this.tournament.winner.name
            });
        }
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Press any key to continue...' + ANSIParser.reset());
        await this.terminal.input();
        
        // Reset tournament state
        this.tournament.active = false;
        this.tournament.phase = 'finished';
    }

    setupTournamentListeners() {
        if (this.socketClient && this.socketClient.socket) {
            this.socketClient.socket.on('trivia-tournament-announcement', (data) => {
                if (data.type === 'tournament-start') {
                    // Show tournament announcement
                    this.terminal.println('');
                    this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
                    this.terminal.println(ANSIParser.fg('bright-cyan') + '  🧠 TRIVIA TOURNAMENT ANNOUNCEMENT 🧠' + ANSIParser.reset());
                    this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
                    this.terminal.println('');
                    this.terminal.println(ANSIParser.fg('bright-white') + `  ${data.message}` + ANSIParser.reset());
                    this.terminal.println('');
                    this.terminal.println(ANSIParser.fg('bright-cyan') + '  Go to Tournament Mode → Join Tournament to participate!' + ANSIParser.reset());
                    this.terminal.println(ANSIParser.fg('bright-yellow') + `  You have ${data.joinPeriod} seconds to join!` + ANSIParser.reset());
                    this.terminal.println('');
                    this.terminal.println('  Press any key to continue...');
                } else if (data.type === 'tournament-join') {
                    // Show player joined
                    this.terminal.println('');
                    this.terminal.println(ANSIParser.fg('bright-cyan') + `  ${data.message}` + ANSIParser.reset());
                    this.terminal.println('');
                } else if (data.type === 'tournament-update') {
                    // Show tournament update
                    this.terminal.println('');
                    this.terminal.println(ANSIParser.fg('bright-green') + `  ${data.message}` + ANSIParser.reset());
                    this.terminal.println('');
                } else if (data.type === 'tournament-end') {
                    // Show tournament results
                    this.terminal.println('');
                    this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
                    this.terminal.println(ANSIParser.fg('bright-cyan') + '  🏆 TOURNAMENT RESULTS 🏆' + ANSIParser.reset());
                    this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
                    this.terminal.println('');
                    this.terminal.println(ANSIParser.fg('bright-white') + `  ${data.message}` + ANSIParser.reset());
                    this.terminal.println('');
                    this.terminal.println('  Press any key to continue...');
                }
            });
        }
    }

    async quickBattle() {
        // Simple AI battle for now
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '╔══════════════════════════════════════════════════════════════════════════════╗' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '║' + ANSIParser.reset() + 
            ANSIParser.fg('bright-white') + '  🧠 QUICK BATTLE vs AI 🧠' + ANSIParser.reset() + 
            ' '.repeat(40) + ANSIParser.fg('bright-cyan') + '║' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '╚══════════════════════════════════════════════════════════════════════════════╝' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Quick Battle system coming soon!' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  This will be a single-player vs AI trivia game.' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Press any key to continue...' + ANSIParser.reset());
        await this.terminal.input();
    }

    async showStats() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '╔══════════════════════════════════════════════════════════════════════════════╗' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '║' + ANSIParser.reset() + 
            ANSIParser.fg('bright-white') + '  YOUR TRIVIA STATISTICS' + ANSIParser.reset() + 
            ' '.repeat(48) + ANSIParser.fg('bright-cyan') + '║' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '╚══════════════════════════════════════════════════════════════════════════════╝' + ANSIParser.reset());
        this.terminal.println('');
        
        if (this.gameState.totalGames > 0) {
            this.terminal.println(ANSIParser.fg('bright-white') + `  Games Played: ${this.gameState.totalGames}` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-white') + `  Games Won: ${this.gameState.totalWins}` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-white') + `  Win Rate: ${this.gameState.totalGames > 0 ? ((this.gameState.totalWins / this.gameState.totalGames) * 100).toFixed(1) : 0}%` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-white') + `  Total Questions: ${this.gameState.totalQuestions}` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-white') + `  Correct Answers: ${this.gameState.totalCorrect}` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-white') + `  Accuracy: ${this.gameState.totalQuestions > 0 ? ((this.gameState.totalCorrect / this.gameState.totalQuestions) * 100).toFixed(1) : 0}%` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-white') + `  Best Streak: ${this.gameState.bestStreak}` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-white') + `  Average Time: ${this.gameState.averageTime.toFixed(2)}s` + ANSIParser.reset());
        } else {
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  No games played yet!' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-white') + '  Play some trivia battles to build your stats.' + ANSIParser.reset());
        }
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Press any key to continue...' + ANSIParser.reset());
        await this.terminal.input();
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
