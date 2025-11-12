const express = require("express");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const db = require("./database");

const app = express();
app.use(bodyParser.json());
app.use(cookieParser());
app.use(express.static("public"));
app.set("trust proxy", true);

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});

function getClientIp(req) {
  return (req.headers["x-forwarded-for"] || req.ip || "").split(",")[0].trim();
}

app.get("/paris", (req, res) => {
  db.all("SELECT * FROM paris", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Admin login/verify endpoint - verifies provided password against ADMIN_PASSWORD env
app.post("/admin/login", (req, res) => {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    // server not configured with admin password
    return res
      .status(500)
      .json({ error: "ADMIN_PASSWORD not configured on server" });
  }

  const { password } = req.body || {};
  if (!password) return res.status(400).json({ error: "password required" });

  if (password === adminPassword) return res.json({ ok: true });

  return res.status(401).json({ error: "Incorrect admin password" });
});

app.post("/create-pari", (req, res) => {
  const { id, titre, description, dateStr, optionA, optionB } = req.body;
  if (!id || !titre)
    return res.status(400).json({ error: "id et titre requis" });

  const adminPassword = process.env.ADMIN_PASSWORD;
  if (adminPassword) {
    const provided = req.headers["x-admin-password"];
    if (!provided || provided !== adminPassword) {
      return res
        .status(401)
        .json({ error: "Admin password required or incorrect" });
    }
  }

  db.run(
    "INSERT INTO paris (id, titre, description, dateTarget, optionA, optionB) VALUES (?, ?, ?, ?, ?, ?)",
    [
      id,
      titre,
      description || null,
      dateStr || null,
      optionA || "Oui",
      optionB || "Non",
    ],
    function (err) {
      if (err) {
        return res.status(409).json({ error: err.message });
      }

      db.get("SELECT * FROM paris WHERE id = ?", [id], (err2, row) => {
        if (err2) return res.status(500).json({ error: err2.message });
        res.json(row);
      });
    }
  );
});

app.post("/vote", (req, res) => {
  const { idPari, choix, uuid } = req.body;
  if (!idPari || !choix)
    return res.status(400).json({ error: "Champs manquants" });

  const ip = getClientIp(req);
  const identifiant = `${ip}|${uuid}`;

  db.serialize(() => {
    db.get(
      "SELECT * FROM votes WHERE idPari = ? AND identifiant = ?",
      [idPari, identifiant],
      (err, row) => {
        if (row)
          return res.status(409).json({ error: "Déjà voté pour ce pari" });

        db.run(
          'INSERT INTO votes (idPari, identifiant, choix, dateVote) VALUES (?, ?, ?, datetime("now"))',
          [idPari, identifiant, choix],
          (err2) => {
            if (err2) return res.status(500).json({ error: err2.message });

            const col = choix === "A" ? "votesA" : "votesB";
            db.run(
              `UPDATE paris SET ${col} = ${col} + 1 WHERE id = ?`,
              [idPari],
              (err3) => {
                if (err3) return res.status(500).json({ error: err3.message });
                res.json({ ok: true });
              }
            );
          }
        );
      }
    );
  });
});
