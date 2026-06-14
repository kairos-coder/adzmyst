// ═══════════════════════════════════════════════════════════════
// ADZMYST · AIR REALM ENGINE
// Shared by all air_XX.html files. Handles:
//   - CSS 3D room rendering
//   - Palette application from JSON
//   - Exit navigation (fade transitions)
//   - Save/load state
//   - HUD + minimap
//   - Puzzle registration
// ═══════════════════════════════════════════════════════════════

// ── CANON DATA (loaded once, cached) ──────────────────────────
let GLYPHS = [];
let AGE = null;
let PALETTE = null;
let ROOM_TEMPLATES = [];
let sacredSeven = [];
let _canonLoaded = false;

const AGE_ID = 'air';
const GRID_SIZE = 3;       // 3×3 grid
const TOTAL_ROOMS = 9;
const LSK = `adzmyst_${AGE_ID}`; // localStorage key

// ── STATE ─────────────────────────────────────────────────────
// Persisted across rooms via localStorage
let RealmState = {
  currentRoom: 1,          // 1-9
  visited: Array(TOTAL_ROOMS + 1).fill(false),
  solved: Array(TOTAL_ROOMS + 1).fill(false),
  facing: 0,               // 0=N, 90=E, 180=S, 270=W
  inventory: [],           // glyph keys collected
};

// ── ROOM DATA (set by each air_XX.html before engine init) ────
let ROOM_ID = 1;
let ROOM_TEMPLATE = '';
let EXITS = { north: null, south: null, east: null, west: null };
let PUZZLE_TYPE = null;
let PUZZLE = null;          // Puzzle instance with .init() and .check()

// ── JSON LOADER ───────────────────────────────────────────────
async function loadJSON(path) {
  const res = await fetch(`../json/${path}`);
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  return res.json();
}

async function loadCanon() {
  if (_canonLoaded) return true;
  try {
    const [glyphsData, agesData, palettesData, roomsData] = await Promise.all([
      loadJSON('glyphs.json'),
      loadJSON('ages.json'),
      loadJSON('palettes.json'),
      loadJSON('rooms.json'),
    ]);

    GLYPHS = glyphsData.glyphs;
    sacredSeven = glyphsData.meta.sacredSeven;
    AGE = agesData.ages.find(a => a.id === AGE_ID);
    PALETTE = palettesData.palettes[AGE_ID] || palettesData.palettes.air;
    ROOM_TEMPLATES = roomsData.templates[AGE_ID] || [];

    if (!AGE) throw new Error(`Age "${AGE_ID}" not found`);
    _canonLoaded = true;
    return true;
  } catch (err) {
    console.error('[Engine] Canon load failed:', err);
    return false;
  }
}

// ── PALETTE APPLICATION ───────────────────────────────────────
function applyPalette() {
  if (!PALETTE) return;
  const r = document.documentElement.style;
  r.setProperty('--age-accent', PALETTE.portal);
  r.setProperty('--age-pale', PALETTE.silverBright);
  r.setProperty('--silver', PALETTE.silver);
  r.setProperty('--breath', PALETTE.silverBright);
  r.setProperty('--gold', PALETTE.gold);
  r.setProperty('--gold-dim', PALETTE.silverDark);
  r.setProperty('--unlock', PALETTE.unlock);
  r.setProperty('--danger', '#c87070');
  r.setProperty('--sky-deep', PALETTE.secondary);
  r.setProperty('--sky-mid', PALETTE.accent);
  r.setProperty('--void', PALETTE.twilightDeep || '#07080f');
}

// ── SAVE / LOAD ──────────────────────────────────────────────
function saveRealm() {
  RealmState.currentRoom = ROOM_ID;
  RealmState.visited[ROOM_ID] = true;
  localStorage.setItem(LSK, JSON.stringify(RealmState));
}

function loadRealm() {
  try {
    const raw = localStorage.getItem(LSK);
    if (raw) {
      const data = JSON.parse(raw);
      RealmState = { ...RealmState, ...data };
    }
  } catch(e) {
    console.warn('[Engine] Could not load realm state');
  }
}

function isPuzzleSolved(roomId) {
  return RealmState.solved[roomId] === true;
}

