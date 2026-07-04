import sqlite3 from 'sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'app.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error('Database error:', err);
  else console.log('✓ Database connected');
});

export function initializeDatabase() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Create users table
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          full_name TEXT,
          balance REAL DEFAULT 0,
          role TEXT DEFAULT 'user',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) reject(err);
      });

      // Seed DANGO888 user if not exists
      const passwordHash = bcrypt.hashSync('dango888', 10);
      db.run(
        `INSERT OR IGNORE INTO users (username, password, full_name, balance, role) 
         VALUES (?, ?, ?, ?, ?)`,
        ['DANGO888', passwordHash, 'Mr Jose Daniel Gomez Marin', 38433.00, 'user'],
        (err) => {
          if (err) reject(err);
          else {
            console.log('✓ Database initialized with DANGO888 user');
            resolve();
          }
        }
      );
    });
  });
}

export function getUser(username) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

export function getAllUsers() {
  return new Promise((resolve, reject) => {
    db.all('SELECT id, username, full_name, balance, role FROM users', (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

export function updateUserBalance(userId, newBalance) {
  return new Promise((resolve, reject) => {
    db.run('UPDATE users SET balance = ? WHERE id = ?', [newBalance, userId], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

export function updateUserName(userId, fullName) {
  return new Promise((resolve, reject) => {
    db.run('UPDATE users SET full_name = ? WHERE id = ?', [fullName, userId], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

export default db;
