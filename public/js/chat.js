// Real-Time Chat System
class ChatSystem {
    constructor(terminal, socketClient, authManager) {
        this.terminal = terminal;
        this.socketClient = socketClient;
        this.authManager = authManager;
        this.chatHistory = [];
        this.onlineUsers = [];
        this.isInChat = false;
        this.chatUpdateInterval = null;
    }

    async showChat() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + this.getHeader() + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [P]' + ANSIParser.reset() + ' Real-Time Chat Room');
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
            await this.showOnlineUsers();
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
            this.terminal.println(ANSIParser.fg('bright-red') + '  Invalid choice!' + ANSIParser.reset());
            await this.terminal.sleep(1000);
            return 'chat';
        }
    }

    async publicChat() {
        this.isInChat = true;
        this.terminal.clear();
        
        // Set up real-time chat listeners
        this.setupChatListeners();
        
        // Load initial chat history
        await this.loadChatHistory();
        
        // Start real-time chat interface
        await this.startRealTimeChat();
        
        // Clean up when exiting
        this.cleanupChat();
    }

    setupChatListeners() {
        // Notify server that user joined chat
        this.socketClient.socket.emit('join-chat');
        
        // Listen for new chat messages
        this.socketClient.socket.on('chat-message', (data) => {
            this.addMessageToDisplay(data);
        });
        
        // Listen for user join/leave events
        this.socketClient.socket.on('user-joined-chat', (data) => {
            this.addSystemMessage(`${data.handle} joined the chat`);
        });
        
        this.socketClient.socket.on('user-left-chat', (data) => {
            this.addSystemMessage(`${data.handle} left the chat`);
        });
        
        // Listen for online users updates
        this.socketClient.socket.on('online-users-update', (users) => {
            this.onlineUsers = users;
        });
        
        // Request current online users
        this.socketClient.socket.emit('get-online-users');
    }

    async loadChatHistory() {
        try {
            const response = await fetch('/api/chat');
            const messages = await response.json();
            this.chatHistory = messages.slice(-50); // Keep last 50 messages
        } catch (error) {
            console.error('Error loading chat history:', error);
        }
    }

    async startRealTimeChat() {
        while (this.isInChat) {
            this.drawChatInterface();
            
            // Get user input with timeout for real-time updates
            const message = await this.terminal.inputWithTimeout(1000);
            
            if (message) {
                if (message.toUpperCase() === 'QUIT' || message.toUpperCase() === 'EXIT') {
                    break;
                } else if (message.startsWith('/')) {
                    await this.handleChatCommand(message);
                } else if (message.trim()) {
                    await this.sendChatMessage(message);
                }
            }
        }
    }

    drawChatInterface() {
        this.terminal.clear();
        
        // Header
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ═══════════════════════════════════════════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  🗨️  REAL-TIME CHAT ROOM 🗨️' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ═══════════════════════════════════════════════════════════════════════════════' + ANSIParser.reset());
        
        // Online users sidebar
        this.drawOnlineUsers();
        
        // Chat messages area
        this.drawChatMessages();
        
        // Input area
        this.drawInputArea();
    }

    drawOnlineUsers() {
        const onlineCount = this.onlineUsers.length;
        this.terminal.println(ANSIParser.fg('bright-green') + `  👥 Online Users (${onlineCount}):` + ANSIParser.reset());
        
        if (onlineCount > 0) {
            const usersPerRow = 3;
            let userRow = '';
            
            this.onlineUsers.forEach((user, index) => {
                const isCurrentUser = user.handle === this.authManager.getCurrentUser().handle;
                const userColor = isCurrentUser ? 'bright-yellow' : 'bright-white';
                const userText = isCurrentUser ? `*${user.handle}*` : user.handle;
                
                userRow += ANSIParser.fg(userColor) + ` ${userText}` + ANSIParser.reset();
                
                if ((index + 1) % usersPerRow === 0 || index === this.onlineUsers.length - 1) {
                    this.terminal.println('  ' + userRow);
                    userRow = '';
                }
            });
        } else {
            this.terminal.println(ANSIParser.fg('bright-red') + '  No users online' + ANSIParser.reset());
        }
        
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ' + '─'.repeat(80) + ANSIParser.reset());
    }

    drawChatMessages() {
        // Show last 15 messages
        const recentMessages = this.chatHistory.slice(-15);
        
        recentMessages.forEach(msg => {
            const timestamp = new Date(msg.created_at).toLocaleTimeString();
            const isCurrentUser = msg.sender_handle === this.authManager.getCurrentUser().handle;
            const senderColor = isCurrentUser ? 'bright-yellow' : 'bright-green';
            
            this.terminal.println(
                ANSIParser.fg('bright-black') + `[${timestamp}]` + ANSIParser.reset() + 
                ANSIParser.fg(senderColor) + ` ${msg.sender_handle}:` + ANSIParser.reset() + 
                ` ${msg.message}`
            );
        });
        
        this.terminal.println('');
    }

    drawInputArea() {
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ' + '─'.repeat(80) + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  💬 Type your message (QUIT to exit, /help for commands):' + ANSIParser.reset());
        this.terminal.print(ANSIParser.fg('bright-green') + '  > ' + ANSIParser.reset());
    }

    async sendChatMessage(message) {
        if (!message.trim()) return;
        
        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: message.trim(),
                    recipient_id: null // Public message
                })
            });
            
            if (response.ok) {
                // Message will be received via socket listener
                console.log('Message sent successfully');
            } else {
                this.addSystemMessage('Failed to send message');
            }
        } catch (error) {
            console.error('Error sending message:', error);
            this.addSystemMessage('Error sending message');
        }
    }

    addMessageToDisplay(data) {
        const timestamp = new Date().toLocaleTimeString();
        const isCurrentUser = data.sender === this.authManager.getCurrentUser().handle;
        const senderColor = isCurrentUser ? 'bright-yellow' : 'bright-green';
        
        // Add to chat history
        this.chatHistory.push({
            sender_handle: data.sender,
            message: data.message,
            created_at: new Date().toISOString()
        });
        
        // Keep only last 50 messages
        if (this.chatHistory.length > 50) {
            this.chatHistory = this.chatHistory.slice(-50);
        }
        
        // Display the message
        this.terminal.println(
            ANSIParser.fg('bright-black') + `[${timestamp}]` + ANSIParser.reset() + 
            ANSIParser.fg(senderColor) + ` ${data.sender}:` + ANSIParser.reset() + 
            ` ${data.message}`
        );
    }

    addSystemMessage(message) {
        const timestamp = new Date().toLocaleTimeString();
        this.terminal.println(
            ANSIParser.fg('bright-black') + `[${timestamp}]` + ANSIParser.reset() + 
            ANSIParser.fg('bright-cyan') + ` *** ${message} ***` + ANSIParser.reset()
        );
    }

    async handleChatCommand(command) {
        const cmd = command.toLowerCase();
        
        if (cmd === '/help') {
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  📋 Chat Commands:' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-white') + '  /help - Show this help' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-white') + '  /who - Show online users' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-white') + '  /clear - Clear chat screen' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-white') + '  /quit - Exit chat room' + ANSIParser.reset());
            await this.terminal.sleep(3000);
        } else if (cmd === '/who') {
            this.terminal.println(ANSIParser.fg('bright-green') + `  👥 Online Users (${this.onlineUsers.length}):` + ANSIParser.reset());
            this.onlineUsers.forEach(user => {
                const isCurrentUser = user.handle === this.authManager.getCurrentUser().handle;
                const userColor = isCurrentUser ? 'bright-yellow' : 'bright-white';
                const userText = isCurrentUser ? `*${user.handle}*` : user.handle;
                this.terminal.println(ANSIParser.fg(userColor) + `    ${userText}` + ANSIParser.reset());
            });
            await this.terminal.sleep(3000);
        } else if (cmd === '/clear') {
            this.terminal.clear();
        } else {
            this.addSystemMessage(`Unknown command: ${command}`);
        }
    }

    cleanupChat() {
        this.isInChat = false;
        
        // Notify server that user left chat
        this.socketClient.socket.emit('leave-chat');
        
        this.socketClient.socket.off('chat-message');
        this.socketClient.socket.off('user-joined-chat');
        this.socketClient.socket.off('user-left-chat');
        this.socketClient.socket.off('online-users-update');
        
        if (this.chatUpdateInterval) {
            clearInterval(this.chatUpdateInterval);
            this.chatUpdateInterval = null;
        }
    }

    // Placeholder methods for other chat features
    async privateMessages() {
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Private Messages feature coming soon!' + ANSIParser.reset());
        await this.terminal.sleep(2000);
    }

    async showOnlineUsers() {
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Who\'s Online feature coming soon!' + ANSIParser.reset());
        await this.terminal.sleep(2000);
    }

    async chatRooms() {
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Chat Rooms feature coming soon!' + ANSIParser.reset());
        await this.terminal.sleep(2000);
    }

    async emotesAndActions() {
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Emotes & Actions feature coming soon!' + ANSIParser.reset());
        await this.terminal.sleep(2000);
    }

    getHeader() {
        return `
  ╔══════════════════════════════════════════════════════════════════════════════╗
  ║                                                                              ║
  ║   ██████╗██╗  ██╗ █████╗ ████████╗    ██████╗ ██╗  ██╗ █████╗ ████████╗    ║
  ║  ██╔════╝██║  ██║██╔══██╗╚══██╔══╝    ██╔══██╗██║  ██║██╔══██╗╚══██╔══╝    ║
  ║  ██║     ███████║███████║   ██║       ██████╔╝███████║███████║   ██║       ║
  ║  ██║     ██╔══██║██╔══██║   ██║       ██╔══██╗██╔══██║██╔══██║   ██║       ║
  ║  ╚██████╗██║  ██║██║  ██║   ██║       ██║  ██║██║  ██║██║  ██║   ██║       ║
  ║   ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝       ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝       ║
  ║                                                                              ║
  ║                         Real-Time Communication                              ║
  ╚══════════════════════════════════════════════════════════════════════════════╝`;
    }
}

// Export for use in other modules
window.ChatSystem = ChatSystem;
