# ⚔️ The Pit - Real PvP Multi-User Combat!

## 🎮 NEW: Real Player vs Player Combat!

**The Pit** now has **TRUE multi-user PvP capabilities**! Players can challenge each other to duels and fight in real-time!

---

## ⚔️ How It Works

### 1. **Challenge Another Player**
- Enter The Pit game
- Press `P` for PvP
- See list of online players
- Select opponent to challenge
- Send challenge!

### 2. **Receive Challenge**
- Get instant notification
- See challenger's stats
- Accept or decline
- Fight if accepted!

### 3. **Combat**
- Turn-based combat
- See each round
- Watch HP drop
- Win gold and experience!

---

## 🎯 Game Flow

### Player A Challenges Player B:

```
Player A (The Pit):
  [P] PvP - Fight another player
  Select opponent: 2
  Challenging ByteMaster to a duel!
  Challenge sent! Waiting for response...
```

### Player B Receives Challenge:

```
Player B (gets notification):
  ════════════════════════════════════════
  PVP CHALLENGE!
  ════════════════════════════════════════

  CyberPunk challenges you to a duel!

  Level: 5
  HP: 100/100
  STR: 15 | DEF: 10

  [A] Accept
  [D] Decline
```

### If Accepted - Combat Begins:

```
PVP COMBAT: CyberPunk vs ByteMaster
═══════════════════════════════════════

You: HP 100/100 | STR 15 | DEF 10
ByteMaster: HP 90/90 | STR 12 | DEF 8

Round 1
You hit ByteMaster for 7 damage!
ByteMaster hits you for 4 damage!

Round 2
You hit ByteMaster for 8 damage!
ByteMaster hits you for 5 damage!

★★★ VICTORY! ★★★
You defeated ByteMaster!

Gold gained: 100
Experience gained: 50
```

---

## 🏆 Rewards

### Winner Gets:
- **Gold**: 50 + (opponent's level × 10)
- **Experience**: 25 + (opponent's level × 5)
- **Win recorded** in stats

### Loser Loses:
- **Gold**: -25 gold
- **HP**: Set to 0 (revived at hospital)
- **Loss recorded** in stats

---

## 🎮 Features

✅ **Real-time challenges** - Instant notifications
✅ **See opponent stats** - Know what you're facing
✅ **Accept/Decline** - Your choice to fight
✅ **Turn-based combat** - Watch each round
✅ **Rewards** - Gold and experience for wins
✅ **Stats tracking** - Wins and losses recorded
✅ **Timeout protection** - Challenges expire after 30 seconds

---

## 📊 Multi-User Capabilities

### Current Multi-User Games:

| Game | Multi-User? | Type |
|------|-------------|------|
| **The Pit** | ✅ **YES** | PvP Combat |
| Legend of the Red Dragon | ❌ No | Single-player RPG |
| Rock Star | ❌ No | Single-player simulation |
| TradeWars 2002 | ❌ No | Single-player trading |
| Barren Realms Elite | ❌ No | Single-player strategy |
| Operation Overkill II | ❌ No | Single-player survival |
| Usurper | ❌ No | Single-player RPG |
| Galactic Trader | ❌ No | Single-player trading |
| Blackjack | ❌ No | Single-player casino |
| Trivia | ❌ No | Single-player quiz |
| Hangman | ❌ No | Single-player word game |
| Number Guess | ❌ No | Single-player guessing |

---

## 🚀 How to Play PvP

### Step 1: Get Multiple Users Online
```
Tab 1: Log in as CyberPunk
Tab 2: Log in as ByteMaster
Tab 3: Log in as RetroGamer
```

### Step 2: Enter The Pit
```
All players:
  Door Games → The Pit
```

### Step 3: Challenge Someone
```
CyberPunk:
  The Pit → [P] PvP
  Select opponent: ByteMaster
  Challenge sent!
```

### Step 4: Accept and Fight
```
ByteMaster:
  Gets challenge notification
  Press [A] to Accept
  Combat begins!
```

### Step 5: Watch the Battle
```
Both players see:
  Round 1
  Round 2
  Round 3
  ...
  Winner declared!
```

---

## 💡 Tips

1. **Check opponent stats** before accepting
2. **Heal at hospital** before challenging
3. **Buy better equipment** at the shop
4. **Level up** by fighting monsters first
5. **Accept challenges** to gain experience!

---

## 🎯 Future Multi-User Games

Potential games to add multi-user support:
- **TradeWars 2002** - Multi-player trading and combat
- **Barren Realms Elite** - Corporate warfare
- **Global War** - Geopolitical strategy
- **Tournament Mode** - Brackets and championships

---

## 🔧 Technical Implementation

### Socket.io Events:
- `pit-challenge` - Send challenge
- `pit-challenge-received` - Receive challenge
- `pit-challenge-response` - Accept/decline response

### Game State:
- Each player has their own stats
- Stats sent with challenge
- Combat calculated locally
- Results saved to database

---

## 🎉 Summary

**The Pit** is now a **TRUE multi-user game**!

✅ **Challenge other players** to duels
✅ **Real-time combat** with turn-based rounds
✅ **Win rewards** for defeating opponents
✅ **Track stats** - wins and losses
✅ **Perfect for multiple users** online at once!

---

## 🚀 Try It Now!

1. **Restart your BBS server**:
   ```bash
   npm start
   ```

2. **Open multiple browser tabs** and log in as different users

3. **All players enter The Pit**:
   - Door Games → The Pit

4. **One player challenges another**:
   - Press `P` → Select opponent → Challenge!

5. **Other player accepts**:
   - Gets notification → Press `A` → Fight!

6. **Watch the battle** and see who wins!

---

**Enjoy the PvP combat!** ⚔️








