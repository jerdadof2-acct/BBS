// Chat System
class ChatSystem {
    constructor(terminal, socketClient, authManager) {
        this.terminal = terminal;
        this.socketClient = socketClient;
        this.authManager = authManager;
        this.chatHistory = [];
    }

    async showChat() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + this.getHeader() + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [P]' + ANSIParser.reset() + ' Public Chat Room');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [M]' + ANSIParser.reset() + ' Private Messages');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [W]' + ANSIParser.reset() + ' Who\'s Online');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [R]' + ANSIParser.reset() + ' Chat Rooms');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [E]' + ANSIParser.reset() + ' Emotes & Actions');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [B]' + ANSIParser.reset() + ' Back to Main Menu');
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
        
        const choice = (await this.terminal.input()).toLowerCase();
        
        if (choice === 'p') {
            await this.publicChat();
            return 'chat';
        } else if (choice === 'm') {
            await this.privateMessages();
            return 'chat';
        } else if (choice === 'w') {
            await this.whosOnline();
            return 'chat';
        } else if (choice === 'r') {
            await this.chatRooms();
            return 'chat';
        } else if (choice === 'e') {
            await this.emotesAndActions();
            return 'chat';
        } else if (choice === 'b') {
            return 'menu';
        } else {
            return 'chat';
        }
    }

    async publicChat() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + this.getChatHeader() + ANSIParser.reset());
        this.terminal.println('');
        
        // Load chat history
        try {
            const response = await fetch('/api/chat');
            const messages = await response.json();
            
            messages.forEach(msg => {
                const timestamp = new Date(msg.created_at).toLocaleTimeString();
                this.terminal.println(ANSIParser.fg('bright-black') + `[${timestamp}]` + ANSIParser.reset() + 
                    ANSIParser.fg('bright-yellow') + ` ${msg.sender_handle}:` + ANSIParser.reset() + 
                    ` ${msg.message}`);
            });
        } catch (error) {
            console.error('Error loading chat:', error);
        }
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  Type your message (or QUIT to exit, !help for commands):' + ANSIParser.reset());
        
        // Set up chat listener
        this.socketClient.on('chat-message', (data) => {
            const timestamp = new Date().toLocaleTimeString();
            this.terminal.println(ANSIParser.fg('bright-black') + `[${timestamp}]` + ANSIParser.reset() + 
                ANSIParser.fg('bright-yellow') + ` ${data.sender}:` + ANSIParser.reset() + 
                ` ${data.message}`);
        });
        
        // Chat loop
        while (true) {
            const message = await this.terminal.input();
            
            if (message.toUpperCase() === 'QUIT') {
                this.socketClient.off('chat-message');
                break;
            }
            
            // Handle commands
            if (message.startsWith('!')) {
                await this.handleChatCommand(message);
                continue;
            }
            
            if (message.trim()) {
                this.socketClient.sendChatMessage(message);
            }
        }
        
        return 'chat';
    }

    async privateMessages() {
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Private messages feature coming soon!' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Use public chat for now.' + ANSIParser.reset());
        await this.terminal.sleep(2000);
        return 'chat';
    }

    async handleChatCommand(command) {
        const cmd = command.toLowerCase().trim();
        
        if (cmd === '!help') {
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-cyan') + '  Chat Commands:' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  !help' + ANSIParser.reset() + ' - Show this help');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  !who' + ANSIParser.reset() + ' - Show who is online');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  !me' + ANSIParser.reset() + ' - Show your info');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  !time' + ANSIParser.reset() + ' - Show current time');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  !quit' + ANSIParser.reset() + ' - Exit chat');
            this.terminal.println('');
        } else if (cmd === '!who') {
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-cyan') + '  Who\'s Online:' + ANSIParser.reset());
            // Get online users
            const onlineUsers = await this.getOnlineUsers();
            if (onlineUsers.length === 0) {
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  No users online.' + ANSIParser.reset());
            } else {
                onlineUsers.forEach(user => {
                    this.terminal.println(ANSIParser.fg('bright-green') + `  ● ${user.handle}` + ANSIParser.reset());
                });
            }
            this.terminal.println('');
        } else if (cmd === '!me') {
            const user = this.authManager.getCurrentUser();
            const level = Math.floor((user.credits || 100) / 100) + 1;
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-cyan') + '  Your Info:' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-white') + `  Handle: ${user.handle}` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-white') + `  Level: ${level}` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-white') + `  Credits: ${user.credits || 100}` + ANSIParser.reset());
            this.terminal.println('');
        } else if (cmd === '!time') {
            const now = new Date();
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-cyan') + `  Current Time: ${now.toLocaleString()}` + ANSIParser.reset());
            this.terminal.println('');
        } else if (cmd.startsWith('!')) {
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-red') + '  Unknown command. Type !help for help.' + ANSIParser.reset());
            this.terminal.println('');
        }
    }

    async getOnlineUsers() {
        return new Promise((resolve) => {
            const timeout = setTimeout(() => resolve([]), 500);
            
            this.socketClient.on('online-users-update', (users) => {
                clearTimeout(timeout);
                resolve(users);
            });
            
            this.socketClient.socket.emit('get-online-users');
        });
    }

    async whosOnline() {
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  Who\'s Online:' + ANSIParser.reset());
        this.terminal.println('');
        
        // This would show real online users via Socket.io
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  ' + this.authManager.getCurrentUser().handle + ANSIParser.reset() + ' (You)');
        this.terminal.println(ANSIParser.fg('bright-black') + '  (Check back later for more users)' + ANSIParser.reset());
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Press any key to continue...' + ANSIParser.reset());
        await this.terminal.input();
        return 'chat';
    }

    async chatRooms() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + this.getHeader() + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-white') + '  Available Chat Rooms:' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + '  [1]' + ANSIParser.reset() + ' General Discussion');
        this.terminal.println(ANSIParser.fg('bright-green') + '  [2]' + ANSIParser.reset() + ' Gaming');
        this.terminal.println(ANSIParser.fg('bright-green') + '  [3]' + ANSIParser.reset() + ' Tech Talk');
        this.terminal.println(ANSIParser.fg('bright-green') + '  [4]' + ANSIParser.reset() + ' Newbies');
        this.terminal.println(ANSIParser.fg('bright-green') + '  [5]' + ANSIParser.reset() + ' Off-Topic');
        this.terminal.println(ANSIParser.fg('bright-red') + '  [0]' + ANSIParser.reset() + ' Back to Chat Menu');
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  Select room: ' + ANSIParser.reset());
        
        const choice = await this.terminal.input();
        
        const rooms = {
            '1': 'General Discussion',
            '2': 'Gaming',
            '3': 'Tech Talk',
            '4': 'Newbies',
            '5': 'Off-Topic'
        };
        
        if (choice === '0') {
            return 'chat';
        } else if (rooms[choice]) {
            await this.joinChatRoom(rooms[choice]);
            return 'chat';
        } else {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Invalid selection.' + ANSIParser.reset());
            await this.terminal.sleep(1500);
            return 'chat';
        }
    }

    async joinChatRoom(roomName) {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + this.getChatRoomHeader(roomName) + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + `  Welcome to the ${roomName} chat room!` + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  Type your message (or QUIT to exit, !help for commands):' + ANSIParser.reset());
        
        // Set up room-specific chat listener
        this.socketClient.on('chat-room-message', (data) => {
            if (data.room === roomName) {
                const timestamp = new Date().toLocaleTimeString();
                this.terminal.println(ANSIParser.fg('bright-black') + `[${timestamp}]` + ANSIParser.reset() + 
                    ANSIParser.fg('bright-yellow') + ` ${data.sender}:` + ANSIParser.reset() + 
                    ` ${data.message}`);
            }
        });
        
        // Chat loop
        while (true) {
            const message = await this.terminal.input();
            
            if (message.toUpperCase() === 'QUIT') {
                this.socketClient.off('chat-room-message');
                break;
            }
            
            // Handle commands
            if (message.startsWith('!')) {
                await this.handleChatCommand(message);
                continue;
            }
            
            if (message.trim()) {
                this.socketClient.sendChatRoomMessage(roomName, message);
            }
        }
        
        return 'chat';
    }

    async emotesAndActions() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + this.getHeader() + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-white') + '  Emotes & Actions:' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + '  [1]' + ANSIParser.reset() + ' Wave to everyone');
        this.terminal.println(ANSIParser.fg('bright-green') + '  [2]' + ANSIParser.reset() + ' Dance');
        this.terminal.println(ANSIParser.fg('bright-green') + '  [3]' + ANSIParser.reset() + ' Laugh');
        this.terminal.println(ANSIParser.fg('bright-green') + '  [4]' + ANSIParser.reset() + ' Thumbs up');
        this.terminal.println(ANSIParser.fg('bright-green') + '  [5]' + ANSIParser.reset() + ' High five');
        this.terminal.println(ANSIParser.fg('bright-green') + '  [6]' + ANSIParser.reset() + ' Celebrate');
        this.terminal.println(ANSIParser.fg('bright-green') + '  [7]' + ANSIParser.reset() + ' Think');
        this.terminal.println(ANSIParser.fg('bright-green') + '  [8]' + ANSIParser.reset() + ' Sleep');
        this.terminal.println(ANSIParser.fg('bright-red') + '  [0]' + ANSIParser.reset() + ' Back to Chat Menu');
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  Select emote: ' + ANSIParser.reset());
        
        const choice = await this.terminal.input();
        
        const emotes = {
            '1': 'waves to everyone',
            '2': 'starts dancing',
            '3': 'laughs out loud',
            '4': 'gives a thumbs up',
            '5': 'gives a high five',
            '6': 'celebrates',
            '7': 'thinks deeply',
            '8': 'falls asleep'
        };
        
        if (choice === '0') {
            return 'chat';
        } else if (emotes[choice]) {
            const user = this.authManager.getCurrentUser().handle;
            const emote = emotes[choice];
            
            // Send emote to chat
            this.socketClient.sendChatMessage(`*${user} ${emote}*`);
            
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-green') + `  You ${emote}!` + ANSIParser.reset());
            await this.terminal.sleep(1500);
            return 'chat';
        } else {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Invalid selection.' + ANSIParser.reset());
            await this.terminal.sleep(1500);
            return 'chat';
        }
    }

    getHeader() {
        return `
╔══════════════════════════════════════════════════════════════════════════════╗
║                         CHAT ROOMS                                           ║
╚══════════════════════════════════════════════════════════════════════════════╝
`;
    }

    getChatHeader() {
        return `
╔══════════════════════════════════════════════════════════════════════════════╗
║                         PUBLIC CHAT ROOM                                     ║
╚══════════════════════════════════════════════════════════════════════════════╝
`;
    }

    getChatRoomHeader(roomName) {
        return `
╔══════════════════════════════════════════════════════════════════════════════╗
║                         ${roomName.toUpperCase().padEnd(60)} ║
╚══════════════════════════════════════════════════════════════════════════════╝
`;
    }
}

// Export for use in other modules
window.ChatSystem = ChatSystem;



