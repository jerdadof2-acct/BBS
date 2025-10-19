# Retro-BBS - Quick Start Guide

## 🚀 Get Started in 3 Steps

### 1. Install Dependencies
```bash
npm install
```

### 2. Seed the Database
```bash
npm run seed
```

This creates sample users, messages, files, and game data.

### 3. Start the Server
```bash
npm start
```

Then open your browser to: **http://localhost:3000**

---

## 🎮 Test Accounts

Use these pre-created accounts to get started:

| Handle | Password | Description |
|--------|----------|-------------|
| `SysOp` | `admin123` | System Administrator |
| `CyberPunk` | `test123` | Regular User |
| `ByteMaster` | `test123` | Regular User |
| `RetroGamer` | `test123` | Gaming Enthusiast |

Or create your own account by choosing **[R] Register** at the login screen!

---

## 🎯 What to Do First

### 1. Explore the Message Boards
- Choose **[M] Message Boards** from the main menu
- Read existing messages from veteran users
- Post your own message in any board

### 2. Play a Door Game
- Choose **[D] Door Games** from the main menu
- Try **Galactic Trader** - a space trading simulation
- Or try **The Pit** - arena combat
- Or **Number Guess** - quick daily game

### 3. Check Out the Files
- Choose **[F] File Libraries** from the main menu
- Browse the different file areas
- "Download" sample files

### 4. Chat with Others
- Choose **[C] Chat Rooms** from the main menu
- Join the public chat
- Send messages in real-time!

---

## ⚙️ Settings

Click the **⚙ Settings** button in the bottom right to:
- Toggle sound effects
- Adjust typing speed
- Change color scheme (Green, Amber, White, or Blue)
- Enable/disable ANSI blinking

---

## 🔧 Troubleshooting

### Port Already in Use
If port 3000 is already in use, set a different port:
```bash
PORT=3001 npm start
```

### Database Issues
Reset the database:
```bash
rm data/bbs.db
npm run seed
```

### Sound Not Working
- Check browser permissions for audio
- Try clicking on the page first (some browsers require user interaction)
- Check Settings to ensure sound is enabled

---

## 📚 Next Steps

- Read the full [README.md](README.md) for detailed documentation
- Customize the BBS with your own ANSI art
- Add your own door games
- Deploy to Railway, Render, or Heroku

---

## 🆘 Need Help?

- Check the [README.md](README.md) for full documentation
- Open an issue on GitHub
- Review the code comments for implementation details

---

**Enjoy your BBS experience!** 🎉

*"Where Legends Connect"*



