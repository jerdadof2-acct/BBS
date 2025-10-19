// Database adapter for SQLite (local) and PostgreSQL (Railway)
const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');

class DatabaseAdapter {
  constructor() {
    this.isPostgreSQL = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    this.db = null;
    this.pool = null;
  }

  async connect() {
    if (this.isPostgreSQL) {
      // Use PostgreSQL on Railway
      this.pool = new Pool({
        connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
        ssl: { rejectUnauthorized: false }
      });
      console.log('Connected to PostgreSQL database');
    } else {
      // Use SQLite locally
      this.db = new sqlite3.Database('./data/bbs.db');
      console.log('Connected to SQLite database');
    }
  }

  async query(sql, params = []) {
    if (this.isPostgreSQL) {
      const client = await this.pool.connect();
      try {
        const result = await client.query(sql, params);
        return result.rows;
      } finally {
        client.release();
      }
    } else {
      return new Promise((resolve, reject) => {
        this.db.all(sql, params, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
    }
  }

  async get(sql, params = []) {
    if (this.isPostgreSQL) {
      const client = await this.pool.connect();
      try {
        const result = await client.query(sql, params);
        return result.rows[0] || null;
      } finally {
        client.release();
      }
    } else {
      return new Promise((resolve, reject) => {
        this.db.get(sql, params, (err, row) => {
          if (err) reject(err);
          else resolve(row || null);
        });
      });
    }
  }

  async run(sql, params = []) {
    if (this.isPostgreSQL) {
      const client = await this.pool.connect();
      try {
        const result = await client.query(sql, params);
        return { lastID: result.rows[0]?.id || result.insertId || 0, changes: result.rowCount || 0 };
      } finally {
        client.release();
      }
    } else {
      return new Promise((resolve, reject) => {
        this.db.run(sql, params, function(err) {
          if (err) reject(err);
          else resolve({ lastID: this.lastID, changes: this.changes });
        });
      });
    }
  }

  async close() {
    if (this.isPostgreSQL && this.pool) {
      await this.pool.end();
    } else if (this.db) {
      this.db.close();
    }
  }
}

module.exports = DatabaseAdapter;
