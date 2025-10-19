// Socket.io Client Wrapper
class SocketClient {
    constructor() {
        this.socket = null;
        this.connected = false;
        this.userId = null;
        this.handle = null;
    }

    connect() {
        this.socket = io();
        
        this.socket.on('connect', () => {
            this.connected = true;
            console.log('Connected to server');
        });

        this.socket.on('disconnect', () => {
            this.connected = false;
            console.log('Disconnected from server');
        });

        this.socket.on('error', (error) => {
            console.error('Socket error:', error);
        });

        // SysOp broadcast message handler
        this.socket.on('sysop-broadcast-message', (data) => {
            if (window.app && window.app.terminal) {
                window.app.terminal.println('');
                window.app.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
                window.app.terminal.println(ANSIParser.fg('bright-cyan') + '  SYSOp BROADCAST' + ANSIParser.reset());
                window.app.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
                window.app.terminal.println('');
                window.app.terminal.println(ANSIParser.fg('bright-yellow') + `  From: ${data.from}` + ANSIParser.reset());
                window.app.terminal.println(ANSIParser.fg('bright-white') + `  Message: ${data.message}` + ANSIParser.reset());
                window.app.terminal.println('');
                window.app.terminal.println('  Press any key to continue...');
            }
        });

        // SysOp direct message handler
        this.socket.on('sysop-direct-message', (data) => {
            if (window.app && window.app.terminal) {
                window.app.terminal.println('');
                window.app.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
                window.app.terminal.println(ANSIParser.fg('bright-cyan') + '  SYSOp MESSAGE' + ANSIParser.reset());
                window.app.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
                window.app.terminal.println('');
                window.app.terminal.println(ANSIParser.fg('bright-yellow') + `  From: ${data.from}` + ANSIParser.reset());
                window.app.terminal.println(ANSIParser.fg('bright-white') + `  Message: ${data.message}` + ANSIParser.reset());
                window.app.terminal.println('');
                window.app.terminal.println('  Press any key to continue...');
            }
        });

        // User-to-user direct message handler
        this.socket.on('user-direct-message', (data) => {
            if (window.app && window.app.terminal) {
                window.app.terminal.println('');
                window.app.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
                window.app.terminal.println(ANSIParser.fg('bright-cyan') + '  DIRECT MESSAGE' + ANSIParser.reset());
                window.app.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
                window.app.terminal.println('');
                window.app.terminal.println(ANSIParser.fg('bright-yellow') + `  From: ${data.from}` + ANSIParser.reset());
                window.app.terminal.println(ANSIParser.fg('bright-white') + `  Message: ${data.message}` + ANSIParser.reset());
                window.app.terminal.println('');
                window.app.terminal.println('  Press any key to continue...');
            }
        });

        // Pit PvP Challenge handler
        this.socket.on('pit-challenge-received', (data) => {
            if (window.app && window.app.terminal) {
                window.app.terminal.println('');
                window.app.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
                window.app.terminal.println(ANSIParser.fg('bright-cyan') + '  PVP CHALLENGE!' + ANSIParser.reset());
                window.app.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
                window.app.terminal.println('');
                window.app.terminal.println(ANSIParser.fg('bright-yellow') + `  ${data.from} challenges you to a duel!` + ANSIParser.reset());
                window.app.terminal.println('');
                window.app.terminal.println(ANSIParser.fg('bright-white') + `  Level: ${data.challengerStats.level}` + ANSIParser.reset());
                window.app.terminal.println(ANSIParser.fg('bright-white') + `  HP: ${data.challengerStats.hp}/${data.challengerStats.maxHp}` + ANSIParser.reset());
                window.app.terminal.println(ANSIParser.fg('bright-white') + `  STR: ${data.challengerStats.strength} | DEF: ${data.challengerStats.defense}` + ANSIParser.reset());
                window.app.terminal.println('');
                window.app.terminal.println(ANSIParser.fg('bright-green') + '  [A] Accept' + ANSIParser.reset());
                window.app.terminal.println(ANSIParser.fg('bright-red') + '  [D] Decline' + ANSIParser.reset());
                window.app.terminal.println('');
                
                // Store challenge data for later
                window.pendingPitChallenge = data;
            }
        });

        // Cyber Arena Challenge handler
        this.socket.on('arena-challenge-received', (data) => {
            if (window.app && window.app.terminal) {
                window.app.terminal.println('');
                window.app.terminal.println(ANSIParser.fg('bright-yellow') + '  ════════════════════════════════════════' + ANSIParser.reset());
                window.app.terminal.println(ANSIParser.fg('bright-yellow') + '  ⚡ ARENA CHALLENGE! ⚡' + ANSIParser.reset());
                window.app.terminal.println(ANSIParser.fg('bright-yellow') + '  ════════════════════════════════════════' + ANSIParser.reset());
                window.app.terminal.println('');
                window.app.terminal.println(ANSIParser.fg('bright-cyan') + `  ${data.from} challenges you to ARENA COMBAT!` + ANSIParser.reset());
                window.app.terminal.println('');
                window.app.terminal.println(ANSIParser.fg('bright-white') + `  Level: ${data.challengerStats.level}` + ANSIParser.reset());
                window.app.terminal.println(ANSIParser.fg('bright-white') + `  HP: ${data.challengerStats.hp}/${data.challengerStats.maxHp}` + ANSIParser.reset());
                window.app.terminal.println(ANSIParser.fg('bright-white') + `  Energy: ${data.challengerStats.energy}/${data.challengerStats.maxEnergy}` + ANSIParser.reset());
                window.app.terminal.println(ANSIParser.fg('bright-white') + `  Damage: ${data.challengerStats.damage} | Defense: ${data.challengerStats.defense}` + ANSIParser.reset());
                window.app.terminal.println('');
                window.app.terminal.println(ANSIParser.fg('bright-green') + '  [A] Accept' + ANSIParser.reset());
                window.app.terminal.println(ANSIParser.fg('bright-red') + '  [D] Decline' + ANSIParser.reset());
                window.app.terminal.println('');
                
                // Store challenge data for later
                window.pendingArenaChallenge = data;
            }
        });
    }

    login(userId, handle, accessLevel = 1) {
        this.userId = userId;
        this.handle = handle;
        this.socket.emit('user-login', { userId, handle, accessLevel });
    }

    logout() {
        this.socket.emit('user-logout');
        this.userId = null;
        this.handle = null;
    }

    sendChatMessage(message, recipientId = null, isPrivate = false, recipientSocketId = null) {
        this.socket.emit('chat-message', {
            message,
            recipientId,
            isPrivate,
            recipientSocketId
        });
    }

    joinGameRoom(room) {
        this.socket.emit('join-game-room', room);
    }

    leaveGameRoom(room) {
        this.socket.emit('leave-game-room', room);
    }

    sendGameAction(data) {
        this.socket.emit('game-action', data);
    }

    sendActivity() {
        this.socket.emit('activity');
    }

    sendChatRoomMessage(roomName, message) {
        this.socket.emit('chat-room-message', {
            room: roomName,
            message: message
        });
    }

    on(event, callback) {
        this.socket.on(event, callback);
    }

    off(event, callback) {
        this.socket.off(event, callback);
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
        }
    }
}

// Export for use in other modules
window.SocketClient = SocketClient;






