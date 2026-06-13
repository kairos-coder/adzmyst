/**
 * Adzmyst Game — State Management
 * Inventory, progress, schism choice, persistence
 */

const AdzmystGame = {
  version: '1.0.0',
  
  // Default state
  state: {
    schism: null,           // 'adzmist' (Ishtar) or 'adzmyst' (Yod)
    collectedGlyphs: [],    // Array of glyph symbols collected
    completedRooms: [],     // Array of room IDs completed
    currentRoom: 'threshold',
    puzzles: {
      aleph: false,
      dalet: false,
      zayin: false,
      mem: false,
      yod: false,
      samekh: false,
      taw: false
    }
  },
  
  // Initialize or load saved game
  init() {
    const saved = localStorage.getItem('adzmyst_game');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        this.state = { ...this.state, ...parsed };
      } catch(e) { console.warn('Failed to load saved game'); }
    }
  },
  
  // New game
  newGame() {
    this.state = {
      schism: null,
      collectedGlyphs: [],
      completedRooms: [],
      currentRoom: 'threshold',
      puzzles: {
        aleph: false,
        dalet: false,
        zayin: false,
        mem: false,
        yod: false,
        samekh: false,
        taw: false
      }
    };
    this.save();
  },
  
  // Save current state
  save() {
    localStorage.setItem('adzmyst_game', JSON.stringify(this.state));
    localStorage.setItem('adzmyst_current_room', this.state.currentRoom);
  },
  
  // Load saved game
  loadGame() {
    const saved = localStorage.getItem('adzmyst_game');
    if (saved) {
      try {
        this.state = JSON.parse(saved);
        this.save();
        return true;
      } catch(e) { return false; }
    }
    return false;
  },
  
  // Collect a glyph
  collectGlyph(glyph) {
    if (!this.state.collectedGlyphs.includes(glyph)) {
      this.state.collectedGlyphs.push(glyph);
      this.save();
      return true;
    }
    return false;
  },
  
  // Complete a puzzle
  completePuzzle(puzzleId) {
    if (!this.state.puzzles[puzzleId]) {
      this.state.puzzles[puzzleId] = true;
      this.save();
      return true;
    }
    return false;
  },
  
  // Complete a room
  completeRoom(roomId) {
    if (!this.state.completedRooms.includes(roomId)) {
      this.state.completedRooms.push(roomId);
      this.state.currentRoom = roomId;
      this.save();
      return true;
    }
    return false;
  },
  
  // Set schism choice
  setSchism(choice) {
    if (choice === 'adzmist' || choice === 'adzmyst') {
      this.state.schism = choice;
      this.save();
      return true;
    }
    return false;
  },
  
  // Check if a room is accessible
  isRoomAccessible(roomId) {
    const order = ['threshold', 'door-chamber', 'blade-room', 'deep-well', 'hand-chamber', 'pillar-hall', 'seal'];
    const currentIndex = order.indexOf(this.state.currentRoom);
    const targetIndex = order.indexOf(roomId);
    return targetIndex <= currentIndex + 1;
  },
  
  // Get progress percentage
  getProgress() {
    const totalPuzzles = Object.keys(this.state.puzzles).length;
    const completed = Object.values(this.state.puzzles).filter(v => v === true).length;
    return Math.floor((completed / totalPuzzles) * 100);
  },
  
  // Render inventory panel (call from any room)
  renderInventory() {
    let panel = document.getElementById('gameInventory');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'gameInventory';
      panel.className = 'inventory-panel';
      document.body.appendChild(panel);
    }
    const glyphCount = this.state.collectedGlyphs.length;
    const progress = this.getProgress();
    panel.innerHTML = `𓌹 ${glyphCount}/22 Glyphs · ${progress}% Breath · ${this.state.schism ? (this.state.schism === 'adzmyst' ? 'Yod Path' : 'Ishtar Path') : 'Schism Pending'}`;
    panel.onclick = () => this.showInventory();
  },
  
  // Show detailed inventory
  showInventory() {
    alert(`Collected Glyphs: ${this.state.collectedGlyphs.join(', ') || 'None'}\nCompleted Rooms: ${this.state.completedRooms.join(', ') || 'None'}\nSchism: ${this.state.schism || 'Not chosen'}\nProgress: ${this.getProgress()}%`);
  }
};

// Auto-init
AdzmystGame.init();

// Make global
window.AdzmystGame = AdzmystGame;
