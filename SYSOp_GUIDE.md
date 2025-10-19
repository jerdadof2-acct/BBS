# SYSOp Control Panel Guide

## Overview

As the System Operator (SysOp) of your BBS, you now have full control over the system, just like in the original BBS days!

## Accessing the SYSOp Panel

1. Log in as **SysOp** (password: `admin123`)
2. From the main menu, press **`!`** to access the SYSOp Control Panel
3. Only users with access level 100 or the handle "SysOp" can access this panel

## SYSOp Features

### 1. User Management
- **View All Users**: See a complete list of all registered users
- **Edit User Access Levels**:
  - User (1): Regular user access
  - Moderator (50): Can moderate content
  - Sysop (100): Full system access
- **Delete Users**: Remove users from the system

### 2. Game Management (LORD)
- **View All LORD Games**: See all active LORD game saves
- **Edit Player Stats**: Modify any player's:
  - Level
  - Gold
  - Strength/Defense
  - HP/Max HP
- **Reset Player Progress**: Delete a player's game save entirely

### 3. System Statistics
View real-time BBS statistics:
- Total Users
- Users Online Today
- Total Messages
- Total Files
- Chat Messages
- Game Saves

### 4. Moderation Tools
- **Delete Messages**: Remove inappropriate posts from message boards
- **Delete Files**: Remove files from the file library

## LORD Game Management

### Editing Player Stats

1. Go to **SYSOp Control Panel** → **Game Management**
2. Select **Edit Player Stats**
3. Enter the user ID
4. Choose what to edit:
   - **Level**: Set player level (affects available monsters)
   - **Gold**: Set gold amount
   - **Stats**: Set Strength and Defense
   - **HP**: Set Max HP (also restores current HP)

### Resetting Player Progress

1. Go to **SYSOp Control Panel** → **Game Management**
2. Select **Reset Player Progress**
3. Enter the user ID
4. Confirm with "yes"

⚠️ **Warning**: This will permanently delete all game progress for that player!

## Access Levels

- **1 - User**: Regular user, default access level
- **50 - Moderator**: Can moderate content (future feature)
- **100 - Sysop**: Full system access, can access SYSOp panel

## Security

- Only users with access level ≥ 100 or handle "SysOp" can access the SYSOp panel
- All SYSOp actions are logged server-side
- Non-sysop users will see "ACCESS DENIED" if they try to access the panel

## Authentic BBS Experience

This implementation matches the original BBS sysop experience:
- Full user management
- Game state editing (just like editing LORD player files)
- System statistics
- Content moderation
- Access level management

## Example Use Cases

### Scenario 1: Player Needs Help
A player is stuck in LORD and needs help:
1. Access SYSOp Panel
2. Go to Game Management → Edit Player Stats
3. Enter their user ID
4. Give them extra gold or increase their level
5. Save changes

### Scenario 2: Inappropriate Content
A user posts inappropriate content:
1. Access SYSOp Panel
2. Go to Moderation Tools → Delete Message
3. Enter the message ID
4. Message is removed

### Scenario 3: New Moderator
You want to promote a user to moderator:
1. Access SYSOp Panel
2. Go to User Management
3. Select Edit User
4. Enter their user ID
5. Set access level to 50 (Moderator)

## Technical Details

### Database Changes
- Added `access_level` field to users table
- Added sysop-specific database functions
- Added sysop API endpoints

### API Endpoints
All SYSOp endpoints require authentication and sysop privileges:
- `GET /api/sysop/check` - Check if user is sysop
- `GET /api/sysop/users` - Get all users
- `POST /api/sysop/user/:userId/access` - Update user access level
- `DELETE /api/sysop/user/:userId` - Delete user
- `GET /api/sysop/game-states` - Get all game states
- `GET /api/sysop/game-state/:userId/:gameName` - Get specific game state
- `POST /api/sysop/game-state/:userId/:gameName` - Save game state
- `DELETE /api/sysop/message/:messageId` - Delete message
- `DELETE /api/sysop/file/:fileId` - Delete file
- `GET /api/sysop/stats` - Get system statistics

## Tips

1. **Backup First**: Before making major changes, consider backing up the database
2. **Test Changes**: Test sysop functions in a development environment first
3. **Document Actions**: Keep track of what you change for accountability
4. **Use Responsibly**: With great power comes great responsibility!

## Future Enhancements

Potential future features:
- Activity logs for sysop actions
- Ban/unban users
- System configuration settings
- Email notifications for moderation
- Advanced statistics and analytics
- User activity monitoring

---

**Welcome to the authentic BBS sysop experience!** 🎮


