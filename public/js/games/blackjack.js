// Blackjack - Classic Casino Game
class Blackjack {
    constructor(terminal, socketClient, authManager) {
        this.terminal = terminal;
        this.socketClient = socketClient;
        this.authManager = authManager;
        this.deck = [];
        this.playerHand = [];
        this.dealerHand = [];
        this.gameState = null;
        this.bet = 0;
    }

    async play() {
        this.terminal.clear();
        await this.showCasinoIntro();
        this.terminal.println(ANSIParser.fg('bright-cyan') + this.getTitle() + ANSIParser.reset());
        this.terminal.println('');
        
        // Load game state
        await this.loadGameState();
        
        while (true) {
            this.terminal.clear();
            this.showStatus();
            this.terminal.println('');
            
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [P]' + ANSIParser.reset() + ' Play Hand');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [S]' + ANSIParser.reset() + ' Statistics');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [X]' + ANSIParser.reset() + ' Exit');
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
            
            const choice = (await this.terminal.input()).toLowerCase();
            
            if (choice === 'p') {
                await this.playHand();
            } else if (choice === 's') {
                await this.showStats();
            } else if (choice === 'x') {
                await this.saveGameState();
                return 'doors';
            }
        }
    }

    async playHand() {
        // Get bet
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + `  You have ${this.gameState.credits} credits.` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + '  How much do you want to bet? ' + ANSIParser.reset());
        
        const betInput = parseInt(await this.terminal.input());
        
        if (betInput <= 0 || betInput > this.gameState.credits) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Invalid bet!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
            return;
        }
        
        this.bet = betInput;
        this.gameState.credits -= this.bet;
        this.gameState.gamesPlayed++;
        
        // Deal initial cards
        this.deck = this.shuffleDeck(this.createDeck());
        this.playerHand = [this.dealCard(), this.dealCard()];
        this.dealerHand = [this.dealCard(), this.dealCard()];
        
        // Check for blackjack
        if (this.getHandValue(this.playerHand) === 21) {
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  BLACKJACK! You win!' + ANSIParser.reset());
            const winnings = Math.floor(this.bet * 2.5);
            this.gameState.credits += this.bet + winnings;
            this.gameState.gamesWon++;
            this.gameState.totalWinnings += winnings;
            await this.terminal.sleep(3000);
            return;
        }
        
        // Player turn
        while (true) {
            this.terminal.clear();
            this.showHands(false);
            this.terminal.println('');
            
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [H]' + ANSIParser.reset() + ' Hit');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [S]' + ANSIParser.reset() + ' Stand');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [D]' + ANSIParser.reset() + ' Double Down (if first hand)');
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
            
            const choice = (await this.terminal.input()).toLowerCase();
            
            if (choice === 'h') {
                this.playerHand.push(this.dealCard());
                const value = this.getHandValue(this.playerHand);
                
                if (value > 21) {
                    // Bust
                    this.terminal.println('');
                    this.terminal.println(ANSIParser.fg('bright-red') + '  BUST! You lose!' + ANSIParser.reset());
                    this.gameState.gamesLost++;
                    await this.terminal.sleep(3000);
                    return;
                } else if (value === 21) {
                    // Player has 21
                    break;
                }
            } else if (choice === 's') {
                break;
            } else if (choice === 'd' && this.playerHand.length === 2) {
                // Double down
                if (this.gameState.credits >= this.bet) {
                    this.gameState.credits -= this.bet;
                    this.bet *= 2;
                    this.playerHand.push(this.dealCard());
                    
                    const value = this.getHandValue(this.playerHand);
                    if (value > 21) {
                        this.terminal.println('');
                        this.terminal.println(ANSIParser.fg('bright-red') + '  BUST! You lose!' + ANSIParser.reset());
                        this.gameState.gamesLost++;
                        await this.terminal.sleep(3000);
                        return;
                    }
                    break;
                } else {
                    this.terminal.println(ANSIParser.fg('bright-red') + '  Not enough credits to double down!' + ANSIParser.reset());
                    await this.terminal.sleep(2000);
                }
            }
        }
        
        // Dealer turn
        while (this.getHandValue(this.dealerHand) < 17) {
            this.dealerHand.push(this.dealCard());
        }
        
        // Determine winner
        this.terminal.clear();
        this.showHands(true);
        this.terminal.println('');
        
        const playerValue = this.getHandValue(this.playerHand);
        const dealerValue = this.getHandValue(this.dealerHand);
        
        if (dealerValue > 21) {
            this.terminal.println(ANSIParser.fg('bright-green') + '  Dealer busts! You win!' + ANSIParser.reset());
            const winnings = this.bet * 2;
            this.gameState.credits += winnings;
            this.gameState.gamesWon++;
            this.gameState.totalWinnings += this.bet;
        } else if (playerValue > dealerValue) {
            this.terminal.println(ANSIParser.fg('bright-green') + '  You win!' + ANSIParser.reset());
            const winnings = this.bet * 2;
            this.gameState.credits += winnings;
            this.gameState.gamesWon++;
            this.gameState.totalWinnings += this.bet;
        } else if (playerValue < dealerValue) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Dealer wins! You lose!' + ANSIParser.reset());
            this.gameState.gamesLost++;
            this.gameState.totalWinnings -= this.bet;
        } else {
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  Push! It\'s a tie!' + ANSIParser.reset());
            this.gameState.credits += this.bet;
        }
        
        await this.terminal.sleep(3000);
    }

    showHands(showDealer) {
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  BLACKJACK' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-white') + '  Dealer\'s Hand:' + ANSIParser.reset());
        if (showDealer) {
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  ' + this.dealerHand.map(c => this.getCardDisplay(c)).join(' ') + 
                ' = ' + this.getHandValue(this.dealerHand) + ANSIParser.reset());
        } else {
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  ' + this.getCardDisplay(this.dealerHand[0]) + ' [??]' + ANSIParser.reset());
        }
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-white') + '  Your Hand:' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  ' + this.playerHand.map(c => this.getCardDisplay(c)).join(' ') + 
            ' = ' + this.getHandValue(this.playerHand) + ANSIParser.reset());
    }

    createDeck() {
        const suits = ['♠', '♥', '♦', '♣'];
        const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
        const deck = [];
        
        for (let suit of suits) {
            for (let rank of ranks) {
                deck.push({ suit, rank });
            }
        }
        
        return deck;
    }

    shuffleDeck(deck) {
        const shuffled = [...deck];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    dealCard() {
        return this.deck.pop();
    }

    getHandValue(hand) {
        let value = 0;
        let aces = 0;
        
        for (let card of hand) {
            if (card.rank === 'A') {
                aces++;
                value += 11;
            } else if (['J', 'Q', 'K'].includes(card.rank)) {
                value += 10;
            } else {
                value += parseInt(card.rank);
            }
        }
        
        // Adjust for aces
        while (value > 21 && aces > 0) {
            value -= 10;
            aces--;
        }
        
        return value;
    }

    getCardDisplay(card) {
        const suitColor = (card.suit === '♥' || card.suit === '♦') ? 'bright-red' : 'bright-white';
        return ANSIParser.fg(suitColor) + card.rank + card.suit + ANSIParser.reset();
    }

    async showStats() {
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  Your Blackjack Statistics:' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-white') + `  Games Played: ${this.gameState.gamesPlayed}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + `  Games Won: ${this.gameState.gamesWon}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-red') + `  Games Lost: ${this.gameState.gamesLost}` + ANSIParser.reset());
        
        if (this.gameState.gamesPlayed > 0) {
            const winRate = ((this.gameState.gamesWon / this.gameState.gamesPlayed) * 100).toFixed(1);
            this.terminal.println(ANSIParser.fg('bright-yellow') + `  Win Rate: ${winRate}%` + ANSIParser.reset());
        }
        
        this.terminal.println(ANSIParser.fg('bright-green') + `  Total Winnings: ${this.gameState.totalWinnings} credits` + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Press any key to continue...' + ANSIParser.reset());
        await this.terminal.input();
    }

    showStatus() {
        this.terminal.println(ANSIParser.fg('bright-cyan') + '╔══════════════════════════════════════════════════════════════════════════════╗' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '║' + ANSIParser.reset() + 
            ANSIParser.fg('bright-white') + '  BLACKJACK' + ANSIParser.reset() + 
            ' '.repeat(68) + ANSIParser.fg('bright-cyan') + '║' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '╚══════════════════════════════════════════════════════════════════════════════╝' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + `  Credits: ${this.gameState.credits}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + `  Games Played: ${this.gameState.gamesPlayed}  |  Won: ${this.gameState.gamesWon}  |  Lost: ${this.gameState.gamesLost}` + ANSIParser.reset());
    }

    async loadGameState() {
        try {
            const response = await fetch(`/api/game-state/blackjack`, {
                credentials: 'include'
            });
            const state = await response.json();
            if (state && state.game_data) {
                this.gameState = { ...this.gameState, ...JSON.parse(state.game_data) };
            } else {
                // Initialize new game state
                this.gameState = {
                    credits: 100,
                    gamesPlayed: 0,
                    gamesWon: 0,
                    gamesLost: 0,
                    totalWinnings: 0
                };
            }
        } catch (error) {
            console.log('Starting new Blackjack game');
            this.gameState = {
                credits: 100,
                gamesPlayed: 0,
                gamesWon: 0,
                gamesLost: 0,
                totalWinnings: 0
            };
        }
    }

    async saveGameState() {
        try {
            const response = await fetch(`/api/game-state/blackjack`, {
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
║                              BLACKJACK                                        ║
║                                                                              ║
║                        Classic Casino Card Game                               ║
║                                                                              ║
║  Beat the dealer without going over 21!                                      ║
║  Blackjack pays 2.5:1!                                                       ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
`;
    }

    async showCasinoIntro() {
        // Casino intro animation
        const casinoFrames = [
            '🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰',
            '🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰',
            '🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰',
            '🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰',
            '🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰',
            '🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰',
            '🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰',
            '🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰',
            '🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰',
            '🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰',
        ];

        for (let frame of casinoFrames) {
            this.terminal.clear();
            this.terminal.println(ANSIParser.fg('bright-red') + frame + ANSIParser.reset());
            await this.terminal.sleep(100);
        }

        // Card dealing animation
        const dealingFrames = [
            '🃏',
            '🃏 🃏',
            '🃏 🃏 🃏',
            '🃏 🃏 🃏 🃏',
            '🃏 🃏 🃏 🃏 🃏',
            '🃏 🃏 🃏 🃏 🃏 🃏',
            '🃏 🃏 🃏 🃏 🃏 🃏 🃏',
            '🃏 🃏 🃏 🃏 🃏 🃏 🃏 🃏',
        ];

        for (let frame of dealingFrames) {
            this.terminal.clear();
            this.terminal.println(ANSIParser.fg('bright-white') + frame + ANSIParser.reset());
            await this.terminal.sleep(200);
        }

        // Casino lights animation
        const lightFrames = [
            '💡💡💡💡💡💡💡💡💡💡💡💡💡💡💡💡💡💡💡💡',
            '💡💡💡💡💡💡💡💡💡💡💡💡💡💡💡💡💡💡💡💡',
            '💡💡💡💡💡💡💡💡💡💡💡💡💡💡💡💡💡💡💡💡',
            '💡💡💡💡💡💡💡💡💡💡💡💡💡💡💡💡💡💡💡💡',
            '💡💡💡💡💡💡💡💡💡💡💡💡💡💡💡💡💡💡💡💡',
        ];

        for (let frame of lightFrames) {
            this.terminal.clear();
            this.terminal.println(ANSIParser.fg('bright-yellow') + frame + ANSIParser.reset());
            await this.terminal.sleep(150);
        }

        await this.terminal.sleep(500);
    }

    async showDealingAnimation() {
        // Card dealing animation
        const dealingFrames = [
            '🃏 Dealing...',
            '🃏 🃏 Dealing...',
            '🃏 🃏 🃏 Dealing...',
            '🃏 🃏 🃏 🃏 Dealing...',
            '🃏 🃏 🃏 🃏 🃏 Dealing...',
        ];

        for (let frame of dealingFrames) {
            this.terminal.clear();
            this.terminal.println(ANSIParser.fg('bright-white') + frame + ANSIParser.reset());
            await this.terminal.sleep(300);
        }
    }

    async showWinAnimation() {
        // Win celebration animation
        const winFrames = [
            '🎉',
            '🎉 🎉',
            '🎉 🎉 🎉',
            '🎉 🎉 🎉 🎉',
            '🎉 🎉 🎉 🎉 🎉',
            '🎉 🎉 🎉 🎉 🎉 🎉',
            '🎉 🎉 🎉 🎉 🎉 🎉 🎉',
            '🎉 🎉 🎉 🎉 🎉 🎉 🎉 🎉',
        ];

        for (let frame of winFrames) {
            this.terminal.clear();
            this.terminal.println(ANSIParser.fg('bright-green') + frame + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-green') + '  YOU WIN! 🎉' + ANSIParser.reset());
            await this.terminal.sleep(200);
        }
    }

    async showLoseAnimation() {
        // Lose animation
        const loseFrames = [
            '💸',
            '💸 💸',
            '💸 💸 💸',
            '💸 💸 💸 💸',
            '💸 💸 💸 💸 💸',
        ];

        for (let frame of loseFrames) {
            this.terminal.clear();
            this.terminal.println(ANSIParser.fg('bright-red') + frame + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-red') + '  YOU LOSE! 💸' + ANSIParser.reset());
            await this.terminal.sleep(300);
        }
    }
}

// Export for use in other modules
window.Blackjack = Blackjack;


