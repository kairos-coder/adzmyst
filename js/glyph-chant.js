/**
 * glyph-chant.js — The Sound of Adzmyst
 * Version: 1.0.0
 * 
 * Web Audio API chant engine for the 22 Proto-Sinaitic glyphs.
 * Each glyph has a frequency (C4 to C7), a chant text, and a meditation.
 * 
 * Usage:
 *   const chant = new GlyphChant();
 *   await chant.init();
 *   chant.playGlyph('𐤀');  // Play the frequency
 *   chant.reciteGlyph('𐤀'); // Speak the chant text
 *   chant.playSequence('foundational'); // Play A D Z M Y S T
 */

class GlyphChant {
  constructor() {
    this.chants = null;
    this.sequences = null;
    this.audioContext = null;
    this.isInitialized = false;
    this.currentOscillators = [];
    this.currentGains = [];
  }

  /**
   * Initialize the chant engine — load JSON and create AudioContext
   * Must be called before any sound playback
   */
  async init() {
    try {
      // Load the glyph-chant.json from data/json/
      const response = await fetch('data/json/glyph-chant.json');
      if (!response.ok) {
        throw new Error(`Failed to load glyph-chant.json: ${response.status}`);
      }
      const data = await response.json();
      this.chants = data.chants;
      this.sequences = data.sequences;
      
      // Create AudioContext (suspended until user interaction)
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.isInitialized = true;
      
      console.log(`GlyphChant initialized: ${this.chants.length} glyphs loaded`);
      return true;
    } catch (error) {
      console.error('GlyphChant initialization failed:', error);
      return false;
    }
  }

