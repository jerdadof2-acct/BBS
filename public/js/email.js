// Email System
class EmailSystem {
    constructor(terminal, authManager) {
        this.terminal = terminal;
        this.authManager = authManager;
    }

    async showEmailMenu() {
        while (true) {
            this.terminal.clear();
            this.terminal.println(ANSIParser.fg('bright-cyan') + this.getTitle() + ANSIParser.reset());
            this.terminal.println('');
            
            // Get unread count
            const unreadCount = await this.getUnreadCount();
            
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [I]' + ANSIParser.reset() + ' Inbox' + 
                (unreadCount > 0 ? ANSIParser.fg('bright-red') + ` (${unreadCount} new)` : '') + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [S]' + ANSIParser.reset() + ' Sent');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [W]' + ANSIParser.reset() + ' Write New Email');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [B]' + ANSIParser.reset() + ' Back to Main Menu');
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
            
            const choice = (await this.terminal.input()).toLowerCase();
            
            if (choice === 'i') {
                await this.showInbox();
            } else if (choice === 's') {
                await this.showSent();
            } else if (choice === 'w') {
                await this.writeEmail();
            } else if (choice === 'b') {
                return 'menu';
            }
        }
    }

    async showInbox() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  INBOX' + ANSIParser.reset());
        this.terminal.println('');
        
        try {
            const response = await fetch('/api/emails/inbox');
            const emails = await response.json();
            
            if (emails.length === 0) {
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  No emails in inbox.' + ANSIParser.reset());
                this.terminal.println('');
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  Press any key to continue...' + ANSIParser.reset());
                await this.terminal.input();
                return;
            }
            
            this.terminal.println(ANSIParser.fg('bright-white') + '  #  From              Subject                          Date' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-cyan') + '  ' + '─'.repeat(80) + ANSIParser.reset());
            
            emails.forEach((email, index) => {
                const num = String(index + 1).padEnd(3);
                const from = email.sender_handle.padEnd(17);
                const subject = email.subject.padEnd(33);
                const date = new Date(email.created_at).toLocaleDateString();
                const status = email.is_read ? '' : ANSIParser.fg('bright-red') + '●' + ANSIParser.reset() + ' ';
                
                this.terminal.println(`  ${num}${status}${from}${subject}${date}`);
            });
            
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [1-' + emails.length + ']' + ANSIParser.reset() + ' Read email');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [B]' + ANSIParser.reset() + ' Back');
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
            
            const choice = (await this.terminal.input()).toLowerCase();
            
            if (choice === 'b') {
                return;
            }
            
            const emailIndex = parseInt(choice) - 1;
            if (emailIndex >= 0 && emailIndex < emails.length) {
                await this.readEmail(emails[emailIndex].id);
            }
        } catch (error) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Error loading inbox!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
        }
    }

    async showSent() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  SENT MAIL' + ANSIParser.reset());
        this.terminal.println('');
        
        try {
            const response = await fetch('/api/emails/sent');
            const emails = await response.json();
            
            if (emails.length === 0) {
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  No sent emails.' + ANSIParser.reset());
                this.terminal.println('');
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  Press any key to continue...' + ANSIParser.reset());
                await this.terminal.input();
                return;
            }
            
            this.terminal.println(ANSIParser.fg('bright-white') + '  #  To                Subject                          Date' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-cyan') + '  ' + '─'.repeat(80) + ANSIParser.reset());
            
            emails.forEach((email, index) => {
                const num = String(index + 1).padEnd(3);
                const to = email.recipient_handle.padEnd(17);
                const subject = email.subject.padEnd(33);
                const date = new Date(email.created_at).toLocaleDateString();
                
                this.terminal.println(`  ${num}${to}${subject}${date}`);
            });
            
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [1-' + emails.length + ']' + ANSIParser.reset() + ' Read email');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [B]' + ANSIParser.reset() + ' Back');
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
            
            const choice = (await this.terminal.input()).toLowerCase();
            
            if (choice === 'b') {
                return;
            }
            
            const emailIndex = parseInt(choice) - 1;
            if (emailIndex >= 0 && emailIndex < emails.length) {
                await this.readEmail(emails[emailIndex].id);
            }
        } catch (error) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Error loading sent emails!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
        }
    }

    async readEmail(emailId) {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  READ EMAIL' + ANSIParser.reset());
        this.terminal.println('');
        
        try {
            const response = await fetch(`/api/emails/${emailId}`);
            const email = await response.json();
            
            this.terminal.println(ANSIParser.fg('bright-white') + '  From: ' + ANSIParser.reset() + email.sender_handle);
            this.terminal.println(ANSIParser.fg('bright-white') + '  To: ' + ANSIParser.reset() + email.recipient_handle);
            this.terminal.println(ANSIParser.fg('bright-white') + '  Subject: ' + ANSIParser.reset() + email.subject);
            this.terminal.println(ANSIParser.fg('bright-white') + '  Date: ' + ANSIParser.reset() + new Date(email.created_at).toLocaleString());
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-cyan') + '  ' + '─'.repeat(70) + ANSIParser.reset());
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-white') + '  ' + email.body.replace(/\n/g, '\n  ') + ANSIParser.reset());
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-cyan') + '  ' + '─'.repeat(70) + ANSIParser.reset());
            this.terminal.println('');
            
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [D]' + ANSIParser.reset() + ' Delete');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [R]' + ANSIParser.reset() + ' Reply');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [B]' + ANSIParser.reset() + ' Back');
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
            
            const choice = (await this.terminal.input()).toLowerCase();
            
            if (choice === 'd') {
                await fetch(`/api/emails/${emailId}`, { method: 'DELETE' });
                this.terminal.println(ANSIParser.fg('bright-green') + '  Email deleted!' + ANSIParser.reset());
                await this.terminal.sleep(1500);
            } else if (choice === 'r') {
                await this.writeEmail(email.sender_handle, 'Re: ' + email.subject);
            }
        } catch (error) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Error loading email!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
        }
    }

    async writeEmail(recipientHandle = '', subjectPrefix = '') {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  WRITE EMAIL' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  To (handle): ' + ANSIParser.reset());
        const recipient = recipientHandle || (await this.terminal.input());
        
        if (!recipient) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Recipient required!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
            return;
        }
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  Subject: ' + ANSIParser.reset());
        const subject = subjectPrefix + (await this.terminal.input());
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + '  Message:' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  • Type "END" on a new line to finish' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  • Type "CANCEL" to go back without sending' + ANSIParser.reset());
        this.terminal.println('');
        
        let body = '';
        let line;
        while (true) {
            line = await this.terminal.input();
            if (line.toUpperCase() === 'END') {
                break;
            } else if (line.toUpperCase() === 'CANCEL') {
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  Email composition cancelled.' + ANSIParser.reset());
                await this.terminal.sleep(1500);
                return;
            }
            body += line + '\n';
        }
        
        try {
            const response = await fetch('/api/emails', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipient_handle: recipient,
                    subject: subject,
                    body: body.trim()
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.terminal.println('');
                this.terminal.println(ANSIParser.fg('bright-green') + '  Email sent successfully!' + ANSIParser.reset());
            } else {
                this.terminal.println('');
                this.terminal.println(ANSIParser.fg('bright-red') + '  Failed to send email: ' + result.error + ANSIParser.reset());
            }
            
            await this.terminal.sleep(2000);
        } catch (error) {
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-red') + '  Error sending email!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
        }
    }

    async getUnreadCount() {
        try {
            const response = await fetch('/api/emails/unread/count');
            const data = await response.json();
            return data.count;
        } catch (error) {
            return 0;
        }
    }

    getTitle() {
        return `
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║                          EMAIL SYSTEM                                         ║
║                                                                              ║
║                    Private Messaging Between Users                            ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
`;
    }
}

// Export for use in other modules
window.EmailSystem = EmailSystem;


