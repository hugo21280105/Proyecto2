document.addEventListener("DOMContentLoaded", () => {
  // === REFERENCIAS DEL DOM ===
  const UI = {
    score: document.getElementById("score"),
    record: document.getElementById("record"),
    square: document.getElementById("square"),
    gameArea: document.getElementById("gameArea"),
    messageBox: document.getElementById("messageBox"),
    comboFlash: document.getElementById("comboFlash"),
    rulesPanel: document.getElementById("rulesPanel"),
    rulesButton: document.getElementById("rulesButton"),
    closeRulesBtn: document.getElementById("closeRulesBtn"),
    shop: document.getElementById("shop"),
    inventoryButton: document.getElementById("inventoryButton"),
    inventoryPanel: document.getElementById("inventoryPanel"),
    inventoryContent: document.getElementById("inventoryContent"),
    closeInventoryBtn: document.getElementById("closeInventoryBtn"),
    menu: document.getElementById("menu"),
    menuButton: document.getElementById("menuButton"),
    resetButton: document.getElementById("resetButton"),
    backToGameBtn: document.getElementById("backToGameBtn"),
  };

  // === ESTADO DEL JUEGO ===
  let score = 0;
  let record = 0;
  let equippedSword = 0; // Nivel actual de espada (0 = ninguna)
  let swordBonus = 0;
  let startTime = 0;
  let timer = null;
  let gameActive = true;

  // Combo
  let comboActive = false;
  let comboHits = 0;
  let comboTimer = null;

  // === LOCALSTORAGE ===
  const storage = {
    set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
    get: (k, def = null) => {
      const v = localStorage.getItem(k);
      return v ? JSON.parse(v) : def;
    },
    remove: (k) => localStorage.removeItem(k),
  };

  // === MENSAJES ===
  function showMessage(html, color = "white") {
    UI.messageBox.innerHTML = html;
    UI.messageBox.style.color = color;
    UI.messageBox.classList.add("show");
    clearTimeout(showMessage.timeout);
    showMessage.timeout = setTimeout(() => {
      UI.messageBox.classList.remove("show");
    }, 2000);
  }

  // === DATOS DE LAS ESPADAS ===
  const swords = [
    { name: "Espada de Madera", bonus: 1, cost: 20, color: "#8fd18f" },
    { name: "Espada de Piedra", bonus: 1, cost: 60, color: "#aaa" },
    { name: "Espada de Hierro", bonus: 2, cost: 150, color: "#c0c0c0" },
    { name: "Espada de Oro", bonus: 3, cost: 400, color: "gold" },
    { name: "Espada de Cristal", bonus: 1, cost: 800, color: "cyan" },
    { name: "Espada Legendaria", bonus: 3, cost: 2000, color: "orange" },
  ];

  function getSwordBonus(level) {
    if (level <= 0) return 0;
    return swords.slice(0, level).reduce((sum, s) => sum + s.bonus, 0);
  }

  // === GUARDAR / CARGAR ===
  function saveProgress() {
    storage.set("score", score);
    storage.set("record", record);
    storage.set("equippedSword", equippedSword);
  }

  function loadProgress() {
    score = storage.get("score", 0);
    record = storage.get("record", 0);
    equippedSword = storage.get("equippedSword", 0);
    swordBonus = getSwordBonus(equippedSword);
    updateUI();
  }

  // === ACTUALIZAR INTERFAZ ===
  function updateUI() {
    UI.score.textContent = `💰 Monedas: ${score}`;
    UI.record.textContent = `🏆 Récord: ${record}`;
    renderShop();
    renderInventory();
  }

  // === PARTÍCULAS ===
  function createParticles(x, y, color = "lime") {
    for (let i = 0; i < 10; i++) {
      const p = document.createElement("div");
      p.style.position = "absolute";
      p.style.width = "6px";
      p.style.height = "6px";
      p.style.borderRadius = "50%";
      p.style.background = color;
      p.style.left = `${x}px`;
      p.style.top = `${y}px`;
      p.style.pointerEvents = "none";
      p.style.opacity = "1";
      p.style.transition = "transform 700ms cubic-bezier(.2,.8,.2,1), opacity 700ms";
      UI.gameArea.appendChild(p);

      const dx = (Math.random() - 0.5) * 160;
      const dy = (Math.random() - 0.5) * 120;
      requestAnimationFrame(() => {
        p.style.transform = `translate(${dx}px, ${dy}px)`;
        p.style.opacity = "0";
      });
      setTimeout(() => p.remove(), 800);
    }
  }

  // === SACUDIDA ===
  function shakeArea() {
    UI.gameArea.style.animation = "shake 0.35s";
    setTimeout(() => (UI.gameArea.style.animation = ""), 350);
  }

  // === EFECTO COMBO ===
  function showComboFlash() {
    UI.comboFlash.classList.add("show");
  }
  function hideComboFlash() {
    UI.comboFlash.classList.remove("show");
  }

  // === SCORE ===
  function updateScore(points) {
    const applied = comboActive && points > 0 ? (points + swordBonus) * 2 : points + swordBonus;
    score += applied;

    if (score > record) {
      record = score;
      showMessage("🏆 ¡Nuevo récord!", "gold");
    }

    saveProgress();
    updateUI();

    if (applied > 0) {
      const color = comboActive ? "yellow" : "lime";
      showMessage(`+${applied} monedas${comboActive ? " (x2)" : ""}`, color);
      const sx = UI.square.offsetLeft + UI.square.offsetWidth / 2;
      const sy = UI.square.offsetTop + UI.square.offsetHeight / 2;
      createParticles(sx, sy, comboActive ? "gold" : "lime");
    } else {
      showMessage(`${applied} monedas`, "red");
      resetCombo();
      shakeArea();
    }
  }

  // === COMBO ===
  function addComboHit() {
    comboHits++;
    if (comboHits >= 3 && !comboActive) {
      comboActive = true;
      showComboFlash();
      showMessage("⚡ ¡Combo x2 activado!", "yellow");
    }
    clearTimeout(comboTimer);
    comboTimer = setTimeout(() => resetCombo(), 2500);
  }

  function resetCombo() {
    if (comboActive) showMessage("Combo perdido 😞", "orange");
    comboActive = false;
    comboHits = 0;
    hideComboFlash();
    clearTimeout(comboTimer);
  }

  // === APARICIÓN DEL CUADRADO ===
  function spawnSquare() {
    if (!gameActive) return;
    clearTimeout(timer);

    UI.square.style.display = "block";
    UI.square.style.visibility = "hidden";

    const areaRect = UI.gameArea.getBoundingClientRect();
    const sqRect = UI.square.getBoundingClientRect();
    const squareW = sqRect.width || 60;
    const squareH = sqRect.height || 60;

    const maxX = Math.max(0, areaRect.width - squareW);
    const maxY = Math.max(0, areaRect.height - squareH);

    const x = Math.random() * maxX;
    const y = Math.random() * maxY;

    UI.square.style.left = `${x}px`;
    UI.square.style.top = `${y}px`;
    UI.square.style.visibility = "visible";

    startTime = Date.now();
    const baseTime = 1500;

    timer = setTimeout(() => {
      if (!gameActive) return;
      UI.square.style.display = "none";
      updateScore(-2);
      showMessage("❌ ¡Demasiado lento!", "red");
      spawnSquare();
    }, baseTime);
  }

  // === CLICK ===
  UI.square.addEventListener("pointerdown", () => {
    if (!gameActive) return;
    const reaction = Date.now() - startTime;
    clearTimeout(timer);
    UI.square.style.display = "none";

    let points = 0;
    if (reaction <= 600) points = 3;
    else if (reaction <= 1000) points = 2;
    else if (reaction <= 1500) points = 1;
    else points = -1;

    updateScore(points);
    if (points > 0) addComboHit();
    setTimeout(spawnSquare, 120);
  });

  // === TIENDA ===
  function renderShop() {
    UI.shop.innerHTML = "";
    const title = document.createElement("h3");
    title.textContent = "🛒 Tienda del Bosque";
    title.style.textShadow = "0 0 8px #0f0";
    UI.shop.appendChild(title);

    swords.forEach((sword, index) => {
      const level = index + 1;
      const itemDiv = document.createElement("div");
      itemDiv.className = "shop-item";
      const owned = equippedSword >= level;

      if (!owned && equippedSword + 1 === level) {
        itemDiv.innerHTML = `
          <strong style="color:${sword.color};">${sword.name}</strong> - 
          <span style="color:gold;">${sword.cost}💰</span><br>
          <small>+${sword.bonus} monedas por toque</small><br>
        `;
        const btn = document.createElement("button");
        btn.textContent = "Comprar";
        btn.style.background = `linear-gradient(90deg, ${sword.color}, #222)`;
        btn.onclick = () => {
          if (score >= sword.cost) {
            score -= sword.cost;
            equippedSword = level;
            swordBonus = getSwordBonus(equippedSword);
            saveProgress();
            updateUI();
            showMessage(`🗡️ ¡Has comprado la ${sword.name}!`, sword.color);
          } else {
            showMessage("No tienes suficientes monedas.", "red");
          }
        };
        itemDiv.appendChild(btn);
      } else if (owned) {
        itemDiv.innerHTML = `<span style="color:${sword.color}">✅ ${sword.name} equipada</span><br><small>+${sword.bonus} monedas</small>`;
      } else {
        itemDiv.innerHTML = `<span style="color:gray;">🔒 ${sword.name} (Desbloquea la anterior)</span>`;
      }

      UI.shop.appendChild(itemDiv);
    });
  }

  // === INVENTARIO ===
  function renderInventory() {
    if (equippedSword === 0) {
      UI.inventoryContent.textContent = "Inventario vacío";
    } else {
      const sword = swords[equippedSword - 1];
      UI.inventoryContent.innerHTML = `🗡️ ${sword.name} equipada (+${getSwordBonus(equippedSword)} monedas por toque)`;
    }
  }

  // === INVENTARIO TOGGLE ===
  function toggleInventory() {
    const open = UI.inventoryPanel.style.display === "block";
    if (open) {
      UI.inventoryPanel.style.display = "none";
      resumeGame();
    } else {
      pauseGame();
      renderInventory();
      UI.inventoryPanel.style.display = "block";
    }
  }

  UI.inventoryButton.addEventListener("click", toggleInventory);
  UI.closeInventoryBtn.addEventListener("click", toggleInventory);

  // === MENÚ ===
  UI.menuButton.addEventListener("click", () => {
    pauseGame();
    UI.menu.style.display = "flex";
  });
  UI.backToGameBtn.addEventListener("click", () => {
    UI.menu.style.display = "none";
    resumeGame();
  });
  UI.resetButton.addEventListener("click", () => {
    score = 0;
    equippedSword = 0;
    swordBonus = 0;
    resetCombo();
    storage.remove("score");
    storage.remove("equippedSword");
    storage.remove("record");
    updateUI();
    showMessage("Progreso reiniciado (el récord se mantiene)", "orange");
  });

  // === REGLAS ===
  let rulesVisible = false;
  UI.rulesButton.addEventListener("click", () => {
    rulesVisible = !rulesVisible;
    UI.rulesPanel.style.display = rulesVisible ? "block" : "none";
  });
  UI.closeRulesBtn?.addEventListener("click", () => {
    rulesVisible = false;
    UI.rulesPanel.style.display = "none";
  });

  // === PAUSAR / REANUDAR ===
  function pauseGame() {
    gameActive = false;
    clearTimeout(timer);
    UI.square.style.display = "none";
  }
  function resumeGame() {
    if (gameActive) return;
    gameActive = true;
    spawnSquare();
  }

  // === ATAJOS ===
  document.addEventListener("keydown", (e) => {
    const key = e.key.toLowerCase();
    if (key === "i") toggleInventory();
    if (key === "m") UI.menuButton.click();
  });

  // === INICIO ===
  loadProgress();
  spawnSquare();
});