  /**
   * Resume AudioContext — must be called in response to user gesture
   * Browsers require user interaction before audio playback
   */
  async resume() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    return this.audioContext?.state === 'running';
  }

  /**
   * Get a glyph's chant data by its symbol
   * @param {string} glyphSymbol - The Proto-Sinaitic glyph (e.g., '𐤀')
   * @returns {object|null} Chant data or null if not found
   */
  getChant(glyphSymbol) {
    if (!this.chants) return null;
    return this.chants.find(c => c.glyph === glyphSymbol) || null;
  }

  /**
   * Get a glyph's chant data by name
   * @param {string} name - Glyph name (e.g., 'Aleph')
   * @returns {object|null} Chant data or null if not found
   */
  getChantByName(name) {
    if (!this.chants) return null;
    return this.chants.find(c => c.name.toLowerCase() === name.toLowerCase()) || null;
  }

  /**
   * Play the frequency of a glyph
   * @param {string} glyphSymbol - The Proto-Sinaitic glyph
   * @param {number} duration - Duration in ms (default from JSON or 1000)
   * @param {number} volume - Volume (0 to 1, default 0.3)
   * @returns {object|null} The chant data or null
   */
  playGlyph(glyphSymbol, duration = null, volume = 0.3) {
    const chant = this.getChant(glyphSymbol);
    if (!chant) {
      console.warn(`Glyph not found: ${glyphSymbol}`);
      return null;
    }

    if (!this.audioContext || this.audioContext.state !== 'running') {
      console.warn('AudioContext not running. Call resume() first.');
      return null;
    }

    const now = this.audioContext.currentTime;
    const durationSec = (duration || chant.duration_ms) / 1000;
    const frequency = chant.frequency_hz;

    // Create oscillator and gain
    const oscillator = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    
    oscillator.connect(gain);
    gain.connect(this.audioContext.destination);
    
    oscillator.type = 'sine'; // Pure tone for chant
    oscillator.frequency.value = frequency;
    
    // Envelope: fade in, sustain, fade out
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.05);
    gain.gain.setValueAtTime(volume, now + durationSec - 0.1);
    gain.gain.linearRampToValueAtTime(0, now + durationSec);
    
    oscillator.start(now);
    oscillator.stop(now + durationSec);
    
    // Store for cleanup
    this.currentOscillators.push(oscillator);
    this.currentGains.push(gain);
    
    // Clean up references after playback
    setTimeout(() => {
      this.currentOscillators = this.currentOscillators.filter(o => o !== oscillator);
      this.currentGains = this.currentGains.filter(g => g !== gain);
    }, durationSec * 1000 + 100);
    
    return chant;
  }

  /**
   * Recite the chant text for a glyph using Web Speech API
   * @param {string} glyphSymbol - The Proto-Sinaitic glyph
   * @param {object} options - Speech options (rate, pitch, voice)
   * @returns {object|null} The chant data or null
   */
  reciteGlyph(glyphSymbol, options = {}) {
    const chant = this.getChant(glyphSymbol);
    if (!chant) {
      console.warn(`Glyph not found: ${glyphSymbol}`);
      return null;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(chant.chant_text);
    utterance.rate = options.rate || 0.8;
    utterance.pitch = options.pitch || 1.1;
    utterance.lang = options.lang || 'en-US';
    
    window.speechSynthesis.speak(utterance);
    
    return chant;
  }

  /**
   * Play and recite a glyph together
   * @param {string} glyphSymbol - The Proto-Sinaitic glyph
   * @returns {Promise<object|null>} The chant data
   */
  async performGlyph(glyphSymbol) {
    await this.resume();
    this.playGlyph(glyphSymbol);
    this.reciteGlyph(glyphSymbol);
    return this.getChant(glyphSymbol);
  }

  /**
   * Play a sequence of glyphs
   * @param {string} sequenceName - Name of the sequence (e.g., 'foundational')
   * @param {number} delayBetween - Milliseconds between each glyph (default 1500)
   */
  playSequence(sequenceName, delayBetween = 1500) {
    const glyphs = this.sequences[sequenceName];
    if (!glyphs) {
      console.warn(`Sequence not found: ${sequenceName}`);
      return;
    }
    
    glyphs.forEach((glyph, index) => {
      setTimeout(() => {
        this.playGlyph(glyph);
      }, index * delayBetween);
    });
  }

  /**
   * Play and recite a sequence of glyphs
   * @param {string} sequenceName - Name of the sequence
   * @param {number} delayBetween - Milliseconds between each glyph (default 2000)
   */
  performSequence(sequenceName, delayBetween = 2000) {
    const glyphs = this.sequences[sequenceName];
    if (!glyphs) {
      console.warn(`Sequence not found: ${sequenceName}`);
      return;
    }
    
    glyphs.forEach((glyph, index) => {
      setTimeout(() => {
        this.performGlyph(glyph);
      }, index * delayBetween);
    });
  }

  /**
   * Loop through all 22 glyphs in order
   * @param {number} delayBetween - Milliseconds between each glyph (default 1500)
   * @param {boolean} includeRecitation - Whether to also recite (default false)
   */
  playAllGlyphs(delayBetween = 1500, includeRecitation = false) {
    if (!this.chants) return;
    
    this.chants.forEach((chant, index) => {
      setTimeout(() => {
        this.playGlyph(chant.glyph);
        if (includeRecitation) {
          this.reciteGlyph(chant.glyph);
        }
      }, index * delayBetween);
    });
  }

  /**
   * Stop all currently playing oscillators
   */
  stopAll() {
    this.currentOscillators.forEach(osc => {
      try {
        osc.stop();
      } catch (e) {
        // Already stopped
      }
    });
    this.currentOscillators = [];
    this.currentGains = [];
    
    // Also cancel speech
    window.speechSynthesis.cancel();
  }

  /**
   * Generate HTML for a clickable sound glyph
   * @param {string} glyphSymbol - The Proto-Sinaitic glyph
   * @param {string} className - CSS class for styling
   * @returns {string} HTML string
   */
  renderSoundGlyph(glyphSymbol, className = 'sound-glyph') {
    const chant = this.getChant(glyphSymbol);
    const title = chant ? `${chant.name} · ${chant.sound} · ${chant.note}` : glyphSymbol;
    return `<span class="${className}" data-glyph="${glyphSymbol}" title="${title}">${glyphSymbol}</span>`;
  }

  /**
   * Attach sound handlers to all elements with class 'sound-glyph'
   * Also handles dynamic elements via event delegation
   */
  attachSoundHandlers(container = document) {
    // Direct attachment for existing elements
    container.querySelectorAll('.sound-glyph').forEach(el => {
      if (el.dataset.handlerAttached) return;
      el.dataset.handlerAttached = 'true';
      el.addEventListener('click', async (e) => {
        e.stopPropagation();
        const glyph = e.currentTarget.dataset.glyph;
        if (glyph) {
          await this.performGlyph(glyph);
        }
      });
    });
  }

  /**
   * Set up event delegation for dynamically added sound glyphs
   * @param {HTMLElement} container - The container to listen on
   */
  enableDelegation(container = document) {
    container.addEventListener('click', async (e) => {
      const target = e.target.closest('.sound-glyph');
      if (target && !target.dataset.handlerAttached) {
        const glyph = target.dataset.glyph;
        if (glyph) {
          await this.performGlyph(glyph);
        }
      }
    });
  }

  /**
   * Create a complete chant panel UI
   * @param {HTMLElement} container - Where to render the panel
   */
  async renderChantPanel(container) {
    if (!this.chants) await this.init();
    if (!container) return;
    
    const sequencesList = Object.keys(this.sequences || {}).map(name => 
      `<button class="sequence-btn" data-sequence="${name}">${name}</button>`
    ).join('');
    
    container.innerHTML = `
      <div class="chant-panel">
        <h3>𓌹 The Chant of Adzmyst 𓋴</h3>
        <div class="glyph-chant-grid">
          ${this.chants.map(chant => `
            <div class="chant-glyph-card">
              <span class="sound-glyph chant-glyph" data-glyph="${chant.glyph}">${chant.glyph}</span>
              <div class="chant-name">${chant.name}</div>
              <div class="chant-note">${chant.note} · ${chant.frequency_hz} Hz</div>
              <div class="chant-sound">${chant.sound}</div>
            </div>
          `).join('')}
        </div>
        <div class="chant-controls">
          <button id="playAllBtn" class="chant-btn">⟳ Play All Glyphs</button>
          <button id="stopAllBtn" class="chant-btn stop">⬡ Stop</button>
          <div class="sequence-controls">
            <span class="sequence-label">Sequences:</span>
            ${sequencesList}
          </div>
        </div>
        <div class="chant-status" id="chantStatus"></div>
      </div>
    `;
    
    // Attach handlers
    this.attachSoundHandlers(container);
    this.enableDelegation(container);
    
    // Sequence buttons
    container.querySelectorAll('.sequence-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const sequence = btn.dataset.sequence;
        await this.resume();
        this.performSequence(sequence);
        this.showStatus(`Playing sequence: ${sequence}`);
      });
    });
    
    // Play all button
    const playAllBtn = container.getElementById('playAllBtn');
    if (playAllBtn) {
      playAllBtn.addEventListener('click', async () => {
        await this.resume();
        this.playAllGlyphs(1500, true);
        this.showStatus('Playing all 22 glyphs...');
      });
    }
    
    // Stop button
    const stopAllBtn = container.getElementById('stopAllBtn');
    if (stopAllBtn) {
      stopAllBtn.addEventListener('click', () => {
        this.stopAll();
        this.showStatus('Stopped');
      });
    }
  }
  
  /**
   * Show a status message
   * @param {string} message 
   */
  showStatus(message) {
    const statusEl = document.getElementById('chantStatus');
    if (statusEl) {
      statusEl.textContent = message;
      setTimeout(() => {
        if (statusEl.textContent === message) {
          statusEl.textContent = '';
        }
      }, 3000);
    }
  }

  /**
   * Get the full chant data for all glyphs
   * @returns {array} Array of chant objects
   */
  getAllChants() {
    return this.chants || [];
  }

  /**
   * Get the sequences object
   * @returns {object} Sequences
   */
  getSequences() {
    return this.sequences || {};
  }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GlyphChant;
}

// Auto-initialize when script loads (but wait for user interaction)
window.GlyphChant = GlyphChant;
