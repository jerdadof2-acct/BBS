# Tournament Implementation Quick Reference

## Server-Side Pattern

```javascript
// 1. Store tournament state
activeTournaments.set(tournamentId, {
    game: data.game,
    host: data.host,
    gameType: data.gameType,
    rounds: data.rounds || 10,
    participants: [...],
    phase: 'joining',
    active: false
});

// 2. Generate game data function
function generateTournamentGameData(tournament, roundNumber) {
    const seed = tournament.tournamentId + roundNumber;
    const sortedParticipants = [...tournament.participants].sort((a, b) => a.id.localeCompare(b.id));
    
    // Generate game-specific data here
    return gameData;
}

// 3. Handle round requests
socket.on('tournament-round-request', (data) => {
    const tournament = activeTournaments.get(data.tournamentId);
    const gameData = generateTournamentGameData(tournament, data.roundNumber);
    
    io.to('game-room').emit('tournament-round-data', {
        game: data.game,
        tournamentId: data.tournamentId,
        roundNumber: data.roundNumber,
        data: gameData
    });
});
```

## Client-Side Pattern

```javascript
// 1. Request data from server
async playTournamentRound() {
    this.socketClient.socket.emit('tournament-round-request', {
        game: 'game-name',
        tournamentId: this.tournament.tournamentId,
        roundNumber: this.tournament.currentRound
    });
    
    const gameData = await this.waitForTournamentData(this.tournament.currentRound);
    this.processGameData(gameData);
}

// 2. Wait for server response
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

// 3. Prevent duplicate runs
async runTournament() {
    if (this.tournament.running) return;
    this.tournament.running = true;
    // ... tournament logic
    this.tournament.running = false;
}
```

## Key Rules

1. **Server generates** all random elements
2. **Same seed** for all players: `tournamentId + roundNumber`
3. **Sort participants** by ID for consistent ordering
4. **Request-based** data fetching (don't generate locally)
5. **Fixed timing** for all players
6. **Real-time sync** for scores and state

## Game-Specific Examples

### Cards
```javascript
// Server
const deck = createDeck();
shuffleDeck(deck, seed);
const hands = dealCards(deck, participants);
```

### Dice
```javascript
// Server
const rolls = rollDice(2, seed + participantId.charCodeAt(0));
```

### Trivia
```javascript
// Server
const question = getRandomQuestion(seed);
```

### Random Events
```javascript
// Server
const event = getRandomEvent(seed);
const outcomes = calculateOutcomes(event, participants);
```
