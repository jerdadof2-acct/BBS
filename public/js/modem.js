// Modem Sound Generator and Connection Simulator
class ModemSimulator {
    constructor() {
        this.audioContext = null;
        this.enabled = true;
        this.initAudioContext();
    }

    initAudioContext() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.warn('Web Audio API not supported');
            this.enabled = false;
        }
    }

    async resumeAudioContext() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
    }

    // Generate a tone
    generateTone(frequency, duration, type = 'sine', volume = 0.3) {
        if (!this.enabled || !this.audioContext) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.frequency.value = frequency;
        oscillator.type = type;

        gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration);
    }

    // Dial tone
    dialTone() {
        if (!this.enabled) return;
        this.generateTone(350, 0.3);
        setTimeout(() => this.generateTone(440, 0.3), 50);
    }

    // DTMF tone
    dtmfTone(digit) {
        if (!this.enabled) return;
        const dtmf = {
            '1': [697, 1209], '2': [697, 1336], '3': [697, 1477],
            '4': [770, 1209], '5': [770, 1336], '6': [770, 1477],
            '7': [852, 1209], '8': [852, 1336], '9': [852, 1477],
            '0': [941, 1336], '*': [941, 1209], '#': [941, 1477]
        };

        const freqs = dtmf[digit] || [440, 440];
        freqs.forEach(freq => this.generateTone(freq, 0.1, 'sine', 0.2));
    }

    // Realistic modem handshake
    async handshake() {
        if (!this.enabled) return;

        // Initial carrier tone
        this.generateTone(1800, 0.4, 'sine', 0.5);
        await this.sleep(500);

        // Answer tone (2100 Hz)
        this.generateTone(2100, 0.6, 'sine', 0.5);
        await this.sleep(700);

        // Training sequence (realistic negotiation sounds)
        const trainingFreqs = [1200, 1400, 1600, 1800, 2000, 2200];
        for (let i = 0; i < trainingFreqs.length; i++) {
            this.generateTone(trainingFreqs[i], 0.2, 'sine', 0.4);
            await this.sleep(150);
        }

        // Protocol negotiation squeals
        for (let i = 0; i < 4; i++) {
            const freq = 1000 + (i * 200) + Math.random() * 100;
            this.generateTone(freq, 0.3, 'sawtooth', 0.3);
            await this.sleep(250);
        }

        // Final carrier establishment
        this.generateTone(1800, 0.8, 'sine', 0.6);
        await this.sleep(300);
        
        // Connection confirmation
        this.generateTone(1200, 0.2, 'sine', 0.4);
        setTimeout(() => this.generateTone(1800, 0.2, 'sine', 0.4), 100);
    }

    // Carrier detect
    carrierDetect() {
        if (!this.enabled) return;
        this.generateTone(1800, 0.2, 'sine', 0.3);
    }

    // Hangup
    hangup() {
        if (!this.enabled) return;
        this.generateTone(400, 0.3, 'sawtooth', 0.2);
    }

    // Connection complete
    connect() {
        if (!this.enabled) return;
        this.generateTone(800, 0.2, 'sine', 0.4);
        setTimeout(() => this.generateTone(1200, 0.2, 'sine', 0.4), 100);
    }

    // Page bell
    bell() {
        if (!this.enabled) return;
        this.generateTone(800, 0.3, 'sine', 0.3);
        setTimeout(() => this.generateTone(1000, 0.3, 'sine', 0.3), 150);
    }

    // Sleep utility
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Enable/disable sounds
    setEnabled(enabled) {
        this.enabled = enabled;
    }
}

// Simulate realistic modem connection
async function simulateModemConnection(terminal, modem) {
    // Initialize modem
    terminal.println(ANSIParser.fg('bright-cyan') + 'ATZ' + ANSIParser.reset());
    await terminal.sleep(400);

    terminal.println(ANSIParser.fg('bright-cyan') + 'OK' + ANSIParser.reset());
    await terminal.sleep(250);

    // Set modem parameters for more realistic connection
    terminal.println(ANSIParser.fg('bright-cyan') + 'AT&F1' + ANSIParser.reset());
    await terminal.sleep(300);
    terminal.println(ANSIParser.fg('bright-cyan') + 'OK' + ANSIParser.reset());
    await terminal.sleep(200);

    terminal.println(ANSIParser.fg('bright-cyan') + 'ATX4' + ANSIParser.reset());
    await terminal.sleep(250);
    terminal.println(ANSIParser.fg('bright-cyan') + 'OK' + ANSIParser.reset());
    await terminal.sleep(200);

    // Dial the BBS number
    terminal.println(ANSIParser.fg('bright-cyan') + 'ATDT 555-CYBER' + ANSIParser.reset());
    modem.dialTone();
    await terminal.sleep(800);

    terminal.println(ANSIParser.fg('yellow') + 'DIALING...' + ANSIParser.reset());
    await terminal.sleep(400);

    // Simulate realistic dialing sequence
    const phoneNumber = '55529437'; // 555-CYBER
    terminal.println(ANSIParser.fg('bright-white') + 'RING...' + ANSIParser.reset());
    await terminal.sleep(600);
    
    terminal.println(ANSIParser.fg('bright-white') + 'RING...' + ANSIParser.reset());
    await terminal.sleep(800);
    
    terminal.println(ANSIParser.fg('bright-white') + 'RING...' + ANSIParser.reset());
    await terminal.sleep(600);

    // Connection established
    terminal.println(ANSIParser.fg('bright-green') + 'CONNECT 14400/ARQ/V42BIS/LAPM' + ANSIParser.reset());
    await terminal.sleep(300);
    
    // Realistic handshake sequence
    terminal.println(ANSIParser.fg('bright-green') + 'CARRIER DETECTED' + ANSIParser.reset());
    modem.carrierDetect();
    await terminal.sleep(500);
    
    terminal.println(ANSIParser.fg('bright-green') + 'NEGOTIATING PROTOCOL...' + ANSIParser.reset());
    await modem.handshake();
    
    terminal.println(ANSIParser.fg('bright-green') + 'PROTOCOL ESTABLISHED' + ANSIParser.reset());
    await terminal.sleep(300);
    
    terminal.println(ANSIParser.fg('bright-green') + 'COMPRESSION ENABLED' + ANSIParser.reset());
    await terminal.sleep(200);
    
    terminal.println(ANSIParser.fg('bright-green') + 'ERROR CORRECTION ACTIVE' + ANSIParser.reset());
    await terminal.sleep(300);
    
    terminal.println(ANSIParser.fg('bright-green') + 'CONNECTED TO RETRO-BBS' + ANSIParser.reset());
    modem.connect();
    await terminal.sleep(400);
    terminal.println('');
}

// Export for use in other modules
window.ModemSimulator = ModemSimulator;
window.simulateModemConnection = simulateModemConnection;

