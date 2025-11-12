const addBetButton = document.querySelector(".add-bet");
const betGrid = document.querySelector(".bet-grid");

function getAdminPassword() {
  return localStorage.getItem("adminPassword");
}

function setAdminPassword(pwd) {
  if (pwd) localStorage.setItem("adminPassword", pwd);
  else localStorage.removeItem("adminPassword");
}
let adminLoginButton = document.querySelector(".admin-login");
let adminListenerAttached = false;

function ensureAdminButton() {
  // prefer an existing button in the HTML
  if (!adminLoginButton)
    adminLoginButton = document.querySelector(".admin-login");

  // fallback: create one if it's not present
  if (!adminLoginButton) {
    adminLoginButton = document.createElement("button");
    adminLoginButton.className = "admin-login";
    if (addBetButton && addBetButton.parentNode)
      addBetButton.parentNode.insertBefore(
        adminLoginButton,
        addBetButton.nextSibling
      );
    else document.body.appendChild(adminLoginButton);
  }

  if (!adminListenerAttached) {
    adminLoginButton.addEventListener("click", async () => {
      const pwd = getAdminPassword();
      if (!pwd) {
        const answer = prompt("Mot de passe admin :");
        if (!answer) return;

        try {
          const res = await fetch("/admin/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password: answer }),
          });
          if (!res.ok) {
            const j = await res.json().catch(() => ({}));
            alert(j.error || "Mot de passe incorrect");
            return;
          }
          // success
          setAdminPassword(answer);
          updateAdminUI();
        } catch (e) {
          console.error("Erreur verification admin:", e);
          alert("Impossible de vérifier le mot de passe admin (erreur réseau)");
        }
      } else {
        if (confirm("Se déconnecter en tant qu'admin ?")) {
          setAdminPassword(null);
          updateAdminUI();
        }
      }
    });
    adminListenerAttached = true;
  }
}

async function updateAdminUI() {
  const pwd = getAdminPassword();
  ensureAdminButton();
  if (!pwd) {
    if (addBetButton) addBetButton.style.display = "none";
    adminLoginButton.textContent = "Connexion admin";
    return;
  }

  try {
    const res = await fetch("/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pwd }),
    });
    if (res.ok) {
      if (addBetButton) addBetButton.style.display = "inline-block";
      adminLoginButton.textContent = "Déconnexion admin";
    } else {
      setAdminPassword(null);
      if (addBetButton) addBetButton.style.display = "none";
      adminLoginButton.textContent = "Connexion admin";
    }
  } catch (e) {
    console.error("Erreur verification admin au démarrage:", e);
    if (addBetButton) addBetButton.style.display = "none";
    adminLoginButton.textContent = "Connexion admin";
  }
}

updateAdminUI();

const overlay = document.createElement("div");
overlay.classList.add("overlay");

overlay.innerHTML = `
    <div class="overlay-content">
        <h2>Ajouter un nouveau pari</h2>
        <input type="text" placeholder="Nom du pari" />
        <textarea placeholder="Description du pari"></textarea>
        <label>Options de pari : (facultatif)</label>
        <input class="persoOui" type="text" placeholder="oui" />
        <input class="persoNon" type="text" placeholder="non"/>
        <input type="date" />
        <div class="overlay-options">
            <button class="submit-bet">Soumettre le pari</button>
            <button class="close-overlay">Fermer</button>
        </div>
    </div>
`;

addBetButton.addEventListener("click", () => {
  overlay.style.display = "flex";
  if (!document.body.contains(overlay)) document.body.appendChild(overlay);
});

const closeOverlayButton = overlay.querySelector(".close-overlay");
closeOverlayButton.addEventListener("click", () => {
  overlay.style.display = "none";
});

const submitBetButton = overlay.querySelector(".submit-bet");

function updateSlideBar(card) {
  if (!card) return;
  const oui = parseInt(card.dataset.oui, 10) || 0;
  const non = parseInt(card.dataset.non, 10) || 0;
  const total = oui + non;
  const pctOui = total === 0 ? 50 : Math.round((oui / total) * 100);
  const pctNon = 100 - pctOui;
  const green = card.querySelector(".green");
  const red = card.querySelector(".red");
  if (green) green.style.width = pctOui + "%";
  if (red) red.style.width = pctNon + "%";
  const pctOuiEl = card.querySelector(".pct-oui");
  const pctNonEl = card.querySelector(".pct-non");
  if (pctOuiEl) pctOuiEl.textContent = pctOui + "%";
  if (pctNonEl) pctNonEl.textContent = pctNon + "%";
}

