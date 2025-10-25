// Main Application
class BBSApplication {
    constructor() {
        this.terminal = null;
        this.modem = null;
        this.socketClient = null;
        this.authManager = null;
        this.menuManager = null;
        this.messageBoard = null;
        this.fileLibrary = null;
        this.chatSystem = null;
        this.doorGames = null;
        this.currentScreen = 'login';
    }

    async init() {
        // Initialize components
        const terminalElement = document.getElementById('terminal-content');
        this.terminal = new Terminal(terminalElement);
        this.modem = new ModemSimulator();
        this.socketClient = new SocketClient();
        this.authManager = new AuthManager();
        
        // Resume audio context on first user interaction
        const resumeAudio = async () => {
            await this.modem.resumeAudioContext();
            document.removeEventListener('keydown', resumeAudio);
            document.removeEventListener('click', resumeAudio);
        };
        document.addEventListener('keydown', resumeAudio, { once: true });
        document.addEventListener('click', resumeAudio, { once: true });
        
        // Connect socket
        this.socketClient.connect();
        
        // Initialize managers
        this.menuManager = new MenuManager(this.terminal, this.socketClient, this.authManager);
        this.messageBoard = new MessageBoard(this.terminal, this.authManager);
        this.fileLibrary = new FileLibrary(this.terminal, this.authManager);
        this.chatSystem = new ChatSystem(this.terminal, this.socketClient, this.authManager);
        this.doorGames = new DoorGames(this.terminal, this.socketClient, this.authManager);
        
        // Set up keyboard input (only once)
        if (!this.keyboardHandlerAdded) {
            document.addEventListener('keydown', (e) => this.terminal.handleKeyPress(e));
            this.keyboardHandlerAdded = true;
        }
        
        // Set up settings
        this.setupSettings();
        this.setupBBSAnnouncements();
        
        // Start application
        await this.start();
    }

    async start() {
        // Check if user is already logged in
        const session = await this.authManager.checkSession();
        
        if (session.success) {
            this.authManager.currentUser = session.user;
            await this.socketClient.login(session.user.userId, session.user.handle, session.user.access_level);
            await this.showWelcome();
            await this.run();
        } else {
            await this.showLogin();
        }
    }

    async showLogin() {
        this.terminal.clear();
        // Disable typing simulation temporarily for ANSI art
        const wasSimulating = this.terminal.simulateSpeed;
        this.terminal.setSimulateSpeed(false);
        
        // Print ANSI art in cyan
        this.terminal.print(ANSIParser.fg('bright-cyan') + this.getLoginArt() + ANSIParser.reset());
        
        // Re-enable typing simulation
        this.terminal.setSimulateSpeed(wasSimulating);
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  [L] Login' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + '  [R] Register' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
        
        const choice = (await this.terminal.input()).toLowerCase();
        
        if (choice === 'l') {
            await this.login();
        } else if (choice === 'r') {
            await this.register();
        } else {
            await this.showLogin();
        }
    }

    async login() {
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + '  Handle: ' + ANSIParser.reset());
        const handle = await this.terminal.input();
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  Password: ' + ANSIParser.reset());
        const password = await this.terminal.input();
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Connecting...' + ANSIParser.reset());
        
        const result = await this.authManager.login(handle, password);
        
