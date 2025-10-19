// Bulletins System
class BulletinSystem {
    constructor(terminal, authManager) {
        this.terminal = terminal;
        this.authManager = authManager;
    }

    async showBulletins() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + this.getTitle() + ANSIParser.reset());
        this.terminal.println('');
        
        try {
            const response = await fetch('/api/bulletins');
            const bulletins = await response.json();
            
            if (bulletins.length === 0) {
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  No bulletins at this time.' + ANSIParser.reset());
                this.terminal.println('');
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  Press any key to continue...' + ANSIParser.reset());
                await this.terminal.input();
                return;
            }
            
            bulletins.forEach((bulletin, index) => {
                this.terminal.println(ANSIParser.fg('bright-cyan') + '  ' + '═'.repeat(70) + ANSIParser.reset());
                this.terminal.println(ANSIParser.fg('bright-yellow') + `  ${bulletin.title}` + ANSIParser.reset());
                this.terminal.println(ANSIParser.fg('bright-white') + `  By: ${bulletin.author_handle} | ${new Date(bulletin.created_at).toLocaleDateString()}` + ANSIParser.reset());
                this.terminal.println('');
                this.terminal.println(ANSIParser.fg('bright-white') + '  ' + bulletin.message.replace(/\n/g, '\n  ') + ANSIParser.reset());
                this.terminal.println('');
            });
            
            this.terminal.println(ANSIParser.fg('bright-cyan') + '  ' + '═'.repeat(70) + ANSIParser.reset());
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  Press any key to continue...' + ANSIParser.reset());
            await this.terminal.input();
        } catch (error) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Error loading bulletins!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
        }
    }

    async showRandomQuote() {
        const quotes = [
            "The only way to do great work is to love what you do. - Steve Jobs",
            "Code is like humor. When you have to explain it, it's bad. - Cory House",
            "First, solve the problem. Then, write the code. - John Johnson",
            "Experience is the name everyone gives to their mistakes. - Oscar Wilde",
            "Sometimes it pays to stay in bed on Monday, rather than spending the rest of the week debugging Monday's code. - Christopher Thompson",
            "Debugging is twice as hard as writing the code in the first place. - Brian Kernighan",
            "The best way to predict the future is to implement it. - David Heinemeier Hansson",
            "Any fool can write code that a computer can understand. Good programmers write code that humans can understand. - Martin Fowler",
            "Premature optimization is the root of all evil. - Donald Knuth",
            "The most disastrous thing that you can ever learn is your first programming language. - Alan Kay"
        ];
        
        const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
        
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ══════════════════════════════════════════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  QUOTE OF THE DAY:' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-white') + '  ' + randomQuote + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ══════════════════════════════════════════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println('');
    }

    getTitle() {
        return `
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║                          BULLETINS & ANNOUNCEMENTS                            ║
║                                                                              ║
║                      System-Wide Messages & Updates                           ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
`;
    }
}

// Export for use in other modules
window.BulletinSystem = BulletinSystem;


