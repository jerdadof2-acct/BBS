// Sysop Control Panel
class SysopPanel {
    constructor(terminal, socketClient, authManager) {
        this.terminal = terminal;
        this.socketClient = socketClient;
        this.authManager = authManager;
        this.isSysop = false;
        this.setupSocketListeners();
    }

    setupSocketListeners() {
        // Listen for incoming SysOp chat messages
        this.socketClient.socket.on('sysop-chat-message', (data) => {
            this.showChatNotification(data);
        });
    }

    async showChatNotification(messageData) {
        // Play notification sound
        this.playNotificationSound();
        
        // Show popup notification
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-red') + '╔══════════════════════════════════════════════════════════════════════════════╗' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-red') + '║' + ANSIParser.reset() + 
            ANSIParser.fg('bright-yellow') + '  🔔 NEW CHAT MESSAGE FROM USER!' + ANSIParser.reset() + 
            ' '.repeat(42) + ANSIParser.fg('bright-red') + '║' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-red') + '╠══════════════════════════════════════════════════════════════════════════════╣' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '║' + ANSIParser.reset() + 
            ANSIParser.fg('bright-white') + `  From: ${messageData.user_handle || 'Unknown User'}` + ANSIParser.reset() + 
            ' '.repeat(58) + ANSIParser.fg('bright-cyan') + '║' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '║' + ANSIParser.reset() + 
            ANSIParser.fg('bright-white') + `  Time: ${new Date(messageData.timestamp).toLocaleString()}` + ANSIParser.reset() + 
            ' '.repeat(50) + ANSIParser.fg('bright-cyan') + '║' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '╠══════════════════════════════════════════════════════════════════════════════╣' + ANSIParser.reset());
        
        // Show message content (truncated if too long)
        const message = messageData.message || '';
        const maxLength = 65;
        const lines = message.length > maxLength ? 
            [message.substring(0, maxLength) + '...'] : 
            [message];
        
        for (const line of lines) {
            this.terminal.println(ANSIParser.fg('bright-cyan') + '║' + ANSIParser.reset() + 
                ANSIParser.fg('bright-white') + `  ${line}` + ANSIParser.reset() + 
                ' '.repeat(Math.max(0, 70 - line.length)) + ANSIParser.fg('bright-cyan') + '║' + ANSIParser.reset());
        }
        
        this.terminal.println(ANSIParser.fg('bright-red') + '╚══════════════════════════════════════════════════════════════════════════════╝' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + '  [R]' + ANSIParser.reset() + ' Reply to User');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [V]' + ANSIParser.reset() + ' View Chat Management');
        this.terminal.println(ANSIParser.fg('bright-red') + '  [X]' + ANSIParser.reset() + ' Dismiss');
        this.terminal.println('');
        
        const choice = await this.terminal.input('  Your choice: ');
        
        if (choice.toLowerCase() === 'r') {
            // Quick reply to the user
            await this.quickReplyToUser(messageData.user_handle, messageData.user_id);
        } else if (choice.toLowerCase() === 'v') {
            // Go to chat management
            await this.sysopChatManagement();
        }
        // If 'x' or anything else, just dismiss and continue
    }

    async quickReplyToUser(userHandle, userId) {
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + `  Quick Reply to ${userHandle}:` + ANSIParser.reset());
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
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  Reply cancelled.' + ANSIParser.reset());
                await this.terminal.sleep(1500);
                return;
            }
            message += line + '\n';
        }

        if (message.trim()) {
            try {
                const response = await fetch('/api/sysop-chat/respond', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ 
                        userId: userId,
                        message: message.trim() 
                    })
                });

                if (response.ok) {
                    this.terminal.println('');
                    this.terminal.println(ANSIParser.fg('bright-green') + '  ✓ Reply sent!' + ANSIParser.reset());
                } else {
                    this.terminal.println('');
                    this.terminal.println(ANSIParser.fg('bright-red') + '  Failed to send reply!' + ANSIParser.reset());
                }
            } catch (error) {
                this.terminal.println('');
                this.terminal.println(ANSIParser.fg('bright-red') + '  Error sending reply: ' + error.message + ANSIParser.reset());
            }
            await this.terminal.sleep(1500);
        } else {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Empty message not sent.' + ANSIParser.reset());
            await this.terminal.sleep(1500);
        }
    }

    playNotificationSound() {
        // Play a beep sound for notification
        try {
            // Create audio context for beep sound
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
        } catch (error) {
            // Fallback: use console beep if audio context fails
            console.log('\x07'); // ASCII bell character
        }
    }

    async checkSysopStatus() {
        try {
            const response = await fetch('/api/sysop/check');
            const data = await response.json();
            return data.isSysop;
        } catch (error) {
            console.error('Error checking sysop status:', error);
            return false;
        }
    }

    async showPanel() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + this.getTitle() + ANSIParser.reset());
        this.terminal.println('');
        
        // Check if user is sysop
        this.isSysop = await this.checkSysopStatus();
        
        if (!this.isSysop) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  ACCESS DENIED!' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  You do not have sysop privileges.' + ANSIParser.reset());
            await this.terminal.sleep(2000);
            return 'menu';
        }
        
        while (true) {
            this.terminal.clear();
            this.showMenu();
            
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
            
            const choice = (await this.terminal.input()).toLowerCase();
            
            if (choice === 'u') {
                await this.userManagement();
            } else if (choice === 'g') {
                await this.gameManagement();
            } else if (choice === 's') {
                await this.systemStats();
            } else if (choice === 'a') {
                await this.advancedSettings();
            } else if (choice === 'd') {
                await this.doorGameConfig();
            } else if (choice === 'm') {
                await this.menuSystemEditor();
            } else if (choice === 'f') {
                await this.fileAreaManagement();
            } else if (choice === 'b') {
                await this.broadcastMessage();
            } else if (choice === 'c') {
                await this.chatWithUsers();
            } else if (choice === 'h') {
                await this.sysopChatManagement();
            } else if (choice === 'l') {
                await this.viewActivityLogs();
            } else if (choice === 'r') {
                await this.databaseManagement();
            } else if (choice === 'p') {
                await this.editMyProfile();
            } else if (choice === 'x') {
                return 'menu';
            }
        }
    }

    showMenu() {
        this.terminal.println(ANSIParser.fg('bright-cyan') + '╔══════════════════════════════════════════════════════════════════════════════╗' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '║' + ANSIParser.reset() + 
            ANSIParser.fg('bright-white') + '  SYSOp CONTROL PANEL' + ANSIParser.reset() + 
            ' '.repeat(58) + ANSIParser.fg('bright-cyan') + '║' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '╚══════════════════════════════════════════════════════════════════════════════╝' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [U]' + ANSIParser.reset() + ' User Management        ' + ANSIParser.fg('bright-yellow') + '[D]' + ANSIParser.reset() + ' Door Game Config');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [G]' + ANSIParser.reset() + ' Game Management       ' + ANSIParser.fg('bright-yellow') + '[M]' + ANSIParser.reset() + ' Menu System Editor');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [S]' + ANSIParser.reset() + ' System Statistics     ' + ANSIParser.fg('bright-yellow') + '[F]' + ANSIParser.reset() + ' File Area Management');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [A]' + ANSIParser.reset() + ' Advanced Settings     ' + ANSIParser.fg('bright-yellow') + '[L]' + ANSIParser.reset() + ' Logs & Monitoring');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [B]' + ANSIParser.reset() + ' Broadcast Message     ' + ANSIParser.fg('bright-yellow') + '[C]' + ANSIParser.reset() + ' Chat with Users');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [H]' + ANSIParser.reset() + ' SysOp Chat Management ' + ANSIParser.fg('bright-yellow') + '[R]' + ANSIParser.reset() + ' Database Management');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [P]' + ANSIParser.reset() + ' Edit My Profile       ' + ANSIParser.fg('bright-yellow') + '[X]' + ANSIParser.reset() + ' Exit to Main Menu');
    }

    async userManagement() {
        while (true) {
            this.terminal.clear();
            this.terminal.println(ANSIParser.fg('bright-cyan') + '  USER MANAGEMENT' + ANSIParser.reset());
            this.terminal.println('');
            
            try {
                const response = await fetch('/api/sysop/users');
                const users = await response.json();
                
                this.terminal.println(ANSIParser.fg('bright-white') + '  ID | Handle        | Location       | Calls | Access' + ANSIParser.reset());
                this.terminal.println(ANSIParser.fg('bright-cyan') + '  ' + '─'.repeat(70) + ANSIParser.reset());
                
                users.forEach(user => {
                    const accessLevel = user.access_level || 1;
                    const accessStr = accessLevel >= 100 ? ANSIParser.fg('bright-red') + 'SYSOP' : 
                                     accessLevel >= 50 ? ANSIParser.fg('bright-yellow') + 'MOD' : 
                                     ANSIParser.fg('bright-green') + 'USER';
                    this.terminal.println(ANSIParser.fg('bright-white') + 
                        `  ${String(user.id).padEnd(2)} | ${user.handle.padEnd(13)} | ${(user.location || 'N/A').padEnd(14)} | ${String(user.calls).padEnd(5)} | ${accessStr}${ANSIParser.reset()}`);
                });
                
                this.terminal.println('');
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  [E]' + ANSIParser.reset() + ' Edit User');
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  [D]' + ANSIParser.reset() + ' Delete User');
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  [B]' + ANSIParser.reset() + ' Back');
                this.terminal.println('');
                this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
                
                const choice = (await this.terminal.input()).toLowerCase();
                
                if (choice === 'e') {
                    this.terminal.println(ANSIParser.fg('bright-green') + '  Enter user ID to edit: ' + ANSIParser.reset());
                    const userId = parseInt(await this.terminal.input());
                    await this.editUser(userId);
                } else if (choice === 'd') {
                    this.terminal.println(ANSIParser.fg('bright-red') + '  Enter user ID to delete: ' + ANSIParser.reset());
                    const userId = parseInt(await this.terminal.input());
                    await this.deleteUser(userId);
                } else if (choice === 'b') {
                    break;
                }
            } catch (error) {
                this.terminal.println(ANSIParser.fg('bright-red') + '  Error loading users!' + ANSIParser.reset());
                await this.terminal.sleep(2000);
            }
        }
    }

    async editUser(userId) {
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Set access level:' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [1]' + ANSIParser.reset() + ' User (1)');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [2]' + ANSIParser.reset() + ' Moderator (50)');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [3]' + ANSIParser.reset() + ' Sysop (100)');
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
        
        const choice = (await this.terminal.input()).toLowerCase();
        let accessLevel = 1;
        
        if (choice === '2') accessLevel = 50;
        else if (choice === '3') accessLevel = 100;
        
        try {
            await fetch(`/api/sysop/user/${userId}/access`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ access_level: accessLevel })
            });
            
            this.terminal.println(ANSIParser.fg('bright-green') + '  Access level updated!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
        } catch (error) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Error updating access level!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
        }
    }

    async deleteUser(userId) {
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-red') + '  Are you sure? (yes/no): ' + ANSIParser.reset());
        const confirm = (await this.terminal.input()).toLowerCase();
        
        if (confirm === 'yes') {
            try {
                await fetch(`/api/sysop/user/${userId}`, { method: 'DELETE' });
                this.terminal.println(ANSIParser.fg('bright-green') + '  User deleted!' + ANSIParser.reset());
                await this.terminal.sleep(2000);
            } catch (error) {
                this.terminal.println(ANSIParser.fg('bright-red') + '  Error deleting user!' + ANSIParser.reset());
                await this.terminal.sleep(2000);
            }
        }
    }

    async gameManagement() {
        while (true) {
            this.terminal.clear();
            this.terminal.println(ANSIParser.fg('bright-cyan') + '  GAME MANAGEMENT - LORD' + ANSIParser.reset());
            this.terminal.println('');
            
            try {
                const response = await fetch('/api/sysop/game-states');
                const gameStates = await response.json();
                
                const lordGames = gameStates.filter(gs => gs.game_name === 'lord');
                
                if (lordGames.length === 0) {
                    this.terminal.println(ANSIParser.fg('bright-yellow') + '  No LORD games found.' + ANSIParser.reset());
                } else {
                    this.terminal.println(ANSIParser.fg('bright-white') + '  User              | Last Updated' + ANSIParser.reset());
                    this.terminal.println(ANSIParser.fg('bright-cyan') + '  ' + '─'.repeat(70) + ANSIParser.reset());
                    
                    lordGames.forEach(game => {
                        const date = new Date(game.updated_at).toLocaleString();
                        this.terminal.println(ANSIParser.fg('bright-white') + 
                            `  ${game.user_handle.padEnd(18)} | ${date}` + ANSIParser.reset());
                    });
                }
                
                this.terminal.println('');
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  [E]' + ANSIParser.reset() + ' Edit Player Stats');
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  [R]' + ANSIParser.reset() + ' Reset Player Progress');
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  [B]' + ANSIParser.reset() + ' Back');
                this.terminal.println('');
                this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
                
                const choice = (await this.terminal.input()).toLowerCase();
                
                if (choice === 'e') {
                    this.terminal.println(ANSIParser.fg('bright-green') + '  Enter user ID to edit: ' + ANSIParser.reset());
                    const userId = parseInt(await this.terminal.input());
                    await this.editPlayerStats(userId);
                } else if (choice === 'r') {
                    this.terminal.println(ANSIParser.fg('bright-red') + '  Enter user ID to reset: ' + ANSIParser.reset());
                    const userId = parseInt(await this.terminal.input());
                    await this.resetPlayerProgress(userId);
                } else if (choice === 'b') {
                    break;
                }
            } catch (error) {
                this.terminal.println(ANSIParser.fg('bright-red') + '  Error loading game states!' + ANSIParser.reset());
                await this.terminal.sleep(2000);
            }
        }
    }

    async editPlayerStats(userId) {
        try {
            const response = await fetch(`/api/sysop/game-state/${userId}/lord`);
            const gameState = await response.json();
            
            if (!gameState || !gameState.game_data) {
                this.terminal.println(ANSIParser.fg('bright-red') + '  No game data found for this user!' + ANSIParser.reset());
                await this.terminal.sleep(2000);
                return;
            }
            
            const gameData = JSON.parse(gameState.game_data);
            
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-cyan') + '  Current Stats:' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-white') + `  Level: ${gameData.level}, HP: ${gameData.hp}/${gameData.maxHp}` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-white') + `  Strength: ${gameData.strength}, Defense: ${gameData.defense}` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-white') + `  Gold: ${gameData.gold}, Experience: ${gameData.experience}` + ANSIParser.reset());
            this.terminal.println('');
            
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  What would you like to edit?' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [L]' + ANSIParser.reset() + ' Level');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [G]' + ANSIParser.reset() + ' Gold');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [S]' + ANSIParser.reset() + ' Stats (Strength/Defense)');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [H]' + ANSIParser.reset() + ' HP');
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
            
            const choice = (await this.terminal.input()).toLowerCase();
            
            if (choice === 'l') {
                this.terminal.println(ANSIParser.fg('bright-green') + '  Enter new level: ' + ANSIParser.reset());
                const level = parseInt(await this.terminal.input());
                gameData.level = level;
            } else if (choice === 'g') {
                this.terminal.println(ANSIParser.fg('bright-green') + '  Enter new gold amount: ' + ANSIParser.reset());
                const gold = parseInt(await this.terminal.input());
                gameData.gold = gold;
            } else if (choice === 's') {
                this.terminal.println(ANSIParser.fg('bright-green') + '  Enter new strength: ' + ANSIParser.reset());
                const strength = parseInt(await this.terminal.input());
                gameData.strength = strength;
                
                this.terminal.println(ANSIParser.fg('bright-green') + '  Enter new defense: ' + ANSIParser.reset());
                const defense = parseInt(await this.terminal.input());
                gameData.defense = defense;
            } else if (choice === 'h') {
                this.terminal.println(ANSIParser.fg('bright-green') + '  Enter new max HP: ' + ANSIParser.reset());
                const maxHp = parseInt(await this.terminal.input());
                gameData.maxHp = maxHp;
                gameData.hp = maxHp;
            }
            
            await fetch(`/api/sysop/game-state/${userId}/lord`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(gameData)
            });
            
            this.terminal.println(ANSIParser.fg('bright-green') + '  Stats updated!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
        } catch (error) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Error editing stats!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
        }
    }

    async resetPlayerProgress(userId) {
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-red') + '  Are you sure? This will delete all game progress! (yes/no): ' + ANSIParser.reset());
        const confirm = (await this.terminal.input()).toLowerCase();
        
        if (confirm === 'yes') {
            try {
                await fetch(`/api/sysop/game-state/${userId}/lord`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(null)
                });
                this.terminal.println(ANSIParser.fg('bright-green') + '  Player progress reset!' + ANSIParser.reset());
                await this.terminal.sleep(2000);
            } catch (error) {
                this.terminal.println(ANSIParser.fg('bright-red') + '  Error resetting progress!' + ANSIParser.reset());
                await this.terminal.sleep(2000);
            }
        }
    }

    async systemStats() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  SYSTEM STATISTICS' + ANSIParser.reset());
        this.terminal.println('');
        
        try {
            const response = await fetch('/api/sysop/stats');
            const stats = await response.json();
            
            this.terminal.println(ANSIParser.fg('bright-white') + `  Total Users: ${stats.total_users}` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-white') + `  Users Today: ${stats.users_today}` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-white') + `  Total Messages: ${stats.total_messages}` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-white') + `  Total Files: ${stats.total_files}` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-white') + `  Chat Messages: ${stats.total_chat_messages}` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-white') + `  Game Saves: ${stats.total_game_saves}` + ANSIParser.reset());
            
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  Press any key to continue...' + ANSIParser.reset());
            await this.terminal.input();
        } catch (error) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Error loading statistics!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
        }
    }

    async moderation() {
        while (true) {
            this.terminal.clear();
            this.terminal.println(ANSIParser.fg('bright-cyan') + '  MODERATION TOOLS' + ANSIParser.reset());
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [M]' + ANSIParser.reset() + ' Delete Message');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [F]' + ANSIParser.reset() + ' Delete File');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [B]' + ANSIParser.reset() + ' Manage Bulletins');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [X]' + ANSIParser.reset() + ' Back');
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
            
            const choice = (await this.terminal.input()).toLowerCase();
            
            if (choice === 'm') {
                this.terminal.println(ANSIParser.fg('bright-green') + '  Enter message ID to delete: ' + ANSIParser.reset());
                const messageId = parseInt(await this.terminal.input());
                await this.deleteMessage(messageId);
            } else if (choice === 'f') {
                this.terminal.println(ANSIParser.fg('bright-green') + '  Enter file ID to delete: ' + ANSIParser.reset());
                const fileId = parseInt(await this.terminal.input());
                await this.deleteFile(fileId);
            } else if (choice === 'b') {
                await this.manageBulletins();
            } else if (choice === 'x') {
                break;
            }
        }
    }

    async manageBulletins() {
        while (true) {
            this.terminal.clear();
            this.terminal.println(ANSIParser.fg('bright-cyan') + '  BULLETIN MANAGEMENT' + ANSIParser.reset());
            this.terminal.println('');
            
            try {
                const response = await fetch('/api/bulletins');
                const bulletins = await response.json();
                
                if (bulletins.length === 0) {
                    this.terminal.println(ANSIParser.fg('bright-yellow') + '  No active bulletins.' + ANSIParser.reset());
                } else {
                    this.terminal.println(ANSIParser.fg('bright-white') + '  ID | Title                          | Author' + ANSIParser.reset());
                    this.terminal.println(ANSIParser.fg('bright-cyan') + '  ' + '─'.repeat(70) + ANSIParser.reset());
                    
                    bulletins.forEach(bulletin => {
                        const id = String(bulletin.id).padEnd(3);
                        const title = bulletin.title.padEnd(30);
                        const author = bulletin.author_handle;
                        this.terminal.println(`  ${id} | ${title} | ${author}`);
                    });
                }
                
                this.terminal.println('');
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  [N]' + ANSIParser.reset() + ' New Bulletin');
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  [D]' + ANSIParser.reset() + ' Delete Bulletin');
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  [B]' + ANSIParser.reset() + ' Back');
                this.terminal.println('');
                this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
                
                const choice = (await this.terminal.input()).toLowerCase();
                
                if (choice === 'n') {
                    await this.createBulletin();
                } else if (choice === 'd') {
                    this.terminal.println(ANSIParser.fg('bright-green') + '  Enter bulletin ID to delete: ' + ANSIParser.reset());
                    const bulletinId = parseInt(await this.terminal.input());
                    await this.deleteBulletin(bulletinId);
                } else if (choice === 'b') {
                    break;
                }
            } catch (error) {
                this.terminal.println(ANSIParser.fg('bright-red') + '  Error loading bulletins!' + ANSIParser.reset());
                await this.terminal.sleep(2000);
            }
        }
    }

    async createBulletin() {
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + '  Title: ' + ANSIParser.reset());
        const title = await this.terminal.input();
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  Priority (0-10, higher = more important): ' + ANSIParser.reset());
        const priority = parseInt(await this.terminal.input()) || 0;
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + '  Message:' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  • Type "END" on a new line to finish' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  • Type "CANCEL" to go back without saving' + ANSIParser.reset());
        this.terminal.println('');
        
        let message = '';
        let line;
        while (true) {
            line = await this.terminal.input();
            if (line.toUpperCase() === 'END') {
                break;
            } else if (line.toUpperCase() === 'CANCEL') {
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  Bulletin creation cancelled.' + ANSIParser.reset());
                await this.terminal.sleep(1500);
                return;
            }
            message += line + '\n';
        }
        
        try {
            await fetch('/api/bulletins', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: title,
                    message: message.trim(),
                    priority: priority
                })
            });
            
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-green') + '  Bulletin created!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
        } catch (error) {
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-red') + '  Error creating bulletin!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
        }
    }

    async deleteBulletin(bulletinId) {
        try {
            await fetch(`/api/bulletins/${bulletinId}`, { method: 'DELETE' });
            this.terminal.println(ANSIParser.fg('bright-green') + '  Bulletin deleted!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
        } catch (error) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Error deleting bulletin!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
        }
    }

    async deleteMessage(messageId) {
        try {
            await fetch(`/api/sysop/message/${messageId}`, { method: 'DELETE' });
            this.terminal.println(ANSIParser.fg('bright-green') + '  Message deleted!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
        } catch (error) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Error deleting message!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
        }
    }

    async deleteFile(fileId) {
        try {
            await fetch(`/api/sysop/file/${fileId}`, { method: 'DELETE' });
            this.terminal.println(ANSIParser.fg('bright-green') + '  File deleted!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
        } catch (error) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Error deleting file!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
        }
    }

    async broadcastMessage() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  BROADCAST MESSAGE TO ALL USERS' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println('');
        
        const message = await this.terminal.input('  Enter message to broadcast: ');
        
        if (message.trim()) {
            this.socketClient.socket.emit('sysop-broadcast', { message });
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-green') + '  Message broadcasted to all online users!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
        }
    }

    async chatWithUsers() {
        while (true) {
            this.terminal.clear();
            this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-cyan') + '  CHAT WITH ONLINE USERS' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
            this.terminal.println('');
            
            try {
                const response = await fetch('/api/users/online');
                const onlineUsers = await response.json();
                
                if (onlineUsers.length === 0) {
                    this.terminal.println(ANSIParser.fg('bright-yellow') + '  No users online.' + ANSIParser.reset());
                    this.terminal.println('');
                    this.terminal.println('  Press any key to continue...');
                    await this.terminal.input();
                    return;
                }
                
                this.terminal.println(ANSIParser.fg('bright-white') + '  Online Users:' + ANSIParser.reset());
                this.terminal.println('');
                
                onlineUsers.forEach((user, index) => {
                    this.terminal.println(ANSIParser.fg('bright-green') + `  [${index + 1}] ${user.handle}` + ANSIParser.reset());
                });
                
                this.terminal.println('');
                this.terminal.println(ANSIParser.fg('bright-red') + '  [0] Back' + ANSIParser.reset());
                this.terminal.println('');
                
                const choice = await this.terminal.input('  Select user to message: ');
                
                if (choice === '0') return;
                
                const userIndex = parseInt(choice) - 1;
                if (userIndex >= 0 && userIndex < onlineUsers.length) {
                    const targetUser = onlineUsers[userIndex];
                    await this.sendDirectMessage(targetUser);
                }
            } catch (error) {
                this.terminal.println(ANSIParser.fg('bright-red') + '  Error loading online users!' + ANSIParser.reset());
                await this.terminal.sleep(2000);
            }
        }
    }

    async sendDirectMessage(targetUser) {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + `  MESSAGE TO: ${targetUser.handle}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println('');
        
        const message = await this.terminal.input('  Enter message: ');
        
        if (message.trim()) {
            this.socketClient.socket.emit('sysop-direct-message', {
                targetUserId: targetUser.id,
                message: message
            });
            
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-green') + `  Message sent to ${targetUser.handle}!` + ANSIParser.reset());
            await this.terminal.sleep(2000);
        }
    }

    async viewActivityLogs() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  SYSTEM ACTIVITY LOGS' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println('');
        
        try {
            const response = await fetch('/api/sysop/activity-logs');
            const logs = await response.json();
            
            if (logs.length === 0) {
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  No activity logs found.' + ANSIParser.reset());
            } else {
                this.terminal.println(ANSIParser.fg('bright-white') + '  Time                | User           | Action' + ANSIParser.reset());
                this.terminal.println(ANSIParser.fg('bright-cyan') + '  ' + '─'.repeat(70) + ANSIParser.reset());
                
                logs.slice(0, 50).forEach(log => {
                    const time = new Date(log.timestamp).toLocaleString();
                    this.terminal.println(ANSIParser.fg('bright-green') + 
                        `  ${time.padEnd(20)} | ${log.user_handle.padEnd(14)} | ${log.action}` + ANSIParser.reset());
                });
            }
        } catch (error) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Error loading activity logs!' + ANSIParser.reset());
        }
        
        this.terminal.println('');
        this.terminal.println('  Press any key to continue...');
        await this.terminal.input();
    }

    async editMyProfile() {
        while (true) {
            this.terminal.clear();
            this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-cyan') + '  SYSOp PROFILE EDITING' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
            this.terminal.println('');
            
            const user = this.authManager.getCurrentUser();
            this.terminal.println(ANSIParser.fg('bright-white') + '  Current Profile:' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-green') + `  Handle: ${user.handle}` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-green') + `  Real Name: ${user.real_name || 'Not set'}` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-green') + `  Location: ${user.location || 'Not set'}` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-green') + `  Signature: ${user.signature || 'Not set'}` + ANSIParser.reset());
            this.terminal.println('');
            
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [I]' + ANSIParser.reset() + ' Edit Personal Info');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [S]' + ANSIParser.reset() + ' Edit Signature');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [A]' + ANSIParser.reset() + ' Edit Avatar');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [P]' + ANSIParser.reset() + ' Change Password');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [B]' + ANSIParser.reset() + ' Back');
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
            
            const choice = (await this.terminal.input()).toLowerCase();
            
            if (choice === 'i') {
                await this.editPersonalInfo();
            } else if (choice === 's') {
                await this.editSignature();
            } else if (choice === 'a') {
                await this.editAvatar();
            } else if (choice === 'p') {
                await this.changePassword();
            } else if (choice === 'b') {
                break;
            }
        }
    }

    async editPersonalInfo() {
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  EDIT PERSONAL INFORMATION' + ANSIParser.reset());
        this.terminal.println('');
        
        const user = this.authManager.getCurrentUser();
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  Real Name (current: ' + (user.real_name || 'Not set') + '):' + ANSIParser.reset());
        const realName = await this.terminal.input();
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  Location (current: ' + (user.location || 'Not set') + '):' + ANSIParser.reset());
        const location = await this.terminal.input();
        
        try {
            const response = await fetch('/api/user/profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    real_name: realName.trim() || null,
                    location: location.trim() || null
                })
            });
            
            if (response.ok) {
                // Update the current user data
                user.real_name = realName.trim() || null;
                user.location = location.trim() || null;
                
                this.terminal.println(ANSIParser.fg('bright-green') + '  Personal information updated!' + ANSIParser.reset());
            } else {
                const error = await response.json();
                this.terminal.println(ANSIParser.fg('bright-red') + `  Error: ${error.error}` + ANSIParser.reset());
            }
            
            await this.terminal.sleep(2000);
        } catch (error) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Error updating personal information!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
        }
    }

    async editSignature() {
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + '  Enter your signature (max 100 chars):' + ANSIParser.reset());
        this.terminal.println('');
        
        const signature = await this.terminal.input();
        
        if (signature.length > 100) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Signature too long!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
            return;
        }
        
        try {
            await fetch('/api/user/signature', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ signature })
            });
            
            // Update current user data
            this.authManager.getCurrentUser().signature = signature;
            
            this.terminal.println(ANSIParser.fg('bright-green') + '  Signature updated!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
        } catch (error) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Error updating signature!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
        }
    }

    async editAvatar() {
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  EDIT AVATAR' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + '  Enter your ASCII art avatar:' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  • Type "END" on a new line to finish' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  • Type "CANCEL" to go back without saving' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  • Keep it small - 5-10 lines max' + ANSIParser.reset());
        this.terminal.println('');
        
        let avatar = '';
        let line;
        let lineCount = 0;
        
        while (lineCount < 15) {
            line = await this.terminal.input();
            
            if (line.toUpperCase() === 'END') {
                break;
            } else if (line.toUpperCase() === 'CANCEL') {
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  Avatar editing cancelled.' + ANSIParser.reset());
                await this.terminal.sleep(1500);
                return;
            }
            
            avatar += line + '\n';
            lineCount++;
        }
        
        if (avatar.length > 500) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Avatar too large!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
            return;
        }
        
        try {
            await fetch('/api/user/avatar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ avatar: avatar.trim() })
            });
            
            // Update current user data
            this.authManager.getCurrentUser().avatar = avatar.trim();
            
            this.terminal.println(ANSIParser.fg('bright-green') + '  Avatar updated!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
        } catch (error) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Error updating avatar!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
        }
    }

    async changePassword() {
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  CHANGE PASSWORD' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  Current Password:' + ANSIParser.reset());
        const currentPassword = await this.terminal.input();
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  New Password:' + ANSIParser.reset());
        const newPassword = await this.terminal.input();
        
        this.terminal.println(ANSIParser.fg('bright-green') + '  Confirm New Password:' + ANSIParser.reset());
        const confirmPassword = await this.terminal.input();
        
        if (newPassword !== confirmPassword) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Passwords do not match!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
            return;
        }
        
        if (newPassword.length < 4) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Password must be at least 4 characters!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
            return;
        }
        
        try {
            const response = await fetch('/api/user/password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    currentPassword,
                    newPassword
                })
            });
            
            if (response.ok) {
                this.terminal.println(ANSIParser.fg('bright-green') + '  Password changed successfully!' + ANSIParser.reset());
            } else {
                const error = await response.json();
                this.terminal.println(ANSIParser.fg('bright-red') + `  Error: ${error.error}` + ANSIParser.reset());
            }
            
            await this.terminal.sleep(2000);
        } catch (error) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Error changing password!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
        }
    }

    // NEW RENEGADE-STYLE ADMIN FUNCTIONS
    
    async advancedSettings() {
        while (true) {
            this.terminal.clear();
            this.terminal.println(ANSIParser.fg('bright-cyan') + '  ADVANCED SYSTEM SETTINGS' + ANSIParser.reset());
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [1]' + ANSIParser.reset() + ' System Configuration');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [2]' + ANSIParser.reset() + ' User Level Settings');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [3]' + ANSIParser.reset() + ' Security Settings');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [4]' + ANSIParser.reset() + ' Performance Tuning');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [5]' + ANSIParser.reset() + ' Backup & Restore');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [6]' + ANSIParser.reset() + ' Advanced User Management');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [X]' + ANSIParser.reset() + ' Back to Main Menu');
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
            
            const choice = (await this.terminal.input()).toLowerCase();
            
            if (choice === '1') {
                await this.systemConfiguration();
            } else if (choice === '2') {
                await this.userLevelSettings();
            } else if (choice === '3') {
                await this.securitySettings();
            } else if (choice === '4') {
                await this.performanceTuning();
            } else if (choice === '5') {
                await this.backupRestore();
            } else if (choice === '6') {
                await this.advancedUserManagement();
            } else if (choice === 'x') {
                break;
            }
        }
    }

    async doorGameConfig() {
        while (true) {
            this.terminal.clear();
            this.terminal.println(ANSIParser.fg('bright-cyan') + '  DOOR GAME CONFIGURATION' + ANSIParser.reset());
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [1]' + ANSIParser.reset() + ' Configure Game Parameters');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [2]' + ANSIParser.reset() + ' Set User Permissions');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [3]' + ANSIParser.reset() + ' Game Statistics');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [4]' + ANSIParser.reset() + ' Enable/Disable Games');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [5]' + ANSIParser.reset() + ' Add Custom Games');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [X]' + ANSIParser.reset() + ' Back to Main Menu');
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
            
            const choice = (await this.terminal.input()).toLowerCase();
            
            if (choice === '1') {
                await this.configureGameParameters();
            } else if (choice === '2') {
                await this.setUserPermissions();
            } else if (choice === '3') {
                await this.gameStatistics();
            } else if (choice === '4') {
                await this.enableDisableGames();
            } else if (choice === '5') {
                await this.addCustomGames();
            } else if (choice === 'x') {
                break;
            }
        }
    }

    async menuSystemEditor() {
        while (true) {
            this.terminal.clear();
            this.terminal.println(ANSIParser.fg('bright-cyan') + '  MENU SYSTEM EDITOR' + ANSIParser.reset());
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [1]' + ANSIParser.reset() + ' Edit Main Menu');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [2]' + ANSIParser.reset() + ' Create New Menu');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [3]' + ANSIParser.reset() + ' Menu Permissions');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [4]' + ANSIParser.reset() + ' Menu Themes');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [5]' + ANSIParser.reset() + ' Import/Export Menus');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [X]' + ANSIParser.reset() + ' Back to Main Menu');
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
            
            const choice = (await this.terminal.input()).toLowerCase();
            
            if (choice === '1') {
                await this.editMainMenu();
            } else if (choice === '2') {
                await this.createNewMenu();
            } else if (choice === '3') {
                await this.menuPermissions();
            } else if (choice === '4') {
                await this.menuThemes();
            } else if (choice === '5') {
                await this.importExportMenus();
            } else if (choice === 'x') {
                break;
            }
        }
    }

    async fileAreaManagement() {
        while (true) {
            this.terminal.clear();
            this.terminal.println(ANSIParser.fg('bright-cyan') + '  FILE AREA MANAGEMENT' + ANSIParser.reset());
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [1]' + ANSIParser.reset() + ' Create File Areas');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [2]' + ANSIParser.reset() + ' Manage Uploads');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [3]' + ANSIParser.reset() + ' File Permissions');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [4]' + ANSIParser.reset() + ' File Statistics');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [5]' + ANSIParser.reset() + ' Cleanup Files');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [X]' + ANSIParser.reset() + ' Back to Main Menu');
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
            
            const choice = (await this.terminal.input()).toLowerCase();
            
            if (choice === '1') {
                await this.createFileAreas();
            } else if (choice === '2') {
                await this.manageUploads();
            } else if (choice === '3') {
                await this.filePermissions();
            } else if (choice === '4') {
                await this.fileStatistics();
            } else if (choice === '5') {
                await this.cleanupFiles();
            } else if (choice === 'x') {
                break;
            }
        }
    }

    async databaseManagement() {
        while (true) {
            this.terminal.clear();
            this.terminal.println(ANSIParser.fg('bright-cyan') + '  DATABASE MANAGEMENT' + ANSIParser.reset());
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [1]' + ANSIParser.reset() + ' Database Statistics');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [2]' + ANSIParser.reset() + ' Optimize Database');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [3]' + ANSIParser.reset() + ' Backup Database');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [4]' + ANSIParser.reset() + ' Restore Database');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [5]' + ANSIParser.reset() + ' Clean Old Data');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [6]' + ANSIParser.reset() + ' Export Data');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [X]' + ANSIParser.reset() + ' Back to Main Menu');
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
            
            const choice = (await this.terminal.input()).toLowerCase();
            
            if (choice === '1') {
                await this.databaseStatistics();
            } else if (choice === '2') {
                await this.optimizeDatabase();
            } else if (choice === '3') {
                await this.backupDatabase();
            } else if (choice === '4') {
                await this.restoreDatabase();
            } else if (choice === '5') {
                await this.cleanOldData();
            } else if (choice === '6') {
                await this.exportData();
            } else if (choice === 'x') {
                break;
            }
        }
    }

    // Placeholder methods for new admin functions
    async systemConfiguration() {
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  System Configuration - Coming Soon!' + ANSIParser.reset());
        await this.terminal.sleep(2000);
    }

    async userLevelSettings() {
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  User Level Settings - Coming Soon!' + ANSIParser.reset());
        await this.terminal.sleep(2000);
    }

    async securitySettings() {
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Security Settings - Coming Soon!' + ANSIParser.reset());
        await this.terminal.sleep(2000);
    }

    async performanceTuning() {
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Performance Tuning - Coming Soon!' + ANSIParser.reset());
        await this.terminal.sleep(2000);
    }

    async backupRestore() {
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Backup & Restore - Coming Soon!' + ANSIParser.reset());
        await this.terminal.sleep(2000);
    }

    async configureGameParameters() {
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Configure Game Parameters - Coming Soon!' + ANSIParser.reset());
        await this.terminal.sleep(2000);
    }

    async setUserPermissions() {
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Set User Permissions - Coming Soon!' + ANSIParser.reset());
        await this.terminal.sleep(2000);
    }

    async gameStatistics() {
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Game Statistics - Coming Soon!' + ANSIParser.reset());
        await this.terminal.sleep(2000);
    }

    async enableDisableGames() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ENABLE/DISABLE GAMES' + ANSIParser.reset());
        this.terminal.println('');
        
        // Get current games from doors.js
        const games = [
            { id: 'agar-io', name: '🟢 Agar.io Clone 🟢', enabled: true },
            { id: 'word-race', name: '🏃 Word Race 🏃', enabled: true },
            { id: 'trivia-battle', name: '🧠 Trivia Battle 🧠', enabled: true },
            { id: 'high-noon-duel', name: '🤠 High Noon Duel 🤠', enabled: true },
            { id: 'cyber-arena', name: '⚡ Cyber Arena ⚡', enabled: true },
            { id: 'fishing-hole', name: '🎣 Fishing Hole 🎣', enabled: true },
            { id: 'lord', name: 'Legend of the Red Dragon', enabled: true },
            { id: 'rock-star', name: 'Rock Star', enabled: true },
            { id: 'tradewars', name: 'TradeWars 2002', enabled: true },
            { id: 'bre', name: 'Barren Realms Elite', enabled: true },
            { id: 'usurper', name: 'Usurper', enabled: true },
            { id: 'galactic-trader', name: 'Galactic Trader', enabled: true },
            { id: 'the-pit', name: 'The Pit', enabled: true },
            { id: 'blackjack', name: 'Blackjack', enabled: true },
            { id: 'trivia', name: 'Trivia', enabled: true },
            { id: 'hangman', name: 'Hangman', enabled: true },
            { id: 'number-guess', name: 'Number Guess', enabled: true }
        ];
        
        this.terminal.println(ANSIParser.fg('bright-white') + '  Current Game Status:' + ANSIParser.reset());
        this.terminal.println('');
        
        for (let i = 0; i < games.length; i++) {
            const game = games[i];
            const status = game.enabled ? 
                ANSIParser.fg('bright-green') + 'ENABLED' + ANSIParser.reset() : 
                ANSIParser.fg('bright-red') + 'DISABLED' + ANSIParser.reset();
            this.terminal.println(ANSIParser.fg('bright-yellow') + `  ${(i + 1).toString().padStart(2)}` + ANSIParser.reset() + 
                ` ${game.name.padEnd(30)} ${status}`);
        }
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-white') + '  Enter game number to toggle, or X to exit:' + ANSIParser.reset());
        
        const choice = (await this.terminal.input()).toLowerCase();
        
        if (choice === 'x') {
            return;
        }
        
        const gameIndex = parseInt(choice) - 1;
        if (gameIndex >= 0 && gameIndex < games.length) {
            const game = games[gameIndex];
            game.enabled = !game.enabled;
            const newStatus = game.enabled ? 'ENABLED' : 'DISABLED';
            this.terminal.println(ANSIParser.fg('bright-green') + `  ${game.name} is now ${newStatus}` + ANSIParser.reset());
            await this.terminal.sleep(2000);
        } else {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Invalid game number!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
        }
    }

    async addCustomGames() {
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Add Custom Games - Coming Soon!' + ANSIParser.reset());
        await this.terminal.sleep(2000);
    }

    async editMainMenu() {
        while (true) {
            this.terminal.clear();
            this.terminal.println(ANSIParser.fg('bright-cyan') + '╔══════════════════════════════════════════════════════════════════════════════╗' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-cyan') + '║' + ANSIParser.reset() + 
                ANSIParser.fg('bright-white') + '  EDIT MAIN MENU' + ANSIParser.reset() + 
                ' '.repeat(64) + ANSIParser.fg('bright-cyan') + '║' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-cyan') + '╚══════════════════════════════════════════════════════════════════════════════╝' + ANSIParser.reset());
            this.terminal.println('');
            
            // Display current main menu structure
            this.terminal.println(ANSIParser.fg('bright-white') + '  Current Main Menu Structure:' + ANSIParser.reset());
            this.terminal.println('');
            
            const menuItems = [
                { key: 'M', name: 'Message Boards', description: 'Read and post messages', enabled: true },
                { key: 'F', name: 'File Libraries', description: 'Browse and download files', enabled: true },
                { key: 'C', name: 'Chat Room', description: 'Real-time chat with users', enabled: true },
                { key: 'G', name: 'Door Games', description: 'Play classic BBS games', enabled: true },
                { key: 'E', name: 'Email System', description: 'Send and receive email', enabled: true },
                { key: 'P', name: 'User Profile', description: 'View and edit your profile', enabled: true },
                { key: 'B', name: 'Bulletins', description: 'Read system announcements', enabled: true },
                { key: 'S', name: 'Sysop Panel', description: 'System operator functions', enabled: true, level: 10 }
            ];
            
            this.terminal.println(ANSIParser.fg('bright-white') + '  Key | Menu Item          | Description                    | Status' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-cyan') + '  ' + '─'.repeat(75) + ANSIParser.reset());
            
            menuItems.forEach(item => {
                const status = item.enabled ? 
                    ANSIParser.fg('bright-green') + 'ENABLED' + ANSIParser.reset() : 
                    ANSIParser.fg('bright-red') + 'DISABLED' + ANSIParser.reset();
                const levelText = item.level ? ` (Level ${item.level})` : '';
                
                this.terminal.println(ANSIParser.fg('bright-white') + 
                    `  ${item.key.padEnd(3)} | ` +
                    `${item.name.padEnd(18)} | ` +
                    `${item.description.padEnd(30)} | ` +
                    `${status}${levelText}` + ANSIParser.reset());
            });
            
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [E]' + ANSIParser.reset() + ' Enable/Disable Menu Items');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [A]' + ANSIParser.reset() + ' Add New Menu Item');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [R]' + ANSIParser.reset() + ' Remove Menu Item');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [M]' + ANSIParser.reset() + ' Modify Menu Item');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [O]' + ANSIParser.reset() + ' Reorder Menu Items');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [P]' + ANSIParser.reset() + ' Set Menu Permissions');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [X]' + ANSIParser.reset() + ' Back to Menu Editor');
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-white') + '  Enter your choice:' + ANSIParser.reset());
            
            const choice = (await this.terminal.input()).toLowerCase();
            
            if (choice === 'x') break;
            else if (choice === 'e') await this.toggleMenuItems(menuItems);
            else if (choice === 'a') await this.addMenuItem();
            else if (choice === 'r') await this.removeMenuItem();
            else if (choice === 'm') await this.modifyMenuItem();
            else if (choice === 'o') await this.reorderMenuItems();
            else if (choice === 'p') await this.setMenuPermissions();
            else {
                this.terminal.println(ANSIParser.fg('bright-red') + '  Invalid choice!' + ANSIParser.reset());
                await this.terminal.sleep(1000);
            }
        }
    }

    async createNewMenu() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '╔══════════════════════════════════════════════════════════════════════════════╗' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '║' + ANSIParser.reset() + 
            ANSIParser.fg('bright-white') + '  CREATE NEW MENU' + ANSIParser.reset() + 
            ' '.repeat(64) + ANSIParser.fg('bright-cyan') + '║' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '╚══════════════════════════════════════════════════════════════════════════════╝' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-white') + '  Enter menu name:' + ANSIParser.reset());
        const menuName = await this.terminal.input();
        
        this.terminal.println(ANSIParser.fg('bright-white') + '  Enter menu description:' + ANSIParser.reset());
        const menuDescription = await this.terminal.input();
        
        this.terminal.println(ANSIParser.fg('bright-white') + '  Enter access level required (1-10):' + ANSIParser.reset());
        const accessLevel = parseInt(await this.terminal.input());
        
        this.terminal.println(ANSIParser.fg('bright-white') + '  Enter menu key (single character):' + ANSIParser.reset());
        const menuKey = (await this.terminal.input()).toUpperCase();
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + '  New Menu Created:' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + `    Name: ${menuName}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + `    Description: ${menuDescription}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + `    Access Level: ${accessLevel}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + `    Key: ${menuKey}` + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Note: This is a preview. Full implementation requires backend integration.' + ANSIParser.reset());
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-white') + '  Press any key to continue...' + ANSIParser.reset());
        await this.terminal.input();
    }

    async menuPermissions() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '╔══════════════════════════════════════════════════════════════════════════════╗' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '║' + ANSIParser.reset() + 
            ANSIParser.fg('bright-white') + '  MENU PERMISSIONS' + ANSIParser.reset() + 
            ' '.repeat(63) + ANSIParser.fg('bright-cyan') + '║' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '╚══════════════════════════════════════════════════════════════════════════════╝' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-white') + '  Permission Management System:' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + '  [1]' + ANSIParser.reset() + ' Set Menu Access Levels');
        this.terminal.println(ANSIParser.fg('bright-green') + '  [2]' + ANSIParser.reset() + ' User Group Permissions');
        this.terminal.println(ANSIParser.fg('bright-green') + '  [3]' + ANSIParser.reset() + ' Time-based Restrictions');
        this.terminal.println(ANSIParser.fg('bright-green') + '  [4]' + ANSIParser.reset() + ' IP-based Restrictions');
        this.terminal.println(ANSIParser.fg('bright-green') + '  [5]' + ANSIParser.reset() + ' View Permission Matrix');
        this.terminal.println(ANSIParser.fg('bright-green') + '  [X]' + ANSIParser.reset() + ' Back to Menu Editor');
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-white') + '  Enter your choice:' + ANSIParser.reset());
        
        const choice = (await this.terminal.input()).toLowerCase();
        
        if (choice === '1') {
            await this.setMenuAccessLevels();
        } else if (choice === '2') {
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  User Group Permissions - Coming Soon!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
        } else if (choice === '3') {
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  Time-based Restrictions - Coming Soon!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
        } else if (choice === '4') {
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  IP-based Restrictions - Coming Soon!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
        } else if (choice === '5') {
            await this.viewPermissionMatrix();
        }
    }

    async setMenuAccessLevels() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  SET MENU ACCESS LEVELS' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-white') + '  Select menu to modify access level:' + ANSIParser.reset());
        this.terminal.println('');
        
        const menus = [
            { key: 'M', name: 'Message Boards', currentLevel: 1 },
            { key: 'F', name: 'File Libraries', currentLevel: 1 },
            { key: 'C', name: 'Chat Room', currentLevel: 2 },
            { key: 'G', name: 'Door Games', currentLevel: 1 },
            { key: 'E', name: 'Email System', currentLevel: 2 },
            { key: 'P', name: 'User Profile', currentLevel: 1 },
            { key: 'B', name: 'Bulletins', currentLevel: 0 },
            { key: 'S', name: 'Sysop Panel', currentLevel: 10 }
        ];
        
        menus.forEach((menu, index) => {
            const levelColor = menu.currentLevel >= 10 ? 'bright-red' : 
                              menu.currentLevel >= 8 ? 'bright-magenta' :
                              menu.currentLevel >= 5 ? 'bright-cyan' :
                              menu.currentLevel >= 2 ? 'bright-yellow' : 'bright-green';
            
            this.terminal.println(ANSIParser.fg('bright-yellow') + `  ${(index + 1).toString().padStart(2)}` + ANSIParser.reset() + 
                ` ${menu.key} - ${menu.name.padEnd(20)} ` + 
                ANSIParser.fg(levelColor) + `Level ${menu.currentLevel}` + ANSIParser.reset());
        });
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-white') + '  Enter menu number to modify, or X to exit:' + ANSIParser.reset());
        
        const choice = (await this.terminal.input()).toLowerCase();
        
        if (choice === 'x') {
            return;
        }
        
        const menuIndex = parseInt(choice) - 1;
        if (menuIndex >= 0 && menuIndex < menus.length) {
            const menu = menus[menuIndex];
            this.terminal.println(ANSIParser.fg('bright-white') + `  Current access level for ${menu.name}: ${menu.currentLevel}` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-white') + '  Enter new access level (0-10):' + ANSIParser.reset());
            
            const newLevel = parseInt(await this.terminal.input());
            if (newLevel >= 0 && newLevel <= 10) {
                this.terminal.println(ANSIParser.fg('bright-green') + `  ${menu.name} access level changed to ${newLevel}` + ANSIParser.reset());
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  Note: This is a preview. Full implementation requires backend integration.' + ANSIParser.reset());
            } else {
                this.terminal.println(ANSIParser.fg('bright-red') + '  Invalid access level!' + ANSIParser.reset());
            }
            
            await this.terminal.sleep(2000);
        } else {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Invalid menu number!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
        }
    }

    async viewPermissionMatrix() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  PERMISSION MATRIX' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-white') + '  User Level | Message | Files | Chat | Games | Email | Profile | Bulletins | Sysop' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ' + '─'.repeat(85) + ANSIParser.reset());
        
        const levels = [
            { level: 0, name: 'Guest', permissions: [true, true, false, true, false, true, true, false] },
            { level: 1, name: 'New User', permissions: [true, true, false, true, false, true, true, false] },
            { level: 2, name: 'User', permissions: [true, true, true, true, true, true, true, false] },
            { level: 5, name: 'Power User', permissions: [true, true, true, true, true, true, true, false] },
            { level: 8, name: 'Co-Sysop', permissions: [true, true, true, true, true, true, true, false] },
            { level: 10, name: 'Sysop', permissions: [true, true, true, true, true, true, true, true] }
        ];
        
        levels.forEach(level => {
            const permissionChars = level.permissions.map(perm => perm ? '✓' : '✗');
            this.terminal.println(ANSIParser.fg('bright-white') + 
                `  Level ${level.level.toString().padStart(2)} (${level.name.padEnd(9)}) | ` +
                `${permissionChars[0].padEnd(7)} | ` +
                `${permissionChars[1].padEnd(5)} | ` +
                `${permissionChars[2].padEnd(4)} | ` +
                `${permissionChars[3].padEnd(5)} | ` +
                `${permissionChars[4].padEnd(5)} | ` +
                `${permissionChars[5].padEnd(7)} | ` +
                `${permissionChars[6].padEnd(9)} | ` +
                `${permissionChars[7].padEnd(4)}` + ANSIParser.reset());
        });
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-white') + '  Press any key to continue...' + ANSIParser.reset());
        await this.terminal.input();
    }

    async menuThemes() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '╔══════════════════════════════════════════════════════════════════════════════╗' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '║' + ANSIParser.reset() + 
            ANSIParser.fg('bright-white') + '  MENU THEMES' + ANSIParser.reset() + 
            ' '.repeat(68) + ANSIParser.fg('bright-cyan') + '║' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '╚══════════════════════════════════════════════════════════════════════════════╝' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-white') + '  Available Menu Themes:' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + '  [1]' + ANSIParser.reset() + ' Classic BBS (Current)');
        this.terminal.println(ANSIParser.fg('bright-green') + '  [2]' + ANSIParser.reset() + ' Modern Terminal');
        this.terminal.println(ANSIParser.fg('bright-green') + '  [3]' + ANSIParser.reset() + ' Retro 80s');
        this.terminal.println(ANSIParser.fg('bright-green') + '  [4]' + ANSIParser.reset() + ' Minimalist');
        this.terminal.println(ANSIParser.fg('bright-green') + '  [5]' + ANSIParser.reset() + ' Custom Theme');
        this.terminal.println(ANSIParser.fg('bright-green') + '  [6]' + ANSIParser.reset() + ' Preview Themes');
        this.terminal.println(ANSIParser.fg('bright-green') + '  [X]' + ANSIParser.reset() + ' Back to Menu Editor');
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-white') + '  Enter your choice:' + ANSIParser.reset());
        
        const choice = (await this.terminal.input()).toLowerCase();
        
        if (choice === '1') {
            this.terminal.println(ANSIParser.fg('bright-green') + '  Classic BBS theme selected!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
        } else if (choice === '2') {
            this.terminal.println(ANSIParser.fg('bright-green') + '  Modern Terminal theme selected!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
        } else if (choice === '3') {
            this.terminal.println(ANSIParser.fg('bright-green') + '  Retro 80s theme selected!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
        } else if (choice === '4') {
            this.terminal.println(ANSIParser.fg('bright-green') + '  Minimalist theme selected!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
        } else if (choice === '5') {
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  Custom theme editor coming soon!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
        } else if (choice === '6') {
            await this.previewThemes();
        }
    }

    async previewThemes() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  THEME PREVIEW' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-white') + '  Theme previews coming soon!' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  This will show live previews of different menu themes.' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-white') + '  Press any key to continue...' + ANSIParser.reset());
        await this.terminal.input();
    }

    async importExportMenus() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '╔══════════════════════════════════════════════════════════════════════════════╗' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '║' + ANSIParser.reset() + 
            ANSIParser.fg('bright-white') + '  IMPORT/EXPORT MENUS' + ANSIParser.reset() + 
            ' '.repeat(60) + ANSIParser.fg('bright-cyan') + '║' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '╚══════════════════════════════════════════════════════════════════════════════╝' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-white') + '  Menu Management:' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + '  [1]' + ANSIParser.reset() + ' Export Current Menu Configuration');
        this.terminal.println(ANSIParser.fg('bright-green') + '  [2]' + ANSIParser.reset() + ' Import Menu Configuration');
        this.terminal.println(ANSIParser.fg('bright-green') + '  [3]' + ANSIParser.reset() + ' Backup All Menus');
        this.terminal.println(ANSIParser.fg('bright-green') + '  [4]' + ANSIParser.reset() + ' Restore Menu Backup');
        this.terminal.println(ANSIParser.fg('bright-green') + '  [5]' + ANSIParser.reset() + ' Reset to Default Menus');
        this.terminal.println(ANSIParser.fg('bright-green') + '  [X]' + ANSIParser.reset() + ' Back to Menu Editor');
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-white') + '  Enter your choice:' + ANSIParser.reset());
        
        const choice = (await this.terminal.input()).toLowerCase();
        
        if (choice === '1') {
            this.terminal.println(ANSIParser.fg('bright-green') + '  Menu configuration exported successfully!' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  Note: This is a preview. Full implementation requires backend integration.' + ANSIParser.reset());
            await this.terminal.sleep(2000);
        } else if (choice === '2') {
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  Import functionality coming soon!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
        } else if (choice === '3') {
            this.terminal.println(ANSIParser.fg('bright-green') + '  Menu backup created successfully!' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  Note: This is a preview. Full implementation requires backend integration.' + ANSIParser.reset());
            await this.terminal.sleep(2000);
        } else if (choice === '4') {
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  Restore functionality coming soon!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
        } else if (choice === '5') {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Are you sure you want to reset to default menus? (Y/N):' + ANSIParser.reset());
            const confirm = (await this.terminal.input()).toUpperCase();
            if (confirm === 'Y') {
                this.terminal.println(ANSIParser.fg('bright-green') + '  Menus reset to default configuration!' + ANSIParser.reset());
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  Note: This is a preview. Full implementation requires backend integration.' + ANSIParser.reset());
            } else {
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  Reset cancelled.' + ANSIParser.reset());
            }
            await this.terminal.sleep(2000);
        }
    }

    async createFileAreas() {
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Create File Areas - Coming Soon!' + ANSIParser.reset());
        await this.terminal.sleep(2000);
    }

    async manageUploads() {
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Manage Uploads - Coming Soon!' + ANSIParser.reset());
        await this.terminal.sleep(2000);
    }

    async filePermissions() {
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  File Permissions - Coming Soon!' + ANSIParser.reset());
        await this.terminal.sleep(2000);
    }

    async fileStatistics() {
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  File Statistics - Coming Soon!' + ANSIParser.reset());
        await this.terminal.sleep(2000);
    }

    async cleanupFiles() {
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Cleanup Files - Coming Soon!' + ANSIParser.reset());
        await this.terminal.sleep(2000);
    }

    async databaseStatistics() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  DATABASE STATISTICS' + ANSIParser.reset());
        this.terminal.println('');
        
        try {
            const response = await fetch('/api/sysop/database-stats');
            const stats = await response.json();
            
            this.terminal.println(ANSIParser.fg('bright-white') + '  Database Information:' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-green') + `    Total Users: ${stats.totalUsers}` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-green') + `    Total Messages: ${stats.totalMessages}` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-green') + `    Total Files: ${stats.totalFiles}` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-green') + `    Database Size: ${stats.databaseSize}` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-green') + `    Last Backup: ${stats.lastBackup || 'Never'}` + ANSIParser.reset());
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-white') + '  Recent Activity:' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-green') + `    Users Online: ${stats.usersOnline}` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-green') + `    Messages Today: ${stats.messagesToday}` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-green') + `    Files Downloaded: ${stats.filesDownloaded}` + ANSIParser.reset());
            
        } catch (error) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Error fetching database statistics!' + ANSIParser.reset());
        }
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-white') + '  Press any key to continue...' + ANSIParser.reset());
        await this.terminal.input();
    }

    async optimizeDatabase() {
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Optimize Database - Coming Soon!' + ANSIParser.reset());
        await this.terminal.sleep(2000);
    }

    async backupDatabase() {
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Backup Database - Coming Soon!' + ANSIParser.reset());
        await this.terminal.sleep(2000);
    }

    async restoreDatabase() {
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Restore Database - Coming Soon!' + ANSIParser.reset());
        await this.terminal.sleep(2000);
    }

    async cleanOldData() {
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Clean Old Data - Coming Soon!' + ANSIParser.reset());
        await this.terminal.sleep(2000);
    }

    async exportData() {
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Export Data - Coming Soon!' + ANSIParser.reset());
        await this.terminal.sleep(2000);
    }

    async advancedUserManagement() {
        while (true) {
            this.terminal.clear();
            this.terminal.println(ANSIParser.fg('bright-cyan') + '╔══════════════════════════════════════════════════════════════════════════════╗' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-cyan') + '║' + ANSIParser.reset() + 
                ANSIParser.fg('bright-white') + '  ADVANCED USER MANAGEMENT' + ANSIParser.reset() + 
                ' '.repeat(58) + ANSIParser.fg('bright-cyan') + '║' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-cyan') + '╚══════════════════════════════════════════════════════════════════════════════╝' + ANSIParser.reset());
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [L]' + ANSIParser.reset() + ' List All Users        ' + ANSIParser.fg('bright-yellow') + '[S]' + ANSIParser.reset() + ' Search Users');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [E]' + ANSIParser.reset() + ' Edit User Profile     ' + ANSIParser.fg('bright-yellow') + '[A]' + ANSIParser.reset() + ' Adjust Access Level');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [D]' + ANSIParser.reset() + ' Delete User           ' + ANSIParser.fg('bright-yellow') + '[C]' + ANSIParser.reset() + ' User Credits');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [B]' + ANSIParser.reset() + ' Ban/Unban User        ' + ANSIParser.fg('bright-yellow') + '[M]' + ANSIParser.reset() + ' User Messages');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [G]' + ANSIParser.reset() + ' User Game Stats       ' + ANSIParser.fg('bright-yellow') + '[T]' + ANSIParser.reset() + ' User Activity Log');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [X]' + ANSIParser.reset() + ' Exit to Advanced Settings');
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-white') + '  Enter your choice:' + ANSIParser.reset());
            
            const choice = (await this.terminal.input()).toLowerCase();
            
            if (choice === 'x') break;
            else if (choice === 'l') await this.listAllUsers();
            else if (choice === 's') await this.searchUsers();
            else if (choice === 'e') await this.editUserProfile();
            else if (choice === 'a') await this.adjustAccessLevel();
            else if (choice === 'd') await this.deleteUser();
            else if (choice === 'c') await this.manageUserCredits();
            else if (choice === 'b') await this.banUnbanUser();
            else if (choice === 'm') await this.viewUserMessages();
            else if (choice === 'g') await this.viewUserGameStats();
            else if (choice === 't') await this.viewUserActivityLog();
            else {
                this.terminal.println(ANSIParser.fg('bright-red') + '  Invalid choice!' + ANSIParser.reset());
                await this.terminal.sleep(1000);
            }
        }
    }

    async listAllUsers() {
        try {
            const response = await fetch('/api/sysop/users');
            const users = await response.json();
            
            this.terminal.clear();
            this.terminal.println(ANSIParser.fg('bright-cyan') + '  ALL USERS' + ANSIParser.reset());
            this.terminal.println('');
            
            if (users.length === 0) {
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  No users found.' + ANSIParser.reset());
            } else {
                this.terminal.println(ANSIParser.fg('bright-white') + '  ID | Handle           | Real Name        | Level | Calls | Messages | Last Seen' + ANSIParser.reset());
                this.terminal.println(ANSIParser.fg('bright-cyan') + '  ' + '─'.repeat(80) + ANSIParser.reset());
                
                users.forEach(user => {
                    const lastSeen = user.last_seen ? new Date(user.last_seen).toLocaleDateString() : 'Never';
                    const level = user.access_level || 1;
                    const levelColor = level >= 10 ? 'bright-green' : level >= 5 ? 'bright-yellow' : 'bright-white';
                    
                    this.terminal.println(ANSIParser.fg('bright-white') + 
                        `  ${user.id.toString().padStart(2)} | ` +
                        `${user.handle.padEnd(16)} | ` +
                        `${(user.real_name || 'N/A').padEnd(16)} | ` +
                        ANSIParser.fg(levelColor) + `${level.toString().padStart(5)}` + ANSIParser.fg('bright-white') + ` | ` +
                        `${user.calls.toString().padStart(5)} | ` +
                        `${user.messages_posted.toString().padStart(8)} | ` +
                        `${lastSeen}` + ANSIParser.reset());
                });
            }
            
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-white') + '  Press any key to continue...' + ANSIParser.reset());
            await this.terminal.input();
            
        } catch (error) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Error loading users!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
        }
    }

    async searchUsers() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  SEARCH USERS' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-white') + '  Enter search term (handle, real name, or location):' + ANSIParser.reset());
        
        const searchTerm = await this.terminal.input();
        
        if (!searchTerm.trim()) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Search term cannot be empty!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
            return;
        }
        
        try {
            const response = await fetch(`/api/sysop/users/search?q=${encodeURIComponent(searchTerm)}`);
            const users = await response.json();
            
            this.terminal.clear();
            this.terminal.println(ANSIParser.fg('bright-cyan') + `  SEARCH RESULTS FOR: "${searchTerm}"` + ANSIParser.reset());
            this.terminal.println('');
            
            if (users.length === 0) {
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  No users found matching your search.' + ANSIParser.reset());
            } else {
                this.terminal.println(ANSIParser.fg('bright-white') + '  ID | Handle           | Real Name        | Level | Location' + ANSIParser.reset());
                this.terminal.println(ANSIParser.fg('bright-cyan') + '  ' + '─'.repeat(70) + ANSIParser.reset());
                
                users.forEach(user => {
                    const level = user.access_level || 1;
                    const levelColor = level >= 10 ? 'bright-green' : level >= 5 ? 'bright-yellow' : 'bright-white';
                    
                    this.terminal.println(ANSIParser.fg('bright-white') + 
                        `  ${user.id.toString().padStart(2)} | ` +
                        `${user.handle.padEnd(16)} | ` +
                        `${(user.real_name || 'N/A').padEnd(16)} | ` +
                        ANSIParser.fg(levelColor) + `${level.toString().padStart(5)}` + ANSIParser.fg('bright-white') + ` | ` +
                        `${user.location || 'N/A'}` + ANSIParser.reset());
                });
            }
            
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-white') + '  Press any key to continue...' + ANSIParser.reset());
            await this.terminal.input();
            
        } catch (error) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Error searching users!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
        }
    }

    async editUserProfile() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  EDIT USER PROFILE' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-white') + '  Enter user ID to edit:' + ANSIParser.reset());
        
        const userId = parseInt(await this.terminal.input());
        
        if (isNaN(userId)) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Invalid user ID!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
            return;
        }
        
        try {
            const response = await fetch(`/api/sysop/users/${userId}`);
            const user = await response.json();
            
            if (!user) {
                this.terminal.println(ANSIParser.fg('bright-red') + '  User not found!' + ANSIParser.reset());
                await this.terminal.sleep(2000);
                return;
            }
            
            this.terminal.clear();
            this.terminal.println(ANSIParser.fg('bright-cyan') + `  EDITING USER: ${user.handle}` + ANSIParser.reset());
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-white') + '  Current Information:' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-green') + `    Handle: ${user.handle}` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-green') + `    Real Name: ${user.real_name || 'N/A'}` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-green') + `    Location: ${user.location || 'N/A'}` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-green') + `    Access Level: ${user.access_level || 1}` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-green') + `    Credits: ${user.credits || 0}` + ANSIParser.reset());
            this.terminal.println('');
            
            this.terminal.println(ANSIParser.fg('bright-white') + '  [1]' + ANSIParser.reset() + ' Change Real Name');
            this.terminal.println(ANSIParser.fg('bright-white') + '  [2]' + ANSIParser.reset() + ' Change Location');
            this.terminal.println(ANSIParser.fg('bright-white') + '  [3]' + ANSIParser.reset() + ' Change Access Level');
            this.terminal.println(ANSIParser.fg('bright-white') + '  [4]' + ANSIParser.reset() + ' Change Credits');
            this.terminal.println(ANSIParser.fg('bright-white') + '  [5]' + ANSIParser.reset() + ' Change Signature');
            this.terminal.println(ANSIParser.fg('bright-white') + '  [X]' + ANSIParser.reset() + ' Back');
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
            
            const choice = (await this.terminal.input()).toLowerCase();
            
            if (choice === '1') {
                this.terminal.println(ANSIParser.fg('bright-white') + '  Enter new real name:' + ANSIParser.reset());
                const newName = await this.terminal.input();
                await this.updateUserField(userId, 'real_name', newName);
            } else if (choice === '2') {
                this.terminal.println(ANSIParser.fg('bright-white') + '  Enter new location:' + ANSIParser.reset());
                const newLocation = await this.terminal.input();
                await this.updateUserField(userId, 'location', newLocation);
            } else if (choice === '3') {
                this.terminal.println(ANSIParser.fg('bright-white') + '  Enter new access level (1-10):' + ANSIParser.reset());
                const newLevel = parseInt(await this.terminal.input());
                if (newLevel >= 1 && newLevel <= 10) {
                    await this.updateUserField(userId, 'access_level', newLevel);
                } else {
                    this.terminal.println(ANSIParser.fg('bright-red') + '  Invalid access level!' + ANSIParser.reset());
                    await this.terminal.sleep(2000);
                }
            } else if (choice === '4') {
                this.terminal.println(ANSIParser.fg('bright-white') + '  Enter new credit amount:' + ANSIParser.reset());
                const newCredits = parseInt(await this.terminal.input());
                if (!isNaN(newCredits)) {
                    await this.updateUserField(userId, 'credits', newCredits);
                } else {
                    this.terminal.println(ANSIParser.fg('bright-red') + '  Invalid credit amount!' + ANSIParser.reset());
                    await this.terminal.sleep(2000);
                }
            } else if (choice === '5') {
                this.terminal.println(ANSIParser.fg('bright-white') + '  Enter new signature:' + ANSIParser.reset());
                const newSignature = await this.terminal.input();
                await this.updateUserField(userId, 'signature', newSignature);
            }
            
        } catch (error) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Error loading user data!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
        }
    }

    async updateUserField(userId, field, value) {
        try {
            const response = await fetch(`/api/sysop/users/${userId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ [field]: value })
            });
            
            if (response.ok) {
                this.terminal.println(ANSIParser.fg('bright-green') + `  ${field} updated successfully!` + ANSIParser.reset());
            } else {
                this.terminal.println(ANSIParser.fg('bright-red') + '  Failed to update user!' + ANSIParser.reset());
            }
            
            await this.terminal.sleep(2000);
        } catch (error) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Error updating user!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
        }
    }

    async adjustAccessLevel() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ADJUST ACCESS LEVEL' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-white') + '  Enter user ID:' + ANSIParser.reset());
        
        const userId = parseInt(await this.terminal.input());
        
        if (isNaN(userId)) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Invalid user ID!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
            return;
        }
        
        try {
            const response = await fetch(`/api/sysop/users/${userId}`);
            const user = await response.json();
            
            if (!user) {
                this.terminal.println(ANSIParser.fg('bright-red') + '  User not found!' + ANSIParser.reset());
                await this.terminal.sleep(2000);
                return;
            }
            
            this.terminal.println(ANSIParser.fg('bright-white') + `  Current access level for ${user.handle}: ${user.access_level || 1}` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-white') + '  Enter new access level (1-10):' + ANSIParser.reset());
            
            const newLevel = parseInt(await this.terminal.input());
            
            if (newLevel >= 1 && newLevel <= 10) {
                await this.updateUserField(userId, 'access_level', newLevel);
            } else {
                this.terminal.println(ANSIParser.fg('bright-red') + '  Invalid access level! Must be 1-10.' + ANSIParser.reset());
                await this.terminal.sleep(2000);
            }
            
        } catch (error) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Error loading user data!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
        }
    }

    async deleteUser() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-red') + '  DELETE USER' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-white') + '  Enter user ID to delete:' + ANSIParser.reset());
        
        const userId = parseInt(await this.terminal.input());
        
        if (isNaN(userId)) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Invalid user ID!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
            return;
        }
        
        try {
            const response = await fetch(`/api/sysop/users/${userId}`);
            const user = await response.json();
            
            if (!user) {
                this.terminal.println(ANSIParser.fg('bright-red') + '  User not found!' + ANSIParser.reset());
                await this.terminal.sleep(2000);
                return;
            }
            
            this.terminal.println(ANSIParser.fg('bright-red') + `  WARNING: This will permanently delete user: ${user.handle}` + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-red') + '  This action cannot be undone!' + ANSIParser.reset());
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-white') + '  Type "DELETE" to confirm:' + ANSIParser.reset());
            
            const confirmation = await this.terminal.input();
            
            if (confirmation === 'DELETE') {
                const deleteResponse = await fetch(`/api/sysop/users/${userId}`, { method: 'DELETE' });
                
                if (deleteResponse.ok) {
                    this.terminal.println(ANSIParser.fg('bright-green') + '  User deleted successfully!' + ANSIParser.reset());
                } else {
                    this.terminal.println(ANSIParser.fg('bright-red') + '  Failed to delete user!' + ANSIParser.reset());
                }
            } else {
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  Deletion cancelled.' + ANSIParser.reset());
            }
            
            await this.terminal.sleep(2000);
            
        } catch (error) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Error deleting user!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
        }
    }

    async manageUserCredits() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  MANAGE USER CREDITS' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-white') + '  Enter user ID:' + ANSIParser.reset());
        
        const userId = parseInt(await this.terminal.input());
        
        if (isNaN(userId)) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Invalid user ID!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
            return;
        }
        
        try {
            const response = await fetch(`/api/sysop/users/${userId}`);
            const user = await response.json();
            
            if (!user) {
                this.terminal.println(ANSIParser.fg('bright-red') + '  User not found!' + ANSIParser.reset());
                await this.terminal.sleep(2000);
                return;
            }
            
            this.terminal.clear();
            this.terminal.println(ANSIParser.fg('bright-cyan') + `  MANAGE CREDITS FOR: ${user.handle}` + ANSIParser.reset());
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-white') + `  Current Credits: ${user.credits || 0}` + ANSIParser.reset());
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-white') + '  [A]' + ANSIParser.reset() + ' Add Credits');
            this.terminal.println(ANSIParser.fg('bright-white') + '  [S]' + ANSIParser.reset() + ' Set Credits');
            this.terminal.println(ANSIParser.fg('bright-white') + '  [R]' + ANSIParser.reset() + ' Remove Credits');
            this.terminal.println(ANSIParser.fg('bright-white') + '  [X]' + ANSIParser.reset() + ' Back');
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
            
            const choice = (await this.terminal.input()).toLowerCase();
            
            if (choice === 'a') {
                this.terminal.println(ANSIParser.fg('bright-white') + '  Enter amount to add:' + ANSIParser.reset());
                const amount = parseInt(await this.terminal.input());
                if (!isNaN(amount) && amount > 0) {
                    await this.updateUserField(userId, 'credits', (user.credits || 0) + amount);
                } else {
                    this.terminal.println(ANSIParser.fg('bright-red') + '  Invalid amount!' + ANSIParser.reset());
                    await this.terminal.sleep(2000);
                }
            } else if (choice === 's') {
                this.terminal.println(ANSIParser.fg('bright-white') + '  Enter new credit amount:' + ANSIParser.reset());
                const amount = parseInt(await this.terminal.input());
                if (!isNaN(amount) && amount >= 0) {
                    await this.updateUserField(userId, 'credits', amount);
                } else {
                    this.terminal.println(ANSIParser.fg('bright-red') + '  Invalid amount!' + ANSIParser.reset());
                    await this.terminal.sleep(2000);
                }
            } else if (choice === 'r') {
                this.terminal.println(ANSIParser.fg('bright-white') + '  Enter amount to remove:' + ANSIParser.reset());
                const amount = parseInt(await this.terminal.input());
                if (!isNaN(amount) && amount > 0) {
                    const newAmount = Math.max(0, (user.credits || 0) - amount);
                    await this.updateUserField(userId, 'credits', newAmount);
                } else {
                    this.terminal.println(ANSIParser.fg('bright-red') + '  Invalid amount!' + ANSIParser.reset());
                    await this.terminal.sleep(2000);
                }
            }
            
        } catch (error) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Error loading user data!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
        }
    }

    async banUnbanUser() {
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Coming Soon!' + ANSIParser.reset());
        await this.terminal.sleep(2000);
    }

    async viewUserMessages() {
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Coming Soon!' + ANSIParser.reset());
        await this.terminal.sleep(2000);
    }

    async viewUserGameStats() {
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Coming Soon!' + ANSIParser.reset());
        await this.terminal.sleep(2000);
    }

    async viewUserActivityLog() {
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Coming Soon!' + ANSIParser.reset());
        await this.terminal.sleep(2000);
    }

    // Menu System Editor Functions
    async toggleMenuItems(menuItems) {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ENABLE/DISABLE MENU ITEMS' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-white') + '  Select menu item to toggle:' + ANSIParser.reset());
        this.terminal.println('');
        
        menuItems.forEach((item, index) => {
            const status = item.enabled ? 
                ANSIParser.fg('bright-green') + 'ENABLED' + ANSIParser.reset() : 
                ANSIParser.fg('bright-red') + 'DISABLED' + ANSIParser.reset();
            
            this.terminal.println(ANSIParser.fg('bright-yellow') + `  ${(index + 1).toString().padStart(2)}` + ANSIParser.reset() + 
                ` ${item.key} - ${item.name.padEnd(20)} ${status}`);
        });
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-white') + '  Enter item number to toggle, or X to exit:' + ANSIParser.reset());
        
        const choice = (await this.terminal.input()).toLowerCase();
        
        if (choice === 'x') {
            return;
        }
        
        const itemIndex = parseInt(choice) - 1;
        if (itemIndex >= 0 && itemIndex < menuItems.length) {
            const item = menuItems[itemIndex];
            item.enabled = !item.enabled;
            const newStatus = item.enabled ? 'ENABLED' : 'DISABLED';
            this.terminal.println(ANSIParser.fg('bright-green') + `  ${item.name} is now ${newStatus}` + ANSIParser.reset());
            await this.terminal.sleep(2000);
        } else {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Invalid item number!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
        }
    }

    async addMenuItem() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ADD NEW MENU ITEM' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-white') + '  Enter menu key (single character):' + ANSIParser.reset());
        const key = (await this.terminal.input()).toUpperCase();
        
        if (key.length !== 1) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Menu key must be a single character!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
            return;
        }
        
        this.terminal.println(ANSIParser.fg('bright-white') + '  Enter menu item name:' + ANSIParser.reset());
        const name = await this.terminal.input();
        
        this.terminal.println(ANSIParser.fg('bright-white') + '  Enter description:' + ANSIParser.reset());
        const description = await this.terminal.input();
        
        this.terminal.println(ANSIParser.fg('bright-white') + '  Enter access level required (1-10, or 0 for all):' + ANSIParser.reset());
        const level = parseInt(await this.terminal.input());
        
        this.terminal.println(ANSIParser.fg('bright-white') + '  Enter function to call (e.g., "showMessages"):' + ANSIParser.reset());
        const functionName = await this.terminal.input();
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + '  New Menu Item Created:' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + `    Key: ${key}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + `    Name: ${name}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + `    Description: ${description}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + `    Access Level: ${level}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + `    Function: ${functionName}` + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Note: This is a preview. Full implementation requires backend integration.' + ANSIParser.reset());
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-white') + '  Press any key to continue...' + ANSIParser.reset());
        await this.terminal.input();
    }

    async removeMenuItem() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-red') + '  REMOVE MENU ITEM' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-white') + '  Enter menu key to remove:' + ANSIParser.reset());
        
        const key = (await this.terminal.input()).toUpperCase();
        
        if (key === 'S') {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Cannot remove Sysop Panel!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
            return;
        }
        
        this.terminal.println(ANSIParser.fg('bright-red') + `  Are you sure you want to remove menu item '${key}'? (Y/N):` + ANSIParser.reset());
        const confirm = (await this.terminal.input()).toUpperCase();
        
        if (confirm === 'Y') {
            this.terminal.println(ANSIParser.fg('bright-green') + `  Menu item '${key}' removed successfully!` + ANSIParser.reset());
        } else {
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  Removal cancelled.' + ANSIParser.reset());
        }
        
        await this.terminal.sleep(2000);
    }

    async modifyMenuItem() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  MODIFY MENU ITEM' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-white') + '  Enter menu key to modify:' + ANSIParser.reset());
        
        const key = (await this.terminal.input()).toUpperCase();
        
        this.terminal.println(ANSIParser.fg('bright-white') + '  Enter new name (or press Enter to keep current):' + ANSIParser.reset());
        const newName = await this.terminal.input();
        
        this.terminal.println(ANSIParser.fg('bright-white') + '  Enter new description (or press Enter to keep current):' + ANSIParser.reset());
        const newDescription = await this.terminal.input();
        
        this.terminal.println(ANSIParser.fg('bright-white') + '  Enter new access level (1-10, or press Enter to keep current):' + ANSIParser.reset());
        const newLevel = await this.terminal.input();
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + `  Menu item '${key}' modified successfully!` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Note: This is a preview. Full implementation requires backend integration.' + ANSIParser.reset());
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-white') + '  Press any key to continue...' + ANSIParser.reset());
        await this.terminal.input();
    }

    async reorderMenuItems() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  REORDER MENU ITEMS' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-white') + '  Current menu order:' + ANSIParser.reset());
        this.terminal.println('');
        
        const menuOrder = ['M', 'F', 'C', 'G', 'E', 'P', 'B', 'S'];
        const menuNames = {
            'M': 'Message Boards',
            'F': 'File Libraries', 
            'C': 'Chat Room',
            'G': 'Door Games',
            'E': 'Email System',
            'P': 'User Profile',
            'B': 'Bulletins',
            'S': 'Sysop Panel'
        };
        
        menuOrder.forEach((key, index) => {
            this.terminal.println(ANSIParser.fg('bright-white') + 
                `  ${(index + 1).toString().padStart(2)}. ${key} - ${menuNames[key]}` + ANSIParser.reset());
        });
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Menu reordering interface coming soon!' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-white') + '  This will allow you to drag and drop menu items to reorder them.' + ANSIParser.reset());
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-white') + '  Press any key to continue...' + ANSIParser.reset());
        await this.terminal.input();
    }

    async setMenuPermissions() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  SET MENU PERMISSIONS' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-white') + '  Menu Access Levels:' + ANSIParser.reset());
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + '  0-1  : Guest/New User' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  2-4  : Regular User' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  5-7  : Power User' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-magenta') + '  8-9  : Co-Sysop' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-red') + '  10   : Sysop' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-white') + '  Current Menu Permissions:' + ANSIParser.reset());
        this.terminal.println('');
        
        const menuPermissions = [
            { key: 'M', name: 'Message Boards', level: 1 },
            { key: 'F', name: 'File Libraries', level: 1 },
            { key: 'C', name: 'Chat Room', level: 2 },
            { key: 'G', name: 'Door Games', level: 1 },
            { key: 'E', name: 'Email System', level: 2 },
            { key: 'P', name: 'User Profile', level: 1 },
            { key: 'B', name: 'Bulletins', level: 0 },
            { key: 'S', name: 'Sysop Panel', level: 10 }
        ];
        
        menuPermissions.forEach(item => {
            const levelColor = item.level >= 10 ? 'bright-red' : 
                              item.level >= 8 ? 'bright-magenta' :
                              item.level >= 5 ? 'bright-cyan' :
                              item.level >= 2 ? 'bright-yellow' : 'bright-green';
            
            this.terminal.println(ANSIParser.fg('bright-white') + 
                `  ${item.key} - ${item.name.padEnd(20)} ` + 
                ANSIParser.fg(levelColor) + `Level ${item.level}` + ANSIParser.reset());
        });
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Advanced permission management coming soon!' + ANSIParser.reset());
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-white') + '  Press any key to continue...' + ANSIParser.reset());
        await this.terminal.input();
    }

    getTitle() {
        return `
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║                    SYSOp CONTROL PANEL                                        ║
║                                                                              ║
║                  System Operator Access Only                                  ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
`;
    }

    async sysopChatManagement() {
        while (true) {
            this.terminal.clear();
            this.terminal.println(ANSIParser.fg('bright-cyan') + '╔══════════════════════════════════════════════════════════════════════════════╗' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-cyan') + '║' + ANSIParser.reset() + 
                ANSIParser.fg('bright-white') + '  SYSOp CHAT MANAGEMENT' + ANSIParser.reset() + 
                ' '.repeat(58) + ANSIParser.fg('bright-cyan') + '║' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-cyan') + '╚══════════════════════════════════════════════════════════════════════════════╝' + ANSIParser.reset());
            this.terminal.println('');
            
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [V]' + ANSIParser.reset() + ' View All Chat Messages');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [R]' + ANSIParser.reset() + ' Respond to User');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [S]' + ANSIParser.reset() + ' Search Messages');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [C]' + ANSIParser.reset() + ' Clear Old Messages');
            this.terminal.println(ANSIParser.fg('bright-red') + '  [X]' + ANSIParser.reset() + ' Exit to SysOp Panel');
            this.terminal.println('');
            
            const choice = await this.terminal.input('  Your choice: ');
            
            if (choice.toLowerCase() === 'x') break;
            else if (choice.toLowerCase() === 'v') await this.viewAllChatMessages();
            else if (choice.toLowerCase() === 'r') await this.respondToUser();
            else if (choice.toLowerCase() === 's') await this.searchChatMessages();
            else if (choice.toLowerCase() === 'c') await this.clearOldMessages();
            else {
                this.terminal.println(ANSIParser.fg('bright-red') + '  Invalid choice!' + ANSIParser.reset());
                await this.terminal.sleep(1000);
            }
        }
    }

    async viewAllChatMessages() {
        try {
            const response = await fetch('/api/sysop-chat/all');
            if (!response.ok) throw new Error('Failed to fetch messages');
            
            const data = await response.json();
            const messages = data.messages || [];
            
            this.terminal.clear();
            this.terminal.println(ANSIParser.fg('bright-cyan') + '  ALL SYSOp CHAT MESSAGES' + ANSIParser.reset());
            this.terminal.println('');
            
            if (messages.length === 0) {
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  No chat messages found.' + ANSIParser.reset());
            } else {
                this.terminal.println(ANSIParser.fg('bright-white') + '  Chat Messages:' + ANSIParser.reset());
                this.terminal.println(ANSIParser.fg('bright-cyan') + '  ' + '═'.repeat(70) + ANSIParser.reset());
                
                for (const msg of messages) {
                    const timestamp = new Date(msg.timestamp).toLocaleString();
                    const sender = msg.from_sysop ? 'SysOp' : msg.user_handle;
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
        } catch (error) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Error loading messages: ' + error.message + ANSIParser.reset());
            await this.terminal.sleep(2000);
        }
    }

    async respondToUser() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  RESPOND TO USER' + ANSIParser.reset());
        this.terminal.println('');
        
        // Get user ID
        const userId = await this.terminal.input('  Enter User ID to respond to: ');
        if (!userId || isNaN(userId)) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Invalid User ID!' + ANSIParser.reset());
            await this.terminal.sleep(1500);
            return;
        }
        
        // Get response message
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + '  Enter your response:' + ANSIParser.reset());
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
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  Response cancelled.' + ANSIParser.reset());
                await this.terminal.sleep(1500);
                return;
            }
            message += line + '\n';
        }
        
        if (message.trim()) {
            try {
                const response = await fetch('/api/sysop-chat/respond', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        user_id: parseInt(userId),
                        message: message.trim()
                    })
                });
                
                if (response.ok) {
                    this.terminal.println('');
                    this.terminal.println(ANSIParser.fg('bright-green') + '  ✓ Response sent successfully!' + ANSIParser.reset());
                } else {
                    this.terminal.println('');
                    this.terminal.println(ANSIParser.fg('bright-red') + '  Failed to send response!' + ANSIParser.reset());
                }
            } catch (error) {
                this.terminal.println('');
                this.terminal.println(ANSIParser.fg('bright-red') + '  Error sending response: ' + error.message + ANSIParser.reset());
            }
            
            await this.terminal.sleep(2000);
        } else {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Empty message not sent.' + ANSIParser.reset());
            await this.terminal.sleep(1500);
        }
    }

    async searchChatMessages() {
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Search functionality coming soon!' + ANSIParser.reset());
        await this.terminal.sleep(1500);
    }

    async clearOldMessages() {
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Clear old messages functionality coming soon!' + ANSIParser.reset());
        await this.terminal.sleep(1500);
    }
}

// Export for use in other modules
window.SysopPanel = SysopPanel;

