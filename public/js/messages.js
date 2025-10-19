// Message Board System
class MessageBoard {
    constructor(terminal, authManager) {
        this.terminal = terminal;
        this.authManager = authManager;
        this.boards = [
            { id: 'general', name: 'General Discussion' },
            { id: 'gaming', name: 'Gaming' },
            { id: 'tech', name: 'Tech Support' },
            { id: 'trading', name: 'Trading Post' },
            { id: 'offtopic', name: 'Off Topic' }
        ];
    }

    async showMessageBoards() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + this.getHeader() + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-white') + '  Message Boards:' + ANSIParser.reset());
        this.terminal.println('');
        
        for (let i = 0; i < this.boards.length; i++) {
            const board = this.boards[i];
            this.terminal.println(ANSIParser.fg('bright-yellow') + `  [${i + 1}]` + ANSIParser.reset() + ` ${board.name}`);
        }
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [0]' + ANSIParser.reset() + ' Return to Main Menu');
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + '  Select board: ' + ANSIParser.reset());
        
        const choice = await this.terminal.input();
        const boardIndex = parseInt(choice) - 1;
        
        if (choice === '0') {
            return 'menu';
        } else if (boardIndex >= 0 && boardIndex < this.boards.length) {
            await this.showBoard(this.boards[boardIndex]);
            return 'messages';
        } else {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Invalid selection.' + ANSIParser.reset());
            await this.terminal.sleep(1500);
            return 'messages';
        }
    }

    async showBoard(board) {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + this.getBoardHeader(board.name) + ANSIParser.reset());
        this.terminal.println('');
        
        try {
            const response = await fetch(`/api/messages/${board.id}`);
            const messages = await response.json();
            
            if (messages.length === 0) {
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  No messages yet. Be the first to post!' + ANSIParser.reset());
            } else {
                messages.forEach((msg, index) => {
                    this.terminal.println(ANSIParser.fg('bright-yellow') + `  [${index + 1}]` + ANSIParser.reset() + 
                        ` ${msg.subject} - by ${msg.author_handle}`);
                    this.terminal.println(ANSIParser.fg('bright-black') + `      ${new Date(msg.created_at).toLocaleString()}` + ANSIParser.reset());
                    this.terminal.println('');
                });
            }
            
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [R]' + ANSIParser.reset() + ' Read Message');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [N]' + ANSIParser.reset() + ' New Message');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [B]' + ANSIParser.reset() + ' Back to Boards');
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
            
            const choice = (await this.terminal.input()).toLowerCase();
            
            if (choice === 'r') {
                await this.readMessage(board, messages);
                return 'messages';
            } else if (choice === 'n') {
                await this.postMessage(board);
                return 'messages';
            } else if (choice === 'b') {
                return 'messages';
            }
        } catch (error) {
            console.error('Error loading messages:', error);
            this.terminal.println(ANSIParser.fg('bright-red') + '  Error loading messages.' + ANSIParser.reset());
            await this.terminal.sleep(2000);
            return 'messages';
        }
    }

    async readMessage(board, messages) {
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + '  Message number: ' + ANSIParser.reset());
        const num = parseInt(await this.terminal.input()) - 1;
        
        if (num >= 0 && num < messages.length) {
            const msg = messages[num];
            this.terminal.clear();
            this.terminal.println(ANSIParser.fg('bright-cyan') + '╔══════════════════════════════════════════════════════════════════════════════╗' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-cyan') + '║' + ANSIParser.reset() + 
                ANSIParser.fg('bright-white') + `  Subject: ${msg.subject}` + ANSIParser.reset() + 
                ' '.repeat(68 - msg.subject.length) + ANSIParser.fg('bright-cyan') + '║' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-cyan') + '║' + ANSIParser.reset() + 
                ANSIParser.fg('bright-white') + `  From: ${msg.author_handle}` + ANSIParser.reset() + 
                ' '.repeat(70 - msg.author_handle.length) + ANSIParser.fg('bright-cyan') + '║' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-cyan') + '║' + ANSIParser.reset() + 
                ANSIParser.fg('bright-white') + `  Date: ${new Date(msg.created_at).toLocaleString()}` + ANSIParser.reset() + 
                ' '.repeat(60) + ANSIParser.fg('bright-cyan') + '║' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-cyan') + '╚══════════════════════════════════════════════════════════════════════════════╝' + ANSIParser.reset());
            this.terminal.println('');
            this.terminal.println(msg.body);
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  Press any key to continue...' + ANSIParser.reset());
            await this.terminal.input();
        }
    }

    async postMessage(board) {
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + '  Subject: ' + ANSIParser.reset());
        const subject = await this.terminal.input();
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  Message:' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  • Type "END" on a new line when done' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  • Type "CANCEL" to go back without posting' + ANSIParser.reset());
        this.terminal.println('');
        
        let body = '';
        let line;
        while (true) {
            line = await this.terminal.input();
            if (line.toUpperCase() === 'END') {
                break;
            } else if (line.toUpperCase() === 'CANCEL') {
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  Message posting cancelled.' + ANSIParser.reset());
                await this.terminal.sleep(1500);
                return;
            }
            body += line + '\n';
        }
        
        try {
            const response = await fetch('/api/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    board: board.id,
                    subject,
                    body: body.trim()
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.terminal.println(ANSIParser.fg('bright-green') + '  Message posted successfully!' + ANSIParser.reset());
            } else {
                this.terminal.println(ANSIParser.fg('bright-red') + '  Failed to post message.' + ANSIParser.reset());
            }
        } catch (error) {
            console.error('Error posting message:', error);
            this.terminal.println(ANSIParser.fg('bright-red') + '  Error posting message.' + ANSIParser.reset());
        }
        
        await this.terminal.sleep(2000);
    }

    getHeader() {
        return `
╔══════════════════════════════════════════════════════════════════════════════╗
║                         MESSAGE BOARDS                                       ║
╚══════════════════════════════════════════════════════════════════════════════╝
`;
    }

    getBoardHeader(name) {
        return `
╔══════════════════════════════════════════════════════════════════════════════╗
║  ${name.padEnd(76)}  ║
╚══════════════════════════════════════════════════════════════════════════════╝
`;
    }
}

// Export for use in other modules
window.MessageBoard = MessageBoard;