        if (result.success) {
            await this.socketClient.login(result.user.id, result.user.handle, result.user.access_level);
            await this.showWelcome();
            await this.showUnreadSysopMessages();
            await this.run();
        } else {
            this.terminal.println(ANSIParser.fg('bright-red') + `  ${result.error}` + ANSIParser.reset());
            await this.terminal.sleep(2000);
            await this.showLogin();
        }
    }

    async register() {
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + '  Handle: ' + ANSIParser.reset());
        const handle = await this.terminal.input();
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  Real Name: ' + ANSIParser.reset());
        const realName = await this.terminal.input();
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  Location: ' + ANSIParser.reset());
        const location = await this.terminal.input();
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  Password: ' + ANSIParser.reset());
        const password = await this.terminal.input();
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Registering...' + ANSIParser.reset());
        
        const result = await this.authManager.register({
            handle,
            real_name: realName,
            location,
            password
        });
        
        if (result.success) {
            this.terminal.println(ANSIParser.fg('bright-green') + '  Registration successful! Please log in.' + ANSIParser.reset());
            await this.terminal.sleep(2000);
            await this.showLogin();
        } else {
            this.terminal.println(ANSIParser.fg('bright-red') + `  ${result.error}` + ANSIParser.reset());
            await this.terminal.sleep(2000);
            await this.showLogin();
        }
    }

    async showWelcome() {
        this.terminal.clear();
        
        // Disable typing simulation for ANSI art
        const wasSimulating = this.terminal.simulateSpeed;
        this.terminal.setSimulateSpeed(false);
        
        this.terminal.print(ANSIParser.fg('bright-cyan') + this.getWelcomeArt() + ANSIParser.reset());
        
        // Re-enable typing simulation
        this.terminal.setSimulateSpeed(wasSimulating);
        
        this.terminal.println('');
        
        // Simulate modem connection
        if (document.getElementById('sound-toggle').checked) {
            await simulateModemConnection(this.terminal, this.modem);
        }
        
        this.terminal.println('');
        
        // Show quote of the day
        const bulletinSystem = new BulletinSystem(this.terminal, this.authManager);
        await bulletinSystem.showRandomQuote();
        
        // Show bulletins
        try {
            const response = await fetch('/api/bulletins');
            const bulletins = await response.json();
            
            if (bulletins.length > 0) {
                this.terminal.println(ANSIParser.fg('bright-cyan') + '  BULLETINS:' + ANSIParser.reset());
                this.terminal.println('');
                
                bulletins.slice(0, 3).forEach(bulletin => {
                    this.terminal.println(ANSIParser.fg('bright-yellow') + `  * ${bulletin.title}` + ANSIParser.reset());
                });
                
                this.terminal.println('');
            }
        } catch (error) {
            // Ignore errors
        }
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  Welcome to Retro-BBS!' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + '  Press any key to continue...' + ANSIParser.reset());
        await this.terminal.input();
    }

    async showUnreadSysopMessages() {
        const unreadMessages = this.authManager.getUnreadSysopMessages();
        
        if (unreadMessages.length > 0) {
            this.terminal.clear();
            this.terminal.println(ANSIParser.fg('bright-cyan') + '╔══════════════════════════════════════════════════════════════════════════════╗' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-cyan') + '║' + ANSIParser.reset() + 
                ANSIParser.fg('bright-white') + '  📨 UNREAD SYSOp MESSAGES' + ANSIParser.reset() + 
                ' '.repeat(52) + ANSIParser.fg('bright-cyan') + '║' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-cyan') + '╚══════════════════════════════════════════════════════════════════════════════╝' + ANSIParser.reset());
            this.terminal.println('');
            
            this.terminal.println(ANSIParser.fg('bright-yellow') + `  You have ${unreadMessages.length} unread message(s) from the SysOp:` + ANSIParser.reset());
            this.terminal.println('');
            
            for (let i = 0; i < unreadMessages.length; i++) {
                const msg = unreadMessages[i];
                const timestamp = new Date(msg.timestamp).toLocaleString();
                
                this.terminal.println(ANSIParser.fg('bright-green') + `  Message ${i + 1} - ${timestamp}:` + ANSIParser.reset());
                this.terminal.println(ANSIParser.fg('bright-white') + `  ${msg.message}` + ANSIParser.reset());
                this.terminal.println('');
            }
            
            this.terminal.println(ANSIParser.fg('bright-cyan') + '  ' + '─'.repeat(70) + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  Use "H" from the main menu to chat with the SysOp' + ANSIParser.reset());
            this.terminal.println('');
            this.terminal.println('  Press any key to continue...');
            await this.terminal.input();
            
            // Mark messages as read
            await this.authManager.clearUnreadSysopMessages();
        }
    }

    async run() {
        while (true) {
            this.socketClient.updateLocation('Main Menu');
            const choice = await this.menuManager.showMainMenu();
            const nextScreen = await this.menuManager.handleMenuChoice(choice);
            
            if (nextScreen === 'logout') {
                await this.logout();
                break;
            } else if (nextScreen === 'messages') {
                this.socketClient.updateLocation('Message Boards');
                const result = await this.messageBoard.showMessageBoards();
                if (result === 'menu') continue;
            } else if (nextScreen === 'email') {
                this.socketClient.updateLocation('Email System');
                const emailSystem = new EmailSystem(this.terminal, this.authManager);
                const result = await emailSystem.showEmailMenu();
                if (result === 'menu') continue;
            } else if (nextScreen === 'files') {
                this.socketClient.updateLocation('File Libraries');
                const result = await this.fileLibrary.showFileLibraries();
                if (result === 'menu') continue;
            } else if (nextScreen === 'doors') {
                this.socketClient.updateLocation('Door Games');
                const result = await this.doorGames.showGames();
                if (result === 'menu') continue;
            } else if (nextScreen === 'chat') {
                this.socketClient.updateLocation('Chat Room');
                const result = await this.chatSystem.showChat();
                if (result === 'menu') continue;
            } else if (nextScreen === 'users') {
                this.socketClient.updateLocation('User List');
                await this.showUsers();
            } else if (nextScreen === 'profile') {
                this.socketClient.updateLocation('Profile System');
                const profileSystem = new ProfileSystem(this.terminal, this.authManager);
                const result = await profileSystem.showProfileMenu();
                if (result === 'menu') continue;
            } else if (nextScreen === 'bulletins') {
                this.socketClient.updateLocation('Bulletins');
                const bulletinSystem = new BulletinSystem(this.terminal, this.authManager);
                await bulletinSystem.showBulletins();
            } else if (nextScreen === 'oneliners') {
                this.socketClient.updateLocation('One-Liners');
                await this.showOneLiners();
            } else if (nextScreen === 'ansi-art') {
                this.socketClient.updateLocation('ANSI Art Gallery');
                const result = await this.menuManager.showAnsiArtGallery();
                if (result === 'menu') continue;
            } else if (nextScreen === 'stats') {
                this.socketClient.updateLocation('Statistics');
                await this.showStats();
            } else if (nextScreen === 'sysop-chat') {
                this.socketClient.updateLocation('SysOp Chat');
                const sysopChat = new SysopChat(this.terminal, this.socketClient, this.authManager);
                const result = await sysopChat.showChat();
                if (result === 'menu') continue;
            } else if (nextScreen === 'sysop') {
                this.socketClient.updateLocation('SysOp Panel');
                const sysopPanel = new SysopPanel(this.terminal, this.socketClient, this.authManager);
                const result = await sysopPanel.showPanel();
                if (result === 'menu') continue;
            }
        }
    }

    async showUsers() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  WHO\'S ONLINE' + ANSIParser.reset());
        this.terminal.println('');
        
        try {
            // Get online users from socket.io
            const onlineUsers = await this.getOnlineUsers();
            
            if (onlineUsers.length === 0) {
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  No users online right now.' + ANSIParser.reset());
            } else {
                this.terminal.println(ANSIParser.fg('bright-green') + `  ${onlineUsers.length} user(s) currently online:` + ANSIParser.reset());
                this.terminal.println('');
                this.terminal.println(ANSIParser.fg('bright-white') + '  Handle          Status' + ANSIParser.reset());
                this.terminal.println(ANSIParser.fg('bright-cyan') + '  ' + '─'.repeat(50) + ANSIParser.reset());
                
                onlineUsers.forEach(user => {
                    const handle = user.handle.padEnd(18);
                    const status = ANSIParser.fg('bright-green') + '● ONLINE' + ANSIParser.reset();
                    this.terminal.println(`  ${handle}${status}`);
                });
            }
            
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-cyan') + '  All Registered Users:' + ANSIParser.reset());
            this.terminal.println('');
            
            const response = await fetch('/api/users');
            const allUsers = await response.json();
            
            this.terminal.println(ANSIParser.fg('bright-white') + '  Handle          Location        Calls  Messages  Last Seen' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-cyan') + '  ' + '─'.repeat(70) + ANSIParser.reset());
            
            allUsers.forEach(user => {
                const handle = user.handle.padEnd(14);
                const location = (user.location || 'Unknown').padEnd(14);
                const calls = String(user.calls).padEnd(6);
                const messages = String(user.messages_posted).padEnd(8);
                const lastSeen = user.last_seen ? new Date(user.last_seen).toLocaleDateString() : 'Never';
                this.terminal.println(ANSIParser.fg('bright-yellow') + `  ${handle}${location}${calls}${messages}${lastSeen}` + ANSIParser.reset());
            });
        } catch (error) {
            console.error('Error loading users:', error);
        }
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Press any key to continue...' + ANSIParser.reset());
        await this.terminal.input();
    }

    setupBBSAnnouncements() {
        if (this.socketClient && this.socketClient.socket) {
            this.socketClient.socket.on('bbs-announcement', (data) => {
                if (data.type === 'user-login') {
                    this.showBBSAnnouncement(data.message, 'login');
                } else if (data.type === 'user-logout') {
                    this.showBBSAnnouncement(data.message, 'logout');
                }
            });
        }
    }

    showBBSAnnouncement(message, type) {
        // Create a temporary announcement that appears on screen
        const announcement = document.createElement('div');
        announcement.className = 'bbs-announcement';
        announcement.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'login' ? '#2d5a2d' : '#5a2d2d'};
            color: white;
            padding: 10px 15px;
            border-radius: 5px;
            border: 2px solid ${type === 'login' ? '#4a7c4a' : '#7c4a4a'};
            font-family: 'Courier New', monospace;
            font-size: 14px;
            z-index: 10000;
            box-shadow: 0 4px 8px rgba(0,0,0,0.3);
            animation: slideIn 0.5s ease-out;
        `;
        
        announcement.textContent = message;
        document.body.appendChild(announcement);
        
        // Add CSS animation
        if (!document.getElementById('bbs-announcement-styles')) {
            const style = document.createElement('style');
            style.id = 'bbs-announcement-styles';
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
        
        // Remove after 5 seconds
        setTimeout(() => {
            announcement.style.animation = 'slideOut 0.5s ease-in';
            setTimeout(() => {
                if (announcement.parentNode) {
                    announcement.parentNode.removeChild(announcement);
                }
            }, 500);
        }, 5000);
    }

    async getOnlineUsers() {
        return new Promise((resolve) => {
            this.socketClient.on('online-users-update', (users) => {
                resolve(users);
            });
            
            // Request current online users
            this.socketClient.socket.emit('get-online-users');
            
            // Timeout after 1 second
            setTimeout(() => resolve([]), 1000);
        });
    }

    async showOneLiners() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ONE-LINERS WALL' + ANSIParser.reset());
        this.terminal.println('');
        
        try {
            const response = await fetch('/api/oneliners');
            const oneliners = await response.json();
            
            if (oneliners.length === 0) {
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  No one-liners yet!' + ANSIParser.reset());
            } else {
                oneliners.forEach(ol => {
                    const timestamp = new Date(ol.created_at).toLocaleString();
                    this.terminal.println(ANSIParser.fg('bright-black') + `  [${timestamp}]` + ANSIParser.reset() + 
                        ANSIParser.fg('bright-yellow') + ` ${ol.user_handle}:` + ANSIParser.reset() + 
                        ` ${ol.message}`);
                });
            }
        } catch (error) {
            console.error('Error loading one-liners:', error);
        }
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Press any key to continue...' + ANSIParser.reset());
        await this.terminal.input();
    }

    async showStats() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  BBS STATISTICS' + ANSIParser.reset());
        this.terminal.println('');
        
        const user = this.authManager.getCurrentUser();
        this.terminal.println(ANSIParser.fg('bright-green') + `  Handle: ${user.handle}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + `  Real Name: ${user.real_name || 'N/A'}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + `  Location: ${user.location || 'N/A'}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + `  Total Calls: ${user.calls}` + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Press any key to continue...' + ANSIParser.reset());
        await this.terminal.input();
    }

    async logout() {
        await this.menuManager.showGoodbye();
        await this.authManager.logout();
        this.socketClient.logout();
        await this.showLogin();
    }

    setupSettings() {
        const soundToggle = document.getElementById('sound-toggle');
        const speedToggle = document.getElementById('speed-toggle');
        const blinkToggle = document.getElementById('blink-toggle');
        const colorScheme = document.getElementById('color-scheme');
        const settingsModal = document.getElementById('settings-modal');
        const settingsToggle = document.getElementById('settings-toggle');
        const settingsClose = document.getElementById('settings-close');
        
        soundToggle.addEventListener('change', (e) => {
            this.modem.setEnabled(e.target.checked);
        });
        
        speedToggle.addEventListener('change', (e) => {
            this.terminal.setSimulateSpeed(e.target.checked);
        });
        
        blinkToggle.addEventListener('change', (e) => {
            if (e.target.checked) {
                document.body.classList.remove('no-blink');
            } else {
                document.body.classList.add('no-blink');
            }
        });
        
        colorScheme.addEventListener('change', (e) => {
            document.body.className = `color-${e.target.value}`;
        });
        
        settingsToggle.addEventListener('click', () => {
            settingsModal.classList.remove('hidden');
        });
        
        settingsClose.addEventListener('click', () => {
            settingsModal.classList.add('hidden');
        });
    }

    getLoginArt() {
        return `
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║   ██████╗ ███████╗████████╗██████╗  ██████╗     ██████╗ ██████╗ ███████╗    ║
║   ██╔══██╗██╔════╝╚══██╔══╝██╔══██╗██╔═══██╗    ██╔══██╗██╔══██╗██╔════╝    ║
║   ██████╔╝█████╗     ██║   ██████╔╝██║   ██║    ██████╔╝██████╔╝███████╗    ║
║   ██╔══██╗██╔══╝     ██║   ██╔══██╗██║   ██║    ██╔══██╗██╔══██╗╚════██║    ║
║   ██║  ██║███████╗   ██║   ██║  ██║╚██████╔╝    ██████╔╝██████╔╝███████║    ║
║   ╚═╝  ╚═╝╚══════╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝     ╚═════╝ ╚═════╝ ╚══════╝    ║
║                                                                              ║
║                      "Where Legends Connect"                                 ║
║                           Retro-BBS                                          ║
╚══════════════════════════════════════════════════════════════════════════════╝
`;
    }

    getWelcomeArt() {
        return `
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║   ██████╗ ███████╗████████╗██████╗  ██████╗     ██████╗ ██████╗ ███████╗    ║
║   ██╔══██╗██╔════╝╚══██╔══╝██╔══██╗██╔═══██╗    ██╔══██╗██╔══██╗██╔════╝    ║
║   ██████╔╝█████╗     ██║   ██████╔╝██║   ██║    ██████╔╝██████╔╝███████╗    ║
║   ██╔══██╗██╔══╝     ██║   ██╔══██╗██║   ██║    ██╔══██╗██╔══██╗╚════██║    ║
║   ██║  ██║███████╗   ██║   ██║  ██║╚██████╔╝    ██████╔╝██████╔╝███████║    ║
║   ╚═╝  ╚═╝╚══════╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝     ╚═════╝ ╚═════╝ ╚══════╝    ║
║                                                                              ║
║                      "Where Legends Connect"                                 ║
║                           Retro-BBS                                          ║
╚══════════════════════════════════════════════════════════════════════════════╝
`;
    }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const app = new BBSApplication();
    app.init();
});

