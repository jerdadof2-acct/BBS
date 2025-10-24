# Tournament Synchronization Implementation Guide

This document outlines the complete system for implementing synchronized multiplayer tournaments in the BBS games. This was developed for High Noon Hustle and should be used as a reference for implementing tournaments in other games.

## Overview

The key principle is **server-side generation with client-side display**. All game logic that affects fairness must be generated on the server and broadcast to all clients to ensure perfect synchronization.

## Architecture

### Server-Side Components

#### 1. Tournament State Management
```javascript
const activeTournaments = new Map(); // tournamentId -> tournament object
```

#### 2. Server-Side Game Logic Generation
- All random elements (cards, dice, etc.) generated on server
- Deterministic algorithms using tournament ID + round number as seed
- Consistent participant ordering (sorted by ID)

#### 3. Event Handlers
- `tournament-start`: Initialize tournament with rounds selection
- `tournament-join`: Add participants to tournament
- `tournament-round-request`: Client requests game data for round
- `tournament-round-data`: Server broadcasts game data to all clients
- `tournament-score-update`: Synchronize scores across clients

### Client-Side Components

#### 1. Tournament Flow Control
- `tournament.running` flag prevents duplicate tournament runs
- Waiting room system for participants
- Automatic transition from waiting to active tournament

#### 2. Server Communication
- Request-based data fetching (don't generate locally)
- Wait for server responses with timeout handling
- Process server data for display

#### 3. Synchronized Display
- All players see identical game state
- Real-time score updates
- Consistent timing across all clients

## Implementation Pattern

### 1. Tournament Setup
```javascript
// Client: Start tournament with round selection
async startTournament(gameType) {
    // Ask user for tournament length (10 or 20 rounds)
    let rounds = 10; // or 20
    this.tournament.rounds = rounds;
    
    // Send to server with rounds info
    this.socketClient.socket.emit('tournament-start', {
        game: 'game-name',
        host: this.player.display_name,
        gameType: gameType,
        tournamentId: this.tournament.tournamentId,
        rounds: rounds,
        joinPeriod: 30
    });
}
```

### 2. Server-Side Game Data Generation
```javascript
// Server: Generate game data for round
function generateTournamentGameData(tournament, roundNumber) {
    // Create deterministic seed
    const seed = tournament.tournamentId + roundNumber;
    
    // Generate game-specific data (cards, dice, etc.)
    const gameData = generateGameSpecificData(seed, tournament.participants);
    
    return gameData;
}

// Server: Handle round requests
socket.on('tournament-round-request', (data) => {
    if (data.game === 'game-name') {
        const tournament = activeTournaments.get(data.tournamentId);
        if (tournament) {
            const gameData = generateTournamentGameData(tournament, data.roundNumber);
            
            // Broadcast to all players
            io.to('game-room').emit('tournament-round-data', {
                game: 'game-name',
                tournamentId: data.tournamentId,
                roundNumber: data.roundNumber,
                data: gameData
            });
        }
    }
});
```

### 3. Client-Side Round Processing
```javascript
// Client: Process tournament round
async playTournamentRound() {
    const roundNumber = this.tournament.currentRound || 1;
    
    // Request data from server
    this.socketClient.socket.emit('tournament-round-request', {
        game: 'game-name',
        tournamentId: this.tournament.tournamentId,
        roundNumber: roundNumber
    });
    
    // Wait for server response
    const gameData = await this.waitForTournamentData(roundNumber);
    
    // Process and display data
    this.processAndDisplayGameData(gameData);
    
    // Update scores and broadcast
    this.updateScoresAndBroadcast(gameData);
}

// Client: Wait for server data
async waitForTournamentData(roundNumber) {
    return new Promise((resolve) => {
        const timeout = setTimeout(() => resolve(null), 10000);
        
        const handler = (data) => {
            if (data.tournamentId === this.tournament.tournamentId && 
                data.roundNumber === roundNumber) {
                clearTimeout(timeout);
                this.socketClient.socket.off('tournament-round-data', handler);
                resolve(data.data);
            }
        };
        
        this.socketClient.socket.on('tournament-round-data', handler);
    });
}
```

## Game-Specific Implementation

### Poker Tournament (High Noon Hustle)
```javascript
// Server: Generate poker hands
function generateTournamentCards(tournament, roundNumber) {
    // Create 52-card deck
    const deck = createStandardDeck();
    
    // Shuffle with deterministic seed
    const seed = tournament.tournamentId + roundNumber;
    shuffleDeck(deck, seed);
    
    // Deal 5 cards to each participant in consistent order
    const sortedParticipants = [...tournament.participants].sort((a, b) => a.id.localeCompare(b.id));
    const playerHands = [];
    let cardIndex = 0;
    
    for (let participant of sortedParticipants) {
        const hand = deck.slice(cardIndex, cardIndex + 5);
        cardIndex += 5;
        playerHands.push({
            participantId: participant.id,
            participantName: participant.name,
            cards: hand
        });
    }
    
    return playerHands;
}
```

### Dice Games
```javascript
// Server: Generate dice rolls
function generateTournamentDice(tournament, roundNumber) {
    const seed = tournament.tournamentId + roundNumber;
    const diceResults = [];
    
    for (let participant of tournament.participants) {
        const rolls = rollDice(2, seed + participant.id.charCodeAt(0));
        diceResults.push({
            participantId: participant.id,
            participantName: participant.name,
            rolls: rolls,
            total: rolls.reduce((a, b) => a + b, 0)
        });
    }
    
    return diceResults;
}
```

### Trivia Games
```javascript
// Server: Generate trivia questions
function generateTournamentTrivia(tournament, roundNumber) {
    const seed = tournament.tournamentId + roundNumber;
    const question = getRandomTriviaQuestion(seed);
    
    return {
        question: question.text,
        options: question.options,
        correctAnswer: question.correct,
        category: question.category
    };
}
```

## Key Principles

### 1. Deterministic Generation
- Always use `tournamentId + roundNumber` as seed
- Same seed = same results across all clients
- Sort participants by ID for consistent ordering

### 2. Server Authority
- Server generates all random elements
- Clients only display and process server data
- No client-side random generation in tournaments

### 3. Synchronized Timing
- Fixed round durations (e.g., 10 seconds per round)
- All clients wait for server data before proceeding
- Consistent delays between displays

### 4. Real-Time Updates
- Score updates broadcast to all players
- Leaderboard updates in real-time
- Tournament state changes synchronized

## Tournament Flow

1. **Host starts tournament** → Selects rounds (10 or 20)
2. **Server creates tournament** → Stores state, sets up participants
3. **Players join** → Added to participant list
4. **Tournament begins** → All players enter game simultaneously
5. **For each round**:
   - Client requests round data from server
   - Server generates game data deterministically
   - Server broadcasts data to all clients
   - All clients display identical game state
   - Scores updated and synchronized
6. **Tournament ends** → Results calculated, rewards distributed

## Error Handling

- Timeout handling for server requests (10 seconds)
- Graceful fallback if server data unavailable
- Tournament cancellation if not enough participants
- Connection recovery for dropped players

## Testing Checklist

- [ ] All players see identical game state
- [ ] Scores synchronize across all clients
- [ ] Tournament timing is consistent
- [ ] Round progression works correctly
- [ ] Error handling works properly
- [ ] Rewards system functions correctly

## Files Modified

### Server (`server/server-persistent.js`)
- Added `activeTournaments` map
- Added `generateTournamentCards()` function
- Added `tournament-round-request` handler
- Added `tournament-round-data` broadcast

### Client (`public/js/games/high-noon-hustle.js`)
- Modified `playTournamentPokerRound()` to request server data
- Added `waitForTournamentCards()` method
- Added `tournament.running` flag for duplicate prevention
- Updated tournament flow and timing

## Next Steps for Other Games

1. **Identify random elements** in the game (dice, cards, questions, etc.)
2. **Create server-side generation function** for those elements
3. **Add tournament round request handler** on server
4. **Modify client game logic** to request server data
5. **Implement synchronized display** of game results
6. **Test with multiple players** to ensure perfect sync

This system ensures that tournaments are completely fair and synchronized across all participants, with the server as the single source of truth for all game data.
