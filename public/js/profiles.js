// User Profiles & Stats
class ProfileSystem {
    constructor(terminal, authManager) {
        this.terminal = terminal;
        this.authManager = authManager;
    }

    async showProfileMenu() {
        while (true) {
            this.terminal.clear();
            this.terminal.println(ANSIParser.fg('bright-cyan') + this.getTitle() + ANSIParser.reset());
            this.terminal.println('');
            
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [M]' + ANSIParser.reset() + ' My Profile');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [L]' + ANSIParser.reset() + ' Leaderboard');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [E]' + ANSIParser.reset() + ' Edit Profile');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [V]' + ANSIParser.reset() + ' View Other Profiles');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [D]' + ANSIParser.reset() + ' Direct Message Users');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [A]' + ANSIParser.reset() + ' Activity Feed');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [B]' + ANSIParser.reset() + ' Back');
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
            
            const choice = (await this.terminal.input()).toLowerCase();
            
            if (choice === 'm') {
                await this.showMyProfile();
            } else if (choice === 'l') {
                await this.showLeaderboard();
            } else if (choice === 'e') {
                await this.editProfile();
            } else if (choice === 'v') {
                await this.viewOtherProfiles();
            } else if (choice === 'd') {
                await this.messageOnlineUsers();
            } else if (choice === 'a') {
                await this.showActivityFeed();
            } else if (choice === 'b') {
                return 'menu';
            }
        }
    }

    async showMyProfile() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  MY PROFILE' + ANSIParser.reset());
        this.terminal.println('');
        
        try {
            const user = this.authManager.getCurrentUser();
            
            // Calculate level based on credits
            const level = Math.floor(user.credits / 100) + 1;
            
            this.terminal.println(ANSIParser.fg('bright-white') + '  Handle: ' + ANSIParser.reset() + user.handle);
            this.terminal.println(ANSIParser.fg('bright-white') + '  Level: ' + ANSIParser.reset() + level);
            this.terminal.println(ANSIParser.fg('bright-white') + '  Credits: ' + ANSIParser.reset() + user.credits);
            this.terminal.println(ANSIParser.fg('bright-white') + '  Location: ' + ANSIParser.reset() + (user.location || 'Unknown'));
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-cyan') + '  Statistics:' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-white') + '  Calls: ' + ANSIParser.reset() + user.calls);
            this.terminal.println(ANSIParser.fg('bright-white') + '  Messages Posted: ' + ANSIParser.reset() + user.messages_posted);
            this.terminal.println(ANSIParser.fg('bright-white') + '  Files Uploaded: ' + ANSIParser.reset() + user.files_uploaded);
            this.terminal.println(ANSIParser.fg('bright-white') + '  Games Played: ' + ANSIParser.reset() + user.games_played);
            this.terminal.println(ANSIParser.fg('bright-white') + '  Time Online: ' + ANSIParser.reset() + this.formatTime(user.time_online));
            this.terminal.println('');
            
            if (user.signature) {
                this.terminal.println(ANSIParser.fg('bright-cyan') + '  Signature:' + ANSIParser.reset());
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  ' + user.signature + ANSIParser.reset());
                this.terminal.println('');
            }
            
            if (user.avatar) {
                this.terminal.println(ANSIParser.fg('bright-cyan') + '  Avatar:' + ANSIParser.reset());
                this.terminal.println(ANSIParser.fg('bright-green') + user.avatar + ANSIParser.reset());
                this.terminal.println('');
            }
            
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  Press any key to continue...' + ANSIParser.reset());
            await this.terminal.input();
        } catch (error) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Error loading profile!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
        }
    }

    async showLeaderboard() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  LEADERBOARD' + ANSIParser.reset());
        this.terminal.println('');
        
        try {
            const response = await fetch('/api/leaderboard');
            const leaderboard = await response.json();
            
            this.terminal.println(ANSIParser.fg('bright-white') + '  Rank  Handle              Credits  Calls  Posts' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-cyan') + '  ' + '─'.repeat(60) + ANSIParser.reset());
            
            leaderboard.forEach((user, index) => {
                const rank = String(index + 1).padEnd(5);
                const handle = user.handle.padEnd(19);
                const credits = String(user.credits).padEnd(8);
                const calls = String(user.calls).padEnd(6);
                const posts = String(user.messages_posted).padEnd(6);
                
                // Highlight current user
                const color = user.id === this.authManager.getCurrentUser().id ? 
                    ANSIParser.fg('bright-green') : ANSIParser.fg('bright-yellow');
                
                this.terminal.println(`  ${rank}${color}${handle}${credits}${calls}${posts}${ANSIParser.reset()}`);
            });
            
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  Press any key to continue...' + ANSIParser.reset());
            await this.terminal.input();
        } catch (error) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Error loading leaderboard!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
        }
    }

    async editProfile() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  EDIT PROFILE' + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [S]' + ANSIParser.reset() + ' Edit Signature');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [A]' + ANSIParser.reset() + ' Edit Avatar (ASCII Art)');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [I]' + ANSIParser.reset() + ' Edit Personal Info');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [P]' + ANSIParser.reset() + ' Change Password');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [B]' + ANSIParser.reset() + ' Back');
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
        
        const choice = (await this.terminal.input()).toLowerCase();
        
        if (choice === 's') {
            await this.editSignature();
        } else if (choice === 'a') {
            await this.editAvatar();
        } else if (choice === 'i') {
            await this.editPersonalInfo();
        } else if (choice === 'p') {
            await this.changePassword();
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
        
        if (lineCount >= 15) {
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  Maximum lines reached. Saving avatar...' + ANSIParser.reset());
        }
        
        if (avatar.length > 500) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Avatar too large! Please keep it under 500 characters.' + ANSIParser.reset());
            await this.terminal.sleep(2000);
            return;
        }
        
        if (avatar.trim().length === 0) {
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  No avatar entered. Keeping current avatar.' + ANSIParser.reset());
            await this.terminal.sleep(1500);
            return;
        }
        
        try {
            await fetch('/api/user/avatar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ avatar: avatar.trim() })
            });
            
            this.terminal.println(ANSIParser.fg('bright-green') + '  Avatar updated successfully!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
        } catch (error) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Error updating avatar!' + ANSIParser.reset());
            await this.terminal.sleep(2000);
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

    formatTime(seconds) {
        if (!seconds || seconds === 0) {
            return '0:00';
        }
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours}:${String(minutes).padStart(2, '0')}`;
    }

    async viewOtherProfiles() {
        while (true) {
            this.terminal.clear();
            this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-cyan') + '  VIEW USER PROFILES' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
            this.terminal.println('');
            
            try {
                const response = await fetch('/api/users');
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                
                const users = await response.json();
                
                if (!users || users.length === 0) {
                    this.terminal.println(ANSIParser.fg('bright-yellow') + '  No users found.' + ANSIParser.reset());
                    this.terminal.println('');
                    this.terminal.println('  Press any key to continue...');
                    await this.terminal.input();
                    return;
                }
                
                this.terminal.println(ANSIParser.fg('bright-white') + '  ID | Handle        | Location       | Level' + ANSIParser.reset());
                this.terminal.println(ANSIParser.fg('bright-cyan') + '  ' + '─'.repeat(70) + ANSIParser.reset());
                
                users.forEach(user => {
                    const level = Math.floor(user.credits / 100) + 1;
                    this.terminal.println(ANSIParser.fg('bright-green') + 
                        `  ${String(user.id).padEnd(2)} | ${user.handle.padEnd(13)} | ${(user.location || 'N/A').padEnd(14)} | ${level}` + ANSIParser.reset());
                });
                
                this.terminal.println('');
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  Enter user ID to view profile, or 0 to go back' + ANSIParser.reset());
                this.terminal.println('');
                
                const choice = await this.terminal.input('  Your choice: ');
                
                if (choice === '0') return;
                
                const userId = parseInt(choice);
                const selectedUser = users.find(u => u.id === userId);
                
                if (selectedUser) {
                    await this.showUserProfile(selectedUser);
                } else {
                    this.terminal.println(ANSIParser.fg('bright-red') + '  User not found!' + ANSIParser.reset());
                    await this.terminal.sleep(2000);
                }
            } catch (error) {
                this.terminal.println(ANSIParser.fg('bright-red') + '  Error loading users!' + ANSIParser.reset());
                this.terminal.println(ANSIParser.fg('bright-yellow') + `  ${error.message}` + ANSIParser.reset());
                this.terminal.println('');
                this.terminal.println('  Press any key to continue...');
                await this.terminal.input();
                return;
            }
        }
    }

    async showUserProfile(user) {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + `  PROFILE: ${user.handle}` + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println('');
        
        const level = Math.floor(user.credits / 100) + 1;
        
        this.terminal.println(ANSIParser.fg('bright-white') + '  Handle: ' + ANSIParser.reset() + user.handle);
        this.terminal.println(ANSIParser.fg('bright-white') + '  Level: ' + ANSIParser.reset() + level);
        this.terminal.println(ANSIParser.fg('bright-white') + '  Credits: ' + ANSIParser.reset() + user.credits);
        this.terminal.println(ANSIParser.fg('bright-white') + '  Location: ' + ANSIParser.reset() + (user.location || 'Unknown'));
        this.terminal.println(ANSIParser.fg('bright-white') + '  Calls: ' + ANSIParser.reset() + user.calls);
        this.terminal.println('');
        
        if (user.signature) {
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  Signature:' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-white') + `  ${user.signature}` + ANSIParser.reset());
            this.terminal.println('');
        }
        
        if (user.avatar) {
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  Avatar:' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-white') + user.avatar + ANSIParser.reset());
            this.terminal.println('');
        }
        
        this.terminal.println('  Press any key to continue...');
        await this.terminal.input();
    }

    async messageOnlineUsers() {
        while (true) {
            this.terminal.clear();
            this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-cyan') + '  DIRECT MESSAGE ONLINE USERS' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
            this.terminal.println('');
            
            try {
                const response = await fetch('/api/users/online');
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                
                const onlineUsers = await response.json();
                
                if (!onlineUsers || onlineUsers.length === 0) {
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
                } else {
                    this.terminal.println(ANSIParser.fg('bright-red') + '  Invalid selection!' + ANSIParser.reset());
                    await this.terminal.sleep(1500);
                }
            } catch (error) {
                this.terminal.println(ANSIParser.fg('bright-red') + '  Error loading online users!' + ANSIParser.reset());
                this.terminal.println(ANSIParser.fg('bright-yellow') + `  ${error.message}` + ANSIParser.reset());
                this.terminal.println('');
                this.terminal.println('  Press any key to continue...');
                await this.terminal.input();
                return;
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
            // Send via Socket.io
            if (window.socketClient && window.socketClient.socket) {
                window.socketClient.socket.emit('user-direct-message', {
                    targetUserId: targetUser.id,
                    message: message
                });
                
                this.terminal.println('');
                this.terminal.println(ANSIParser.fg('bright-green') + `  Message sent to ${targetUser.handle}!` + ANSIParser.reset());
                await this.terminal.sleep(2000);
            } else {
                this.terminal.println(ANSIParser.fg('bright-red') + '  Error: Socket connection not available!' + ANSIParser.reset());
                await this.terminal.sleep(2000);
            }
        }
    }

    async showActivityFeed() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  RECENT ACTIVITY' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-cyan') + '  ════════════════════════════════════════' + ANSIParser.reset());
        this.terminal.println('');
        
        try {
            const response = await fetch('/api/activity-feed');
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const activities = await response.json();
            
            if (!activities || activities.length === 0) {
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  No recent activity.' + ANSIParser.reset());
            } else {
                activities.forEach(activity => {
                    const time = new Date(activity.timestamp).toLocaleString();
                    this.terminal.println(ANSIParser.fg('bright-green') + `  [${time}] ${activity.user_handle}: ${activity.action}` + ANSIParser.reset());
                });
            }
        } catch (error) {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Error loading activity feed!' + ANSIParser.reset());
            this.terminal.println(ANSIParser.fg('bright-yellow') + `  ${error.message}` + ANSIParser.reset());
        }
        
        this.terminal.println('');
        this.terminal.println('  Press any key to continue...');
        await this.terminal.input();
    }

    getTitle() {
        return `
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║                        USER PROFILE & STATS                                   ║
║                                                                              ║
║                         View Your Stats & Leaderboard                         ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
`;
    }
}

// Export for use in other modules
window.ProfileSystem = ProfileSystem;


