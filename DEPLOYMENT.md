# Deployment Guide for Retro-BBS

This guide will help you deploy your BBS to various hosting platforms.

## 🚀 Quick Deploy Options

### Railway (Recommended - Easiest)

1. **Create Railway Account**
   - Go to [railway.app](https://railway.app)
   - Sign up with GitHub

2. **Deploy**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your BBS repository
   - Railway auto-detects Node.js and deploys!

3. **Environment Variables**
   - Add `SESSION_SECRET` variable (generate a random string)
   - Railway will auto-assign a PORT

4. **Done!**
   - Your BBS will be live at `https://your-app.railway.app`

### Render

1. **Create Render Account**
   - Go to [render.com](https://render.com)
   - Sign up with GitHub

2. **Create Web Service**
   - Click "New +" → "Web Service"
   - Connect your repository
   - Settings:
     - **Name**: retro-bbs
     - **Environment**: Node
     - **Build Command**: `npm install`
     - **Start Command**: `npm start`
     - **Instance Type**: Free tier works!

3. **Environment Variables**
   - Add `SESSION_SECRET` (generate random string)
   - Add `NODE_ENV=production`

4. **Deploy**
   - Click "Create Web Service"
   - Wait for deployment

5. **Post-Deploy**
   - SSH into your instance
   - Run: `npm run seed` to populate database

### Heroku

1. **Install Heroku CLI**
   ```bash
   npm install -g heroku
   ```

2. **Login**
   ```bash
   heroku login
   ```

3. **Create App**
   ```bash
   heroku create your-bbs-name
   ```

4. **Set Environment Variables**
   ```bash
   heroku config:set SESSION_SECRET=your-secret-key
   ```

5. **Deploy**
   ```bash
   git push heroku main
   ```

6. **Seed Database**
   ```bash
   heroku run npm run seed
   ```

7. **Open**
   ```bash
   heroku open
   ```

### Glitch

1. **Create Glitch Account**
   - Go to [glitch.com](https://glitch.com)
   - Sign up with GitHub

2. **Import Project**
   - Click "New Project"
   - Choose "Import from GitHub"
   - Enter your repository URL

3. **Configure**
   - Click `.env` file
   - Add `SESSION_SECRET=your-secret-key`

4. **Deploy**
   - Glitch auto-deploys on save!

## 🔧 Environment Variables

Create a `.env` file or set these in your hosting platform:

```env
PORT=3000
SESSION_SECRET=your-super-secret-key-change-this
NODE_ENV=production
```

**Generate a secure SESSION_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 📦 Database Considerations

### SQLite (Default)
- ✅ Works great for small to medium BBS
- ✅ No additional setup needed
- ⚠️ File-based (may have issues on some hosting)
- ⚠️ Not ideal for multiple instances

### PostgreSQL (For Production)
For better scalability, consider PostgreSQL:

1. **Install dependencies**
   ```bash
   npm install pg
   ```

2. **Update database connection**
   - Modify `server/db.js` to use PostgreSQL
   - Use connection pooling for better performance

3. **Add to environment**
   ```env
   DATABASE_URL=postgresql://user:password@host:5432/dbname
   ```

## 🌐 Custom Domain

### Railway
1. Go to your project settings
2. Click "Domains"
3. Add your custom domain
4. Update DNS records as shown

### Render
1. Go to your service settings
2. Click "Custom Domains"
3. Add your domain
4. Update DNS records

### Heroku
```bash
heroku domains:add www.yourdomain.com
heroku domains:add yourdomain.com
```

## 🔒 Security Checklist

- [ ] Change default `SESSION_SECRET`
- [ ] Use HTTPS (most platforms do this automatically)
- [ ] Set `NODE_ENV=production`
- [ ] Review and sanitize user inputs
- [ ] Set up rate limiting (consider express-rate-limit)
- [ ] Regular backups of database
- [ ] Keep dependencies updated

## 📊 Monitoring

### Add Logging
```bash
npm install winston
```

### Add Health Check
Add to `server/server.js`:
```javascript
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});
```

## 🚨 Troubleshooting

### Build Fails
- Check Node.js version (needs 18+)
- Verify all dependencies in `package.json`
- Check build logs for specific errors

### Database Issues
- Ensure write permissions for `data/` directory
- Some platforms may need different paths
- Consider using environment variable for DB path

### Socket.io Issues
- Ensure WebSocket support on your platform
- Check firewall settings
- Verify CORS configuration

### Port Issues
- Most platforms set PORT automatically
- Don't hardcode port 3000
- Use `process.env.PORT || 3000`

## 📈 Scaling

### Horizontal Scaling
- Use Redis for Socket.io adapter
- Use PostgreSQL instead of SQLite
- Implement load balancer
- Use CDN for static assets

### Vertical Scaling
- Upgrade instance size
- Add more memory
- Optimize database queries

## 💾 Backup Strategy

### Automated Backups
```bash
# Backup database
cp data/bbs.db backups/bbs-$(date +%Y%m%d).db

# Or use cloud storage
aws s3 cp data/bbs.db s3://your-bucket/backups/
```

### Restore
```bash
cp backups/bbs-20240101.db data/bbs.db
```

## 🎯 Performance Tips

1. **Enable gzip compression**
   ```javascript
   const compression = require('compression');
   app.use(compression());
   ```

2. **Set cache headers**
   ```javascript
   app.use(express.static('public', {
     maxAge: '1d'
   }));
   ```

3. **Use Redis for sessions**
   ```bash
   npm install connect-redis
   ```

## 📞 Support

- Check [README.md](README.md) for full documentation
- Open GitHub issues for bugs
- Join the community discussions

---

**Happy Deploying!** 🚀

*Your BBS is ready to go live!*



