const cards = Array.from(document.querySelectorAll(".quest-card"));
const statusCopy = document.getElementById("status-copy");
const homeScreen = document.getElementById("home-screen");
const areaScreen = document.getElementById("area-screen");

const areas = {
  farm: {
    title: "FARM", skill: "FARMING", image: "assets/farm-area.png",
    imageAlt: "Six pixel-art farm plots beside a cottage, at different stages of growth",
    location: "THE HOMESTEAD", condition: "SPRING · CLEAR",
    stats: [["PLOTS", "6"], ["WATER", "4 / 4"], ["READY", "1"]],
    actions: [
      ["✦", "CHOOSE SEEDS", "Red Berries · Flax", "BAG: 0", "Choose a seed, then select an empty plot."],
      ["≈", "WATER CROPS", "Four pours start growth", "CAN: 4", "Each planted crop needs four pours of water."],
      ["♣", "HARVEST", "Collect ripe produce", "1 READY", "The bright plot is ready to harvest."]
    ]
  },
  forest: {
    title: "FOREST", skill: "LOGGING", image: "assets/forest-area.png",
    imageAlt: "Three pixel-art pine trees of different sizes in a forest clearing",
    location: "AERENDELL WOOD", condition: "SHADED",
    stats: [["TREES", "3"], ["AXE", "WOOD"], ["READY", "1"]],
    actions: [
      ["▲", "TEND SAPLINGS", "Young pines grow with time", "2 GROWING", "Saplings continue growing while you are away."],
      ["╱", "CHOP PINE", "Four swings to fell", "4 HITS", "A grown pine takes four timed axe swings."],
      ["●", "GATHER CONES", "Seeds for future trees", "+1 CONE", "Pine cones return to your inventory."]
    ]
  },
  mine: {
    title: "THE SHAFT", skill: "MINING", image: "assets/mine-area.png",
    imageAlt: "A torchlit pixel-art mine with ladders, platforms and exposed ore veins",
    location: "DEPTH 0M", condition: "2% RISK",
    stats: [["DEPTH", "0M"], ["PICK", "FLINT"], ["CARRIED", "0"]],
    actions: [
      ["▼", "DIG DEEPER", "Find ore · increase risk", "2% RISK", "Every descent can reveal ore or trigger a cave-in."],
      ["◆", "INSPECT VEIN", "Copper · Silver · Stone", "UNKNOWN", "Deeper veins hold rarer materials."],
      ["▲", "SURFACE & BANK", "Make carried ore safe", "BANK: 0", "Return before a cave-in to keep everything carried."]
    ]
  },
  craft: {
    title: "CRAFT BENCH", skill: "CRAFTING", image: "assets/craft-bench-area.png",
    imageAlt: "A warm pixel-art workshop with a wooden bench, hanging tools and glowing forge",
    location: "THE WORKSHOP", condition: "FIRE LIT",
    stats: [["RECIPES", "4"], ["QUEUE", "0"], ["TOOLS", "WOOD"]],
    actions: [
      ["╱", "WOODEN TOOLS", "Axe · Pickaxe · Watering Can", "LOGS + FLINT", "Basic tools unlock the first gathering loops."],
      ["◇", "REFINE MATERIAL", "Logs to planks", "3 LOGS", "Refined parts are used by stronger recipes."],
      ["◉", "CRAFT BUCKLER", "Simple wooden defence", "5 PLANKS", "Craft equipment from gathered materials."]
    ]
  }
};

function selectCard(card) {
  cards.forEach(function (item) {
    const selected = item === card;
    item.classList.toggle("selected", selected);
    if (selected) item.setAttribute("aria-current", "true");
    else item.removeAttribute("aria-current");
  });
  statusCopy.textContent = card.dataset.status;
}

function openArea(id) {
  const area = areas[id];
  if (!area) return;
  document.getElementById("area-title").textContent = area.title;
  document.getElementById("area-skill").textContent = area.skill;
  document.getElementById("area-image").src = area.image;
  document.getElementById("area-image").alt = area.imageAlt;
  document.getElementById("area-location").textContent = area.location;
  document.getElementById("area-condition").textContent = area.condition;
  document.getElementById("area-stats").replaceChildren(...area.stats.map(function (stat) {
    const block = document.createElement("div");
    block.className = "stat-block";
    block.innerHTML = "<small>" + stat[0] + "</small><strong>" + stat[1] + "</strong>";
    return block;
  }));
  document.getElementById("action-list").replaceChildren(...area.actions.map(function (action, index) {
    const button = document.createElement("button");
    button.className = "area-action" + (index === 0 ? " selected" : "");
    button.innerHTML = '<span class="action-icon">' + action[0] + '</span><span><strong>' + action[1] + '</strong><small>' + action[2] + '</small></span><span class="action-cost">' + action[3] + '</span>';
    button.addEventListener("click", function () {
      document.querySelectorAll(".area-action").forEach(function (item) { item.classList.toggle("selected", item === button); });
      document.getElementById("area-tip-copy").textContent = action[4];
    });
    return button;
  }));
  document.getElementById("area-tip-copy").textContent = area.actions[0][4];
  homeScreen.classList.add("hidden");
  areaScreen.classList.remove("hidden");
  areaScreen.scrollIntoView({ block: "start" });
  document.getElementById("area-back").focus();
  history.replaceState(null, "", "#" + id);
}

function closeArea() {
  areaScreen.classList.add("hidden");
  homeScreen.classList.remove("hidden");
  history.replaceState(null, "", location.pathname + location.search);
  const selected = document.querySelector(".quest-card.selected");
  if (selected) selected.focus();
}

cards.forEach(function (card) {
  card.addEventListener("focus", function () { selectCard(card); });
  card.addEventListener("click", function () {
    selectCard(card);
    if (card.dataset.area) openArea(card.dataset.area);
  });
});

document.getElementById("area-back").addEventListener("click", closeArea);

document.querySelector(".forage-action").addEventListener("click", function () {
  statusCopy.textContent = this.dataset.status;
});

document.querySelectorAll(".bottom-nav button").forEach(function (button) {
  button.addEventListener("click", function () {
    document.querySelectorAll(".bottom-nav button").forEach(function (item) { item.classList.toggle("active", item === button); });
    statusCopy.textContent = button.textContent.trim() + " selected";
  });
});

document.addEventListener("keydown", function (event) {
  if (event.key === "Escape" && !areaScreen.classList.contains("hidden")) { closeArea(); return; }
  if (!areaScreen.classList.contains("hidden")) return;
  const current = Math.max(0, cards.indexOf(document.activeElement));
  let next = current;
  if (event.key === "ArrowRight") next = Math.min(cards.length - 1, current + 1);
  if (event.key === "ArrowLeft") next = Math.max(0, current - 1);
  if (event.key === "ArrowDown") next = Math.min(cards.length - 1, current + 2);
  if (event.key === "ArrowUp") next = Math.max(0, current - 2);
  if (next !== current) { event.preventDefault(); cards[next].focus(); }
});

const initialArea = location.hash.slice(1);
if (areas[initialArea]) openArea(initialArea);
