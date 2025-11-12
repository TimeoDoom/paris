const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const dbPath = path.join(__dirname, "data", "pari.db");

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error("Erreur ouverture base SQLite:", err.message);
});

db.serialize(() => {
  db.run(`
        CREATE TABLE IF NOT EXISTS paris (
            id TEXT PRIMARY KEY,
            titre TEXT NOT NULL,
            description TEXT,
      date_creation DATETIME DEFAULT CURRENT_TIMESTAMP,
      dateTarget TEXT,
            votesA INTEGER DEFAULT 0,
            votesB INTEGER DEFAULT 0
        )
    `);

  db.run(`
        CREATE TABLE IF NOT EXISTS votes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            idPari TEXT NOT NULL,
            identifiant TEXT NOT NULL,
            choix TEXT NOT NULL,
            dateVote DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(idPari, identifiant)
        )
    `);
  // Ensure dateTarget column exists for older DBs that may not have it
  db.all("PRAGMA table_info(paris)", (err, cols) => {
    if (err) return;
    const hasDateTarget =
      cols && cols.some((c) => c && c.name === "dateTarget");
    if (!hasDateTarget) {
      db.run("ALTER TABLE paris ADD COLUMN dateTarget TEXT", (err2) => {
        if (err2)
          console.error(
            "Impossible d'ajouter la colonne dateTarget:",
            err2.message
          );
      });
    }
  });
});


module.exports = db;
