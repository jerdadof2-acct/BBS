const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');

const DB_PATH = path.join(__dirname, 'bbs.db');

async function seedDatabase() {
    const db = new sqlite3.Database(DB_PATH);

    try {
        console.log('Seeding database...');

        // Create test users with pre-hashed passwords
        const testUsers = [
            { handle: 'SysOp', real_name: 'System Operator', location: 'BBS HQ', password_hash: '$2b$10$W53ghbDl4wd.eb8SjHXgEuiIVmPY1k4cFEplh0DlVzsrIfBrZYinu', access_level: 100, credits: 1000 },
            { handle: 'CyberPunk', real_name: 'Alex Johnson', location: 'New York', password_hash: '$2b$10$744MKC/LzrKtB7u1b0xRM.KmorAtTKXfLvylAXYjOp1hcDiKfRjde', access_level: 1, credits: 250 },
            { handle: 'ByteMaster', real_name: 'Sarah Chen', location: 'San Francisco', password_hash: '$2b$10$744MKC/LzrKtB7u1b0xRM.KmorAtTKXfLvylAXYjOp1hcDiKfRjde', credits: 180 },
            { handle: 'TerminalWarrior', real_name: 'Mike Rodriguez', location: 'Los Angeles', password_hash: '$2b$10$744MKC/LzrKtB7u1b0xRM.KmorAtTKXfLvylAXYjOp1hcDiKfRjde', credits: 320 },
            { handle: 'ASCII_Art', real_name: 'Emma Davis', location: 'Chicago', password_hash: '$2b$10$744MKC/LzrKtB7u1b0xRM.KmorAtTKXfLvylAXYjOp1hcDiKfRjde', credits: 150 },
            { handle: 'ModemKing', real_name: 'David Lee', location: 'Seattle', password_hash: '$2b$10$744MKC/LzrKtB7u1b0xRM.KmorAtTKXfLvylAXYjOp1hcDiKfRjde', credits: 200 },
            { handle: 'BBSLegend', real_name: 'Lisa Wang', location: 'Boston', password_hash: '$2b$10$744MKC/LzrKtB7u1b0xRM.KmorAtTKXfLvylAXYjOp1hcDiKfRjde', credits: 400 },
            { handle: 'RetroGamer', real_name: 'Chris Brown', location: 'Austin', password_hash: '$2b$10$744MKC/LzrKtB7u1b0xRM.KmorAtTKXfLvylAXYjOp1hcDiKfRjde', credits: 120 }
        ];

        for (const user of testUsers) {
            await new Promise((resolve, reject) => {
                db.run(
                    'INSERT OR IGNORE INTO users (handle, real_name, location, password_hash, signature, calls, access_level, credits) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                    [user.handle, user.real_name, user.location, user.password_hash, `-- ${user.handle}`, Math.floor(Math.random() * 50), user.access_level || 1, user.credits || 100],
                    (err) => {
                        if (err) reject(err);
                        else resolve();
                    }
                );
            });
        }

        console.log('✓ Users created');

        // Create sample messages
        const boards = ['general', 'gaming', 'tech', 'trading', 'offtopic'];
        const messages = [
            { board: 'general', subject: 'Welcome to Retro-BBS!', body: 'Welcome everyone! This is a brand new BBS. Feel free to explore and have fun!', author: 'SysOp' },
            { board: 'general', subject: 'Anyone remember the good old days?', body: 'Back in the 80s, I used to dial into BBS systems every night. Those were the days!', author: 'BBSLegend' },
            { board: 'gaming', subject: 'Best door games?', body: 'What are your favorite door games? I love Trade Wars and LORD!', author: 'RetroGamer' },
            { board: 'gaming', subject: 'Re: Best door games?', body: 'Don\'t forget about BRE (Barren Realms Elite)! That was amazing!', author: 'CyberPunk' },
            { board: 'tech', subject: 'ANSI art tips', body: 'Anyone have tips for creating ANSI art? I\'m trying to learn.', author: 'ASCII_Art' },
            { board: 'tech', subject: 'Re: ANSI art tips', body: 'Use TheDraw or PabloDraw. They\'re great tools for ANSI art!', author: 'ByteMaster' },
            { board: 'trading', subject: 'Looking for rare files', body: 'Anyone have any rare BBS files they want to trade?', author: 'ModemKing' },
            { board: 'offtopic', subject: 'What\'s everyone up to?', body: 'Just checking in. What\'s everyone doing this weekend?', author: 'TerminalWarrior' }
        ];

        for (const msg of messages) {
            const user = testUsers.find(u => u.handle === msg.author);
            if (user) {
                await new Promise((resolve, reject) => {
                    db.get('SELECT id FROM users WHERE handle = ?', [user.handle], (err, row) => {
                        if (err) {
                            reject(err);
                            return;
                        }
                        if (row) {
                            db.run(
                                'INSERT INTO messages (board, subject, body, author_id) VALUES (?, ?, ?, ?)',
                                [msg.board, msg.subject, msg.body, row.id],
                                (err) => {
                                    if (err) reject(err);
                                    else resolve();
                                }
                            );
                        } else {
                            resolve();
                        }
                    });
                });
            }
        }

        console.log('✓ Messages created');

        // Create sample files
        const fileAreas = ['games', 'utilities', 'graphics', 'text', 'ascii'];
        const files = [
            { filename: 'tradewars.zip', description: 'Trade Wars 2002 - Classic space trading game', area: 'games', size: 524288, uploader: 'RetroGamer' },
            { filename: 'lord.zip', description: 'Legend of the Red Dragon - RPG game', area: 'games', size: 1048576, uploader: 'CyberPunk' },
            { filename: 'ansiedit.zip', description: 'ANSI Editor for creating art', area: 'utilities', size: 262144, uploader: 'ASCII_Art' },
            { filename: 'the_draw.zip', description: 'TheDraw - ANSI art editor', area: 'utilities', size: 393216, uploader: 'ByteMaster' },
            { filename: 'cool_logo.ans', description: 'Cool BBS logo in ANSI', area: 'graphics', size: 4096, uploader: 'ASCII_Art' },
            { filename: 'ascii_art_collection.txt', description: 'Collection of ASCII art', area: 'ascii', size: 8192, uploader: 'ASCII_Art' },
            { filename: 'bbs_guide.txt', description: 'Guide to running a BBS', area: 'text', size: 16384, uploader: 'SysOp' }
        ];

        for (const file of files) {
            const user = testUsers.find(u => u.handle === file.uploader);
            if (user) {
                await new Promise((resolve, reject) => {
                    db.get('SELECT id FROM users WHERE handle = ?', [user.handle], (err, row) => {
                        if (err) {
                            reject(err);
                            return;
                        }
                        if (row) {
                            db.run(
                                'INSERT INTO files (filename, description, area, size, uploader_id) VALUES (?, ?, ?, ?, ?)',
                                [file.filename, file.description, file.area, file.size, row.id],
                                (err) => {
                                    if (err) reject(err);
                                    else resolve();
                                }
                            );
                        } else {
                            resolve();
                        }
                    });
                });
            }
        }

        console.log('✓ Files created');

        // Create sample one-liners
        const oneliners = [
            { message: 'Just got my first 2400 baud modem!', user: 'ModemKing' },
            { message: 'Anyone up for a game of Trade Wars?', user: 'RetroGamer' },
            { message: 'Check out my new ANSI art!', user: 'ASCII_Art' },
            { message: 'This BBS is awesome!', user: 'CyberPunk' },
            { message: 'Remember when 14.4k was fast?', user: 'BBSLegend' }
        ];

        for (const ol of oneliners) {
            const user = testUsers.find(u => u.handle === ol.user);
            if (user) {
                await new Promise((resolve, reject) => {
                    db.get('SELECT id FROM users WHERE handle = ?', [user.handle], (err, row) => {
                        if (err) {
                            reject(err);
                            return;
                        }
                        if (row) {
                            db.run(
                                'INSERT INTO oneliners (user_id, message) VALUES (?, ?)',
                                [row.id, ol.message],
                                (err) => {
                                    if (err) reject(err);
                                    else resolve();
                                }
                            );
                        } else {
                            resolve();
                        }
                    });
                });
            }
        }

        console.log('✓ One-liners created');

        // Create sample high scores
        const gameScores = [
            { game: 'galactic-trader', score: 15000, user: 'CyberPunk' },
            { game: 'galactic-trader', score: 12000, user: 'RetroGamer' },
            { game: 'the-pit', score: 5, user: 'TerminalWarrior' },
            { game: 'the-pit', score: 3, user: 'ByteMaster' },
            { game: 'number-guess', score: 3, user: 'ASCII_Art' },
            { game: 'number-guess', score: 4, user: 'ModemKing' }
        ];

        for (const score of gameScores) {
            const user = testUsers.find(u => u.handle === score.user);
            if (user) {
                await new Promise((resolve, reject) => {
                    db.get('SELECT id FROM users WHERE handle = ?', [user.handle], (err, row) => {
                        if (err) {
                            reject(err);
                            return;
                        }
                        if (row) {
                            db.run(
                                'INSERT INTO high_scores (user_id, game_name, score, details) VALUES (?, ?, ?, ?)',
                                [row.id, score.game, score.score, 'Sample score'],
                                (err) => {
                                    if (err) reject(err);
                                    else resolve();
                                }
                            );
                        } else {
                            resolve();
                        }
                    });
                });
            }
        }

        console.log('✓ High scores created');

        console.log('\n✓ Database seeded successfully!');
        console.log('\nTest accounts:');
        testUsers.forEach(user => {
            console.log(`  ${user.handle} / ${user.password}`);
        });
        console.log('\nDefault admin: SysOp / admin123');

    } catch (error) {
        console.error('Error seeding database:', error);
    } finally {
        db.close();
    }
}

seedDatabase();

