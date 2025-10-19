// Terminal Emulator
class Terminal {
    constructor(element) {
        this.element = element;
        this.content = '';
        this.cursorVisible = true;
        this.typingSpeed = 10; // milliseconds per character
        this.simulateSpeed = true;
        this.ansiParser = new ANSIParser();
        this.inputBuffer = '';
        this.inputCallback = null;
        this.isWaitingForInput = false;
    }

    // Clear terminal
    clear() {
        this.content = '';
        this.element.innerHTML = '';
        this.updateCursor();
    }

    // Print text (with optional ANSI support)
    print(text, useAnsi = true) {
        if (useAnsi) {
            const parsed = this.ansiParser.parse(text);
            this.content += text;
            this.element.innerHTML += parsed;
        } else {
            this.content += text;
            this.element.innerHTML += this.escapeHtml(text);
        }
        this.scrollToBottom();
    }
    
    // Print raw HTML (for ANSI art)
    printHtml(html) {
        this.element.innerHTML += html;
        this.scrollToBottom();
    }

    // Print with typing effect
    async printSlow(text, speed = null) {
        const typingSpeed = speed || this.typingSpeed;
        
        if (!this.simulateSpeed || typingSpeed === 0) {
            this.print(text);
            return;
        }

        for (let i = 0; i < text.length; i++) {
            this.print(text[i]);
            await this.sleep(typingSpeed);
        }
    }

    // Print line (with newline)
    println(text = '', useAnsi = true) {
        this.print(text + '\n', useAnsi);
    }

    // Print line with typing effect
    async printlnSlow(text = '', speed = null) {
        await this.printSlow(text + '\n', speed);
    }

    // Get user input
    async input(prompt = '') {
        if (prompt) {
            this.print(prompt);
        }
        
        this.isWaitingForInput = true;
        this.updateCursor();
        
        return new Promise((resolve) => {
            this.inputCallback = (value) => {
                this.isWaitingForInput = false;
                // Don't print the value again - it's already been typed
                this.println(''); // Just add a newline
                resolve(value);
            };
        });
    }

    // Handle keyboard input
    handleKeyPress(event) {
        if (!this.isWaitingForInput) return;

        const key = event.key;

        if (key === 'Enter') {
            event.preventDefault();
            event.stopPropagation();
            const value = this.inputBuffer;
            this.inputBuffer = '';
            if (this.inputCallback) {
                this.inputCallback(value);
                this.inputCallback = null;
            }
        } else if (key === 'Backspace') {
            event.preventDefault();
            event.stopPropagation();
            if (this.inputBuffer.length > 0) {
                this.inputBuffer = this.inputBuffer.slice(0, -1);
                this.removeLastChar();
            }
        } else if (key === ' ' && this.inputBuffer.length === 0) {
            // Space with no input - treat as "any key"
            event.preventDefault();
            event.stopPropagation();
            if (this.inputCallback) {
                this.inputCallback('');
                this.inputCallback = null;
            }
        } else if (key.length === 1) {
            event.preventDefault();
            event.stopPropagation();
            this.inputBuffer += key;
            this.print(key);
        }
    }

    // Remove last character from display
    removeLastChar() {
        const html = this.element.innerHTML;
        // Remove last character (handling ANSI spans)
        this.element.innerHTML = html.slice(0, -1);
    }

    // Update cursor visibility
    updateCursor() {
        const cursor = document.getElementById('terminal-cursor');
        if (cursor) {
            cursor.style.display = this.isWaitingForInput ? 'inline-block' : 'none';
        }
    }

    // Scroll to bottom
    scrollToBottom() {
        const screen = document.getElementById('terminal-screen');
        if (screen) {
            screen.scrollTop = screen.scrollHeight;
        }
    }

    // Escape HTML
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Sleep utility
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Set typing speed
    setTypingSpeed(speed) {
        this.typingSpeed = speed;
    }

    // Enable/disable speed simulation
    setSimulateSpeed(enabled) {
        this.simulateSpeed = enabled;
    }

    // Draw a box with characters
    drawBox(x, y, width, height, style = 'single') {
        const chars = {
            single: {
                tl: '┌', tr: '┐', bl: '└', br: '┘',
                h: '─', v: '│'
            },
            double: {
                tl: '╔', tr: '╗', bl: '╚', br: '╝',
                h: '═', v: '║'
            }
        };

        const c = chars[style] || chars.single;
        let box = '';

        // Top
        box += c.tl + c.h.repeat(width - 2) + c.tr + '\n';

        // Middle
        for (let i = 0; i < height - 2; i++) {
            box += c.v + ' '.repeat(width - 2) + c.v + '\n';
        }

        // Bottom
        box += c.bl + c.h.repeat(width - 2) + c.br + '\n';

        return box;
    }

    // Center text
    centerText(text, width = 80) {
        const padding = Math.floor((width - text.length) / 2);
        return ' '.repeat(padding) + text;
    }

    // Draw a line
    drawLine(char = '─', length = 80) {
        return char.repeat(length) + '\n';
    }
}

// Export for use in other modules
window.Terminal = Terminal;

