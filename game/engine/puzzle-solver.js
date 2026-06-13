/**
 * puzzle-solver.js — Adzmyst Game Puzzle Engine
 * Version: 1.0.0
 * 
 * Handles all puzzle types:
 * - chant (speech recognition)
 * - choice (binary/multi-choice)
 * - triad_select (pick correct from options)
 * - recall (memory/dream recall)
 * - sequence (order glyphs correctly)
 * - balance (structural choice)
 * - sequence_recall (chant or select sequence)
 * - final_chant (speak your name)
 * - final_offering (speak a hidden word)
 * - practice (ungraded learning)
 * 
 * Integrates with audio-engine.js and game-state.js
 */

class PuzzleSolver {
  constructor(audioEngine, gameState) {
    this.audio = audioEngine;
    this.game = gameState;
    this.currentPuzzle = null;
    this.currentSceneId = null;
    this.puzzleCallbacks = {};
    this.speechRecognition = null;
    this.isListening = false;
  }

  /**
   * Initialize speech recognition
   */
  initSpeechRecognition() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn('Speech recognition not supported in this browser');
      return false;
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.speechRecognition = new SpeechRecognition();
    this.speechRecognition.lang = 'en-US';
    this.speechRecognition.interimResults = false;
    this.speechRecognition.maxAlternatives = 3;
    
