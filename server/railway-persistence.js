// Railway persistence helper
const fs = require('fs');
const path = require('path');

// Get database path for Railway
function getDatabasePath() {
  if (process.env.RAILWAY_ENVIRONMENT) {
    // On Railway, use /tmp directory (persistent across deployments)
    const dataDir = '/tmp';
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    return path.join(dataDir, 'bbs.db');
  } else {
    // Local development
    return path.join(__dirname, '../data/bbs.db');
  }
}

module.exports = {
  getDatabasePath
};
