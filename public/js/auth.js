// Authentication Module
class AuthManager {
    constructor() {
        this.currentUser = null;
    }

    async login(handle, password) {
        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ handle, password })
            });

            const data = await response.json();

            if (data.success) {
                this.currentUser = data.user;
                
                // Check for unread SysOp messages after successful login
                await this.checkUnreadSysopMessages();
                
                return { success: true, user: data.user };
            } else {
                return { success: false, error: data.error || 'Login failed' };
            }
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, error: 'Network error' };
        }
    }

    async checkUnreadSysopMessages() {
        try {
            const response = await fetch('/api/sysop-chat/unread');
            if (response.ok) {
                const data = await response.json();
                const unreadMessages = data.messages || [];
                
                if (unreadMessages.length > 0) {
                    // Store unread messages for display
                    this.unreadSysopMessages = unreadMessages;
                    return unreadMessages;
                }
            }
        } catch (error) {
            console.error('Error checking unread SysOp messages:', error);
        }
        return [];
    }

    getUnreadSysopMessages() {
        return this.unreadSysopMessages || [];
    }

    async clearUnreadSysopMessages() {
        try {
            await fetch('/api/sysop-chat/mark-read', {
                method: 'POST',
                credentials: 'include'
            });
        } catch (error) {
            console.error('Error marking messages as read:', error);
        }
        this.unreadSysopMessages = [];
    }

    async register(userData) {
        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(userData)
            });

            const data = await response.json();

            if (data.success) {
                return { success: true, userId: data.userId };
            } else {
                return { success: false, error: data.error || 'Registration failed' };
            }
        } catch (error) {
            console.error('Registration error:', error);
            return { success: false, error: 'Network error' };
        }
    }

    async logout() {
        try {
            await fetch('/api/logout', {
                method: 'POST',
                credentials: 'include'
            });
            this.currentUser = null;
            return { success: true };
        } catch (error) {
            console.error('Logout error:', error);
            return { success: false };
        }
    }

    async checkSession() {
        try {
            const response = await fetch('/api/me', {
                credentials: 'include'
            });
            const data = await response.json();

            if (data.userId) {
                this.currentUser = data;
                return { success: true, user: data };
            } else {
                return { success: false };
            }
        } catch (error) {
            console.error('Session check error:', error);
            return { success: false };
        }
    }

    isAuthenticated() {
        return this.currentUser !== null;
    }

    getCurrentUser() {
        return this.currentUser;
    }
}

// Export for use in other modules
window.AuthManager = AuthManager;

