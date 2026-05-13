const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./bot.db");

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      telegram_id INTEGER PRIMARY KEY,
      age INTEGER,
      weight REAL,
      height REAL,
      sex TEXT,
      activity_level REAL,
      bmr REAL,
      tdee REAL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS meals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      raw_text TEXT,
      calories_estimated REAL DEFAULT 0,
      timestamp TEXT
    )
  `);
});

module.exports = db;