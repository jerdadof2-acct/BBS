// Door Games Launcher
class DoorGames {
    constructor(terminal, socketClient, authManager) {
        this.terminal = terminal;
        this.socketClient = socketClient;
        this.authManager = authManager;
        this.games = [
            { id: 'word-race', name: '🏃 Word Race 🏃', description: 'Typing competition - SOLO/MP (Practice + Multiplayer)' },
            { id: 'trivia-battle', name: '🧠 Trivia Battle 🧠', description: 'Trivia competition - MULTIPLAYER ONLY' },
            { id: 'high-noon-duel', name: '🤠 High Noon Duel 🤠', description: 'Western shootout - MULTIPLAYER ONLY' },
            { id: 'cyber-arena', name: '⚡ Cyber Arena ⚡', description: 'Arena combat - MULTIPLAYER ONLY' },
            { id: 'fishing-hole', name: '🎣 Fishing Hole 🎣', description: 'Fishing adventure - SOLO/MP (Play alone or with others)' },
            { id: 'lord', name: 'Legend of the Red Dragon', description: 'Classic BBS RPG - SINGLE PLAYER' },
            { id: 'rock-star', name: 'Rock Star', description: 'Band management - SINGLE PLAYER' },
            { id: 'tradewars', name: 'TradeWars 2002', description: 'Space trading - SINGLE PLAYER' },
            { id: 'bre', name: 'Barren Realms Elite', description: 'Economic strategy - SINGLE PLAYER' },
            { id: 'overkill', name: 'Operation Overkill II', description: 'Wasteland survival - SINGLE PLAYER' },
            { id: 'usurper', name: 'Usurper', description: 'Medieval fantasy - SINGLE PLAYER' },
            { id: 'galactic-trader', name: 'Galactic Trader', description: 'Space trading sim - SINGLE PLAYER' },
            { id: 'the-pit', name: 'The Pit', description: 'PvP combat arena - MULTIPLAYER ONLY' },
            { id: 'blackjack', name: 'Blackjack', description: 'Casino card game - SINGLE PLAYER' },
            { id: 'trivia', name: 'Trivia', description: 'Quiz game - SINGLE PLAYER' },
            { id: 'hangman', name: 'Hangman', description: 'Word guessing - SINGLE PLAYER' },
            { id: 'number-guess', name: 'Number Guess', description: 'Daily guessing - SINGLE PLAYER' }
        ];
    }

