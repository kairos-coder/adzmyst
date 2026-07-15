/**
 * Adzmyst Realm Engine — Core
 * Reads realm JSON (air.json, fire.json, etc.)
 * Renders rooms, portals, hidden objects, inventory
 * Manages save state and realm progression
 */

const AdzmystEngine = (function() {
  // ── STATE ──────────────────────────────────────────────
  let realmData = null;           // Current realm JSON
  let currentRoom = null;        // Current room object
  let collectedItems = [];       // IDs of collected hidden objects
  let visitedRooms = [];         // Room IDs the player has entered
  let realmComplete = false;     // Has the realm exit been used?
  
  // ── DOM REFERENCES ─────────────────────────────────────
  let container = null;
  let inventoryEl = null;
  let mapModal = null;
  let toastEl = null;

  // ── INITIALIZATION ─────────────────────────────────────
  async function init(realmId = 'air') {
    container = document.getElementById('realmContainer');
    inventoryEl = document.getElementById('inventory');
    mapModal = document.getElementById('mapModal');
    
    // Load realm JSON
    realmData = await loadRealmJSON(realmId);
    if (!realmData) {
      container.innerHTML = `<div class="error">Failed to load realm: ${realmId}</div>`;
      return;
    }
    
    // Load saved state
    loadState(realmId);
    
    // Determine starting room
    const startRoomId = getStartRoom();
    const room = realmData.rooms.find(r => r.id === startRoomId);
    if (!room) {
      container.innerHTML = `<div class="error">Room not found: ${startRoomId}</div>`;
      return;
    }
    
    // Enter the room
    enterRoom(room);
    updateInventory();
    attachGlobalListeners();
    
    console.log(`[Realm Engine] ${realmData.displayName} loaded. ${realmData.rooms.length} rooms.`);
  }

  // ── JSON LOADING ───────────────────────────────────────
  async function loadRealmJSON(realmId) {
    // Check cache
    if (realmData && realmData.realm === realmId) return realmData;
    
    try {
      const response = await fetch(`../json/${realmId}.json`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`[Realm Engine] Failed to load ${realmId}.json:`, error);
      return null;
    }
  }

  // ── SAVE SYSTEM ─────────────────────────────────────────
  function loadState(realmId) {
    try {
      const saved = localStorage.getItem(`adzmyst_${realmId}_save`);
      if (saved) {
        const data = JSON.parse(saved);
        collectedItems = data.collectedItems || [];
        visitedRooms = data.visitedRooms || [];
        realmComplete = data.realmComplete || false;
      }
    } catch(e) {
      console.warn('[Realm Engine] Could not load save:', e);
    }
  }

  function saveState() {
    if (!realmData) return;
    const data = {
      realm: realmData.realm,
      collectedItems,
      visitedRooms,
      realmComplete,
      savedAt: Date.now()
    };
    localStorage.setItem(`adzmyst_${realmData.realm}_save`, JSON.stringify(data));
    
    // Pulse save indicator
    const dot = document.getElementById('saveDot');
    if (dot) {
      dot.classList.add('pulse');
      setTimeout(() => dot.classList.remove('pulse'), 600);
    }
  }

  function getStartRoom() {
    if (realmComplete) {
      // If completed, start at the exit room
      const exitRoom = realmData.rooms.find(r => r.realmExit);
      if (exitRoom) return exitRoom.id;
    }
    
    // Check URL parameter
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam && realmData.rooms.find(r => r.id === roomParam)) {
      return roomParam;
    }
    
    // Default to entry room
    return realmData.entryRoom || realmData.rooms[0].id;
  }

  // ── ROOM NAVIGATION ────────────────────────────────────
  function enterRoom(room) {
    currentRoom = room;
    
    // Track visit
    if (!visitedRooms.includes(room.id)) {
      visitedRooms.push(room.id);
    }
    
    // Update URL
    const url = new URL(window.location);
    url.searchParams.set('room', room.id);
    window.history.replaceState({}, '', url);
    
    // Render
    renderRoom(room);
    saveState();
    
    // Scroll to top of room
    if (container) container.scrollTop = 0;
  }

  function navigateTo(roomId) {
    const room = realmData.rooms.find(r => r.id === roomId);
    if (!room) {
      showToast('That path is lost to the wind.');
      return;
    }
    
    // Fade transition
    container.classList.add('transitioning');
    setTimeout(() => {
      enterRoom(room);
      container.classList.remove('transitioning');
    }, 400);
  }

  function navigateToRealmExit() {
    if (!canExitRealm()) {
      showToast(`You need all ${realmData.requiredForExit.length} storm shards to pass.`);
      return;
    }
    
    realmComplete = true;
    saveState();
    
    // Update atrium save
    syncAtriumSave();
    
    // Navigate to next realm
    showToast('The sky door opens...');
    setTimeout(() => {
      window.location.href = realmData.exitTarget;
    }, 1500);
  }

  function canExitRealm() {
    if (!realmData.requiredForExit) return true;
    return realmData.requiredForExit.every(id => collectedItems.includes(id));
  }

  function syncAtriumSave() {
    try {
      const key = realmData.witnessKey || 'adzmyst_witness';
      localStorage.setItem(key, JSON.stringify({
        realm: realmData.realm,
        completed: true,
        timestamp: Date.now()
      }));
      
      // Also update atrium
      const atriumRaw = localStorage.getItem('adzmyst_atrium_save');
      if (atriumRaw) {
        const atriumData = JSON.parse(atriumRaw);
        atriumData.unlocked = atriumData.unlocked || {};
        atriumData.unlocked[realmData.realm] = true;
        
        // Unlock next realm based on exit target
        if (realmData.exitTarget) {
          const nextRealm = realmData.exitTarget.match(/\.\.\/(\w+)\//)?.[1];
          if (nextRealm) {
            atriumData.unlocked[nextRealm] = true;
          }
        }
        
        localStorage.setItem('adzmyst_atrium_save', JSON.stringify(atriumData));
      }
    } catch(e) {
      console.warn('[Realm Engine] Could not sync atrium:', e);
    }
  }

  // ── RENDERING ───────────────────────────────────────────
  function renderRoom(room) {
    if (!container) return;
    
    const shardsCollected = collectedItems.filter(id => id.startsWith('storm_shard'));
    const shardsNeeded = realmData.requiredForExit?.length || 0;
    const isExitRoom = !!room.realmExit;
    const canExit = canExitRealm();
    
    container.innerHTML = `
      <div class="room" id="room-${room.id}">
        <!-- Room background -->
        <div class="room-background" style="background-image: url('${room.background || ''}');">
          <div class="room-vignette"></div>
        </div>
        
        <!-- Hidden objects layer -->
        <div class="hidden-objects-layer">
          ${room.hiddenObjects?.map(obj => {
            const collected = collectedItems.includes(obj.id);
            return `
              <div class="hidden-object ${collected ? 'collected' : ''} ${obj.isDecoy ? 'decoy' : 'shard'}"
                   id="obj-${obj.id}"
                   style="left: ${obj.x}; top: ${obj.y}; --glow: ${obj.glowRadius || 100}px;"
                   data-item-id="${obj.id}"
                   data-decoy="${obj.isDecoy || false}"
                   title="${collected ? (obj.isDecoy ? 'A molted feather. Nothing more.' : 'Storm shard collected.') : 'Something glimmers...'}">
                ${collected ? (obj.isDecoy ? '🪶' : '💎') : '✨'}
              </div>
            `;
          }).join('') || ''}
        </div>
        
        <!-- Room info overlay -->
        <div class="room-info">
          <div class="room-header">
            <h1 class="room-title">${room.title}</h1>
            <div class="room-id">${room.id.replace('_', ' ').toUpperCase()}</div>
          </div>
          <p class="room-description">${room.description}</p>
          
          <!-- Shard progress -->
          <div class="shard-progress">
            ${Array.from({ length: shardsNeeded }, (_, i) => `
              <div class="shard-dot ${collectedItems.includes(`storm_shard_${i + 1}`) ? 'filled' : ''}">
                ${collectedItems.includes(`storm_shard_${i + 1}`) ? '💎' : '○'}
              </div>
            `).join('')}
            <span class="shard-label">Storm Shards: ${shardsCollected.length}/${shardsNeeded}</span>
          </div>
        </div>
        
        <!-- Portals -->
        <div class="portals">
          ${room.visiblePortals?.map(portal => `
            <button class="portal-btn" data-target="${portal.to}">
              <span class="portal-icon">𐤃</span>
              <span class="portal-label">${portal.label}</span>
            </button>
          `).join('') || ''}
          
          ${isExitRoom ? `
            <button class="portal-btn exit-portal ${canExit ? 'unlocked' : 'locked'}" 
                    data-action="exit">
              <span class="portal-icon">${canExit ? '𐤕' : '𐤎'}</span>
              <span class="portal-label">${room.realmExit.label}</span>
              ${!canExit ? `<span class="portal-requirement">Requires ${shardsNeeded} storm shards</span>` : ''}
            </button>
          ` : ''}
        </div>
      </div>
    `;
    
    // Attach event listeners
    attachRoomListeners(room);
  }

  function attachRoomListeners(room) {
    // Portal clicks
    container.querySelectorAll('.portal-btn[data-target]').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.target;
        navigateTo(target);
      });
    });
    
    // Exit portal
    const exitBtn = container.querySelector('.portal-btn[data-action="exit"]');
    if (exitBtn) {
      exitBtn.addEventListener('click', () => {
        if (canExitRealm()) {
          navigateToRealmExit();
        } else {
          showToast(`Collect all ${realmData.requiredForExit.length} storm shards first.`);
        }
      });
    }
    
    // Hidden objects
    container.querySelectorAll('.hidden-object:not(.collected)').forEach(obj => {
      obj.addEventListener('click', () => {
        collectItem(obj.dataset.itemId, obj.dataset.decoy === 'true');
      });
    });
  }

  function collectItem(itemId, isDecoy) {
    if (collectedItems.includes(itemId)) return;
    
    collectedItems.push(itemId);
    
    const itemEl = document.getElementById(`obj-${itemId}`);
    if (itemEl) {
      itemEl.classList.add('collected');
      if (isDecoy) {
        itemEl.innerHTML = '🪶';
        showToast('A molted feather. Beautiful, but not what you seek.');
      } else {
        itemEl.innerHTML = '💎';
        const shardNum = itemId.match(/\d+/)?.[0] || '';
        showToast(`Storm shard ${shardNum} collected! The wind hums with power.`);
      }
    }
    
    updateInventory();
    saveState();
    
    // Refresh room to update exit portal if needed
    if (!isDecoy && canExitRealm()) {
      const exitRoom = realmData.rooms.find(r => r.realmExit);
      if (exitRoom && currentRoom.id === exitRoom.id) {
        // Re-render to unlock exit portal
        renderRoom(currentRoom);
        attachRoomListeners(currentRoom);
      }
    }
  }

  function updateInventory() {
    if (!inventoryEl) return;
    
    const shards = collectedItems.filter(id => id.startsWith('storm_shard'));
    const decoys = collectedItems.filter(id => id.startsWith('decoy'));
    
    inventoryEl.innerHTML = `
      <div class="inventory-section">
        <div class="inventory-label">Storm Shards</div>
        <div class="inventory-items">
          ${shards.length > 0 
            ? shards.map(s => `<span class="inv-item shard">💎</span>`).join('') 
            : '<span class="inv-empty">Empty</span>'}
        </div>
      </div>
      <div class="inventory-section">
        <div class="inventory-label">Feathers Found</div>
        <div class="inventory-items">
          ${decoys.length > 0 
            ? decoys.map(d => `<span class="inv-item decoy">🪶</span>`).join('') 
            : '<span class="inv-empty">None</span>'}
        </div>
      </div>
    `;
  }

  // ── MAP ──────────────────────────────────────────────────
  function renderMap() {
    const mapGrid = document.getElementById('mapGrid');
    if (!mapGrid || !realmData) return;
    
    mapGrid.innerHTML = realmData.rooms.map(room => {
      const isCurrent = currentRoom && room.id === currentRoom.id;
      const isVisited = visitedRooms.includes(room.id);
      const hasShard = room.hiddenObjects?.some(obj => 
        obj.id.startsWith('storm_shard') && collectedItems.includes(obj.id)
      );
      const isExit = !!room.realmExit;
      
      return `
        <div class="map-node ${isCurrent ? 'current' : ''} ${isVisited ? 'visited' : ''} ${hasShard ? 'has-shard' : ''} ${isExit ? 'exit' : ''}"
             data-room="${room.id}">
          <div class="map-node-icon">${isExit ? '𐤕' : hasShard ? '💎' : isVisited ? '○' : '·'}</div>
          <div class="map-node-name">${room.title}</div>
          ${isCurrent ? '<div class="map-node-marker">▼</div>' : ''}
        </div>
      `;
    }).join('');
    
    // Clickable nodes
    mapGrid.querySelectorAll('.map-node').forEach(node => {
      node.addEventListener('click', () => {
        const roomId = node.dataset.room;
        if (roomId) {
          navigateTo(roomId);
          if (mapModal) mapModal.style.display = 'none';
        }
      });
    });
  }

  // ── TOAST ────────────────────────────────────────────────
  function showToast(message) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.id = 'realmToast';
      toastEl.className = 'realm-toast';
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = message;
    toastEl.classList.add('show');
    clearTimeout(toastEl._timeout);
    toastEl._timeout = setTimeout(() => toastEl.classList.remove('show'), 3000);
  }

  // ── GLOBAL LISTENERS ────────────────────────────────────
  function attachGlobalListeners() {
    // Map button
    const mapBtn = document.getElementById('mapBtn');
    if (mapBtn) {
      mapBtn.addEventListener('click', () => {
        renderMap();
        if (mapModal) mapModal.style.display = 'flex';
      });
    }
    
    // Inventory button
    const invBtn = document.getElementById('inventoryBtn');
    if (invBtn) {
      invBtn.addEventListener('click', () => {
        const invModal = document.getElementById('inventoryModal');
        if (invModal) invModal.style.display = 'flex';
      });
    }
    
    // Save button
    const saveBtn = document.getElementById('saveBtn');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        saveState();
        showToast('Progress saved.');
      });
    }
    
    // Reset button
    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (confirm('Reset this realm? All collected shards will be lost.')) {
          collectedItems = [];
          visitedRooms = [];
          realmComplete = false;
          saveState();
          init(realmData.realm);
          showToast('Realm reset.');
        }
      });
    }
    
    // Return to atrium
    const returnBtn = document.getElementById('returnBtn');
    if (returnBtn) {
      returnBtn.addEventListener('click', () => {
        window.location.href = '../../index.html';
      });
    }
    
    // Modal close buttons
    document.querySelectorAll('.modal-close').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
      });
    });
    
    // Close modals on background click
    document.querySelectorAll('.modal').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = 'none';
      });
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
      }
      if (e.key === 'm' && !e.ctrlKey && !e.metaKey) {
        renderMap();
        if (mapModal) mapModal.style.display = 'flex';
      }
    });
  }

  // ── PUBLIC API ───────────────────────────────────────────
  return {
    init,
    navigateTo,
    getState: () => ({
      realm: realmData?.realm,
      currentRoom: currentRoom?.id,
      collectedItems: [...collectedItems],
      visitedRooms: [...visitedRooms],
      realmComplete
    }),
    saveState,
    canExitRealm
  };
})();

// Auto-init when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Detect realm from URL or default to air
  const params = new URLSearchParams(window.location.search);
  const realm = params.get('realm') || 'air';
  AdzmystEngine.init(realm);
});

window.AdzmystEngine = AdzmystEngine;
