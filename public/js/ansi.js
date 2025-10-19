// ANSI Parser and Renderer
class ANSIParser {
    constructor() {
        this.colors = {
            '30': 'ansi-0', '31': 'ansi-1', '32': 'ansi-2', '33': 'ansi-3',
            '34': 'ansi-4', '35': 'ansi-5', '36': 'ansi-6', '37': 'ansi-7',
            '90': 'ansi-8', '91': 'ansi-9', '92': 'ansi-10', '93': 'ansi-11',
            '94': 'ansi-12', '95': 'ansi-13', '96': 'ansi-14', '97': 'ansi-15'
        };
        this.bgColors = {
            '40': 'ansi-bg-0', '41': 'ansi-bg-1', '42': 'ansi-bg-2', '43': 'ansi-bg-3',
            '44': 'ansi-bg-4', '45': 'ansi-bg-5', '46': 'ansi-bg-6', '47': 'ansi-bg-7',
            '100': 'ansi-bg-8', '101': 'ansi-bg-9', '102': 'ansi-bg-10', '103': 'ansi-bg-11',
            '104': 'ansi-bg-12', '105': 'ansi-bg-13', '106': 'ansi-bg-14', '107': 'ansi-bg-15'
        };
    }

    parse(text) {
        const lines = text.split('\n');
        const htmlLines = lines.map(line => this.parseLine(line));
        return htmlLines.join('<br>');
    }

    parseLine(line) {
        let result = '';
        let i = 0;
        let currentClasses = [];
        
        while (i < line.length) {
            if (line[i] === '\x1b') {
                // ANSI escape sequence
                const escapeEnd = line.indexOf('m', i);
                if (escapeEnd === -1) break;
                
                const escapeSeq = line.substring(i + 2, escapeEnd);
                const codes = escapeSeq.split(';');
                
                // Close previous span if needed
                if (currentClasses.length > 0) {
                    result += '</span>';
                    currentClasses = [];
                }
                
                // Parse new codes
                const newClasses = [];
                codes.forEach(code => {
                    if (code === '0') {
                        // Reset - no classes
                    } else if (code === '1') {
                        newClasses.push('ansi-bold');
                    } else if (code === '3') {
                        newClasses.push('ansi-italic');
                    } else if (code === '4') {
                        newClasses.push('ansi-underline');
                    } else if (code === '5' || code === '6') {
                        newClasses.push('ansi-blink');
                    } else if (code === '9') {
                        newClasses.push('ansi-strikethrough');
                    } else if (this.colors[code]) {
                        newClasses.push(this.colors[code]);
                    } else if (this.bgColors[code]) {
                        newClasses.push(this.bgColors[code]);
                    }
                });
                
                // Open new span if there are classes
                if (newClasses.length > 0) {
                    result += `<span class="${newClasses.join(' ')}">`;
                    currentClasses = newClasses;
                }
                
                i = escapeEnd + 1;
            } else {
                result += this.escapeHtml(line[i]);
                i++;
            }
        }
        
        // Close any open span
        if (currentClasses.length > 0) {
            result += '</span>';
        }
        
        return result;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Generate ANSI codes
    static fg(color) {
        const codes = {
            'black': '30', 'red': '31', 'green': '32', 'yellow': '33',
            'blue': '34', 'magenta': '35', 'cyan': '36', 'white': '37',
            'bright-black': '90', 'bright-red': '91', 'bright-green': '92', 'bright-yellow': '93',
            'bright-blue': '94', 'bright-magenta': '95', 'bright-cyan': '96', 'bright-white': '97'
        };
        return `\x1b[${codes[color] || '37'}m`;
    }

    static bg(color) {
        const codes = {
            'black': '40', 'red': '41', 'green': '42', 'yellow': '43',
            'blue': '44', 'magenta': '45', 'cyan': '46', 'white': '47',
            'bright-black': '100', 'bright-red': '101', 'bright-green': '102', 'bright-yellow': '103',
            'bright-blue': '104', 'bright-magenta': '105', 'bright-cyan': '106', 'bright-white': '107'
        };
        return `\x1b[${codes[color] || '40'}m`;
    }

    static reset() {
        return '\x1b[0m';
    }

    static bold() {
        return '\x1b[1m';
    }

    static blink() {
        return '\x1b[5m';
    }

    static clear() {
        return '\x1b[2J\x1b[H';
    }

    static moveCursor(row, col) {
        return `\x1b[${row};${col}H`;
    }
}

// Export for use in other modules
window.ANSIParser = ANSIParser;

