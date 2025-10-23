// Socket.io Client Wrapper
class SocketClient {
    constructor() {
        this.socket = null;
        this.connected = false;
        this.userId = null;
        this.handle = null;
        this.retryTimeout = null;
    }

    connect() {
        // Prevent duplicate connections
        if (this.socket && this.socket.connected) {
            console.log('Socket already connected, skipping...');
            return;
        }
        
        // Clean up existing socket if it exists but isn't connected
        if (this.socket && !this.socket.connected) {
            console.log('Cleaning up existing disconnected socket...');
            this.socket.removeAllListeners();
            this.socket.disconnect();
            this.socket = null;
        }
        
        console.log('Initializing socket connection...');
        
        this.socket = io({
            transports: ['polling', 'websocket'],
            upgrade: true,
            rememberUpgrade: false,
            timeout: 30000, // Increased timeout for Railway
            forceNew: true,
            reconnection: true,
            reconnectionDelay: 2000, // Increased delay for Railway
            reconnectionAttempts: 10, // More attempts for Railway
            maxReconnectionAttempts: 10
        });
        
        this.socket.on('connect', () => {
            this.connected = true;
            console.log('✅ Connected to server');
            console.log('Socket ID:', this.socket.id);
            
            // Clear any retry timeouts
            if (this.retryTimeout) {
                clearTimeout(this.retryTimeout);
                this.retryTimeout = null;
            }
            
            // Process any pending login
            if (this.pendingLogin) {
                console.log('Processing pending login:', this.pendingLogin);
                this.socket.emit('user-login', this.pendingLogin);
                this.pendingLogin = null;
                console.log('Pending login processed');
            }
        });

        this.socket.on('disconnect', (reason) => {
            this.connected = false;
            console.log('❌ Disconnected from server. Reason:', reason);
            
            // Auto-reconnect after a short delay
            if (reason === 'io server disconnect') {
                // Server initiated disconnect, don't reconnect
                console.log('Server initiated disconnect, not reconnecting');
            } else {
                // Client-side disconnect, try to reconnect
                console.log('Attempting to reconnect in 3 seconds...');
                setTimeout(() => {
                    if (!this.connected) {
                        console.log('Reconnecting...');
                        this.connect();
                    } else {
                        console.log('Already reconnected, skipping');
                    }
                }, 3000);
            }
        });

        this.socket.on('connect_error', (error) => {
            console.error('Socket connection error:', error);
            this.connected = false;
            
            // Show user-friendly message for common errors
            if (error.message.includes('502') || error.message.includes('Bad Gateway')) {
                console.warn('🚨 Railway server is temporarily unavailable. Retrying in 5 seconds...');
                console.warn('This is a known issue with Railway hosting. The connection will be restored automatically.');
            } else if (error.message.includes('ERR_NAME_NOT_RESOLVED')) {
                console.warn('Cannot reach server. Check your internet connection.');
            } else if (error.message.includes('timeout')) {
                console.warn('Connection timeout. Railway server may be slow to respond.');
            }
        });

        this.socket.on('error', (error) => {
            console.error('Socket error:', error);
            this.connected = false;
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

        // Fishing tournament announcement handler
        this.socket.on('fishing-tournament-announcement', (data) => {
            if (window.app && window.app.terminal) {
                window.app.terminal.println('');
                window.app.terminal.println(ANSIParser.fg('bright-yellow') + '  ════════════════════════════════════════' + ANSIParser.reset());
                window.app.terminal.println(ANSIParser.fg('bright-yellow') + '  🏆 FISHING TOURNAMENT ANNOUNCEMENT 🏆' + ANSIParser.reset());
                window.app.terminal.println(ANSIParser.fg('bright-yellow') + '  ════════════════════════════════════════' + ANSIParser.reset());
                window.app.terminal.println('');
                window.app.terminal.println(ANSIParser.fg('bright-white') + `  ${data.message}` + ANSIParser.reset());
                window.app.terminal.println('');
                
                if (data.type === 'tournament-start') {
                    window.app.terminal.println(ANSIParser.fg('bright-cyan') + '  Go to Door Games → Fishing Hole → Tournament Mode to join!' + ANSIParser.reset());
                    if (data.joinPeriod) {
                        window.app.terminal.println(ANSIParser.fg('bright-yellow') + `  You have ${data.joinPeriod} seconds to join!` + ANSIParser.reset());
                    }
                }
                
                window.app.terminal.println('  Press any key to continue...');
            }
        });

        // High Noon Hustle tournament announcement handler
        this.socket.on('tournament-start', (data) => {
            console.log('DEBUG: Received tournament-start event:', data);
            if (data.game === 'high-noon-hustle' && window.app && window.app.terminal) {
                console.log('DEBUG: Displaying tournament announcement');
                window.app.terminal.println('');
                window.app.terminal.println(ANSIParser.fg('bright-yellow') + '  ════════════════════════════════════════' + ANSIParser.reset());
                window.app.terminal.println(ANSIParser.fg('bright-yellow') + '  🏆 HIGH NOON HUSTLE TOURNAMENT 🏆' + ANSIParser.reset());
                window.app.terminal.println(ANSIParser.fg('bright-yellow') + '  ════════════════════════════════════════' + ANSIParser.reset());
                window.app.terminal.println('');
                window.app.terminal.println(ANSIParser.fg('bright-white') + `  ${data.host} started a ${data.gameType} tournament!` + ANSIParser.reset());
                window.app.terminal.println(ANSIParser.fg('bright-cyan') + '  Go to Door Games → High Noon Hustle → Tournaments to join!' + ANSIParser.reset());
                if (data.joinPeriod) {
                    window.app.terminal.println(ANSIParser.fg('bright-yellow') + `  You have ${data.joinPeriod} seconds to join!` + ANSIParser.reset());
                }
                window.app.terminal.println(ANSIParser.fg('bright-yellow') + '  ════════════════════════════════════════' + ANSIParser.reset());
                window.app.terminal.println('');
            } else {
                console.log('DEBUG: Not displaying tournament announcement - conditions not met:', {
                    game: data.game,
                    hasApp: !!window.app,
                    hasTerminal: !!(window.app && window.app.terminal)
                });
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

    async login(userId, handle, accessLevel = 1) {
        this.userId = userId;
        this.handle = handle;
        
        console.log('Attempting to login via socket:', { userId, handle, accessLevel });
        console.log('Socket connected:', this.socket?.connected);
        
        if (this.socket && this.socket.connected) {
            this.socket.emit('user-login', { userId, handle, accessLevel });
            console.log('User-login event emitted');
            return;
        }
        
        // Wait for connection with retries
        console.log('Socket not connected, waiting for connection...');
        try {
            await this.waitForConnection(10000);
            this.socket.emit('user-login', { userId, handle, accessLevel });
            console.log('User-login event emitted after waiting for connection');
        } catch (error) {
            console.error('Failed to login via socket:', error);
            // Store login data for when connection is ready
            this.pendingLogin = { userId, handle, accessLevel };
        }
    }

    updateLocation(location) {
        if (this.socket && this.socket.connected) {
            this.socket.emit('user-location-change', { location });
            console.log('Location updated to:', location);
        }
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
            this.socket = null;
            this.connected = false;
        }
    }

    isReady() {
        return this.socket && this.socket.connected;
    }

    waitForConnection(timeout = 10000) {
        return new Promise((resolve, reject) => {
            if (this.isReady()) {
                resolve(true);
                return;
            }

            const timeoutId = setTimeout(() => {
                reject(new Error('Socket connection timeout'));
            }, timeout);

            const checkConnection = () => {
                if (this.isReady()) {
                    clearTimeout(timeoutId);
                    resolve(true);
                } else {
                    setTimeout(checkConnection, 100);
                }
            };

            checkConnection();
        });
    }

    async checkServerStatus() {
        try {
            const response = await fetch('/api/health', {
                method: 'GET',
                timeout: 5000
            });
            return response.ok;
        } catch (error) {
            console.warn('Server health check failed:', error);
            return false;
        }
    }
}

// Export for use in other modules
window.SocketClient = SocketClient;






