// Main Menu System
class MenuManager {
    constructor(terminal, socketClient, authManager) {
        this.terminal = terminal;
        this.socketClient = socketClient;
        this.authManager = authManager;
    }

    async showMainMenu() {
        const user = this.authManager.getCurrentUser();
        
        // Clear screen
        this.terminal.clear();
        
        // Disable typing simulation for ANSI art
        const wasSimulating = this.terminal.simulateSpeed;
        this.terminal.setSimulateSpeed(false);
        
        // Show ANSI art header
        this.terminal.print(ANSIParser.fg('bright-cyan') + this.getHeaderArt() + ANSIParser.reset());
        
        // Re-enable typing simulation
        this.terminal.setSimulateSpeed(wasSimulating);
        
        this.terminal.println('');
        
        // Get online users count
        const onlineCount = await this.getOnlineUsersCount();
        
        // User info bar
        this.terminal.println(ANSIParser.fg('bright-green') + '╔══════════════════════════════════════════════════════════════════════════════╗' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + '║' + ANSIParser.reset() + 
            ANSIParser.fg('bright-white') + `  Welcome, ${user.handle}!` + ANSIParser.reset() +
            ' '.repeat(65 - user.handle.length) + ANSIParser.fg('bright-green') + '║' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + '╚══════════════════════════════════════════════════════════════════════════════╝' + ANSIParser.reset());
        this.terminal.println('');
        
        // Menu options
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [M]' + ANSIParser.reset() + ' Message Boards');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [E]' + ANSIParser.reset() + ' Email / Private Messages');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [F]' + ANSIParser.reset() + ' File Libraries');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [D]' + ANSIParser.reset() + ' Door Games');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [C]' + ANSIParser.reset() + ' Chat Rooms');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [U]' + ANSIParser.reset() + ' User List / Who\'s Online');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [P]' + ANSIParser.reset() + ' My Profile & Stats');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [B]' + ANSIParser.reset() + ' Bulletins');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [O]' + ANSIParser.reset() + ' One-Liners Wall');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [S]' + ANSIParser.reset() + ' Statistics/Info');
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  [H]' + ANSIParser.reset() + ' Chat with SysOp');
        this.terminal.println(ANSIParser.fg('bright-red') + '  [!]' + ANSIParser.reset() + ' SYSOp Control Panel');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [G]' + ANSIParser.reset() + ' Goodbye (Logoff)');
        this.terminal.println('');
        
        // Status info
        const userLevel = Math.floor((user.credits || 100) / 100) + 1;
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  Calls: ' + ANSIParser.reset() + user.calls + 
            ANSIParser.fg('bright-cyan') + '  |  Level: ' + ANSIParser.reset() + userLevel +
            ANSIParser.fg('bright-cyan') + '  |  Credits: ' + ANSIParser.reset() + (user.credits || 100) +
            ANSIParser.fg('bright-cyan') + '  |  Online: ' + ANSIParser.reset() + 
            ANSIParser.fg('bright-green') + onlineCount + ANSIParser.reset());
        this.terminal.println('');
        
        // Prompt for selection
        this.terminal.println(ANSIParser.fg('bright-green') + '  Make your selection: ' + ANSIParser.reset());
        
        const choice = await this.terminal.input();
        
        return choice.toLowerCase().trim();
    }
    
    async getOnlineUsersCount() {
        return new Promise((resolve) => {
            const timeout = setTimeout(() => resolve(0), 500);
            
            this.socketClient.on('online-users-update', (users) => {
                clearTimeout(timeout);
                resolve(users.length);
            });
            
            // Request current online users
            this.socketClient.socket.emit('get-online-users');
        });
    }

    getHeaderArt() {
        return `
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║   ██████╗ ███████╗████████╗██████╗  ██████╗      ██████╗ ██████╗ ███████╗    ║
║   ██╔══██╗██╔════╝╚══██╔══╝██╔══██╗██╔═══██╗    ██╔══██╗██╔══██╗██╔════╝    ║
║   ██████╔╝█████╗     ██║   ██████╔╝██║   ██║    ██████╔╝██████╔╝███████╗    ║
║   ██╔══██╗██╔══╝     ██║   ██╔══██╗██║   ██║    ██╔══██╗██╔══██╗╚════██║    ║
║   ██║  ██║███████╗   ██║   ██║  ██║╚██████╔╝    ██████╔╝██████╔╝███████║    ║
║   ╚═╝  ╚═╝╚══════╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝     ╚═════╝ ╚═════╝ ╚══════╝    ║
║                                                                              ║
║                         Retro-BBS - Where Legends Connect                     ║
╚══════════════════════════════════════════════════════════════════════════════╝
`;
    }

    async handleMenuChoice(choice) {
        switch (choice) {
            case 'm':
                return 'messages';
            case 'e':
                return 'email';
            case 'f':
                return 'files';
            case 'd':
                return 'doors';
            case 'c':
                return 'chat';
            case 'u':
                return 'users';
            case 'p':
                return 'profile';
            case 'b':
                return 'bulletins';
            case 'o':
                return 'oneliners';
            case 's':
                return 'stats';
            case 'h':
                return 'sysop-chat';
            case '!':
                return 'sysop';
            case 'g':
                return 'logout';
            default:
                this.terminal.println(ANSIParser.fg('bright-red') + 'Invalid selection. Please try again.' + ANSIParser.reset());
                await this.terminal.sleep(1500);
                return 'menu';
        }
    }

    async showGoodbye() {
        this.terminal.clear();
        
        // Disable typing simulation for ANSI art
        const wasSimulating = this.terminal.simulateSpeed;
        this.terminal.setSimulateSpeed(false);
        
        this.terminal.print(ANSIParser.fg('bright-cyan') + this.getGoodbyeArt() + ANSIParser.reset());
        
        // Re-enable typing simulation
        this.terminal.setSimulateSpeed(wasSimulating);
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + '  Thanks for calling Retro-BBS!' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + '  Please call again soon!' + ANSIParser.reset());
        this.terminal.println('');
        
        const user = this.authManager.getCurrentUser();
        this.terminal.println(ANSIParser.fg('bright-cyan') + `  Session Statistics:` + ANSIParser.reset());
        if (user) {
            this.terminal.println(ANSIParser.fg('bright-white') + `     Total Calls: ${user.calls || 0}` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-white') + `     Time Online: 0:00:00` + ANSIParser.reset());
        } else {
            this.terminal.println(ANSIParser.fg('bright-white') + `     Total Calls: 0` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-white') + `     Time Online: 0:00:00` + ANSIParser.reset());
        }
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Press any key to disconnect...' + ANSIParser.reset());
        
        await this.terminal.input();
    }

    getGoodbyeArt() {
        return `
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║                    ██╗   ██╗ ██████╗ ██╗   ██╗███████╗                        ║
║                    ╚██╗ ██╔╝██╔═══██╗██║   ██║██╔════╝                        ║
║                     ╚████╔╝ ██║   ██║██║   ██║███████╗                        ║
║                      ╚██╔╝  ██║   ██║██║   ██║╚════██║                        ║
║                       ██║   ╚██████╔╝╚██████╔╝███████║                        ║
║                       ╚═╝    ╚═════╝  ╚═════╝ ╚══════╝                        ║
║                                                                              ║
║                      Thank you for calling!                                  ║
╚══════════════════════════════════════════════════════════════════════════════╝
`;
    }
}

// Export for use in other modules
window.MenuManager = MenuManager;