function markPuzzleSolved(roomId) {
  RealmState.solved[roomId] = true;
  saveRealm();
}

function allPuzzlesSolved() {
  // Rooms with puzzles: 2, 3, 4, 5, 6, 8
  const puzzleRooms = [2, 3, 4, 5, 6, 8];
  return puzzleRooms.every(id => RealmState.solved[id]);
}

// ── FADE TRANSITION ──────────────────────────────────────────
function fadeTo(url) {
  const fade = document.getElementById('fade');
  fade.classList.add('active');
  setTimeout(() => {
    window.location.href = url;
  }, 500);
}

// ── EXIT NAVIGATION ──────────────────────────────────────────
function navigate(direction) {
  const target = EXITS[direction];
  if (!target) return;

  // Set facing for arrival at target room
  const oppositeFacings = { north: 180, south: 0, east: 270, west: 90 };
  RealmState.facing = oppositeFacings[direction];
  saveRealm();
  fadeTo(target);
}

function returnToAtrium() {
  saveRealm();
  fadeTo('../index.html');
}

// ── HUD ──────────────────────────────────────────────────────
function updateHUD() {
  const template = ROOM_TEMPLATES.find(t => t.id === ROOM_TEMPLATE);
  const roomName = template ? template.name : `Room ${ROOM_ID}`;

  document.getElementById('hud-room').textContent =
    `${AGE?.name || 'Air'} · ${roomName}`;

  document.getElementById('hud-glyphs').textContent =
    sacredSeven.map(i => GLYPHS[i]?.symbol || '?').join(' ');

  document.getElementById('breadcrumb').textContent =
    `Atrium · ${AGE?.name || 'Air'} · ${roomName}`;

  // Progress bar
  const solved = Object.values(RealmState.solved).filter(Boolean).length;
  const total = 6;
  document.getElementById('hud-progress').textContent =
    `Puzzles: ${solved}/${total}`;

  drawMinimap();
}

// ── MINIMAP ──────────────────────────────────────────────────
// Room positions on the 3×3 grid (row-major, 1-indexed)
//  1 2 3
//  4 5 6
//  7 8 9
const ROOM_POSITIONS = {
  1: { row: 0, col: 0 }, 2: { row: 0, col: 1 }, 3: { row: 0, col: 2 },
  4: { row: 1, col: 0 }, 5: { row: 1, col: 1 }, 6: { row: 1, col: 2 },
  7: { row: 2, col: 0 }, 8: { row: 2, col: 1 }, 9: { row: 2, col: 2 },
};

// Connection map: which rooms connect to which
const ROOM_CONNECTIONS = {
  1: { north: 4, south: null, east: 2, west: null },
  2: { north: 5, south: null, east: 3, west: 1 },
  3: { north: 6, south: null, east: null, west: 2 },
  4: { north: 7, south: 1, east: 5, west: null },
  5: { north: 8, south: 2, east: 6, west: 4 },
  6: { north: 9, south: 3, east: null, west: 5 },
  7: { north: null, south: 4, east: 8, west: null },
  8: { north: null, south: 5, east: 9, west: 7 },
  9: { north: null, south: 6, east: null, west: 8 },
};