function addBetCard(pari) {
  const newBetCard = document.createElement("div");
  newBetCard.classList.add("bet-card");
  newBetCard.dataset.id = pari.id;
  newBetCard.dataset.oui = pari.votesA || 0;
  newBetCard.dataset.non = pari.votesB || 0;

  const dateStr = pari.dateTarget || pari.date_creation || null;
  let daysLeftText = "Date non définie";
  let expired = false;
  if (dateStr) {
    const normalized = dateStr.replace(" ", "T");
    const target = new Date(normalized);
    const today = new Date();
    const todayMid = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    const diffDays = Math.ceil((target - todayMid) / (1000 * 60 * 60 * 24));
    if (!isNaN(diffDays)) {
      if (diffDays >= 0)
        daysLeftText = `${diffDays} jour${diffDays > 1 ? "s" : ""} restants`;
      else {
        daysLeftText = "Date passée";
        expired = true;
      }
    }
  }

  newBetCard.dataset.expired = expired ? "true" : "false";

  newBetCard.innerHTML = `
    <div class="bet-header">
      <h2>${pari.titre}</h2>
      <p class="bet-date"><span class="days-left">${daysLeftText}</span></p>
    </div>
    <p>${pari.description || ""}</p>
    <div class="bet-options">
      <button class="yes">Oui</button>
      <div class="vote-center">
        <div class="slide-bar">
          <div class="green"></div>
          <div class="red"></div>
        </div>
        <div class="pct-text"><span class="pct-oui">50%</span> / <span class="pct-non">50%</span></div>
      </div>
      <button class="no">Non</button>
    </div>
  `;

  betGrid.appendChild(newBetCard);
  updateSlideBar(newBetCard);

  const yes = newBetCard.querySelector(".yes");
  const no = newBetCard.querySelector(".no");

  function markCardVoted(cardEl, choice) {
    const y = cardEl.querySelector(".yes");
    const n = cardEl.querySelector(".no");
    if (y) y.disabled = true;
    if (n) n.disabled = true;
    cardEl.classList.add("voted");
    let badge = cardEl.querySelector(".voted-badge");
    if (!badge) {
      badge = document.createElement("div");
      badge.className = "voted-badge";
      badge.style.marginTop = "8px";
      badge.style.fontSize = "14px";
      badge.style.fontWeight = "600";
      cardEl.querySelector(".bet-header").appendChild(badge);
    }
    if (choice === "A") badge.textContent = "Vous avez voté : Oui";
    else if (choice === "B") badge.textContent = "Vous avez voté : Non";
    else badge.textContent = "Vous avez voté";
  }

  if (expired) {
    if (yes) yes.disabled = true;
    if (no) no.disabled = true;
  }

  try {
    const stored = localStorage.getItem(`voted_${pari.id}`);
    if (stored) {
      const info = JSON.parse(stored);
      markCardVoted(newBetCard, info.choice);
    }
  } catch (e) {
    console.error("Erreur lecture localStorage voted:", e);
  }
}

submitBetButton.addEventListener("click", async () => {
  const betName = overlay.querySelector("input").value.trim();
  const betDescription = overlay.querySelector("textarea").value.trim();
  const dateStr = overlay.querySelector("input[type='date']").value;

  if (!betName) {
    alert("Le nom du pari est obligatoire");
    return;
  }

  const id = crypto.randomUUID();

  const res = await fetch("/create-pari", {
    method: "POST",
    headers: Object.assign(
      { "Content-Type": "application/json" },
      (function () {
        const pwd = localStorage.getItem("adminPassword");
        return pwd ? { "x-admin-password": pwd } : {};
      })()
    ),
    body: JSON.stringify({
      id,
      titre: betName,
      description: betDescription,
      dateStr,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    alert(data.error);
    return;
  }

  addBetCard(data);
  overlay.style.display = "none";
});

document.querySelectorAll(".bet-card").forEach((card) => {
  if (!card.dataset.oui) card.dataset.oui = "0";
  if (!card.dataset.non) card.dataset.non = "0";
  updateSlideBar(card);
});

betGrid.addEventListener("click", (e) => {
  const target = e.target;
  if (!target.classList) return;
  if (target.classList.contains("yes") || target.classList.contains("no")) {
    const card = target.closest(".bet-card");
    if (!card) return;
    if (card.dataset.expired === "true") return;
    const idPari = card.dataset.id;
    const choix = target.classList.contains("yes") ? "A" : "B";
    let uuid = localStorage.getItem("uuid");
    if (!uuid) {
      uuid = crypto.randomUUID();
      localStorage.setItem("uuid", uuid);
    }

    fetch("/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idPari, choix, uuid }),
    })
      .then((r) => r.json().then((j) => ({ ok: r.ok, body: j })))
      .then((resObj) => {
        if (!resObj.ok) {
          alert(resObj.body.error || "Erreur lors du vote");
          return;
        }
        try {
          localStorage.setItem(
            `voted_${idPari}`,
            JSON.stringify({ choice: choix, date: new Date().toISOString() })
          );
        } catch (e) {
          console.error("Erreur écriture localStorage", e);
        }

        const card = document.querySelector(`.bet-card[data-id="${idPari}"]`);
        if (card) {
          const y = card.querySelector(".yes");
          const n = card.querySelector(".no");
          if (y) y.disabled = true;
          if (n) n.disabled = true;
          card.classList.add("voted");
          let badge = card.querySelector(".voted-badge");
          if (!badge) {
            badge = document.createElement("div");
            badge.className = "voted-badge";
            badge.style.marginTop = "8px";
            badge.style.fontSize = "14px";
            badge.style.fontWeight = "600";
            card.querySelector(".bet-header").appendChild(badge);
          }
          badge.textContent =
            choix === "A" ? "Vous avez voté : Oui" : "Vous avez voté : Non";
        }

        loadParis();
      })
      .catch((err) => {
        console.error(err);
        alert("Erreur réseau lors du vote");
      });
  }
});

async function loadParis() {
  try {
    const res = await fetch("/paris");
    if (!res.ok) throw new Error("Erreur chargement paris");
    const rows = await res.json();
    betGrid.innerHTML = "";
    rows.forEach((p) => addBetCard(p));
  } catch (e) {
    console.error(e);
  }
}

document.addEventListener("DOMContentLoaded", loadParis);
