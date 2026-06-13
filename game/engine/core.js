/**
 * Adzmyst Game Engine — Core
 * Manages state, scene loading, navigation
 */

const AdzmystEngine = (function() {
  // State
  let state = {
    schism: null,
    collectedGlyphs: [],
    completedRooms: [],
    currentSceneId: null,
    puzzles: {}
  };
  
  let currentSceneData = null;
  let chantEngine = null;
  
  // Scene order for map
  const sceneOrder = [
    'threshold', 'door-chamber', 'blade-room', 'deep-well',
    'hand-chamber', 'pillar-hall', 'seal'
  ];
  
  // Initialize
  async function init() {
    chantEngine = new GlyphChant();
    await chantEngine.init();
    loadSavedGame();
    attachEventListeners();
    updateUI();
  }
  
  // Load saved game from localStorage
  function loadSavedGame() {
    const saved = localStorage.getItem('adzmyst_game_v2');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        state = { ...state, ...parsed };
        return true;
      } catch(e) { return false; }
    }
    return false;
  }
  
  // Save current game
  function saveGame() {
    localStorage.setItem('adzmyst_game_v2', JSON.stringify(state));
  }
  
  // New game
  function newGame() {
    state = {
      schism: null,
      collectedGlyphs: [],
      completedRooms: [],
      currentSceneId: null,
      puzzles: {}
    };
    saveGame();
    updateUI();
  }
  
  // Load a scene by ID
  async function loadScene(sceneId) {
    if (!sceneId) return;
    
    // Check if scene is accessible
    if (!isSceneAccessible(sceneId)) {
      showMessage("The path is not yet open. Complete the previous chamber first.");
      return;
    }
    
    currentSceneData = await SceneLoader.load(sceneId);
    if (!currentSceneData) {
      console.error(`Failed to load scene: ${sceneId}`);
      return;
    }
    
    state.currentSceneId = sceneId;
    saveGame();
    renderScene();
    updateUI();
  }
  
  // Check if a scene is accessible based on completed rooms
  function isSceneAccessible(sceneId) {
    if (sceneId === 'threshold') return true;
    
    const currentIndex = sceneOrder.indexOf(state.currentSceneId);
    const targetIndex = sceneOrder.indexOf(sceneId);
    
    // If we have a saved current scene, allow navigation to adjacent rooms
    if (state.currentSceneId && Math.abs(targetIndex - currentIndex) <= 1) {
      return true;
    }
    
    // Otherwise check if previous scene is completed
    const prevIndex = targetIndex - 1;
    if (prevIndex >= 0) {
      const prevSceneId = sceneOrder[prevIndex];
      return state.completedRooms.includes(prevSceneId);
    }
    
    return false;
  }
  
  // Render the current scene
  function renderScene() {
    const container = document.getElementById('sceneContainer');
    if (!container || !currentSceneData) return;
    
    const isCompleted = state.puzzles[currentSceneData.id] || state.completedRooms.includes(currentSceneData.id);
    
    container.innerHTML = `
      <div class="scene-card">
        <div class="scene-glyph" data-glyph="${currentSceneData.glyph}">${currentSceneData.glyph}</div>
        <h2 class="scene-title">${currentSceneData.name} · ${currentSceneData.glyphName}</h2>
        <div class="scene-description">${currentSceneData.description}</div>
        
        ${!isCompleted ? `
          <div class="scene-puzzle">
            <div class="puzzle-prompt">${currentSceneData.puzzle?.prompt || 'Solve the riddle to proceed.'}</div>
            <div id="puzzleInterface" class="puzzle-interface"></div>
            <div id="puzzleFeedback" class="puzzle-feedback"></div>
          </div>
        ` : `
          <div class="scene-completed">
            <div class="completion-mark">✓ Chamber Complete</div>
            <div class="completion-message">The glyph ${currentSceneData.glyph} resonates in your memory.</div>
          </div>
        `}
        
        <div class="scene-exits">
          ${currentSceneData.exits?.previous ? `<button class="exit-btn" data-scene="${currentSceneData.exits.previous}">← Previous Chamber</button>` : ''}
          ${currentSceneData.exits?.next && !isCompleted ? `<button class="exit-btn disabled" disabled>→ Next Chamber (Complete puzzle first)</button>` : ''}
          ${currentSceneData.exits?.next && isCompleted ? `<button class="exit-btn" data-scene="${currentSceneData.exits.next}">→ Next Chamber</button>` : ''}
        </div>
      </div>
    `;
    
    // Attach glyph click for chant
    const glyphEl = container.querySelector('.scene-glyph');
    if (glyphEl) {
      glyphEl.addEventListener('click', async () => {
        await chantEngine.resume();
        chantEngine.performGlyph(currentSceneData.glyph);
      });
    }
    
    // Attach exit buttons
    container.querySelectorAll('.exit-btn[data-scene]').forEach(btn => {
      btn.addEventListener('click', () => loadScene(btn.dataset.scene));
    });
    
    // Render puzzle interface if not completed
    if (!isCompleted && currentSceneData.puzzle) {
      renderPuzzle();
    }
  }
  
  // Render puzzle interface based on puzzle type
  async function renderPuzzle() {
    const container = document.getElementById('puzzleInterface');
    if (!container) return;
    
    const puzzle = currentSceneData.puzzle;
    
    switch (puzzle.type) {
      case 'chant':
        container.innerHTML = `
          <div class="chant-puzzle">
            <p>Speak the glyph's sound: <strong>${puzzle.targetSound}</strong></p>
            <button id="listenBtn" class="puzzle-action">🎤 Speak Now</button>
            <button id="hearBtn" class="puzzle-action">🔊 Hear the Chant</button>
          </div>
        `;
        
        document.getElementById('hearBtn')?.addEventListener('click', async () => {
          await chantEngine.resume();
          chantEngine.performGlyph(currentSceneData.glyph);
        });
        
        document.getElementById('listenBtn')?.addEventListener('click', async () => {
          const result = await AdzmystAudio.listenForGlyph(currentSceneData.glyph);
          const feedback = document.getElementById('puzzleFeedback');
          if (result.matched) {
            feedback.innerHTML = `<span class="success">✓ ${puzzle.successMessage}</span>`;
            completePuzzle();
          } else {
            feedback.innerHTML = `<span class="failure">✗ ${puzzle.failureMessage || `Heard: "${result.heard}"`}</span>`;
          }
        });
        break;
        
      case 'choice':
        container.innerHTML = `
          <div class="choice-puzzle">
            <p>${puzzle.prompt}</p>
            <div class="choice-options">
              ${puzzle.options.map(opt => `
                <button class="choice-btn" data-choice="${opt.id}">${opt.label}</button>
              `).join('')}
            </div>
          </div>
        `;
        
        container.querySelectorAll('.choice-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            const choiceId = btn.dataset.choice;
            const choice = puzzle.options.find(o => o.id === choiceId);
            if (choice) {
              if (choice.setsSchism) {
                state.schism = choice.setsSchism;
                saveGame();
              }
              document.getElementById('puzzleFeedback').innerHTML = `<span class="success">✓ ${choice.successMessage}</span>`;
              completePuzzle();
            }
          });
        });
        break;
        
      case 'triad':
        // Triad puzzle — select matching glyphs
        container.innerHTML = `
          <div class="triad-puzzle">
            <p>${puzzle.prompt}</p>
            <div class="triad-options" id="triadOptions"></div>
            <button id="submitTriad" class="puzzle-action">Submit Triad</button>
          </div>
        `;
        // Triad rendering logic would go here
        break;
        
      default:
        container.innerHTML = `<p>Puzzle type "${puzzle.type}" not implemented.</p>`;
    }
  }
  
  // Complete current puzzle
  function completePuzzle() {
    const sceneId = currentSceneData.id;
    state.puzzles[sceneId] = true;
    if (!state.completedRooms.includes(sceneId)) {
      state.completedRooms.push(sceneId);
    }
    if (currentSceneData.completion?.collectsGlyph) {
      const glyph = currentSceneData.completion.collectsGlyph;
      if (!state.collectedGlyphs.includes(glyph)) {
        state.collectedGlyphs.push(glyph);
      }
    }
    saveGame();
    updateUI();
    renderScene(); // Re-render to show completion state
  }
  
  // Update UI elements (inventory, progress, map)
  function updateUI() {
    const glyphCount = state.collectedGlyphs.length;
    const countEl = document.getElementById('glyphCount');
    if (countEl) countEl.textContent = glyphCount;
    
    const progress = (state.completedRooms.length / sceneOrder.length) * 100;
    const fillEl = document.getElementById('progressFill');
    if (fillEl) fillEl.style.width = `${progress}%`;
    
    // Update map if open
    const mapModal = document.getElementById('mapModal');
    if (mapModal && mapModal.style.display !== 'none') {
      renderMap();
    }
  }
  
  // Render the map modal
  function renderMap() {
    const mapGrid = document.getElementById('mapGrid');
    if (!mapGrid) return;
    
    mapGrid.innerHTML = sceneOrder.map(sceneId => {
      const isCompleted = state.completedRooms.includes(sceneId);
      const isCurrent = state.currentSceneId === sceneId;
      const sceneData = SceneLoader.getCached(sceneId);
      const name = sceneData?.name || sceneId;
      
      return `
        <div class="map-node ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}" 
             data-scene="${sceneId}">
          <div class="map-glyph">${sceneData?.glyph || '?'}</div>
          <div class="map-name">${name}</div>
          ${isCompleted ? '<div class="map-check">✓</div>' : ''}
        </div>
      `;
    }).join('');
    
    mapGrid.querySelectorAll('.map-node').forEach(node => {
      node.addEventListener('click', () => {
        const sceneId = node.dataset.scene;
        if (sceneId && isSceneAccessible(sceneId)) {
          loadScene(sceneId);
          document.getElementById('mapModal').style.display = 'none';
        } else {
          showMessage("That chamber is not yet accessible.");
        }
      });
    });
  }
  
  // Show a temporary message
  function showMessage(msg) {
    let toast = document.getElementById('gameToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'gameToast';
      toast.className = 'game-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
  }
  
  // Attach global event listeners
  function attachEventListeners() {
    const mapBtn = document.getElementById('mapBtn');
    const inventoryBtn = document.getElementById('inventoryBtn');
    const saveBtn = document.getElementById('saveBtn');
    const resetBtn = document.getElementById('resetBtn');
    
    if (mapBtn) {
      mapBtn.addEventListener('click', () => {
        renderMap();
        document.getElementById('mapModal').style.display = 'flex';
      });
    }
    
    if (inventoryBtn) {
      inventoryBtn.addEventListener('click', () => {
        const inventoryList = document.getElementById('inventoryList');
        if (inventoryList) {
          inventoryList.innerHTML = state.collectedGlyphs.map(g => 
            `<div class="inv-glyph" data-glyph="${g}">${g}</div>`
          ).join('');
          document.getElementById('inventoryModal').style.display = 'flex';
        }
      });
    }
    
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        saveGame();
        showMessage('Game saved.');
      });
    }
    
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (currentSceneData && confirm('Reset this room? Progress will be lost.')) {
          delete state.puzzles[currentSceneData.id];
          state.completedRooms = state.completedRooms.filter(id => id !== currentSceneData.id);
          saveGame();
          renderScene();
          updateUI();
        }
      });
    }
    
    // Modal close buttons
    document.querySelectorAll('.modal-close').forEach(btn => {
      btn.addEventListener('click', () => {
        document.getElementById('mapModal').style.display = 'none';
        document.getElementById('inventoryModal').style.display = 'none';
      });
    });
  }
  
  // Public API
  return {
    init,
    newGame,
    loadGame: loadSavedGame,
    loadScene,
    saveGame,
    getState: () => ({ ...state }),
    completePuzzle
  };
})();

// Auto-init
document.addEventListener('DOMContentLoaded', () => AdzmystEngine.init());

window.AdzmystEngine = AdzmystEngine;