function drawMinimap() {
  const canvas = document.getElementById('minimap-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const size = canvas.width;
  const cellSize = size / GRID_SIZE;
  const padding = cellSize * 0.15;

  ctx.clearRect(0, 0, size, size);

  // Draw cells
  for (let id = 1; id <= TOTAL_ROOMS; id++) {
    const pos = ROOM_POSITIONS[id];
    const x = pos.col * cellSize + padding;
    const y = pos.row * cellSize + padding;
    const w = cellSize - padding * 2;
    const h = cellSize - padding * 2;

    // Fill
    if (id === ROOM_ID) {
      ctx.fillStyle = 'rgba(122, 184, 212, 0.3)';
    } else if (RealmState.visited[id]) {
      ctx.fillStyle = 'rgba(200, 168, 74, 0.12)';
    } else {
      ctx.fillStyle = 'rgba(20, 35, 65, 0.4)';
    }
    ctx.fillRect(x, y, w, h);

    // Border
    if (id === ROOM_ID) {
      ctx.strokeStyle = 'rgba(122, 184, 212, 0.8)';
      ctx.lineWidth = 1.5;
    } else if (RealmState.visited[id]) {
      ctx.strokeStyle = 'rgba(200, 168, 74, 0.4)';
      ctx.lineWidth = 0.8;
    } else {
      ctx.strokeStyle = 'rgba(74, 122, 170, 0.2)';
      ctx.lineWidth = 0.5;
    }
    ctx.strokeRect(x, y, w, h);

    // Puzzle solved dot
    if (RealmState.solved[id]) {
      ctx.fillStyle = '#a8d890';
      ctx.beginPath();
      ctx.arc(x + w - 6, y + 6, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Current room indicator
    if (id === ROOM_ID) {
      ctx.fillStyle = '#7ab8d4';
      ctx.beginPath();
      ctx.arc(x + w / 2, y + h / 2, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Locked sanctum
    if (id === 9 && !allPuzzlesSolved()) {
      ctx.fillStyle = 'rgba(200, 168, 74, 0.15)';
      ctx.fillRect(x, y, w, h);
      ctx.font = `${cellSize * 0.3}px serif`;
      ctx.fillStyle = 'rgba(200, 168, 74, 0.5)';
      ctx.textAlign = 'center';
      ctx.fillText('𐤎', x + w / 2, y + h / 2 + cellSize * 0.1);
    }
  }

  // Draw connections
  for (let id = 1; id <= TOTAL_ROOMS; id++) {
    const conns = ROOM_CONNECTIONS[id];
    const pos = ROOM_POSITIONS[id];
    const cx = pos.col * cellSize + cellSize / 2;
    const cy = pos.row * cellSize + cellSize / 2;

    for (const [dir, target] of Object.entries(conns)) {
      if (target === null) continue;
      if (!RealmState.visited[id] && !RealmState.visited[target]) continue;

      const tpos = ROOM_POSITIONS[target];
      const tx = tpos.col * cellSize + cellSize / 2;
      const ty = tpos.row * cellSize + cellSize / 2;

      ctx.strokeStyle = 'rgba(74, 122, 170, 0.25)';
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(tx, ty);
      ctx.stroke();
    }
  }
}

// ── ROOM BUILDER ─────────────────────────────────────────────
function buildRoom() {
  const north = document.getElementById('face-north');
  const template = ROOM_TEMPLATES.find(t => t.id === ROOM_TEMPLATE);
  const roomData = template || { name: `Room ${ROOM_ID}`, atmosphere: '', description: '' };

  // Sacred glyphs string
  const sacredStr = sacredSeven.map(i => GLYPHS[i]?.symbol || '?').join(' ');

  // Build content
  let content = `
    <div class="room-content">
      <div class="room-title">${roomData.name}</div>
      <div class="room-subtitle">${AGE?.name || 'Air'} · Chamber ${ROOM_ID} of ${TOTAL_ROOMS}</div>
      <div class="room-lore">${roomData.atmosphere || roomData.description || ''}</div>
      <div class="room-glyph-wall">${sacredStr}</div>
  `;

  // Puzzle area (if this room has a puzzle)
  if (PUZZLE_TYPE && !isPuzzleSolved(ROOM_ID)) {
    content += `<div class="puzzle-container" id="puzzle-container"></div>`;
  } else if (PUZZLE_TYPE && isPuzzleSolved(ROOM_ID)) {
    content += `
      <div class="puzzle-solved">
        <span style="font-size:2rem;color:var(--unlock);">𐤕</span>
        <p style="color:var(--unlock);font-family:Cinzel,serif;font-size:0.7rem;letter-spacing:0.2em;">PUZZLE COMPLETE</p>
      </div>
    `;
  }

  // Exits
  content += `<div class="exits-row">`;
  const exitDirs = ['north', 'south', 'east', 'west'];
  const exitIcons = { north: '▲', south: '▼', east: '►', west: '◄' };
  const exitLabels = { north: 'North', south: 'South', east: 'East', west: 'West' };

  exitDirs.forEach(dir => {
    if (EXITS[dir]) {
      // Special handling for sanctum if not all puzzles solved
      const isSanctum = ROOM_ID === 9;
      const locked = isSanctum && !allPuzzlesSolved();
      const cls = locked ? 'exit-arch locked' : 'exit-arch';
      const label = locked ? 'LOCKED' : exitLabels[dir];
      const onclick = locked
        ? `onclick="alert('Solve all six puzzles before the Sanctum opens.')"`
        : `onclick="navigate('${dir}')"`;

      content += `
        <div class="${cls}" ${onclick}>
          <span class="exit-icon">${exitIcons[dir]}</span>
          <span class="exit-label">${label}</span>
        </div>
      `;
    }
  });
  content += `</div>`;

  // Close room-content
  content += `</div>`;

  north.innerHTML = content;
}

// ── WIND STREAKS ──────────────────────────────────────────────
function createWindStreaks() {
  const container = document.getElementById('wind-streaks');
  if (!container) return;
  container.innerHTML = '';
  const positions = [18, 30, 45, 55, 68, 78, 88];
  positions.forEach((top, i) => {
    const streak = document.createElement('div');
    streak.className = 'wind-streak';
    streak.style.top = top + '%';
    streak.style.width = (40 + Math.random() * 45) + 'vw';
    streak.style.setProperty('--dur', (3.5 + Math.random() * 5) + 's');
    streak.style.setProperty('--delay', (i * 0.7) + 's');
    container.appendChild(streak);
  });
}

// ── KEYBOARD ──────────────────────────────────────────────────
function setupKeyboard() {
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') returnToAtrium();
    if (e.key === 'ArrowUp' || e.key === 'w')    { if (EXITS.north) navigate('north'); }
    if (e.key === 'ArrowDown' || e.key === 's')  { if (EXITS.south) navigate('south'); }
    if (e.key === 'ArrowRight' || e.key === 'd') { if (EXITS.east)  navigate('east');  }
    if (e.key === 'ArrowLeft' || e.key === 'a')  { if (EXITS.west)  navigate('west');  }
    if (e.key === 'm' || e.key === 'M') {
      // Toggle minimap
      const mm = document.getElementById('minimap-container');
      if (mm) mm.classList.toggle('visible');
    }
  });
}

// ── LOG ──────────────────────────────────────────────────────
const logLines = [];
function addLog(msg) {
  logLines.unshift(msg);
  if (logLines.length > 4) logLines.pop();
  const el = document.getElementById('log');
  if (el) el.innerHTML = logLines.map(l => `<div>${l}</div>`).join('');
}

// ── INIT ──────────────────────────────────────────────────────
async function initEngine() {
  const ok = await loadCanon();
  if (!ok) {
    document.body.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;height:100vh;
        color:var(--danger);font-family:Cinzel,serif;text-align:center;padding:2rem;">
        <div>
          <p style="font-size:1.5rem;margin-bottom:1rem;">𐤆</p>
          <p>Failed to load the Air Realm.</p>
          <p style="margin-top:1rem;"><a href="../index.html" style="color:var(--gold);">Return to the Atrium</a></p>
        </div>
      </div>`;
    return;
  }

  applyPalette();
  loadRealm();

  // If arriving from another room, use the saved facing
  if (RealmState.currentRoom === ROOM_ID && RealmState.facing !== 0) {
    document.getElementById('scene').style.transform = `rotateY(${RealmState.facing}deg)`;
  }

  // Mark visited
  RealmState.visited[ROOM_ID] = true;
  saveRealm();

  buildRoom();
  createWindStreaks();
  setupKeyboard();
  updateHUD();

  // Initialize puzzle if present and unsolved
  if (PUZZLE_TYPE && !isPuzzleSolved(ROOM_ID) && PUZZLE && PUZZLE.init) {
    PUZZLE.init();
  }

  // Update minimap after a short delay (canvas needs to be ready)
  setTimeout(drawMinimap, 100);

  const template = ROOM_TEMPLATES.find(t => t.id === ROOM_TEMPLATE);
  const roomName = template ? template.name : `Chamber ${ROOM_ID}`;
  addLog(`You enter ${roomName}`);

  if (PUZZLE_TYPE && !isPuzzleSolved(ROOM_ID)) {
    addLog('A puzzle awaits');
  }
}