    return true;
  }

  /**
   * Load a puzzle for a scene
   * @param {string} sceneId - Scene ID
   * @param {object} puzzleData - Puzzle configuration from scene JSON
   */
  loadPuzzle(sceneId, puzzleData) {
    this.currentSceneId = sceneId;
    this.currentPuzzle = puzzleData;
    
    if (this.puzzleCallbacks.onLoad) {
      this.puzzleCallbacks.onLoad(puzzleData);
    }
    
    return this.renderPuzzleInterface(puzzleData);
  }

  /**
   * Render the puzzle interface based on puzzle type
   * @param {object} puzzle - Puzzle configuration
   * @returns {string} HTML string
   */
  renderPuzzleInterface(puzzle) {
    if (!puzzle) return '<div class="puzzle-error">No puzzle defined for this chamber.</div>';
    
    switch (puzzle.type) {
      case 'chant':
        return this.renderChantPuzzle(puzzle);
      case 'choice':
        return this.renderChoicePuzzle(puzzle);
      case 'triad_select':
        return this.renderTriadSelectPuzzle(puzzle);
      case 'recall':
        return this.renderRecallPuzzle(puzzle);
      case 'sequence':
        return this.renderSequencePuzzle(puzzle);
      case 'balance':
        return this.renderBalancePuzzle(puzzle);
      case 'sequence_recall':
        return this.renderSequenceRecallPuzzle(puzzle);
      case 'final_chant':
        return this.renderFinalChantPuzzle(puzzle);
      case 'final_offering':
        return this.renderFinalOfferingPuzzle(puzzle);
      case 'practice':
        return this.renderPracticePuzzle(puzzle);
      default:
        return `<div class="puzzle-error">Unknown puzzle type: ${puzzle.type}</div>`;
    }
  }

  /**
   * Chant puzzle — speak the glyph's sound
   */
  renderChantPuzzle(puzzle) {
    const targetGlyph = puzzle.target_glyph || '𐤀';
    const targetSound = puzzle.target_sound || 'ah';
    const frequency = puzzle.frequency_hz || 261.63;
    
    return `
      <div class="puzzle-chant" data-puzzle-type="chant">
        <div class="chant-target">
          <span class="chant-glyph" data-glyph="${targetGlyph}">${targetGlyph}</span>
          <span class="chant-sound">"${targetSound}"</span>
        </div>
        <div class="chant-controls">
          <button class="puzzle-btn hear-btn" data-frequency="${frequency}">
            🔊 Hear the Chant
          </button>
          <button class="puzzle-btn speak-btn" data-target="${targetGlyph}">
            🎤 Speak Now
          </button>
        </div>
        <div class="chant-feedback"></div>
        <div class="chant-instruction">
          ${puzzle.prompt || `Speak the sound of ${targetGlyph} to unlock the door.`}
        </div>
      </div>
    `;
  }

  /**
   * Choice puzzle — select between options
   */
  renderChoicePuzzle(puzzle) {
    const options = puzzle.options || [];
    
    return `
      <div class="puzzle-choice" data-puzzle-type="choice">
        <div class="choice-prompt">${puzzle.prompt || 'Choose your path:'}</div>
        <div class="choice-options">
          ${options.map((opt, idx) => `
            <button class="choice-btn" data-choice-id="${opt.id}" data-choice-index="${idx}">
              ${opt.label || opt.id}
            </button>
          `).join('')}
        </div>
        <div class="choice-feedback"></div>
      </div>
    `;
  }

  /**
   * Triad select puzzle — pick correct option from three
   */
  renderTriadSelectPuzzle(puzzle) {
    const options = puzzle.options || [];
    
    return `
      <div class="puzzle-triad" data-puzzle-type="triad_select">
        <div class="triad-prompt">${puzzle.prompt || 'Which thread is the weapon meant to cut?'}</div>
        <div class="triad-options">
          ${options.map((opt, idx) => `
            <button class="triad-btn" data-option-id="${opt.id}" data-correct="${opt.is_correct}">
              ${opt.label}
            </button>
          `).join('')}
        </div>
        <div class="triad-feedback"></div>
      </div>
    `;
  }

  /**
   * Recall puzzle — remember a dream or memory
   */
  renderRecallPuzzle(puzzle) {
    const options = puzzle.dream_options || puzzle.options || [];
    
    return `
      <div class="puzzle-recall" data-puzzle-type="recall">
        <div class="recall-prompt">${puzzle.prompt || 'The water asks: what did you dream last night?'}</div>
        <div class="recall-options">
          ${options.map((opt, idx) => `
            <button class="recall-btn" data-option-id="${opt.id}" data-correct="${opt.is_correct}">
              ${opt.label}
            </button>
          `).join('')}
        </div>
        <div class="recall-feedback"></div>
        <div class="recall-custom">
          <input type="text" id="recallCustomInput" placeholder="Or describe your own dream..." class="recall-input">
          <button id="recallCustomSubmit" class="puzzle-btn">Submit</button>
        </div>
      </div>
    `;
  }

  /**
   * Sequence puzzle — arrange glyphs in correct order
   */
  renderSequencePuzzle(puzzle) {
    const options = puzzle.options || ['𐤀', '𐤃', '𐤆', '𐤌', '𐤕'];
    const correctSequence = puzzle.correct_sequence || ['𐤀', '𐤃', '𐤆', '𐤌', '𐤕'];
    
    return `
      <div class="puzzle-sequence" data-puzzle-type="sequence">
        <div class="sequence-prompt">${puzzle.prompt || 'Arrange the glyphs in the correct order:'}</div>
        <div class="sequence-pool" id="sequencePool">
          ${options.map(opt => `
            <div class="sequence-item" data-glyph="${opt}" draggable="true">${opt}</div>
          `).join('')}
        </div>
        <div class="sequence-slots" id="sequenceSlots">
          ${correctSequence.map((_, idx) => `
            <div class="sequence-slot" data-slot-index="${idx}"></div>
          `).join('')}
        </div>
        <div class="sequence-controls">
          <button id="sequenceCheckBtn" class="puzzle-btn">Check Order</button>
          <button id="sequenceResetBtn" class="puzzle-btn">Reset</button>
        </div>
        <div class="sequence-feedback"></div>
      </div>
    `;
  }

  /**
   * Balance puzzle — choose which pillar needs attention
   */
  renderBalancePuzzle(puzzle) {
    const options = puzzle.options || [];
    
    return `
      <div class="puzzle-balance" data-puzzle-type="balance">
        <div class="balance-prompt">${puzzle.prompt || 'Which pillar needs your attention?'}</div>
        <div class="balance-options">
          ${options.map((opt, idx) => `
            <button class="balance-btn" data-option-id="${opt.id}" data-correct="${opt.is_correct}">
              ${opt.label}
            </button>
          `).join('')}
        </div>
        <div class="balance-feedback"></div>
      </div>
    `;
  }

  /**
   * Sequence recall puzzle — chant or select sequence
   */
  renderSequenceRecallPuzzle(puzzle) {
    const expectedSequence = puzzle.expected_sequence || ['𐤀', '𐤃', '𐤆', '𐤌', '𐤉', '𐤎', '𐤕'];
    
    return `
      <div class="puzzle-seq-recall" data-puzzle-type="sequence_recall">
        <div class="seq-recall-prompt">${puzzle.prompt || 'Chant the seven foundational glyphs in order:'}</div>
        <div class="seq-recall-glyphs">
          ${expectedSequence.map(glyph => `
            <button class="recall-glyph-btn" data-glyph="${glyph}">${glyph}</button>
          `).join('')}
        </div>
        <div class="seq-recall-current" id="recallCurrentSequence">
          Current: <span id="recallSequenceDisplay">[]</span>
        </div>
        <div class="seq-recall-controls">
          <button id="recallSubmitBtn" class="puzzle-btn">Submit Sequence</button>
          <button id="recallClearBtn" class="puzzle-btn">Clear</button>
          <button id="recallChantBtn" class="puzzle-btn">🎤 Chant Instead</button>
        </div>
        <div class="seq-recall-feedback"></div>
      </div>
    `;
  }

  /**
   * Final chant puzzle — speak your name
   */
  renderFinalChantPuzzle(puzzle) {
    return `
      <div class="puzzle-final-chant" data-puzzle-type="final_chant">
        <div class="final-prompt">${puzzle.prompt || 'The door asks for one final sound — the sound of your own name, spoken as breath.'}</div>
        <div class="final-controls">
          <button id="finalChantBtn" class="puzzle-btn primary">🎤 Speak Your Name</button>
        </div>
        <div class="final-feedback"></div>
        <div class="final-instruction">
          <em>No one is listening except the door. Speak freely.</em>
        </div>
      </div>
    `;
  }

  /**
   * Final offering puzzle — speak a hidden word
   */
  renderFinalOfferingPuzzle(puzzle) {
    return `
      <div class="puzzle-final-offering" data-puzzle-type="final_offering">
        <div class="final-prompt">${puzzle.prompt || 'The door asks for an offering — not gold, not blood. A word. The word you have been afraid to speak.'}</div>
        <div class="final-controls">
          <input type="text" id="offeringWord" placeholder="The word you fear..." class="offering-input">
          <button id="offeringSubmitBtn" class="puzzle-btn primary">Offer the Word</button>
          <button id="offeringSpeakBtn" class="puzzle-btn">🎤 Speak Instead</button>
        </div>
        <div class="final-feedback"></div>
      </div>
    `;
  }

  /**
   * Practice puzzle — ungraded learning
   */
  renderPracticePuzzle(puzzle) {
    const glyphs = puzzle.glyphs || ['𐤀', '𐤃', '𐤆', '𐤌', '𐤉', '𐤎', '𐤕'];
    
    return `
      <div class="puzzle-practice" data-puzzle-type="practice">
        <div class="practice-prompt">${puzzle.prompt || 'Practice chamber. Click any glyph to hear its frequency. Speak it back.'}</div>
        <div class="practice-glyphs">
          ${glyphs.map(glyph => `
            <button class="practice-glyph-btn" data-glyph="${glyph}">${glyph}</button>
          `).join('')}
        </div>
        <div class="practice-feedback"></div>
      </div>
    `;
  }

  /**
   * Attach event listeners to a rendered puzzle container
   * @param {HTMLElement} container - DOM element containing the puzzle
   */
  attachPuzzleEvents(container) {
    if (!container) return;
    
    // Chant puzzle events
    const hearBtn = container.querySelector('.hear-btn');
    if (hearBtn) {
      hearBtn.addEventListener('click', async () => {
        const freq = parseFloat(hearBtn.dataset.frequency);
        if (this.audio && freq) {
          await this.audio.playFrequency(freq, 1500);
        }
      });
    }
    
    const speakBtn = container.querySelector('.speak-btn');
    if (speakBtn) {
      speakBtn.addEventListener('click', async () => {
        const targetGlyph = speakBtn.dataset.target;
        const feedbackDiv = container.querySelector('.chant-feedback');
        const result = await this.solveChantPuzzle(targetGlyph);
        if (feedbackDiv) {
          feedbackDiv.innerHTML = `<div class="feedback ${result.success ? 'success' : 'failure'}">${result.message}</div>`;
        }
        if (result.success && this.puzzleCallbacks.onSolve) {
          this.puzzleCallbacks.onSolve(this.currentSceneId, result);
        }
      });
    }
    
    // Choice puzzle events
    const choiceBtns = container.querySelectorAll('.choice-btn');
    choiceBtns.forEach(btn => {
      btn.addEventListener('click', async () => {
        const choiceId = btn.dataset.choiceId;
        const feedbackDiv = container.querySelector('.choice-feedback');
        const puzzle = this.currentPuzzle;
        const option = puzzle.options?.find(o => o.id === choiceId);
        const result = this.solveChoicePuzzle(choiceId, option);
        if (feedbackDiv) {
          feedbackDiv.innerHTML = `<div class="feedback ${result.success ? 'success' : 'failure'}">${result.message}</div>`;
        }
        if (result.success && this.puzzleCallbacks.onSolve) {
          this.puzzleCallbacks.onSolve(this.currentSceneId, result);
        }
      });
    });
    
    // Triad select events
    const triadBtns = container.querySelectorAll('.triad-btn');
    triadBtns.forEach(btn => {
      btn.addEventListener('click', async () => {
        const isCorrect = btn.dataset.correct === 'true';
        const feedbackDiv = container.querySelector('.triad-feedback');
        const puzzle = this.currentPuzzle;
        const option = puzzle.options?.find(o => o.id === btn.dataset.optionId);
        const result = this.solveTriadPuzzle(isCorrect, option);
        if (feedbackDiv) {
          feedbackDiv.innerHTML = `<div class="feedback ${result.success ? 'success' : 'failure'}">${result.message}</div>`;
        }
        if (result.success && this.puzzleCallbacks.onSolve) {
          this.puzzleCallbacks.onSolve(this.currentSceneId, result);
        }
      });
    });
    
    // Recall puzzle events
    const recallBtns = container.querySelectorAll('.recall-btn');
    recallBtns.forEach(btn => {
      btn.addEventListener('click', async () => {
        const isCorrect = btn.dataset.correct === 'true';
        const feedbackDiv = container.querySelector('.recall-feedback');
        const result = this.solveRecallPuzzle(isCorrect);
        if (feedbackDiv) {
          feedbackDiv.innerHTML = `<div class="feedback ${result.success ? 'success' : 'failure'}">${result.message}</div>`;
        }
        if (result.success && this.puzzleCallbacks.onSolve) {
          this.puzzleCallbacks.onSolve(this.currentSceneId, result);
        }
      });
    });
    
    const recallCustomSubmit = container.querySelector('#recallCustomSubmit');
    if (recallCustomSubmit) {
      recallCustomSubmit.addEventListener('click', async () => {
        const input = container.querySelector('#recallCustomInput');
        const dream = input?.value || '';
        const feedbackDiv = container.querySelector('.recall-feedback');
        const result = this.solveRecallPuzzle(true, dream);
        if (feedbackDiv) {
          feedbackDiv.innerHTML = `<div class="feedback success">${result.message}</div>`;
        }
        if (result.success && this.puzzleCallbacks.onSolve) {
          this.puzzleCallbacks.onSolve(this.currentSceneId, result);
        }
      });
    }
    
    // Sequence puzzle events (drag and drop)
    this.setupSequencePuzzle(container);
    
    // Balance puzzle events
    const balanceBtns = container.querySelectorAll('.balance-btn');
    balanceBtns.forEach(btn => {
      btn.addEventListener('click', async () => {
        const isCorrect = btn.dataset.correct === 'true';
        const feedbackDiv = container.querySelector('.balance-feedback');
        const result = this.solveBalancePuzzle(isCorrect);
        if (feedbackDiv) {
          feedbackDiv.innerHTML = `<div class="feedback ${result.success ? 'success' : 'failure'}">${result.message}</div>`;
        }
        if (result.success && this.puzzleCallbacks.onSolve) {
          this.puzzleCallbacks.onSolve(this.currentSceneId, result);
        }
      });
    });
    
    // Sequence recall events
    this.setupSequenceRecallPuzzle(container);
    
    // Final chant events
    const finalChantBtn = container.querySelector('#finalChantBtn');
    if (finalChantBtn) {
      finalChantBtn.addEventListener('click', async () => {
        const feedbackDiv = container.querySelector('.final-feedback');
        const result = await this.solveFinalChantPuzzle();
        if (feedbackDiv) {
          feedbackDiv.innerHTML = `<div class="feedback ${result.success ? 'success' : 'failure'}">${result.message}</div>`;
        }
        if (result.success && this.puzzleCallbacks.onSolve) {
          this.puzzleCallbacks.onSolve(this.currentSceneId, result);
        }
      });
    }
    
    // Final offering events
    const offeringSubmit = container.querySelector('#offeringSubmitBtn');
    if (offeringSubmit) {
      offeringSubmit.addEventListener('click', async () => {
        const input = container.querySelector('#offeringWord');
        const word = input?.value || '';
        const feedbackDiv = container.querySelector('.final-feedback');
        const result = this.solveFinalOfferingPuzzle(word);
        if (feedbackDiv) {
          feedbackDiv.innerHTML = `<div class="feedback ${result.success ? 'success' : 'failure'}">${result.message}</div>`;
        }
        if (result.success && this.puzzleCallbacks.onSolve) {
          this.puzzleCallbacks.onSolve(this.currentSceneId, result);
        }
      });
    }
    
    const offeringSpeak = container.querySelector('#offeringSpeakBtn');
    if (offeringSpeak) {
      offeringSpeak.addEventListener('click', async () => {
        const feedbackDiv = container.querySelector('.final-feedback');
        const result = await this.solveFinalOfferingPuzzle(null, true);
        if (feedbackDiv) {
          feedbackDiv.innerHTML = `<div class="feedback ${result.success ? 'success' : 'failure'}">${result.message}</div>`;
        }
        if (result.success && this.puzzleCallbacks.onSolve) {
          this.puzzleCallbacks.onSolve(this.currentSceneId, result);
        }
      });
    }
    
    // Practice events
    const practiceBtns = container.querySelectorAll('.practice-glyph-btn');
    practiceBtns.forEach(btn => {
      btn.addEventListener('click', async () => {
        const glyph = btn.dataset.glyph;
        const feedbackDiv = container.querySelector('.practice-feedback');
        if (this.audio && glyph) {
          const freq = this.getGlyphFrequency(glyph);
          if (freq) {
            await this.audio.playFrequency(freq, 1500);
            if (feedbackDiv) {
              feedbackDiv.innerHTML = `<div class="feedback">Playing: ${glyph}</div>`;
              setTimeout(() => {
                if (feedbackDiv) feedbackDiv.innerHTML = '';
              }, 1500);
            }
          }
        }
      });
    });
  }

  /**
   * Setup drag-and-drop sequence puzzle
   */
  setupSequencePuzzle(container) {
    const pool = container.querySelector('#sequencePool');
    const slots = container.querySelector('#sequenceSlots');
    const checkBtn = container.querySelector('#sequenceCheckBtn');
    const resetBtn = container.querySelector('#sequenceResetBtn');
    const feedbackDiv = container.querySelector('.sequence-feedback');
    
    if (!pool || !slots) return;
    
    let currentSequence = [];
    const correctSequence = this.currentPuzzle?.correct_sequence || ['𐤀', '𐤃', '𐤆', '𐤌', '𐤕'];
    
    // Make pool items draggable
    const poolItems = pool.querySelectorAll('.sequence-item');
    poolItems.forEach(item => {
      item.setAttribute('draggable', 'true');
      item.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', item.dataset.glyph);
        e.dataTransfer.effectAllowed = 'move';
      });
    });
    
    // Make slots droppable
    const slotDivs = slots.querySelectorAll('.sequence-slot');
    slotDivs.forEach((slot, index) => {
      slot.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      });
      
      slot.addEventListener('drop', (e) => {
        e.preventDefault();
        const glyph = e.dataTransfer.getData('text/plain');
        if (glyph && !currentSequence[index]) {
          currentSequence[index] = glyph;
          slot.textContent = glyph;
          slot.classList.add('filled');
          
          // Remove from pool
          const sourceItem = Array.from(poolItems).find(item => item.dataset.glyph === glyph);
          if (sourceItem) sourceItem.remove();
        }
      });
      
      // Click to remove
      slot.addEventListener('click', () => {
        if (currentSequence[index]) {
          const removedGlyph = currentSequence[index];
          currentSequence[index] = null;
          slot.textContent = '';
          slot.classList.remove('filled');
          
          // Add back to pool
          const newItem = document.createElement('div');
          newItem.className = 'sequence-item';
          newItem.setAttribute('data-glyph', removedGlyph);
          newItem.setAttribute('draggable', 'true');
          newItem.textContent = removedGlyph;
          newItem.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', removedGlyph);
          });
          pool.appendChild(newItem);
        }
      });
    });
    
    // Check button
    if (checkBtn) {
      checkBtn.addEventListener('click', () => {
        const isCorrect = currentSequence.every((val, idx) => val === correctSequence[idx]);
        if (feedbackDiv) {
          if (isCorrect) {
            feedbackDiv.innerHTML = `<div class="feedback success">${this.currentPuzzle?.success_message || 'Correct! The hand closes.'}</div>`;
            if (this.puzzleCallbacks.onSolve) {
              this.puzzleCallbacks.onSolve(this.currentSceneId, { success: true, message: 'Sequence correct' });
            }
          } else {
            feedbackDiv.innerHTML = `<div class="feedback failure">${this.currentPuzzle?.failure_message || 'The order is wrong. Try again.'}</div>`;
          }
        }
      });
    }
    
    // Reset button
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        currentSequence = [];
        slotDivs.forEach(slot => {
          slot.textContent = '';
          slot.classList.remove('filled');
        });
        // Rebuild pool
        pool.innerHTML = correctSequence.map(glyph => `
          <div class="sequence-item" data-glyph="${glyph}" draggable="true">${glyph}</div>
        `).join('');
        // Reattach drag events
        const newItems = pool.querySelectorAll('.sequence-item');
        newItems.forEach(item => {
          item.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', item.dataset.glyph);
          });
        });
        if (feedbackDiv) feedbackDiv.innerHTML = '';
      });
    }
  }

  /**
   * Setup sequence recall puzzle (button-based)
   */
  setupSequenceRecallPuzzle(container) {
    const glyphBtns = container.querySelectorAll('.recall-glyph-btn');
    const displaySpan = container.querySelector('#recallSequenceDisplay');
    const submitBtn = container.querySelector('#recallSubmitBtn');
    const clearBtn = container.querySelector('#recallClearBtn');
    const chantBtn = container.querySelector('#recallChantBtn');
    const feedbackDiv = container.querySelector('.seq-recall-feedback');
    
    let currentSequence = [];
    const expectedSequence = this.currentPuzzle?.expected_sequence || ['𐤀', '𐤃', '𐤆', '𐤌', '𐤉', '𐤎', '𐤕'];
    
    if (glyphBtns) {
      glyphBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const glyph = btn.dataset.glyph;
          currentSequence.push(glyph);
          if (displaySpan) {
            displaySpan.textContent = `[${currentSequence.join(', ')}]`;
          }
        });
      });
    }
    
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        currentSequence = [];
        if (displaySpan) displaySpan.textContent = '[]';
        if (feedbackDiv) feedbackDiv.innerHTML = '';
      });
    }
    
    if (submitBtn) {
      submitBtn.addEventListener('click', async () => {
        const isCorrect = currentSequence.length === expectedSequence.length &&
          currentSequence.every((val, idx) => val === expectedSequence[idx]);
        
        if (feedbackDiv) {
          if (isCorrect) {
            feedbackDiv.innerHTML = `<div class="feedback success">${this.currentPuzzle?.success_message || 'The seal recognizes the sequence. The door opens.'}</div>`;
            if (this.puzzleCallbacks.onSolve) {
              this.puzzleCallbacks.onSolve(this.currentSceneId, { success: true, message: 'Sequence correct' });
            }
          } else {
            feedbackDiv.innerHTML = `<div class="feedback failure">${this.currentPuzzle?.failure_message || 'The seal does not recognize that sequence. Try again.'}</div>`;
          }
        }
      });
    }
    
    if (chantBtn) {
      chantBtn.addEventListener('click', async () => {
        const result = await this.solveSequenceRecallByChant(expectedSequence);
        if (feedbackDiv) {
          if (result.success) {
            feedbackDiv.innerHTML = `<div class="feedback success">${this.currentPuzzle?.success_message || 'The seal recognizes your voice. The door opens.'}</div>`;
            if (this.puzzleCallbacks.onSolve) {
              this.puzzleCallbacks.onSolve(this.currentSceneId, result);
            }
          } else {
            feedbackDiv.innerHTML = `<div class="feedback failure">${result.message || 'The seal does not recognize that sequence.'}</div>`;
          }
        }
      });
    }
  }

  /**
   * Solve chant puzzle via speech recognition
   */
  async solveChantPuzzle(targetGlyph) {
    if (!this.speechRecognition) {
      this.initSpeechRecognition();
    }
    
    if (!this.speechRecognition) {
      return { success: false, message: 'Speech recognition not supported in this browser.' };
    }
    
    return new Promise((resolve) => {
      let timeout = setTimeout(() => {
        this.speechRecognition.abort();
        resolve({ success: false, message: 'No speech detected. Try again.' });
      }, 5000);
      
      this.speechRecognition.onresult = (event) => {
        clearTimeout(timeout);
        const heard = event.results[0][0].transcript.toLowerCase().trim();
        
        // Get expected sound for glyph
        const glyphSounds = {
          '𐤀': ['ah', 'aaah', 'ahhh', 'a', 'alpha'],
          '𐤃': ['d', 'duh', 'dah', 'dalet'],
          '𐤆': ['z', 'zzz', 'zuh', 'zayin'],
          '𐤌': ['m', 'mmm', 'muh', 'mem'],
          '𐤉': ['y', 'yuh', 'yah', 'yod'],
          '𐤎': ['s', 'sss', 'suh', 'samekh'],
          '𐤕': ['t', 'tuh', 'tah', 'taw']
        };
        
        const expectedSounds = glyphSounds[targetGlyph] || ['ah'];
        const matched = expectedSounds.some(sound => heard.includes(sound));
        
        if (matched) {
          resolve({ success: true, message: this.currentPuzzle?.success_message || 'The door opens.' });
        } else {
          resolve({ success: false, message: this.currentPuzzle?.failure_message || `Heard "${heard}". Try again.` });
        }
      };
      
      this.speechRecognition.onerror = () => {
        clearTimeout(timeout);
        resolve({ success: false, message: 'Speech recognition failed. Try the button again.' });
      };
      
      this.speechRecognition.start();
    });
  }

  /**
   * Solve choice puzzle
   */
  solveChoicePuzzle(choiceId, option) {
    if (option) {
      if (option.sets_schism && this.game) {
        this.game.setSchism(option.sets_schism);
      }
      return { success: true, message: option.success_message || 'Your choice is made.' };
    }
    return { success: false, message: 'Invalid choice.' };
  }

  /**
   * Solve triad puzzle
   */
  solveTriadPuzzle(isCorrect, option) {
    if (isCorrect) {
      return { success: true, message: option?.success_message || this.currentPuzzle?.success_message || 'The blade cuts true.' };
    }
    return { success: false, message: option?.failure_message || this.currentPuzzle?.failure_message || 'The blade does not cut. Try again.' };
  }

  /**
   * Solve recall puzzle
   */
  solveRecallPuzzle(isCorrect, customDream = null) {
    if (isCorrect || customDream) {
      return { success: true, message: this.currentPuzzle?.success_message || 'The water accepts your dream.' };
    }
    return { success: false, message: this.currentPuzzle?.failure_message || 'The water does not recognize that dream.' };
  }

  /**
   * Solve balance puzzle
   */
  solveBalancePuzzle(isCorrect) {
    if (isCorrect) {
      return { success: true, message: this.currentPuzzle?.success_message || 'The hall steadies.' };
    }
    return { success: false, message: this.currentPuzzle?.failure_message || 'The structure still falters.' };
  }

  /**
   * Solve sequence recall by chant
   */
  async solveSequenceRecallByChant(expectedSequence) {
    if (!this.speechRecognition) {
      this.initSpeechRecognition();
    }
    
    if (!this.speechRecognition) {
      return { success: false, message: 'Speech recognition not supported.' };
    }
    
    return new Promise((resolve) => {
      let timeout = setTimeout(() => {
        this.speechRecognition.abort();
        resolve({ success: false, message: 'No speech detected.' });
      }, 8000);
      
      this.speechRecognition.onresult = (event) => {
        clearTimeout(timeout);
        const heard = event.results[0][0].transcript.toLowerCase().trim();
        
        // Check if heard matches expected sequence sounds
        const sequenceSounds = expectedSequence.map(glyph => {
          const sounds = { '𐤀': 'ah', '𐤃': 'd', '𐤆': 'z', '𐤌': 'm', '𐤉': 'y', '𐤎': 's', '𐤕': 't' };
          return sounds[glyph] || '';
        }).join(' ');
        
        const matched = sequenceSounds.split(' ').every(sound => heard.includes(sound));
        
        if (matched) {
          resolve({ success: true, message: 'Sequence recognized.' });
        } else {
          resolve({ success: false, message: `Heard "${heard}". Try chanting: ${sequenceSounds}` });
        }
      };
      
      this.speechRecognition.start();
    });
  }

  /**
   * Solve final chant puzzle
   */
  async solveFinalChantPuzzle() {
    if (!this.speechRecognition) {
      this.initSpeechRecognition();
    }
    
    if (!this.speechRecognition) {
      return { success: false, message: 'Speech recognition not supported.' };
    }
    
    return new Promise((resolve) => {
      let timeout = setTimeout(() => {
        this.speechRecognition.abort();
        resolve({ success: false, message: 'No name spoken.' });
      }, 8000);
      
      this.speechRecognition.onresult = (event) => {
        clearTimeout(timeout);
        const heard = event.results[0][0].transcript;
        resolve({ success: true, message: `The door hears you, ${heard}. Welcome home.` });
      };
      
      this.speechRecognition.start();
    });
  }

  /**
   * Solve final offering puzzle
   */
  solveFinalOfferingPuzzle(word = null, useSpeech = false) {
    if (useSpeech) {
      return { success: true, message: 'The door accepts your spoken word. The goddess smiles.' };
    }
    if (word && word.length > 0) {
      return { success: true, message: `The door accepts "${word}". The goddess smiles.` };
    }
    return { success: false, message: 'The door waits for a word.' };
  }

  /**
   * Get frequency for a glyph
   */
  getGlyphFrequency(glyph) {
    const frequencies = {
      '𐤀': 261.63, '𐤁': 293.66, '𐤂': 329.63, '𐤃': 349.23,
      '𐤄': 392.00, '𐤅': 440.00, '𐤆': 493.88, '𐤇': 523.25,
      '𐤈': 587.33, '𐤉': 659.25, '𐤊': 698.46, '𐤋': 783.99,
      '𐤌': 880.00, '𐤍': 987.77, '𐤎': 1046.50, '𐤏': 1174.66,
      '𐤐': 1318.51, '𐤑': 1396.91, '𐤒': 1567.98, '𐤓': 1760.00,
      '𐤔': 1975.53, '𐤕': 2093.00
    };
    return frequencies[glyph] || 440.00;
  }

  /**
   * Set callback for puzzle solve events
   */
  onSolve(callback) {
    this.puzzleCallbacks.onSolve = callback;
  }

  /**
   * Set callback for puzzle load events
   */
  onLoad(callback) {
    this.puzzleCallbacks.onLoad = callback;
  }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PuzzleSolver
