// SysOp Chat System
class SysopChat {
    constructor(terminal, socketClient, authManager) {
        this.terminal = terminal;
        this.socketClient = socketClient;
        this.authManager = authManager;
        this.isConnected = false;
        this.chatHistory = [];
        this.sysopOnline = false;
        this.setupSocketListeners();
    }

    setupSocketListeners() {
        // Listen for SysOp chat messages
        this.socketClient.socket.on('sysop-chat-message', (data) => {
            this.handleSysopMessage(data);
        });

        // Listen for SysOp status updates
        this.socketClient.socket.on('sysop-status', (data) => {
            this.sysopOnline = data.online;
        });

        // Listen for chat history
        this.socketClient.socket.on('sysop-chat-history', (data) => {
            this.chatHistory = data.messages || [];
        });

        // Listen for connection status
        this.socketClient.socket.on('sysop-chat-connected', (data) => {
            this.isConnected = data.connected;
        });
    }

    async showChat() {
        this.terminal.clear();
        
        // Request SysOp status and chat history
        this.socketClient.socket.emit('get-sysop-status');
        this.socketClient.socket.emit('get-sysop-chat-history');

        while (true) {
            this.terminal.clear();
            this.terminal.println(ANSIParser.fg('bright-cyan') + this.getHeader() + ANSIParser.reset());
            this.terminal.println('');

            // Show SysOp status
            if (this.sysopOnline) {
                this.terminal.println(ANSIParser.fg('bright-green') + '  🟢 SysOp is ONLINE and available for chat!' + ANSIParser.reset());
            } else {
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  🟡 SysOp is OFFLINE - messages will be queued' + ANSIParser.reset());
            }
            this.terminal.println('');

            // Show recent chat history
            if (this.chatHistory.length > 0) {
                this.terminal.println(ANSIParser.fg('bright-white') + '  Recent Messages:' + ANSIParser.reset());
                this.terminal.println(ANSIParser.fg('bright-cyan') + '  ' + '─'.repeat(70) + ANSIParser.reset());
                
                // Show last 10 messages
                const recentMessages = this.chatHistory.slice(-10);
                for (const msg of recentMessages) {
                    const timestamp = new Date(msg.timestamp).toLocaleTimeString();
                    const sender = msg.from_sysop ? 'SysOp' : this.authManager.getCurrentUser().handle;
                    const color = msg.from_sysop ? 'bright-green' : 'bright-blue';
                    
                    this.terminal.println(ANSIParser.fg(color) + `  [${timestamp}] ${sender}: ${msg.message}` + ANSIParser.reset());
                }
                this.terminal.println(ANSIParser.fg('bright-cyan') + '  ' + '─'.repeat(70) + ANSIParser.reset());
                this.terminal.println('');
            }

            // Show menu options
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [S]' + ANSIParser.reset() + ' Send Message to SysOp');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [H]' + ANSIParser.reset() + ' View Full Chat History');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [C]' + ANSIParser.reset() + ' Clear Chat History');
            this.terminal.println(ANSIParser.fg('bright-red') + '  [X]' + ANSIParser.reset() + ' Exit Chat');
            this.terminal.println('');

            const choice = await this.terminal.input('  Your choice: ');
            
            switch (choice.toLowerCase()) {
                case 's':
                    await this.sendMessage();
                    break;
                case 'h':
                    await this.viewFullHistory();
                    break;
                case 'c':
                    await this.clearHistory();
                    break;
                case 'x':
                    return 'menu';
                default:
                    this.terminal.println(ANSIParser.fg('bright-red') + '  Invalid choice!' + ANSIParser.reset());
                    await this.terminal.sleep(1000);
            }
        }
    }

    async sendMessage() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  SEND MESSAGE TO SYSOp' + ANSIParser.reset());
        this.terminal.println('');
        
        if (!this.sysopOnline) {
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  Note: SysOp is currently offline. Your message will be queued.' + ANSIParser.reset());
            this.terminal.println('');
        }

        this.terminal.println(ANSIParser.fg('bright-green') + '  Enter your message:' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  • Type "END" on a new line to finish' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  • Type "CANCEL" to go back without sending' + ANSIParser.reset());
        this.terminal.println('');

        let message = '';
        let line;
        while (true) {
            line = await this.terminal.input();
            if (line.toUpperCase() === 'END') {
                break;
            } else if (line.toUpperCase() === 'CANCEL') {
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  Message cancelled.' + ANSIParser.reset());
                await this.terminal.sleep(1500);
                return;
            }
            message += line + '\n';
        }

        if (message.trim()) {
            // Send message to server
            this.socketClient.socket.emit('send-sysop-message', {
                message: message.trim(),
                timestamp: new Date().toISOString()
            });

            // Add to local history
            this.chatHistory.push({
                from_sysop: false,
                message: message.trim(),
                timestamp: new Date().toISOString()
            });

            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-green') + '  ✓ Message sent to SysOp!' + ANSIParser.reset());
            await this.terminal.sleep(1500);
        } else {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Empty message not sent.' + ANSIParser.reset());
            await this.terminal.sleep(1500);
        }
    }

    async viewFullHistory() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  FULL CHAT HISTORY' + ANSIParser.reset());
        this.terminal.println('');

        if (this.chatHistory.length === 0) {
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  No chat history available.' + ANSIParser.reset());
        } else {
            this.terminal.println(ANSIParser.fg('bright-white') + '  Chat History:' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-cyan') + '  ' + '═'.repeat(70) + ANSIParser.reset());
            
            for (const msg of this.chatHistory) {
                const timestamp = new Date(msg.timestamp).toLocaleString();
                const sender = msg.from_sysop ? 'SysOp' : this.authManager.getCurrentUser().handle;
                const color = msg.from_sysop ? 'bright-green' : 'bright-blue';
                
                this.terminal.println(ANSIParser.fg(color) + `  [${timestamp}] ${sender}:` + ANSIParser.reset());
                this.terminal.println(ANSIParser.fg('bright-white') + `  ${msg.message}` + ANSIParser.reset());
                this.terminal.println('');
            }
            this.terminal.println(ANSIParser.fg('bright-cyan') + '  ' + '═'.repeat(70) + ANSIParser.reset());
        }

        this.terminal.println('');
        this.terminal.println('  Press any key to continue...');
        await this.terminal.input();
    }

    async clearHistory() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  CLEAR CHAT HISTORY' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-white') + '  This will clear your local chat history.' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-red') + '  This action cannot be undone!' + ANSIParser.reset());
        this.terminal.println('');

        const confirm = await this.terminal.input('  Are you sure? (y/N): ');
        
        if (confirm.toLowerCase() === 'y' || confirm.toLowerCase() === 'yes') {
            this.chatHistory = [];
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-green') + '  ✓ Chat history cleared!' + ANSIParser.reset());
        } else {
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  Chat history not cleared.' + ANSIParser.reset());
        }

        await this.terminal.sleep(1500);
    }

    handleSysopMessage(data) {
        // Add SysOp message to history
        this.chatHistory.push({
            from_sysop: true,
            message: data.message,
            timestamp: data.timestamp
        });

        // Show notification if user is in chat
        if (this.isConnected) {
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-green') + `  📨 New message from SysOp: ${data.message}` + ANSIParser.reset());
            this.terminal.println('  Press any key to continue...');
        }
    }

    getHeader() {
        return `
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║                        💬 CHAT WITH SYSOp 💬                                ║
║                                                                              ║
║  Direct communication with the System Operator                              ║
║  Get help, report issues, or just say hello!                               ║
╚══════════════════════════════════════════════════════════════════════════════╝`;
    }
}

// Export for use in other modules
window.SysopChat = SysopChat;
