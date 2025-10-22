// File Library System
class FileLibrary {
    constructor(terminal, authManager) {
        this.terminal = terminal;
        this.authManager = authManager;
        this.areas = [
            { id: 'games', name: 'Games' },
            { id: 'utilities', name: 'Utilities' },
            { id: 'graphics', name: 'Graphics' },
            { id: 'text', name: 'Text Files' },
            { id: 'ascii', name: 'ASCII Art' }
        ];
    }

    async showFileLibraries() {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + this.getHeader() + ANSIParser.reset());
        this.terminal.println('');
        
        this.terminal.println(ANSIParser.fg('bright-white') + '  File Libraries:' + ANSIParser.reset());
        this.terminal.println('');
        
        for (let i = 0; i < this.areas.length; i++) {
            const area = this.areas[i];
            this.terminal.println(ANSIParser.fg('bright-yellow') + `  [${i + 1}]` + ANSIParser.reset() + ` ${area.name}`);
        }
        
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  [0]' + ANSIParser.reset() + ' Return to Main Menu');
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + '  Select area: ' + ANSIParser.reset());
        
        const choice = await this.terminal.input();
        const areaIndex = parseInt(choice) - 1;
        
        if (choice === '0') {
            return 'menu';
        } else if (areaIndex >= 0 && areaIndex < this.areas.length) {
            await this.showArea(this.areas[areaIndex]);
            return 'files';
        } else {
            this.terminal.println(ANSIParser.fg('bright-red') + '  Invalid selection.' + ANSIParser.reset());
            await this.terminal.sleep(1500);
            return 'files';
        }
    }

    async showArea(area) {
        this.terminal.clear();
        this.terminal.println(ANSIParser.fg('bright-cyan') + this.getAreaHeader(area.name) + ANSIParser.reset());
        this.terminal.println('');
        
        try {
            const response = await fetch(`/api/files/${area.id}`);
            const files = await response.json();
            
            if (files.length === 0) {
                this.terminal.println(ANSIParser.fg('bright-yellow') + '  No files in this area yet.' + ANSIParser.reset());
            } else {
                this.terminal.println(ANSIParser.fg('bright-white') + '  Filename                          Size    Uploader       Date' + ANSIParser.reset());
                this.terminal.println(ANSIParser.fg('bright-cyan') + '  ' + '─'.repeat(70) + ANSIParser.reset());
                
                files.forEach((file, index) => {
                    const filename = file.filename.padEnd(30);
                    const size = this.formatSize(file.size).padEnd(8);
                    const uploader = file.uploader_handle.padEnd(13);
                    const date = new Date(file.created_at).toLocaleDateString();
                    
                    this.terminal.println(ANSIParser.fg('bright-yellow') + `  [${index + 1}]` + ANSIParser.reset() + 
                        ` ${filename} ${size} ${uploader} ${date}`);
                    
                    if (file.description) {
                        this.terminal.println(ANSIParser.fg('bright-black') + `      ${file.description}` + ANSIParser.reset());
                    }
                });
            }
            
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [D]' + ANSIParser.reset() + ' Download File');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [U]' + ANSIParser.reset() + ' Upload File');
            this.terminal.println(ANSIParser.fg('bright-yellow') + '  [B]' + ANSIParser.reset() + ' Back to Areas');
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-green') + '  Your choice: ' + ANSIParser.reset());
            
            const choice = (await this.terminal.input()).toLowerCase();
            
            if (choice === 'd') {
                await this.downloadFile(area, files);
                return 'files';
            } else if (choice === 'u') {
                await this.uploadFile(area);
                return 'files';
            } else if (choice === 'b') {
                return 'files';
            }
        } catch (error) {
            console.error('Error loading files:', error);
            this.terminal.println(ANSIParser.fg('bright-red') + '  Error loading files.' + ANSIParser.reset());
            await this.terminal.sleep(2000);
            return 'files';
        }
    }

    async downloadFile(area, files) {
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-green') + '  File number: ' + ANSIParser.reset());
        const num = parseInt(await this.terminal.input()) - 1;
        
        if (num >= 0 && num < files.length) {
            const file = files[num];
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-yellow') + `  Downloading ${file.filename}...` + ANSIParser.reset());
            
            // Simulate download progress
            for (let i = 0; i <= 100; i += 10) {
                await this.terminal.sleep(100);
                const bar = '█'.repeat(i / 10) + '░'.repeat(10 - i / 10);
                this.terminal.print(`\r  [${bar}] ${i}%`);
            }
            
            this.terminal.println('');
            this.terminal.println(ANSIParser.fg('bright-green') + '  Download complete!' + ANSIParser.reset());
            await this.terminal.sleep(1500);
        }
    }

    async uploadFile(area) {
        this.terminal.println('');
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  File uploads are not implemented in this demo.' + ANSIParser.reset());
        this.terminal.println(ANSIParser.fg('bright-yellow') + '  Use the file library to browse and download files.' + ANSIParser.reset());
        await this.terminal.sleep(2000);
    }

    formatSize(bytes) {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    getHeader() {
        return `
╔══════════════════════════════════════════════════════════════════════════════╗
║                         FILE LIBRARIES                                       ║
╚══════════════════════════════════════════════════════════════════════════════╝
`;
    }

    getAreaHeader(name) {
        return `
╔══════════════════════════════════════════════════════════════════════════════╗
║  ${name.padEnd(76)}  ║
╚══════════════════════════════════════════════════════════════════════════════╝
`;
    }
}

// Export for use in other modules
window.FileLibrary = FileLibrary;