    async showGames() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + this.getHeader() + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-white') + '  Available Games:' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  LEGEND: ' + ANSIParser.reset() + 
            ANSIParser.fg('bright-green') + 'SINGLE PLAYER ' + ANSIParser.reset() + 
            ANSIParser.fg('bright-yellow') + '| ' + ANSIParser.reset() + 
            ANSIParser.fg('bright-red') + 'MULTIPLAYER ONLY ' + ANSIParser.reset() + 
            ANSIParser.fg('bright-yellow') + '| ' + ANSIParser.reset() + 
            ANSIParser.fg('bright-magenta') + 'SOLO/MP (Both)' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-white') + '  TIP: ' + ANSIParser.reset() + 
            ANSIParser.fg('bright-green') + 'Single Player ' + ANSIParser.reset() + 
            ANSIParser.fg('bright-white') + '= Play anytime | ' + ANSIParser.reset() + 
            ANSIParser.fg('bright-red') + 'Multiplayer ' + ANSIParser.reset() + 
            ANSIParser.fg('bright-white') + '= Need others online' + ANSIParser.reset());
        this.terminal.println('');
        
        for (let i = 0; i < this.games.length; i++) {
            const game = this.games[i];
            this.terminal.println(ANSIParser.fg('bright-yellow') + `  [${i + 1}]` + ANSIParser.reset() + ` ${game.name}`);
            
            // Color code the description based on game type
            let descriptionColor = ANSIParser.fg('bright-black');
            if (game.description.includes('SINGLE PLAYER')) {
                descriptionColor = ANSIParser.fg('bright-green');
            } else if (game.description.includes('MULTIPLAYER ONLY')) {
                descriptionColor = ANSIParser.fg('bright-red');
            } else if (game.description.includes('SOLO/MP')) {
                descriptionColor = ANSIParser.fg('bright-magenta');
            }
            
            this.terminal.println(descriptionColor + `      ${game.description}` + ANSIParser.reset());
            this.terminal.println('');
        }
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  GAME SUMMARY:' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + '  • 11 Single Player Games' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-red') + '  • 3 Multiplayer Only Games' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-magenta') + '  • 2 Games (Solo + Multiplayer)' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [0]' + ANSIParser.reset() + ' Return to Main Menu');
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + '  Select game: ' + ANSIParser.reset());
        
        const choice = await this.terminal.input();
        const gameIndex = parseInt(choice) - 1;
        
        if (choice === '0') {
            return 'menu';
        } else if (gameIndex >= 0 && gameIndex < this.games.length) {
            return await this.launchGame(this.games[gameIndex]);
        } else {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Invalid selection.' + ANSIParser.reset());
            await this.terminal.sleep(1500);
            return 'doors';
        }
    }

    async launchGame(game) {
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-yellow') + `  Loading ${game.name}...` + ANSIParser.reset());
        await this.terminal.sleep(1000);
        
        // Launch the appropriate game
        if (game.id === 'word-race') {
            const wordRace = new WordRace(this.terminal, this.socketClient, this.authManager);
            const result = await wordRace.play();
            return result === 'menu' ? 'menu' : 'doors';
        } else if (game.id === 'trivia-battle') {
            const triviaBattle = new TriviaBattle(this.terminal, this.socketClient, this.authManager);
            const result = await triviaBattle.play();
            return result === 'menu' ? 'menu' : 'doors';
        } else if (game.id === 'high-noon-duel') {
            const highNoonDuel = new HighNoonDuel(this.terminal, this.socketClient, this.authManager);
            const result = await highNoonDuel.play();
            return result === 'menu' ? 'menu' : 'doors';
        } else if (game.id === 'cyber-arena') {
            const cyberArena = new CyberArena(this.terminal, this.socketClient, this.authManager);
            const result = await cyberArena.play();
            return result === 'menu' ? 'menu' : 'doors';
        } else if (game.id === 'fishing-hole') {
            const fishingHole = new FishingHole(this.terminal, this.socketClient, this.authManager);
            const result = await fishingHole.play();
            return result === 'menu' ? 'menu' : 'doors';
        } else if (game.id === 'lord') {
            const lord = new LORD(this.terminal, this.socketClient, this.authManager);
            const result = await lord.play();
            return result === 'menu' ? 'menu' : 'doors';
        } else if (game.id === 'rock-star') {
            const rockStar = new RockStar(this.terminal, this.socketClient, this.authManager);
            const result = await rockStar.play();
            return result === 'menu' ? 'menu' : 'doors';
        } else if (game.id === 'tradewars') {
            const tradewars = new TradeWars(this.terminal, this.socketClient, this.authManager);
            const result = await tradewars.play();
            return result === 'menu' ? 'menu' : 'doors';
        } else if (game.id === 'bre') {
            const bre = new BRE(this.terminal, this.socketClient, this.authManager);
            const result = await bre.play();
            return result === 'menu' ? 'menu' : 'doors';
        } else if (game.id === 'overkill') {
            const overkill = new Overkill(this.terminal, this.socketClient, this.authManager);
            const result = await overkill.play();
            return result === 'menu' ? 'menu' : 'doors';
        } else if (game.id === 'usurper') {
            const usurper = new Usurper(this.terminal, this.socketClient, this.authManager);
            const result = await usurper.play();
            return result === 'menu' ? 'menu' : 'doors';
        } else if (game.id === 'galactic-trader') {
            const galacticTrader = new GalacticTrader(this.terminal, this.socketClient, this.authManager);
            const result = await galacticTrader.play();
            return result === 'menu' ? 'menu' : 'doors';
        } else if (game.id === 'the-pit') {
            const thePit = new ThePit(this.terminal, this.socketClient, this.authManager);
            const result = await thePit.play();
            return result === 'menu' ? 'menu' : 'doors';
        } else if (game.id === 'blackjack') {
            const blackjack = new Blackjack(this.terminal, this.socketClient, this.authManager);
            const result = await blackjack.play();
            return result === 'menu' ? 'menu' : 'doors';
        } else if (game.id === 'trivia') {
            const trivia = new Trivia(this.terminal, this.socketClient, this.authManager);
            const result = await trivia.play();
            return result === 'menu' ? 'menu' : 'doors';
        } else if (game.id === 'hangman') {
            const hangman = new Hangman(this.terminal, this.socketClient, this.authManager);
            const result = await hangman.play();
            return result === 'menu' ? 'menu' : 'doors';
        } else if (game.id === 'number-guess') {
            const numberGuess = new NumberGuess(this.terminal, this.socketClient, this.authManager);
            const result = await numberGuess.play();
            return result === 'menu' ? 'menu' : 'doors';
        }
        
        return 'doors';
    }

    getHeader() {
        return `
╔══════════════════════════════════════════════════════════════════════════════╗
║                         DOOR GAMES                                           ║
╚══════════════════════════════════════════════════════════════════════════════╝
`;
    }
}

// Export for use in other modules
window.DoorGames = DoorGames;

