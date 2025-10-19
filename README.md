# Retro-BBS - The Ultimate Bulletin Board System

A fully functional, authentic 1980s/90s BBS simulator with real-time multiplayer support, running in your web browser!

![BBS](https://img.shields.io/badge/BBS-RETRO-green) ![Node](https://img.shields.io/badge/Node.js-18+-brightgreen) ![License](https://img.shields.io/badge/License-MIT-blue)

## 🌟 Features

### Core BBS Features
- **Authentic ANSI Art Rendering** - Full CP437 character set support with proper colors
- **Modem Connection Simulation** - Realistic dial-up sounds and connection sequence
- **User Authentication** - Registration, login, and session management
- **Message Boards** - Multiple boards for different topics with threading
- **File Libraries** - Organized file areas with upload/download
- **Real-time Chat** - Public chat rooms and private messaging
- **User Directory** - Browse all users and see who's online
- **One-Liners Wall** - Quick messages from users
- **Statistics** - Track calls, messages, and activity

### Door Games (Multiplayer!)
- **Galactic Trader** - Space trading simulation with dynamic markets
- **The Pit** - PvP combat arena with monsters and leveling
- **Number Guess** - Daily guessing competition with leaderboards

### Authentic Details
- IBM VGA font styling
- ANSI color palette (16 colors)
- Modem sound generation using Web Audio API
- Configurable typing speed simulation
- Multiple color schemes (Green, Amber, White, Blue)
- Real-time Socket.io communication
- SQLite database for persistence

## 🚀 Quick Start

### Prerequisites
- Node.js 18 or higher
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd BBS
```

2. Install dependencies:
```bash
npm install
```

3. Seed the database with sample data:
```bash
npm run seed
```

4. Start the server:
```bash
npm start
```

5. Open your browser and navigate to:
```
http://localhost:3000
```

### Development Mode

For development with auto-reload:
```bash
npm run dev
```

## 🎮 Usage

### First Time Setup

1. **Register a new account:**
   - Choose [R] Register
   - Enter your handle (username)
   - Enter your real name and location
   - Choose a password

2. **Or use a test account:**
   - Handle: `CyberPunk`
   - Password: `test123`

### Main Menu Options

- **[M] Message Boards** - Read and post messages
- **[F] File Libraries** - Browse and download files
- **[D] Door Games** - Play multiplayer games
- **[C] Chat Rooms** - Real-time chat with other users
- **[U] User List** - See who's online and browse users
- **[O] One-Liners Wall** - Quick messages
- **[S] Statistics** - View your stats
- **[G] Goodbye** - Logout

### Settings

Click the ⚙ Settings button to:
- Toggle sound effects on/off
- Enable/disable typing speed simulation
- Toggle ANSI blinking text
- Change color scheme

## 🎯 Door Games

### Galactic Trader
- Travel between planets
- Buy and sell commodities
- Build your trading empire
- Daily turn limits
- Global leaderboards

### The Pit
- Fight monsters in arena combat
- Level up and gain stats
- Buy weapons and armor
- Challenge other players
- Track wins and losses

### Number Guess
- Guess a number between 1-100
- Limited attempts
- Daily high scores
- Fast and casual

## 🛠️ Technology Stack

### Backend
- **Node.js** - Runtime environment
- **Express** - Web framework
- **Socket.io** - Real-time communication
- **SQLite** - Database
- **bcrypt** - Password hashing
- **express-session** - Session management

### Frontend
- **Vanilla JavaScript** - No frameworks!
- **HTML5/CSS3** - Modern web standards
- **Web Audio API** - Sound generation
- **Socket.io Client** - Real-time updates

## 📁 Project Structure

```
BBS/
├── server/
│   ├── server.js          # Express + Socket.io server
│   └── db.js              # Database queries
├── public/
│   ├── index.html         # Main HTML
│   ├── css/               # Stylesheets
│   │   ├── bbs.css
│   │   └── ansi.css
│   └── js/                # JavaScript modules
│       ├── main.js        # Application entry
│       ├── terminal.js    # Terminal emulator
│       ├── ansi.js        # ANSI parser
│       ├── modem.js       # Modem simulator
│       ├── auth.js        # Authentication
│       ├── menu.js        # Menu system
│       ├── messages.js    # Message boards
│       ├── files.js       # File library
│       ├── chat.js        # Chat system
│       ├── doors.js       # Game launcher
│       └── games/         # Door games
│           ├── galactic-trader.js
│           ├── the-pit.js
│           └── number-guess.js
├── data/
│   ├── bbs.db            # SQLite database (auto-created)
│   └── seed-data.js      # Database seeding script
├── package.json
└── README.md
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
PORT=3000
SESSION_SECRET=your-secret-key-here
```

### Database

The SQLite database is automatically created on first run. To reset the database:

```bash
rm data/bbs.db
npm run seed
```

## 🎨 Customization

### Color Schemes

Edit `public/css/bbs.css` to add new color schemes or modify existing ones.

### ANSI Art

Create your own ANSI art files and reference them in the code. Use tools like:
- [PabloDraw](http://picoe.ca/products/pablodraw/)
- [TheDraw](https://github.com/ansilove/TheDraw)

### Modem Sounds

Modify `public/js/modem.js` to adjust sound frequencies and durations.

## 🌐 Deployment

### Railway

1. Create a new Railway project
2. Connect your GitHub repository
3. Add environment variables
4. Deploy!

### Render

1. Create a new Web Service
2. Connect your repository
3. Set build command: `npm install`
4. Set start command: `npm start`
5. Deploy!

### Heroku

1. Create a new Heroku app
2. Set buildpacks: `heroku/nodejs`
3. Add environment variables
4. Deploy: `git push heroku main`

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Inspired by classic BBS systems like WWIV, Renegade, and RemoteAccess
- Door games inspired by Trade Wars, Legend of the Red Dragon, and Barren Realms Elite
- ANSI art community for keeping the retro spirit alive

## 📞 Contact

For questions or support, please open an issue on GitHub.

---

**Retro-BBS** - "Where Legends Connect" 🚀

*Relive the golden age of dial-up bulletin board systems!*



