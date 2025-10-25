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
        this.terminal.println(ANSIParser.fg('bright-magenta') + '  [A]' + ANSIParser.reset() + ' ANSI Art Gallery');
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

    async showAnsiArtGallery() {
        this.terminal.clear();
        
        // Disable typing simulation for ANSI art
        const wasSimulating = this.terminal.simulateSpeed;
        this.terminal.setSimulateSpeed(false);
        
        // Show gallery header
        this.terminal.println(ANSIParser.fg('bright-magenta') + this.getAnsiGalleryHeader() + ANSIParser.reset());
        this.terminal.println('');
        
        // Re-enable typing simulation
        this.terminal.setSimulateSpeed(wasSimulating);
        
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  Welcome to the ANSI Art Gallery!' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  Browse classic ANSI art from the golden age of BBS.' + ANSIParser.reset());
        this.terminal.println('');
        
        // Show menu options
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [1]' + ANSIParser.reset() + ' View Classic ANSI Art');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [2]' + ANSIParser.reset() + ' View BBS Art Collection');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [3]' + ANSIParser.reset() + ' View Gaming Art');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [4]' + ANSIParser.reset() + ' View ASCII Art');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [5]' + ANSIParser.reset() + ' Upload Your Own Art');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [6]' + ANSIParser.reset() + ' View User Submissions');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [7]' + ANSIParser.reset() + ' ANSI Art Contest');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [8]' + ANSIParser.reset() + ' ANSI Art Tutorial');
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-red') + '  [B]' + ANSIParser.reset() + ' Back to Main Menu');
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
        
        const choice = await this.terminal.input();
        
        switch (choice.toLowerCase()) {
            case '1':
                await this.showClassicAnsiArt();
                break;
            case '2':
                await this.showBbsArtCollection();
                break;
            case '3':
                await this.showGamingArt();
                break;
            case '4':
                await this.showAsciiArt();
                break;
            case '5':
                await this.uploadAnsiArt();
                break;
            case '6':
                await this.showUserSubmissions();
                break;
            case '7':
                await this.showAnsiContest();
                break;
            case '8':
                await this.showAnsiTutorial();
                break;
            case 'b':
                return 'menu';
            default:
                this.terminal.println(ANSIParser.fg('bright-red') + '  Invalid choice!' + ANSIParser.reset());
                await this.terminal.sleep(1000);
                await this.showAnsiArtGallery();
        }
        
        return 'menu';
    }

    getHeaderArt() {
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
╚══════════════════════════════════════════════════════════════════════════════╝`;
    }

    getAnsiGalleryHeader() {
        return `
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║   █████╗ ███╗   ██╗███████╗██╗    █████╗ ██████╗ ███████╗                    ║
║  ██╔══██╗████╗  ██║██╔════╝██║   ██╔══██╗██╔══██╗██╔════╝                    ║
║  ███████║██╔██╗ ██║███████╗██║   ███████║██████╔╝█████╗                      ║
║  ██╔══██║██║╚██╗██║╚════██║██║   ██╔══██║██╔══██╗██╔══╝                      ║
║  ██║  ██║██║ ╚████║███████║██║   ██║  ██║██████╔╝███████╗                    ║
║  ╚═╝  ╚═╝╚═╝  ╚═══╝╚══════╝╚═╝   ╚═╝  ╚═╝╚═════╝ ╚══════╝                    ║
║                                                                              ║
║                    🎨 ART GALLERY - Where Pixels Meet Poetry 🎨              ║
╚══════════════════════════════════════════════════════════════════════════════╝
`;
    }

    async showClassicAnsiArt() {
        this.terminal.clear();
        
        // Disable typing simulation for ANSI art
        const wasSimulating = this.terminal.simulateSpeed;
        this.terminal.setSimulateSpeed(false);
        
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ╔══════════════════════════════════════════════════════════════════════════════╗' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ║' + ANSIParser.reset() + ANSIParser.fg('bright-yellow') + '                        CLASSIC ANSI ART COLLECTION                        ' + ANSIParser.reset() + ANSIParser.fg('bright-cyan') + '║' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ╚══════════════════════════════════════════════════════════════════════════════╝' + ANSIParser.reset());
        this.terminal.println('');
        
        // Show some classic ANSI art
        this.terminal.println(ANSIParser.fg('bright-green') + '  🎨 "Spectacular ANSI Collection #1" by ColorMaster' + ANSIParser.reset());
        this.terminal.println(this.getSpectacularAnsiArt1());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  🎨 "Colorful Masterpiece #2" by PixelArtist' + ANSIParser.reset());
        this.terminal.println(this.getSpectacularAnsiArt2());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  🎨 "Digital Art Revolution #3" by ANSI Wizard' + ANSIParser.reset());
        this.terminal.println(this.getSpectacularAnsiArt3());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  🎨 "Golden Age ANSI #4" by RetroMaster' + ANSIParser.reset());
        this.terminal.println(this.getSpectacularAnsiArt4());
        this.terminal.println('');
        
        // Re-enable typing simulation
        this.terminal.setSimulateSpeed(wasSimulating);
        
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  Press any key to continue...' + ANSIParser.reset());
        await this.terminal.input();
        await this.showAnsiArtGallery();
    }

    async showBbsArtCollection() {
        this.terminal.clear();
        
        const wasSimulating = this.terminal.simulateSpeed;
        this.terminal.setSimulateSpeed(false);
        
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ╔══════════════════════════════════════════════════════════════════════════════╗' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ║' + ANSIParser.reset() + ANSIParser.fg('bright-yellow') + '                          BBS ART COLLECTION                            ' + ANSIParser.reset() + ANSIParser.fg('bright-cyan') + '║' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ╚══════════════════════════════════════════════════════════════════════════════╝' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  🎨 "BBS Welcome Screen" by RetroSysOp' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + this.getBbsWelcomeArt() + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  🎨 "Modem Connection" by DialUpArtist' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + this.getModemArt() + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  🎨 "Spectacular BBS Art #1" by ColorMaster' + ANSIParser.reset());
        this.terminal.println(this.getSpectacularAnsiArt1());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  🎨 "Spectacular BBS Art #2" by PixelArtist' + ANSIParser.reset());
        this.terminal.println(this.getSpectacularAnsiArt2());
        this.terminal.println('');
        
        this.terminal.setSimulateSpeed(wasSimulating);
        
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  Press any key to continue...' + ANSIParser.reset());
        await this.terminal.input();
        await this.showAnsiArtGallery();
    }

    async showGamingArt() {
        this.terminal.clear();
        
        const wasSimulating = this.terminal.simulateSpeed;
        this.terminal.setSimulateSpeed(false);
        
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ╔══════════════════════════════════════════════════════════════════════════════╗' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ║' + ANSIParser.reset() + ANSIParser.fg('bright-yellow') + '                            GAMING ART GALLERY                           ' + ANSIParser.reset() + ANSIParser.fg('bright-cyan') + '║' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ╚══════════════════════════════════════════════════════════════════════════════╝' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  🎨 "Space Invaders" by PixelPirate' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + this.getSpaceInvadersArt() + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  🎨 "Pac-Man" by ArcadeArtist' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + this.getPacManArt() + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  🎨 "Gaming Spectacular #1" by ColorMaster' + ANSIParser.reset());
        this.terminal.println(this.getSpectacularAnsiArt3());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  🎨 "Gaming Spectacular #2" by PixelArtist' + ANSIParser.reset());
        this.terminal.println(this.getSpectacularAnsiArt4());
        this.terminal.println('');
        
        this.terminal.setSimulateSpeed(wasSimulating);
        
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  Press any key to continue...' + ANSIParser.reset());
        await this.terminal.input();
        await this.showAnsiArtGallery();
    }

    async showAsciiArt() {
        this.terminal.clear();
        
        const wasSimulating = this.terminal.simulateSpeed;
        this.terminal.setSimulateSpeed(false);
        
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ╔══════════════════════════════════════════════════════════════════════════════╗' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ║' + ANSIParser.reset() + ANSIParser.fg('bright-yellow') + '                           ASCII ART COLLECTION                          ' + ANSIParser.reset() + ANSIParser.fg('bright-cyan') + '║' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ╚══════════════════════════════════════════════════════════════════════════════╝' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  🎨 "ASCII Cat" by TextArtist' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + this.getAsciiCatArt() + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  🎨 "ASCII Heart" by LoveArtist' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + this.getAsciiHeartArt() + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.setSimulateSpeed(wasSimulating);
        
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  Press any key to continue...' + ANSIParser.reset());
        await this.terminal.input();
        await this.showAnsiArtGallery();
    }

    async uploadAnsiArt() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  ╔══════════════════════════════════════════════════════════════════════════════╗' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  ║' + ANSIParser.reset() + ANSIParser.fg('bright-cyan') + '                            UPLOAD ANSI ART                              ' + ANSIParser.reset() + ANSIParser.fg('bright-yellow') + '║' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  ╚══════════════════════════════════════════════════════════════════════════════╝' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-white') + '  Share your ANSI art with the BBS community!' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  Instructions:' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  1. Create your ANSI art using any ANSI editor' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  2. Save it as a .ANS or .TXT file' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  3. Paste your art below (use Ctrl+V to paste)' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  4. Give it a title and description' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  Art Title: ' + ANSIParser.reset());
        const title = await this.terminal.input();
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  Artist Name: ' + ANSIParser.reset());
        const artist = await this.terminal.input();
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  Description: ' + ANSIParser.reset());
        const description = await this.terminal.input();
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  Paste your ANSI art (end with a line containing just "END"):' + ANSIParser.reset());
        this.terminal.println('');
        
        let artContent = '';
        let line;
        while ((line = await this.terminal.input()) !== 'END') {
            artContent += line + '\n';
        }
        
        // Save the art (in a real implementation, this would save to a database)
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + '  ✅ Art uploaded successfully!' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + `  Title: ${title}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + `  Artist: ${artist}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + `  Description: ${description}` + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Your art will be reviewed by the SysOp before being added to the gallery.' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  Press any key to continue...' + ANSIParser.reset());
        await this.terminal.input();
        await this.showAnsiArtGallery();
    }

    async showUserSubmissions() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  ╔══════════════════════════════════════════════════════════════════════════════╗' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  ║' + ANSIParser.reset() + ANSIParser.fg('bright-cyan') + '                          USER SUBMISSIONS GALLERY                       ' + ANSIParser.reset() + ANSIParser.fg('bright-yellow') + '║' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  ╚══════════════════════════════════════════════════════════════════════════════╝' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-white') + '  Community-submitted ANSI art from our users:' + ANSIParser.reset());
        this.terminal.println('');
        
        // Show some example user submissions
        this.terminal.println(ANSIParser.fg('bright-green') + '  🎨 "My First ANSI" by NewUser123' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  "Just learning ANSI art, hope you like it!"' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + this.getUserArt1() + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  🎨 "Retro Vibes" by PixelMaster' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  "Inspired by the golden age of BBS"' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + this.getUserArt2() + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  Press any key to continue...' + ANSIParser.reset());
        await this.terminal.input();
        await this.showAnsiArtGallery();
    }

    async showAnsiContest() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  ╔══════════════════════════════════════════════════════════════════════════════╗' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  ║' + ANSIParser.reset() + ANSIParser.fg('bright-cyan') + '                            ANSI ART CONTEST                             ' + ANSIParser.reset() + ANSIParser.fg('bright-yellow') + '║' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  ╚══════════════════════════════════════════════════════════════════════════════╝' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-white') + '  🏆 Current Contest: "Retro BBS Nostalgia"' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  Theme: Create ANSI art that captures the spirit of classic BBS' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  Deadline: December 31, 2024' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  Prize: 1000 credits + Featured in gallery' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-white') + '  Rules:' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  • Must be original work' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  • Maximum 80 characters wide' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  • Must relate to BBS/retro computing theme' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  • Submit via Upload Art option' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + '  Current Entries: 12' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-green') + '  Days Remaining: 12' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  Press any key to continue...' + ANSIParser.reset());
        await this.terminal.input();
        await this.showAnsiArtGallery();
    }

    async showAnsiTutorial() {
        this.terminal.clear();
        
        const wasSimulating = this.terminal.simulateSpeed;
        this.terminal.setSimulateSpeed(false);
        
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ╔══════════════════════════════════════════════════════════════════════════════╗' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ║' + ANSIParser.reset() + ANSIParser.fg('bright-yellow') + '                            ANSI ART TUTORIAL                            ' + ANSIParser.reset() + ANSIParser.fg('bright-cyan') + '║' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ╚══════════════════════════════════════════════════════════════════════════════╝' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  🎨 Learn to Create Spectacular ANSI Art!' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  📚 Tutorial Sections:' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [1] CP437 Character Set - The Building Blocks' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [2] Gradient Techniques - Creating Smooth Transitions' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [3] Color Strategies - 16 Colors + 8 Backgrounds' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [4] Cityscape Tutorial - Step by Step' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [5] Advanced Techniques - Shading & Depth' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  [6] Tools & Resources - PabloDraw, Moebius' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  Your choice: ' + ANSIParser.reset());
        
        const choice = await this.terminal.input();
        
        switch (choice) {
            case '1':
                await this.showCharacterSetTutorial();
                break;
            case '2':
                await this.showGradientTutorial();
                break;
            case '3':
                await this.showColorTutorial();
                break;
            case '4':
                await this.showCityscapeTutorial();
                break;
            case '5':
                await this.showAdvancedTutorial();
                break;
            case '6':
                await this.showToolsTutorial();
                break;
            default:
                this.terminal.println(ANSIParser.fg('bright-red') + '  Invalid choice!' + ANSIParser.reset());
                await this.terminal.sleep(1000);
                await this.showAnsiTutorial();
        }
        
        this.terminal.setSimulateSpeed(wasSimulating);
        await this.showAnsiArtGallery();
    }

    async showGoodbye() {
        this.terminal.clear();
        
        // Disable typing simulation for ANSI art
        const wasSimulating = this.terminal.simulateSpeed;
        this.terminal.setSimulateSpeed(false);
        
        // Show goodbye ANSI art
        this.terminal.print(ANSIParser.fg('bright-cyan') + this.getGoodbyeArt() + ANSIParser.reset());
        
        // Re-enable typing simulation
        this.terminal.setSimulateSpeed(wasSimulating);
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + '  Thanks for visiting Retro-BBS!' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Come back soon for more classic BBS fun!' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  Press any key to disconnect...' + ANSIParser.reset());
        await this.terminal.input();
    }

    getGoodbyeArt() {
        return `
    ╔══════════════════════════════════════════════════════════════════════════════╗
    ║                                                                              ║
    ║   ██████╗ ██████╗ ██████╗ ██████╗ ███████╗    ██████╗ ██╗   ██╗███████╗    ║
    ║   ██╔══██╗██╔═══██╗██╔══██╗██╔══██╗██╔════╝    ██╔══██╗██║   ██║██╔════╝    ║
    ║   ██║  ██║██║   ██║██║  ██║██║  ██║█████╗      ██████╔╝██║   ██║███████╗    ║
    ║   ██║  ██║██║   ██║██║  ██║██║  ██║██╔══╝      ██╔══██╗██║   ██║╚════██║    ║
    ║   ██████╔╝╚██████╔╝██████╔╝██████╔╝███████╗    ██║  ██║╚██████╔╝███████║    ║
    ║   ╚═════╝  ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝    ╚═╝  ╚═╝ ╚═════╝ ╚══════╝    ║
    ║                                                                              ║
    ║                    ██████╗ ██████╗ ███████╗ ███████╗                        ║
    ║                    ██╔══██╗██╔══██╗██╔════╝ ██╔════╝                        ║
    ║                    ██████╔╝██████╔╝███████╗ ███████╗                        ║
    ║                    ██╔══██╗██╔══██╗╚════██║ ╚════██║                        ║
    ║                    ██║  ██║██║  ██║███████║ ███████║                        ║
    ║                    ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝ ╚══════╝                        ║
    ║                                                                              ║
    ╚══════════════════════════════════════════════════════════════════════════════╝`;
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
        case 'a':
            return 'ansi-art';
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
║   ██████╗ ███████╗████████╗██████╗  ██████╗     ██████╗ ██████╗ ███████╗    ║
║   ██╔══██╗██╔════╝╚══██╔══╝██╔══██╗██╔═══██╗    ██╔══██╗██╔══██╗██╔════╝    ║
║   ██████╔╝█████╗     ██║   ██████╔╝██║   ██║    ██████╔╝██████╔╝███████╗    ║
║   ██╔══██╗██╔══╝     ██║   ██╔══██╗██║   ██║    ██╔══██╗██╔══██╗╚════██║    ║
║   ██║  ██║███████╗   ██║   ██║  ██║╚██████╔╝    ██████╔╝██████╔╝███████║    ║
║   ╚═╝  ╚═╝╚══════╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝     ╚═════╝ ╚═════╝ ╚══════╝    ║
║                                                                              ║
║                      "Where Legends Connect"                                 ║
║                           Retro-BBS                                          ║
║                                                                              ║
║                      Thank you for calling!                                  ║
╚══════════════════════════════════════════════════════════════════════════════╝
`;
    }

    // ANSI Art Collection Methods
    getMatrixArt() {
        return `
${ANSIParser.fg('bright-green')}    ╔══════════════════════════════════════════════════════════════════════════════╗${ANSIParser.reset()}
${ANSIParser.fg('bright-green')}    ║${ANSIParser.reset()}${ANSIParser.fg('bright-cyan')}                                                                              ${ANSIParser.reset()}${ANSIParser.fg('bright-green')}║${ANSIParser.reset()}
${ANSIParser.fg('bright-green')}    ║${ANSIParser.reset()}${ANSIParser.fg('bright-white')}  ███╗   ███╗ █████╗ ████████╗██████╗ ██╗██╗  ██╗                            ${ANSIParser.reset()}${ANSIParser.fg('bright-green')}║${ANSIParser.reset()}
${ANSIParser.fg('bright-green')}    ║${ANSIParser.reset()}${ANSIParser.fg('bright-white')}  ████╗ ████║██╔══██╗╚══██╔══╝██╔══██╗██║╚██╗██╔╝                            ${ANSIParser.reset()}${ANSIParser.fg('bright-green')}║${ANSIParser.reset()}
${ANSIParser.fg('bright-green')}    ║${ANSIParser.reset()}${ANSIParser.fg('bright-white')}  ██╔████╔██║███████║   ██║   ██████╔╝██║ ╚███╔╝                             ${ANSIParser.reset()}${ANSIParser.fg('bright-green')}║${ANSIParser.reset()}
${ANSIParser.fg('bright-green')}    ║${ANSIParser.reset()}${ANSIParser.fg('bright-white')}  ██║╚██╔╝██║██╔══██║   ██║   ██╔══██╗██║ ██╔██╗                             ${ANSIParser.reset()}${ANSIParser.fg('bright-green')}║${ANSIParser.reset()}
${ANSIParser.fg('bright-green')}    ║${ANSIParser.reset()}${ANSIParser.fg('bright-white')}  ██║ ╚═╝ ██║██║  ██║   ██║   ██║  ██║██║██╔╝ ██╗                            ${ANSIParser.reset()}${ANSIParser.fg('bright-green')}║${ANSIParser.reset()}
${ANSIParser.fg('bright-green')}    ║${ANSIParser.reset()}${ANSIParser.fg('bright-white')}  ╚═╝     ╚═╝╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═╝╚═╝╚═╝  ╚═╝                            ${ANSIParser.reset()}${ANSIParser.fg('bright-green')}║${ANSIParser.reset()}
${ANSIParser.fg('bright-green')}    ║${ANSIParser.reset()}${ANSIParser.fg('bright-cyan')}                                                                              ${ANSIParser.reset()}${ANSIParser.fg('bright-green')}║${ANSIParser.reset()}
${ANSIParser.fg('bright-green')}    ║${ANSIParser.reset()}${ANSIParser.fg('bright-yellow')}  ██╗  ██╗ ██████╗ ██╗     ██╗   ██╗███████╗                                 ${ANSIParser.reset()}${ANSIParser.fg('bright-green')}║${ANSIParser.reset()}
${ANSIParser.fg('bright-green')}    ║${ANSIParser.reset()}${ANSIParser.fg('bright-yellow')}  ██║  ██║██╔═══██╗██║     ██║   ██║██╔════╝                                 ${ANSIParser.reset()}${ANSIParser.fg('bright-green')}║${ANSIParser.reset()}
${ANSIParser.fg('bright-green')}    ║${ANSIParser.reset()}${ANSIParser.fg('bright-yellow')}  ███████║██║   ██║██║     ██║   ██║█████╗                                   ${ANSIParser.reset()}${ANSIParser.fg('bright-green')}║${ANSIParser.reset()}
${ANSIParser.fg('bright-green')}    ║${ANSIParser.reset()}${ANSIParser.fg('bright-yellow')}  ██╔══██║██║   ██║██║     ╚██╗ ██╔╝██╔══╝                                   ${ANSIParser.reset()}${ANSIParser.fg('bright-green')}║${ANSIParser.reset()}
${ANSIParser.fg('bright-green')}    ║${ANSIParser.reset()}${ANSIParser.fg('bright-yellow')}  ██║  ██║╚██████╔╝███████╗ ╚████╔╝ ███████╗                                 ${ANSIParser.reset()}${ANSIParser.fg('bright-green')}║${ANSIParser.reset()}
${ANSIParser.fg('bright-green')}    ║${ANSIParser.reset()}${ANSIParser.fg('bright-yellow')}  ╚═╝  ╚═╝ ╚═════╝ ╚══════╝  ╚═══╝  ╚══════╝                                 ${ANSIParser.reset()}${ANSIParser.fg('bright-green')}║${ANSIParser.reset()}
${ANSIParser.fg('bright-green')}    ║${ANSIParser.reset()}${ANSIParser.fg('bright-cyan')}                                                                              ${ANSIParser.reset()}${ANSIParser.fg('bright-green')}║${ANSIParser.reset()}
${ANSIParser.fg('bright-green')}    ║${ANSIParser.reset()}${ANSIParser.fg('bright-red')}  "Welcome to the Matrix... Follow the white rabbit."                        ${ANSIParser.reset()}${ANSIParser.fg('bright-green')}║${ANSIParser.reset()}
${ANSIParser.fg('bright-green')}    ╚══════════════════════════════════════════════════════════════════════════════╝${ANSIParser.reset()}
`;
    }

    getDragonArt() {
        return `
    ╔══════════════════════════════════════════════════════════════════════════════╗
    ║                                                                              ║
    ║                    ██████╗ ██████╗  █████╗  ██████╗ ██████╗ ███╗   ██╗        ║
    ║                    ██╔══██╗██╔══██╗██╔══██╗██╔════╝██╔═══██╗████╗  ██║        ║
    ║                    ██║  ██║██████╔╝███████║██║     ██║   ██║██╔██╗ ██║        ║
    ║                    ██║  ██║██╔══██╗██╔══██║██║     ██║   ██║██║╚██╗██║        ║
    ║                    ██████╔╝██║  ██║██║  ██║╚██████╗╚██████╔╝██║ ╚████║        ║
    ║                    ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝ ╚═════╝ ╚═╝  ╚═══╝        ║
    ║                                                                              ║
    ║  ╔══════════════════════════════════════════════════════════════════════════╗ ║
    ║  ║                                                                          ║ ║
    ║  ║    ██╗     ██╗   ██╗██╗   ██╗██╗  ██╗    ██╗  ██╗ ██████╗ ████████╗     ║ ║
    ║  ║    ██║     ██║   ██║██║   ██║██║  ██║    ██║  ██║██╔═══██╗╚══██╔══╝     ║ ║
    ║  ║    ██║     ██║   ██║██║   ██║██║  ██║    ███████║██║   ██║   ██║        ║ ║
    ║  ║    ██║     ██║   ██║██║   ██║██║  ██║    ██╔══██║██║   ██║   ██║        ║ ║
    ║  ║    ███████╗╚██████╔╝╚██████╔╝██████╔╝    ██║  ██║╚██████╔╝   ██║        ║ ║
    ║  ║    ╚══════╝ ╚═════╝  ╚═════╝ ╚═════╝     ╚═╝  ╚═╝ ╚═════╝    ╚═╝        ║ ║
    ║  ║                                                                          ║ ║
    ║  ╚══════════════════════════════════════════════════════════════════════════╝ ║
    ║                                                                              ║
    ║  "The dragon awakens... Welcome to the realm of digital art!"               ║
    ╚══════════════════════════════════════════════════════════════════════════════╝
`;
    }

    getComputerArt() {
        return `
    ╔══════════════════════════════════════════════════════════════════════════════╗
    ║                                                                              ║
    ║  ██████╗ ███████╗████████╗██████╗  ██████╗     ██████╗ ██████╗ ███╗   ███╗   ║
    ║  ██╔══██╗██╔════╝╚══██╔══╝██╔══██╗██╔═══██╗   ██╔════╝██╔═══██╗████╗ ████║   ║
    ║  ██████╔╝█████╗     ██║   ██████╔╝██║   ██║   ██║     ██║   ██║██╔████╔██║   ║
    ║  ██╔══██╗██╔══╝     ██║   ██╔══██╗██║   ██║   ██║     ██║   ██║██║╚██╔╝██║   ║
    ║  ██║  ██║███████╗   ██║   ██║  ██║╚██████╔╝   ╚██████╗╚██████╔╝██║ ╚═╝ ██║   ║
    ║  ╚═╝  ╚═╝╚══════╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝     ╚═════╝ ╚═════╝ ╚═╝     ╚═╝   ║
    ║                                                                              ║
    ║  ╔══════════════════════════════════════════════════════════════════════════╗ ║
    ║  ║                                                                          ║ ║
    ║  ║    ┌─────────────────────────────────────────────────────────────┐      ║ ║
    ║  ║    │  ███████╗ ██████╗ ██████╗ ██████╗ ███████╗ ██████╗ ███████╗ │      ║ ║
    ║  ║    │  ██╔════╝██╔═══██╗██╔══██╗██╔══██╗██╔════╝██╔═══██╗██╔════╝ │      ║ ║
    ║  ║    │  ███████╗██║   ██║██████╔╝██████╔╝█████╗  ██║   ██║███████╗ │      ║ ║
    ║  ║    │  ╚════██║██║   ██║██╔══██╗██╔═══╝ ██╔══╝  ██║   ██║╚════██║ │      ║ ║
    ║  ║    │  ███████║╚██████╔╝██║  ██║██║     ███████╗╚██████╔╝███████║ │      ║ ║
    ║  ║    │  ╚══════╝ ╚═════╝ ╚═╝  ╚═╝╚═╝     ╚══════╝ ╚═════╝ ╚══════╝ │      ║ ║
    ║  ║    └─────────────────────────────────────────────────────────────┘      ║ ║
    ║  ║                                                                          ║ ║
    ║  ╚══════════════════════════════════════════════════════════════════════════╝ ║
    ║                                                                              ║
    ║  "The golden age of computing... Where it all began!"                       ║
    ╚══════════════════════════════════════════════════════════════════════════════╝
`;
    }

    getBbsWelcomeArt() {
        return `
    ╔══════════════════════════════════════════════════════════════════════════════╗
    ║                                                                              ║
    ║  ██████╗ ██████╗ ███████╗    ██╗    ██╗███████╗██╗     ███████╗ ██████╗     ║
    ║  ██╔══██╗██╔══██╗██╔════╝    ██║    ██║██╔════╝██║     ██╔════╝██╔═══██╗    ║
    ║  ██████╔╝██████╔╝███████╗    ██║ █╗ ██║█████╗  ██║     █████╗  ██║   ██║    ║
    ║  ██╔══██╗██╔══██╗╚════██║    ██║███╗██║██╔══╝  ██║     ██╔══╝  ██║   ██║    ║
    ║  ██║  ██║██████╔╝███████║    ╚███╔███╔╝███████╗███████╗███████╗╚██████╔╝    ║
    ║  ╚═╝  ╚═╝╚═════╝ ╚══════╝     ╚══╝╚══╝ ╚══════╝╚══════╝╚══════╝ ╚═════╝     ║
    ║                                                                              ║
    ║  ╔══════════════════════════════════════════════════════════════════════════╗ ║
    ║  ║                                                                          ║ ║
    ║  ║    ██╗  ██╗ ██████╗ ██╗   ██╗███████╗███████╗███████╗                    ║ ║
    ║  ║    ██║  ██║██╔═══██╗██║   ██║██╔════╝██╔════╝██╔════╝                    ║ ║
    ║  ║    ███████║██║   ██║██║   ██║█████╗  █████╗  █████╗                      ║ ║
    ║  ║    ██╔══██║██║   ██║╚██╗ ██╔╝██╔══╝  ██╔══╝  ██╔══╝                      ║ ║
    ║  ║    ██║  ██║╚██████╔╝ ╚████╔╝ ███████╗██║     ███████╗                    ║ ║
    ║  ║    ╚═╝  ╚═╝ ╚═════╝   ╚═══╝  ╚══════╝╚═╝     ╚══════╝                    ║ ║
    ║  ║                                                                          ║ ║
    ║  ╚══════════════════════════════════════════════════════════════════════════╝ ║
    ║                                                                              ║
    ║  "Welcome to the digital frontier... Your adventure begins here!"            ║
    ╚══════════════════════════════════════════════════════════════════════════════╝
`;
    }

    getModemArt() {
        return `
    ╔══════════════════════════════════════════════════════════════════════════════╗
    ║                                                                              ║
    ║  ███╗   ███╗ ██████╗ ██████╗ ███████╗███╗   ███╗                            ║
    ║  ████╗ ████║██╔═══██╗██╔══██╗██╔════╝████╗ ████║                            ║
    ║  ██╔████╔██║██║   ██║██║  ██║█████╗  ██╔████╔██║                            ║
    ║  ██║╚██╔╝██║██║   ██║██║  ██║██╔══╝  ██║╚██╔╝██║                            ║
    ║  ██║ ╚═╝ ██║╚██████╔╝██████╔╝███████╗██║ ╚═╝ ██║                            ║
    ║  ╚═╝     ╚═╝ ╚═════╝ ╚═════╝ ╚══════╝╚═╝     ╚═╝                            ║
    ║                                                                              ║
    ║  ╔══════════════════════════════════════════════════════════════════════════╗ ║
    ║  ║                                                                          ║ ║
    ║  ║    ┌─────────────────────────────────────────────────────────────┐      ║ ║
    ║  ║    │  ██████╗ ██████╗ ███╗   ██╗███╗   ██╗███████╗ ██████╗ ███████╗ │      ║ ║
    ║  ║    │  ██╔══██╗██╔══██╗████╗  ██║████╗  ██║██╔════╝██╔═══██╗██╔════╝ │      ║ ║
    ║  ║    │  ██████╔╝██████╔╝██╔██╗ ██║██╔██╗ ██║█████╗  ██║   ██║███████╗ │      ║ ║
    ║  ║    │  ██╔═══╝ ██╔══██╗██║╚██╗██║██║╚██╗██║██╔══╝  ██║   ██║╚════██║ │      ║ ║
    ║  ║    │  ██║     ██║  ██║██║ ╚████║██║ ╚████║███████╗╚██████╔╝███████║ │      ║ ║
    ║  ║    │  ╚═╝     ╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝  ╚═══╝╚══════╝ ╚═════╝ ╚══════╝ │      ║ ║
    ║  ║    └─────────────────────────────────────────────────────────────┘      ║ ║
    ║  ║                                                                          ║ ║
    ║  ╚══════════════════════════════════════════════════════════════════════════╝ ║
    ║                                                                              ║
    ║  "Connecting to the digital world... One beep at a time!"                   ║
    ╚══════════════════════════════════════════════════════════════════════════════╝
`;
    }

    getSpaceInvadersArt() {
        return `
    ╔══════════════════════════════════════════════════════════════════════════════╗
    ║                                                                              ║
    ║  ███████╗██████╗  █████╗  ██████╗███████╗    ██╗██╗   ██╗ █████╗ ██████╗    ║
    ║  ██╔════╝██╔══██╗██╔══██╗██╔════╝██╔════╝    ██║██║   ██║██╔══██╗██╔══██╗   ║
    ║  ███████╗██████╔╝███████║██║     █████╗      ██║██║   ██║███████║██║  ██║   ║
    ║  ╚════██║██╔═══╝ ██╔══██║██║     ██╔══╝      ╚═╝╚██╗ ██╔╝██╔══██║██║  ██║   ║
    ║  ███████║██║     ██║  ██║╚██████╗███████╗    ██╗ ╚████╔╝ ██║  ██║██████╔╝   ║
    ║  ╚══════╝╚═╝     ╚═╝  ╚═╝ ╚═════╝╚══════╝    ╚═╝  ╚═══╝  ╚═╝  ╚═╝╚═════╝    ║
    ║                                                                              ║
    ║  ╔══════════════════════════════════════════════════════════════════════════╗ ║
    ║  ║                                                                          ║ ║
    ║  ║    ██████╗  ██████╗ ██████╗ ██████╗ ██████╗ ██████╗ ██████╗ ██████╗     ║ ║
    ║  ║    ██╔══██╗██╔═══██╗██╔══██╗██╔══██╗██╔══██╗██╔══██╗██╔══██╗██╔══██╗    ║ ║
    ║  ║    ██████╔╝██║   ██║██████╔╝██████╔╝██████╔╝██████╔╝██████╔╝██████╔╝    ║ ║
    ║  ║    ██╔══██╗██║   ██║██╔══██╗██╔══██╗██╔══██╗██╔══██╗██╔══██╗██╔══██╗    ║ ║
    ║  ║    ██║  ██║╚██████╔╝██║  ██║██████╔╝██████╔╝██████╔╝██████╔╝██████╔╝    ║ ║
    ║  ║    ╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝╚═════╝ ╚═════╝ ╚═════╝ ╚═════╝ ╚═════╝     ║ ║
    ║  ║                                                                          ║ ║
    ║  ╚══════════════════════════════════════════════════════════════════════════╝ ║
    ║                                                                              ║
    ║  "The aliens are coming! Defend Earth!"                                     ║
    ╚══════════════════════════════════════════════════════════════════════════════╝
`;
    }

    getPacManArt() {
        return `
    ╔══════════════════════════════════════════════════════════════════════════════╗
    ║                                                                              ║
    ║  ██████╗  █████╗  ██████╗███╗   ███╗ █████╗ ███╗   ██╗                      ║
    ║  ██╔══██╗██╔══██╗██╔════╝████╗ ████║██╔══██╗████╗  ██║                      ║
    ║  ██████╔╝███████║██║     ██╔████╔██║███████║██╔██╗ ██║                      ║
    ║  ██╔═══╝ ██╔══██║██║     ██║╚██╔╝██║██╔══██║██║╚██╗██║                      ║
    ║  ██║     ██║  ██║╚██████╗██║ ╚═╝ ██║██║  ██║██║ ╚████║                      ║
    ║  ╚═╝     ╚═╝  ╚═╝ ╚═════╝╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝                      ║
    ║                                                                              ║
    ║  ╔══════════════════════════════════════════════════════════════════════════╗ ║
    ║  ║                                                                          ║ ║
    ║  ║    ██████╗  █████╗  ██████╗███╗   ███╗ █████╗ ███╗   ██╗                ║ ║
    ║  ║    ██╔══██╗██╔══██╗██╔════╝████╗ ████║██╔══██╗████╗  ██║                ║ ║
    ║  ║    ██████╔╝███████║██║     ██╔████╔██║███████║██╔██╗ ██║                ║ ║
    ║  ║    ██╔═══╝ ██╔══██║██║     ██║╚██╔╝██║██╔══██║██║╚██╗██║                ║ ║
    ║  ║    ██║     ██║  ██║╚██████╗██║ ╚═╝ ██║██║  ██║██║ ╚████║                ║ ║
    ║  ║    ╚═╝     ╚═╝  ╚═╝ ╚═════╝╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝                ║ ║
    ║  ║                                                                          ║ ║
    ║  ╚══════════════════════════════════════════════════════════════════════════╝ ║
    ║                                                                              ║
    ║  "Waka waka waka! Eat all the dots!"                                        ║
    ╚══════════════════════════════════════════════════════════════════════════════╝
`;
    }

    getAsciiCatArt() {
        return `
    ╔══════════════════════════════════════════════════════════════════════════════╗
    ║                                                                              ║
    ║  ╔══════════════════════════════════════════════════════════════════════════╗ ║
    ║  ║                                                                          ║ ║
    ║  ║    /\\_/\\                                                               ║ ║
    ║  ║   (  o.o  )                                                             ║ ║
    ║  ║    > ^ <                                                                ║ ║
    ║  ║                                                                          ║ ║
    ║  ║    ██████╗  █████╗ ████████╗                                            ║ ║
    ║  ║    ██╔══██╗██╔══██╗╚══██╔══╝                                            ║ ║
    ║  ║    ██████╔╝███████║   ██║                                               ║ ║
    ║  ║    ██╔═══╝ ██╔══██║   ██║                                               ║ ║
    ║  ║    ██║     ██║  ██║   ██║                                               ║ ║
    ║  ║    ╚═╝     ╚═╝  ╚═╝   ╚═╝                                               ║ ║
    ║  ║                                                                          ║ ║
    ║  ╚══════════════════════════════════════════════════════════════════════════╝ ║
    ║                                                                              ║
    ║  "Meow! ASCII art is purr-fect!"                                            ║
    ╚══════════════════════════════════════════════════════════════════════════════╝
`;
    }

    getAsciiHeartArt() {
        return `
    ╔══════════════════════════════════════════════════════════════════════════════╗
    ║                                                                              ║
    ║  ╔══════════════════════════════════════════════════════════════════════════╗ ║
    ║  ║                                                                          ║ ║
    ║  ║    ██╗  ██╗███████╗ █████╗ ██████╗ ███████╗                             ║ ║
    ║  ║    ██║  ██║██╔════╝██╔══██╗██╔══██╗██╔════╝                             ║ ║
    ║  ║    ███████║█████╗  ███████║██████╔╝█████╗                               ║ ║
    ║  ║    ██╔══██║██╔══╝  ██╔══██║██╔══██╗██╔══╝                               ║ ║
    ║  ║    ██║  ██║███████╗██║  ██║██║  ██║███████╗                             ║ ║
    ║  ║    ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝                             ║ ║
    ║  ║                                                                          ║ ║
    ║  ║    ♥ ♥ ♥ ♥ ♥ ♥ ♥ ♥ ♥ ♥ ♥ ♥ ♥ ♥ ♥ ♥ ♥ ♥ ♥ ♥ ♥ ♥ ♥ ♥ ♥ ♥ ♥ ♥ ♥ ♥ ♥ ♥ ♥ ♥ ║ ║
    ║  ║                                                                          ║ ║
    ║  ╚══════════════════════════════════════════════════════════════════════════╝ ║
    ║                                                                              ║
    ║  "Love is the greatest art of all!"                                          ║
    ╚══════════════════════════════════════════════════════════════════════════════╝
`;
    }

    getUserArt1() {
        return `
    ╔══════════════════════════════════════════════════════════════════════════════╗
    ║                                                                              ║
    ║  ╔══════════════════════════════════════════════════════════════════════════╗ ║
    ║  ║                                                                          ║ ║
    ║  ║    ██╗  ██╗ ██████╗ ██╗   ██╗███████╗                                   ║ ║
    ║  ║    ██║  ██║██╔═══██╗██║   ██║██╔════╝                                   ║ ║
    ║  ║    ███████║██║   ██║██║   ██║█████╗                                     ║ ║
    ║  ║    ██╔══██║██║   ██║╚██╗ ██╔╝██╔══╝                                     ║ ║
    ║  ║    ██║  ██║╚██████╔╝ ╚████╔╝ ███████╗                                   ║ ║
    ║  ║    ╚═╝  ╚═╝ ╚═════╝   ╚═══╝  ╚══════╝                                   ║ ║
    ║  ║                                                                          ║ ║
    ║  ║    "My first attempt at ANSI art!"                                       ║ ║
    ║  ║                                                                          ║ ║
    ║  ╚══════════════════════════════════════════════════════════════════════════╝ ║
    ║                                                                              ║
    ║  "Great start! Keep practicing!"                                            ║
    ╚══════════════════════════════════════════════════════════════════════════════╝
`;
    }

    getUserArt2() {
        return `
    ╔══════════════════════════════════════════════════════════════════════════════╗
    ║                                                                              ║
    ║  ╔══════════════════════════════════════════════════════════════════════════╗ ║
    ║  ║                                                                          ║ ║
    ║  ║    ██████╗ ███████╗████████╗██████╗  ██████╗                             ║ ║
    ║  ║    ██╔══██╗██╔════╝╚══██╔══╝██╔══██╗██╔═══██╗                            ║ ║
    ║  ║    ██████╔╝█████╗     ██║   ██████╔╝██║   ██║                            ║ ║
    ║  ║    ██╔══██╗██╔══╝     ██║   ██╔══██╗██║   ██║                            ║ ║
    ║  ║    ██║  ██║███████╗   ██║   ██║  ██║╚██████╔╝                            ║ ║
    ║  ║    ╚═╝  ╚═╝╚══════╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝                             ║ ║
    ║  ║                                                                          ║ ║
    ║  ║    "Inspired by the golden age of BBS!"                                  ║ ║
    ║  ║                                                                          ║ ║
    ║  ╚══════════════════════════════════════════════════════════════════════════╝ ║
    ║                                                                              ║
    ║  "Excellent work! Very retro!"                                              ║
    ╚══════════════════════════════════════════════════════════════════════════════╝
`;
    }

    // SPECTACULAR COLORFUL ANSI ART COLLECTION
    getSpectacularAnsiArt1() {
        return `
${ANSIParser.fg('bright-cyan')}    ╔══════════════════════════════════════════════════════════════════════════════╗${ANSIParser.reset()}
${ANSIParser.fg('bright-cyan')}    ║${ANSIParser.reset()}${ANSIParser.fg('bright-yellow')}                                                                              ${ANSIParser.reset()}${ANSIParser.fg('bright-cyan')}║${ANSIParser.reset()}
${ANSIParser.fg('bright-cyan')}    ║${ANSIParser.reset()}${ANSIParser.fg('bright-red')}    ███████╗██╗   ██╗██╗  ████████╗███████╗██████╗  ██████╗ ███████╗    ${ANSIParser.reset()}${ANSIParser.fg('bright-cyan')}║${ANSIParser.reset()}
${ANSIParser.fg('bright-cyan')}    ║${ANSIParser.reset()}${ANSIParser.fg('bright-red')}    ██╔════╝██║   ██║██║  ╚══██╔══╝██╔════╝██╔══██╗██╔═══██╗██╔════╝    ${ANSIParser.reset()}${ANSIParser.fg('bright-cyan')}║${ANSIParser.reset()}
${ANSIParser.fg('bright-cyan')}    ║${ANSIParser.reset()}${ANSIParser.fg('bright-red')}    ███████╗██║   ██║██║     ██║   █████╗  ██████╔╝██║   ██║███████╗    ${ANSIParser.reset()}${ANSIParser.fg('bright-cyan')}║${ANSIParser.reset()}
${ANSIParser.fg('bright-cyan')}    ║${ANSIParser.reset()}${ANSIParser.fg('bright-red')}    ╚════██║██║   ██║██║     ██║   ██╔══╝  ██╔══██╗██║   ██║╚════██║    ${ANSIParser.reset()}${ANSIParser.fg('bright-cyan')}║${ANSIParser.reset()}
${ANSIParser.fg('bright-cyan')}    ║${ANSIParser.reset()}${ANSIParser.fg('bright-red')}    ███████║╚██████╔╝██║     ██║   ███████╗██║  ██║╚██████╔╝███████║    ${ANSIParser.reset()}${ANSIParser.fg('bright-cyan')}║${ANSIParser.reset()}
${ANSIParser.fg('bright-cyan')}    ║${ANSIParser.reset()}${ANSIParser.fg('bright-red')}    ╚══════╝ ╚═════╝ ╚═╝     ╚═╝   ╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝    ${ANSIParser.reset()}${ANSIParser.fg('bright-cyan')}║${ANSIParser.reset()}
${ANSIParser.fg('bright-cyan')}    ║${ANSIParser.reset()}${ANSIParser.fg('bright-yellow')}                                                                              ${ANSIParser.reset()}${ANSIParser.fg('bright-cyan')}║${ANSIParser.reset()}
${ANSIParser.fg('bright-cyan')}    ║${ANSIParser.reset()}${ANSIParser.fg('bright-green')}    ██████╗ ██████╗ ██╗     ██╗   ██╗███████╗███████╗███████╗███████╗    ${ANSIParser.reset()}${ANSIParser.fg('bright-cyan')}║${ANSIParser.reset()}
${ANSIParser.fg('bright-cyan')}    ║${ANSIParser.reset()}${ANSIParser.fg('bright-green')}    ██╔══██╗██╔══██╗██║     ██║   ██║██╔════╝██╔════╝██╔════╝██╔════╝    ${ANSIParser.reset()}${ANSIParser.fg('bright-cyan')}║${ANSIParser.reset()}
${ANSIParser.fg('bright-cyan')}    ║${ANSIParser.reset()}${ANSIParser.fg('bright-green')}    ██████╔╝██████╔╝██║     ██║   ██║█████╗  ███████╗█████╗  ███████╗    ${ANSIParser.reset()}${ANSIParser.fg('bright-cyan')}║${ANSIParser.reset()}
${ANSIParser.fg('bright-cyan')}    ║${ANSIParser.reset()}${ANSIParser.fg('bright-green')}    ██╔══██╗██╔══██╗██║     ╚██╗ ██╔╝██╔══╝  ╚════██║██╔══╝  ╚════██║    ${ANSIParser.reset()}${ANSIParser.fg('bright-cyan')}║${ANSIParser.reset()}
${ANSIParser.fg('bright-cyan')}    ║${ANSIParser.reset()}${ANSIParser.fg('bright-green')}    ██║  ██║██║  ██║███████╗ ╚████╔╝ ███████╗███████║███████╗███████║    ${ANSIParser.reset()}${ANSIParser.fg('bright-cyan')}║${ANSIParser.reset()}
${ANSIParser.fg('bright-cyan')}    ║${ANSIParser.reset()}${ANSIParser.fg('bright-green')}    ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝  ╚═══╝  ╚══════╝╚══════╝╚══════╝╚══════╝    ${ANSIParser.reset()}${ANSIParser.fg('bright-cyan')}║${ANSIParser.reset()}
${ANSIParser.fg('bright-cyan')}    ║${ANSIParser.reset()}${ANSIParser.fg('bright-yellow')}                                                                              ${ANSIParser.reset()}${ANSIParser.fg('bright-cyan')}║${ANSIParser.reset()}
${ANSIParser.fg('bright-cyan')}    ║${ANSIParser.reset()}${ANSIParser.fg('bright-magenta')}    "Spectacular ANSI Art Collection - Where Colors Meet Creativity!"        ${ANSIParser.reset()}${ANSIParser.fg('bright-cyan')}║${ANSIParser.reset()}
${ANSIParser.fg('bright-cyan')}    ╚══════════════════════════════════════════════════════════════════════════════╝${ANSIParser.reset()}
`;
    }

    getSpectacularAnsiArt2() {
        return `
${ANSIParser.fg('bright-red')}    ╔══════════════════════════════════════════════════════════════════════════════╗${ANSIParser.reset()}
${ANSIParser.fg('bright-red')}    ║${ANSIParser.reset()}${ANSIParser.fg('bright-yellow')}                                                                              ${ANSIParser.reset()}${ANSIParser.fg('bright-red')}║${ANSIParser.reset()}
${ANSIParser.fg('bright-red')}    ║${ANSIParser.reset()}${ANSIParser.fg('bright-cyan')}    ██╗  ██╗ ██████╗ ██╗     ██╗   ██╗███████╗███████╗███████╗███████╗    ${ANSIParser.reset()}${ANSIParser.fg('bright-red')}║${ANSIParser.reset()}
${ANSIParser.fg('bright-red')}    ║${ANSIParser.reset()}${ANSIParser.fg('bright-cyan')}    ██║  ██║██╔═══██╗██║     ██║   ██║██╔════╝██╔════╝██╔════╝██╔════╝    ${ANSIParser.reset()}${ANSIParser.fg('bright-red')}║${ANSIParser.reset()}
${ANSIParser.fg('bright-red')}    ║${ANSIParser.reset()}${ANSIParser.fg('bright-cyan')}    ███████║██║   ██║██║     ██║   ██║█████╗  ███████╗█████╗  ███████╗    ${ANSIParser.reset()}${ANSIParser.fg('bright-red')}║${ANSIParser.reset()}
${ANSIParser.fg('bright-red')}    ║${ANSIParser.reset()}${ANSIParser.fg('bright-cyan')}    ██╔══██║██║   ██║██║     ╚██╗ ██╔╝██╔══╝  ╚════██║██╔══╝  ╚════██║    ${ANSIParser.reset()}${ANSIParser.fg('bright-red')}║${ANSIParser.reset()}
${ANSIParser.fg('bright-red')}    ║${ANSIParser.reset()}${ANSIParser.fg('bright-cyan')}    ██║  ██║╚██████╔╝███████╗ ╚████╔╝ ███████╗███████║███████╗███████║    ${ANSIParser.reset()}${ANSIParser.fg('bright-red')}║${ANSIParser.reset()}
${ANSIParser.fg('bright-red')}    ║${ANSIParser.reset()}${ANSIParser.fg('bright-cyan')}    ╚═╝  ╚═╝ ╚═════╝ ╚══════╝  ╚═══╝  ╚══════╝╚══════╝╚══════╝╚══════╝    ${ANSIParser.reset()}${ANSIParser.fg('bright-red')}║${ANSIParser.reset()}
${ANSIParser.fg('bright-red')}    ║${ANSIParser.reset()}${ANSIParser.fg('bright-yellow')}                                                                              ${ANSIParser.reset()}${ANSIParser.fg('bright-red')}║${ANSIParser.reset()}
${ANSIParser.fg('bright-red')}    ║${ANSIParser.reset()}${ANSIParser.fg('bright-green')}    ███████╗██╗   ██╗██╗  ████████╗███████╗██████╗  ██████╗ ███████╗    ${ANSIParser.reset()}${ANSIParser.fg('bright-red')}║${ANSIParser.reset()}
${ANSIParser.fg('bright-red')}    ║${ANSIParser.reset()}${ANSIParser.fg('bright-green')}    ██╔════╝██║   ██║██║  ╚══██╔══╝██╔════╝██╔══██╗██╔═══██╗██╔════╝    ${ANSIParser.reset()}${ANSIParser.fg('bright-red')}║${ANSIParser.reset()}
${ANSIParser.fg('bright-red')}    ║${ANSIParser.reset()}${ANSIParser.fg('bright-green')}    ███████╗██║   ██║██║     ██║   █████╗  ██████╔╝██║   ██║███████╗    ${ANSIParser.reset()}${ANSIParser.fg('bright-red')}║${ANSIParser.reset()}
${ANSIParser.fg('bright-red')}    ║${ANSIParser.reset()}${ANSIParser.fg('bright-green')}    ╚════██║██║   ██║██║     ██║   ██╔══╝  ██╔══██╗██║   ██║╚════██║    ${ANSIParser.reset()}${ANSIParser.fg('bright-red')}║${ANSIParser.reset()}
${ANSIParser.fg('bright-red')}    ║${ANSIParser.reset()}${ANSIParser.fg('bright-green')}    ███████║╚██████╔╝██║     ██║   ███████╗██║  ██║╚██████╔╝███████║    ${ANSIParser.reset()}${ANSIParser.fg('bright-red')}║${ANSIParser.reset()}
${ANSIParser.fg('bright-red')}    ║${ANSIParser.reset()}${ANSIParser.fg('bright-green')}    ╚══════╝ ╚═════╝ ╚═╝     ╚═╝   ╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝    ${ANSIParser.reset()}${ANSIParser.fg('bright-red')}║${ANSIParser.reset()}
${ANSIParser.fg('bright-red')}    ║${ANSIParser.reset()}${ANSIParser.fg('bright-yellow')}                                                                              ${ANSIParser.reset()}${ANSIParser.fg('bright-red')}║${ANSIParser.reset()}
${ANSIParser.fg('bright-red')}    ║${ANSIParser.reset()}${ANSIParser.fg('bright-magenta')}    "Colorful Masterpiece - The Art of Digital Expression!"                ${ANSIParser.reset()}${ANSIParser.fg('bright-red')}║${ANSIParser.reset()}
${ANSIParser.fg('bright-red')}    ╚══════════════════════════════════════════════════════════════════════════════╝${ANSIParser.reset()}
`;
    }

    getSpectacularAnsiArt3() {
        return `
${ANSIParser.fg('bright-magenta')}    ╔══════════════════════════════════════════════════════════════════════════════╗${ANSIParser.reset()}
${ANSIParser.fg('bright-magenta')}    ║${ANSIParser.reset()}${ANSIParser.fg('bright-cyan')}                                                                              ${ANSIParser.reset()}${ANSIParser.fg('bright-magenta')}║${ANSIParser.reset()}
${ANSIParser.fg('bright-magenta')}    ║${ANSIParser.reset()}${ANSIParser.fg('bright-yellow')}    ███████╗██╗   ██╗██╗  ████████╗███████╗██████╗  ██████╗ ███████╗    ${ANSIParser.reset()}${ANSIParser.fg('bright-magenta')}║${ANSIParser.reset()}
${ANSIParser.fg('bright-magenta')}    ║${ANSIParser.reset()}${ANSIParser.fg('bright-yellow')}    ██╔════╝██║   ██║██║  ╚══██╔══╝██╔════╝██╔══██╗██╔═══██╗██╔════╝    ${ANSIParser.reset()}${ANSIParser.fg('bright-magenta')}║${ANSIParser.reset()}
${ANSIParser.fg('bright-magenta')}    ║${ANSIParser.reset()}${ANSIParser.fg('bright-yellow')}    ███████╗██║   ██║██║     ██║   █████╗  ██████╔╝██║   ██║███████╗    ${ANSIParser.reset()}${ANSIParser.fg('bright-magenta')}║${ANSIParser.reset()}
${ANSIParser.fg('bright-magenta')}    ║${ANSIParser.reset()}${ANSIParser.fg('bright-yellow')}    ╚════██║██║   ██║██║     ██║   ██╔══╝  ██╔══██╗██║   ██║╚════██║    ${ANSIParser.reset()}${ANSIParser.fg('bright-magenta')}║${ANSIParser.reset()}
${ANSIParser.fg('bright-magenta')}    ║${ANSIParser.reset()}${ANSIParser.fg('bright-yellow')}    ███████║╚██████╔╝██║     ██║   ███████╗██║  ██║╚██████╔╝███████║    ${ANSIParser.reset()}${ANSIParser.fg('bright-magenta')}║${ANSIParser.reset()}
${ANSIParser.fg('bright-magenta')}    ║${ANSIParser.reset()}${ANSIParser.fg('bright-yellow')}    ╚══════╝ ╚═════╝ ╚═╝     ╚═╝   ╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝    ${ANSIParser.reset()}${ANSIParser.fg('bright-magenta')}║${ANSIParser.reset()}
${ANSIParser.fg('bright-magenta')}    ║${ANSIParser.reset()}${ANSIParser.fg('bright-cyan')}                                                                              ${ANSIParser.reset()}${ANSIParser.fg('bright-magenta')}║${ANSIParser.reset()}
${ANSIParser.fg('bright-magenta')}    ║${ANSIParser.reset()}${ANSIParser.fg('bright-green')}    ███████╗██╗   ██╗██╗  ████████╗███████╗██████╗  ██████╗ ███████╗    ${ANSIParser.reset()}${ANSIParser.fg('bright-magenta')}║${ANSIParser.reset()}
${ANSIParser.fg('bright-magenta')}    ║${ANSIParser.reset()}${ANSIParser.fg('bright-green')}    ██╔════╝██║   ██║██║  ╚══██╔══╝██╔════╝██╔══██╗██╔═══██╗██╔════╝    ${ANSIParser.reset()}${ANSIParser.fg('bright-magenta')}║${ANSIParser.reset()}
${ANSIParser.fg('bright-magenta')}    ║${ANSIParser.reset()}${ANSIParser.fg('bright-green')}    ███████╗██║   ██║██║     ██║   █████╗  ██████╔╝██║   ██║███████╗    ${ANSIParser.reset()}${ANSIParser.fg('bright-magenta')}║${ANSIParser.reset()}
${ANSIParser.fg('bright-magenta')}    ║${ANSIParser.reset()}${ANSIParser.fg('bright-green')}    ╚════██║██║   ██║██║     ██║   ██╔══╝  ██╔══██╗██║   ██║╚════██║    ${ANSIParser.reset()}${ANSIParser.fg('bright-magenta')}║${ANSIParser.reset()}
${ANSIParser.fg('bright-magenta')}    ║${ANSIParser.reset()}${ANSIParser.fg('bright-green')}    ███████║╚██████╔╝██║     ██║   ███████╗██║  ██║╚██████╔╝███████║    ${ANSIParser.reset()}${ANSIParser.fg('bright-magenta')}║${ANSIParser.reset()}
${ANSIParser.fg('bright-magenta')}    ║${ANSIParser.reset()}${ANSIParser.fg('bright-green')}    ╚══════╝ ╚═════╝ ╚═╝     ╚═╝   ╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝    ${ANSIParser.reset()}${ANSIParser.fg('bright-magenta')}║${ANSIParser.reset()}
${ANSIParser.fg('bright-magenta')}    ║${ANSIParser.reset()}${ANSIParser.fg('bright-cyan')}                                                                              ${ANSIParser.reset()}${ANSIParser.fg('bright-magenta')}║${ANSIParser.reset()}
${ANSIParser.fg('bright-magenta')}    ║${ANSIParser.reset()}${ANSIParser.fg('bright-red')}    "Digital Art Revolution - Where Pixels Become Poetry!"                  ${ANSIParser.reset()}${ANSIParser.fg('bright-magenta')}║${ANSIParser.reset()}
${ANSIParser.fg('bright-magenta')}    ╚══════════════════════════════════════════════════════════════════════════════╝${ANSIParser.reset()}
`;
    }

    getSpectacularAnsiArt4() {
        return `
${ANSIParser.fg('bright-yellow')}    ╔══════════════════════════════════════════════════════════════════════════════╗${ANSIParser.reset()}
${ANSIParser.fg('bright-yellow')}    ║${ANSIParser.reset()}${ANSIParser.fg('bright-red')}                                                                              ${ANSIParser.reset()}${ANSIParser.fg('bright-yellow')}║${ANSIParser.reset()}
${ANSIParser.fg('bright-yellow')}    ║${ANSIParser.reset()}${ANSIParser.fg('bright-red')}    ███████╗██╗   ██╗██╗  ████████╗███████╗██████╗  ██████╗ ███████╗    ${ANSIParser.reset()}${ANSIParser.fg('bright-yellow')}║${ANSIParser.reset()}
${ANSIParser.fg('bright-yellow')}    ║${ANSIParser.reset()}${ANSIParser.fg('bright-red')}    ██╔════╝██║   ██║██║  ╚══██╔══╝██╔════╝██╔══██╗██╔═══██╗██╔════╝    ${ANSIParser.reset()}${ANSIParser.fg('bright-yellow')}║${ANSIParser.reset()}
${ANSIParser.fg('bright-yellow')}    ║${ANSIParser.reset()}${ANSIParser.fg('bright-red')}    ███████╗██║   ██║██║     ██║   █████╗  ██████╔╝██║   ██║███████╗    ${ANSIParser.reset()}${ANSIParser.fg('bright-yellow')}║${ANSIParser.reset()}
${ANSIParser.fg('bright-yellow')}    ║${ANSIParser.reset()}${ANSIParser.fg('bright-red')}    ╚════██║██║   ██║██║     ██║   ██╔══╝  ██╔══██╗██║   ██║╚════██║    ${ANSIParser.reset()}${ANSIParser.fg('bright-yellow')}║${ANSIParser.reset()}
${ANSIParser.fg('bright-yellow')}    ║${ANSIParser.reset()}${ANSIParser.fg('bright-red')}    ███████║╚██████╔╝██║     ██║   ███████╗██║  ██║╚██████╔╝███████║    ${ANSIParser.reset()}${ANSIParser.fg('bright-yellow')}║${ANSIParser.reset()}
${ANSIParser.fg('bright-yellow')}    ║${ANSIParser.reset()}${ANSIParser.fg('bright-red')}    ╚══════╝ ╚═════╝ ╚═╝     ╚═╝   ╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝    ${ANSIParser.reset()}${ANSIParser.fg('bright-yellow')}║${ANSIParser.reset()}
${ANSIParser.fg('bright-yellow')}    ║${ANSIParser.reset()}${ANSIParser.fg('bright-red')}                                                                              ${ANSIParser.reset()}${ANSIParser.fg('bright-yellow')}║${ANSIParser.reset()}
${ANSIParser.fg('bright-yellow')}    ║${ANSIParser.reset()}${ANSIParser.fg('bright-cyan')}    ███████╗██╗   ██╗██╗  ████████╗███████╗██████╗  ██████╗ ███████╗    ${ANSIParser.reset()}${ANSIParser.fg('bright-yellow')}║${ANSIParser.reset()}
${ANSIParser.fg('bright-yellow')}    ║${ANSIParser.reset()}${ANSIParser.fg('bright-cyan')}    ██╔════╝██║   ██║██║  ╚══██╔══╝██╔════╝██╔══██╗██╔═══██╗██╔════╝    ${ANSIParser.reset()}${ANSIParser.fg('bright-yellow')}║${ANSIParser.reset()}
${ANSIParser.fg('bright-yellow')}    ║${ANSIParser.reset()}${ANSIParser.fg('bright-cyan')}    ███████╗██║   ██║██║     ██║   █████╗  ██████╔╝██║   ██║███████╗    ${ANSIParser.reset()}${ANSIParser.fg('bright-yellow')}║${ANSIParser.reset()}
${ANSIParser.fg('bright-yellow')}    ║${ANSIParser.reset()}${ANSIParser.fg('bright-cyan')}    ╚════██║██║   ██║██║     ██║   ██╔══╝  ██╔══██╗██║   ██║╚════██║    ${ANSIParser.reset()}${ANSIParser.fg('bright-yellow')}║${ANSIParser.reset()}
${ANSIParser.fg('bright-yellow')}    ║${ANSIParser.reset()}${ANSIParser.fg('bright-cyan')}    ███████║╚██████╔╝██║     ██║   ███████╗██║  ██║╚██████╔╝███████║    ${ANSIParser.reset()}${ANSIParser.fg('bright-yellow')}║${ANSIParser.reset()}
${ANSIParser.fg('bright-yellow')}    ║${ANSIParser.reset()}${ANSIParser.fg('bright-cyan')}    ╚══════╝ ╚═════╝ ╚═╝     ╚═╝   ╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝    ${ANSIParser.reset()}${ANSIParser.fg('bright-yellow')}║${ANSIParser.reset()}
${ANSIParser.fg('bright-yellow')}    ║${ANSIParser.reset()}${ANSIParser.fg('bright-red')}                                                                              ${ANSIParser.reset()}${ANSIParser.fg('bright-yellow')}║${ANSIParser.reset()}
${ANSIParser.fg('bright-yellow')}    ║${ANSIParser.reset()}${ANSIParser.fg('bright-magenta')}    "Golden Age of ANSI - Where Art Meets Technology!"                     ${ANSIParser.reset()}${ANSIParser.fg('bright-yellow')}║${ANSIParser.reset()}
${ANSIParser.fg('bright-yellow')}    ╚══════════════════════════════════════════════════════════════════════════════╝${ANSIParser.reset()}
`;
    }

    // ANSI ART TUTORIAL METHODS
    async showCharacterSetTutorial() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ╔══════════════════════════════════════════════════════════════════════════════╗' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ║' + ANSIParser.reset() + ANSIParser.fg('bright-yellow') + '                        CP437 CHARACTER SET TUTORIAL                        ' + ANSIParser.reset() + ANSIParser.fg('bright-cyan') + '║' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ╚══════════════════════════════════════════════════════════════════════════════╝' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  🎨 The Building Blocks of ANSI Art:' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Block Characters for Shading:' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  █ - Full block (solid)' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  ▓ - Dark shade block' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  ▒ - Medium shade block' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  ░ - Light shade block' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Half-Block Characters for Gradients:' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  ▄ - Lower half block' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  ▀ - Upper half block' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  ▌ - Left half block' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  ▐ - Right half block' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Example Gradient:' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  ████████' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  ▓▓▓▓▓▓▓▓' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  ▒▒▒▒▒▒▒▒' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  ░░░░░░░░' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  Press any key to continue...' + ANSIParser.reset());
        await this.terminal.input();
    }

    async showGradientTutorial() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ╔══════════════════════════════════════════════════════════════════════════════╗' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ║' + ANSIParser.reset() + ANSIParser.fg('bright-yellow') + '                        GRADIENT TECHNIQUES TUTORIAL                        ' + ANSIParser.reset() + ANSIParser.fg('bright-cyan') + '║' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ╚══════════════════════════════════════════════════════════════════════════════╝' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  🌈 Creating Smooth Gradients:' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Technique 1: Character Density' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  Use █ → ▓ → ▒ → ░ → (space) for smooth transitions' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Technique 2: Half-Block Layering' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  Combine ▄ and ▀ for vertical gradients' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  Combine ▌ and ▐ for horizontal gradients' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Technique 3: Color + Character' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  Use different colors with same characters' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  Use same color with different characters' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  Press any key to continue...' + ANSIParser.reset());
        await this.terminal.input();
    }

    async showColorTutorial() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ╔══════════════════════════════════════════════════════════════════════════════╗' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ║' + ANSIParser.reset() + ANSIParser.fg('bright-yellow') + '                        COLOR STRATEGIES TUTORIAL                        ' + ANSIParser.reset() + ANSIParser.fg('bright-cyan') + '║' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ╚══════════════════════════════════════════════════════════════════════════════╝' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  🎨 ANSI Color System:' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  16 Foreground Colors:' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('black') + '  Black ' + ANSIParser.reset() + ANSIParser.fg('red') + 'Red ' + ANSIParser.reset() + ANSIParser.fg('green') + 'Green ' + ANSIParser.reset() + ANSIParser.fg('yellow') + 'Yellow' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('blue') + '  Blue ' + ANSIParser.reset() + ANSIParser.fg('magenta') + 'Magenta ' + ANSIParser.reset() + ANSIParser.fg('cyan') + 'Cyan ' + ANSIParser.reset() + ANSIParser.fg('white') + 'White' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-black') + '  Bright Black ' + ANSIParser.reset() + ANSIParser.fg('bright-red') + 'Bright Red ' + ANSIParser.reset() + ANSIParser.fg('bright-green') + 'Bright Green ' + ANSIParser.reset() + ANSIParser.fg('bright-yellow') + 'Bright Yellow' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-blue') + '  Bright Blue ' + ANSIParser.reset() + ANSIParser.fg('bright-magenta') + 'Bright Magenta ' + ANSIParser.reset() + ANSIParser.fg('bright-cyan') + 'Bright Cyan ' + ANSIParser.reset() + ANSIParser.fg('bright-white') + 'Bright White' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Color Strategy Tips:' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  • Use contrasting colors for windows/lighting' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  • Dark buildings with bright accent colors' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  • Gradient skies using color transitions' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  • Bright colors for highlights and details' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  Press any key to continue...' + ANSIParser.reset());
        await this.terminal.input();
    }

    async showCityscapeTutorial() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ╔══════════════════════════════════════════════════════════════════════════════╗' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ║' + ANSIParser.reset() + ANSIParser.fg('bright-yellow') + '                        CITYSCAPE TUTORIAL - STEP BY STEP                        ' + ANSIParser.reset() + ANSIParser.fg('bright-cyan') + '║' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ╚══════════════════════════════════════════════════════════════════════════════╝' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  🏙️ Creating a Spectacular Cityscape:' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Step 1: Plan Your Layout' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  • Sketch basic building shapes' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  • Plan sky gradient (top to bottom)' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  • Decide on building heights and variety' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Step 2: Create Sky Gradient' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  • Start with black at top' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  • Transition through blue, purple, magenta' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  • Use █ ▓ ▒ ░ for smooth transitions' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Step 3: Add Buildings' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  • Use █ for solid building shapes' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  • Vary heights for interest' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  • Add warm colors (brown/orange) for depth' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Step 4: Add Windows & Lights' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  • Use bright colors (cyan, yellow, white)' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  • Create patterns and variety' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  • Add golden roofs and accents' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Step 5: Add Foreground Details' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  • Use teal/green for water/ground' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  • Add reflections and small details' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  • Use ▄ ▀ for layered effects' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  Press any key to continue...' + ANSIParser.reset());
        await this.terminal.input();
    }

    async showAdvancedTutorial() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ╔══════════════════════════════════════════════════════════════════════════════╗' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ║' + ANSIParser.reset() + ANSIParser.fg('bright-yellow') + '                        ADVANCED TECHNIQUES TUTORIAL                        ' + ANSIParser.reset() + ANSIParser.fg('bright-cyan') + '║' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ╚══════════════════════════════════════════════════════════════════════════════╝' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  🎯 Advanced ANSI Art Techniques:' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Shading & Depth:' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  • Use darker colors for shadows' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  • Bright colors for highlights' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  • Layer half-blocks for smooth transitions' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Composition Tips:' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  • Create focal points with bright colors' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  • Use contrast to guide the eye' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  • Balance dark and light areas' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Character Placement:' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  • Experiment with character combinations' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  • Use ▄▀ for detailed textures' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  • Combine ▌▐ for complex patterns' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  Press any key to continue...' + ANSIParser.reset());
        await this.terminal.input();
    }

    async showToolsTutorial() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ╔══════════════════════════════════════════════════════════════════════════════╗' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ║' + ANSIParser.reset() + ANSIParser.fg('bright-yellow') + '                        TOOLS & RESOURCES TUTORIAL                        ' + ANSIParser.reset() + ANSIParser.fg('bright-cyan') + '║' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ╚══════════════════════════════════════════════════════════════════════════════╝' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  🛠️ Professional ANSI Art Tools:' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Recommended Editors:' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  • PabloDraw - Collaborative ANSI editor' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  • Moebius - Modern ANSI/ASCII editor' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  • TheDraw - Classic DOS ANSI editor' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Learning Resources:' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  • ASCII Art Academy (roysac.com)' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  • 16colo.rs - ANSI art gallery' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  • Lord Soth\'s ANSI Tips' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Community:' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  • 16colo.rs forum' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  • ANSI art contests' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  • Share your work for feedback' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  Press any key to continue...' + ANSIParser.reset());
        await this.terminal.input();
    }

    // SPECTACULAR ANSI ART CREATIONS
    getSpectacularCityscape() {
        return `
${ANSIParser.fg('black')}    ╔══════════════════════════════════════════════════════════════════════════════╗${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('blue')}                                                                              ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('blue')}    ████████████████████████████████████████████████████████████████████████    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('blue')}    ████████████████████████████████████████████████████████████████████████    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('blue')}    ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('blue')}    ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ║${ANSIParser.reset()}${ANSIParser.fg('magenta')}    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ${ANSIParser.reset()}${ANSIParser.fg('black')}║${ANSIParser.reset()}
${ANSIParser.fg('black')}    ╚══════════════════════════════════════════════════════════════════════════════╝${ANSIParser.reset()}
`;
    }
}

// Export for use in other modules
window.MenuManager = MenuManager;

