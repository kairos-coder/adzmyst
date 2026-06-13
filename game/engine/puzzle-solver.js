/**
 * puzzle-solver.js — Adzmyst Game Puzzle Engine
 * Version: 1.0.0
 * 
 * Handles all puzzle types for the Adzmyst breath game.
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
  }

  /**
   * Initialize speech recognition
   */
  initSpeechRecognition() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn('Speech recognition not supported');
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
   * Render puzzle interface based on type
   */
  renderPuzzleInterface(puzzle) {
    if (!puzzle) return '<div class="puzzle-error">No puzzle defined.</div>';
    
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
        return `<div class="puzzle-error">Unknown type: ${puzzle.type}</div>`;
    }
  }

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
          <button class="puzzle-btn hear-btn" data-frequency="${frequency}">🔊 Hear</button>
          <button class="puzzle-btn speak-btn" data-target="${targetGlyph}">🎤 Speak</button>
        </div>
        <div class="chant-feedback"></div>
      </div>
    `;
  }

  renderChoicePuzzle(puzzle) {
    const options = puzzle.options || [];
    return `
      <div class="puzzle-choice">
        <div class="choice-prompt">${puzzle.prompt || 'Choose:'}</div>
        <div class="choice-options">
          ${options.map(opt => `<button class="choice-btn" data-choice-id="${opt.id}">${opt.label}</button>`).join('')}
        </div>
        <div class="choice-feedback"></div>
      </div>
    `;
  }

  renderTriadSelectPuzzle(puzzle) {
    const options = puzzle.options || [];
    return `
      <div class="puzzle-triad">
        <div class="triad-prompt">${puzzle.prompt || 'Choose wisely:'}</div>
        <div class="triad-options">
          ${options.map(opt => `<button class="triad-btn" data-correct="${opt.is_correct}" data-msg="${opt.success_message || opt.failure_message || ''}">${opt.label}</button>`).join('')}
        </div>
        <div class="triad-feedback"></div>
      </div>
    `;
  }

  renderRecallPuzzle(puzzle) {
    const options = puzzle.dream_options || puzzle.options || [];
    return `
      <div class="puzzle-recall">
        <div class="recall-prompt">${puzzle.prompt || 'What did you dream?'}</div>
        <div class="recall-options">
          ${options.map(opt => `<button class="recall-btn" data-correct="${opt.is_correct}">${opt.label}</button>`).join('')}
        </div>
        <div class="recall-custom">
          <input type="text" id="recallCustomInput" placeholder="Or describe your own dream...">
          <button id="recallCustomSubmit" class="puzzle-btn">Submit</button>
        </div>
        <div class="recall-feedback"></div>
      </div>
    `;
  }

  renderSequencePuzzle(puzzle) {
    const options = puzzle.options || ['𐤀', '𐤃', '𐤆', '𐤌', '𐤕'];
    const correctSequence = puzzle.correct_sequence || ['𐤀', '𐤃', '𐤆', '𐤌', '𐤕'];
    
    return `
      <div class="puzzle-sequence">
        <div class="sequence-prompt">${puzzle.prompt || 'Arrange the glyphs:'}</div>
        <div class="sequence-pool" id="sequencePool">
          ${options.map(opt => `<div class="sequence-item" data-glyph="${opt}" draggable="true">${opt}</div>`).join('')}
        </div>
        <div class="sequence-slots" id="sequenceSlots">
          ${correctSequence.map((_, i) => `<div class="sequence-slot" data-slot-index="${i}"></div>`).join('')}
        </div>
        <button id="sequenceCheckBtn" class="puzzle-btn">Check</button>
        <div class="sequence-feedback"></div>
      </div>
    `;
  }

  renderBalancePuzzle(puzzle) {
    const options = puzzle.options || [];
    return `
      <div class="puzzle-balance">
        <div class="balance-prompt">${puzzle.prompt || 'Which pillar needs you?'}</div>
        ${options.map(opt => `<button class="balance-btn" data-correct="${opt.is_correct}">${opt.label}</button>`).join('')}
        <div class="balance-feedback"></div>
      </div>
    `;
  }

  renderSequenceRecallPuzzle(puzzle) {
    const expected = puzzle.expected_sequence || ['𐤀', '𐤃', '𐤆', '𐤌', '𐤉', '𐤎', '𐤕'];
    return `
      <div class="puzzle-seq-recall">
        <div class="seq-prompt">${puzzle.prompt || 'Chant the sequence:'}</div>
        <div class="seq-glyphs">${expected.map(g => `<button class="seq-glyph-btn" data-glyph="${g}">${g}</button>`).join('')}</div>
        <div class="seq-current">Current: <span id="recallSequenceDisplay">[]</span></div>
        <button id="recallSubmitBtn" class="puzzle-btn">Submit</button>
        <button id="recallChantBtn" class="puzzle-btn">🎤 Chant</button>
        <div class="seq-feedback"></div>
      </div>
    `;
  }

  renderFinalChantPuzzle(puzzle) {
    return `
      <div class="puzzle-final-chant">
        <div class="final-prompt">${puzzle.prompt || 'Speak your name as breath.'}</div>
        <button id="finalChantBtn" class="puzzle-btn primary">🎤 Speak</button>
        <div class="final-feedback"></div>
      </div>
    `;
  }

  renderFinalOfferingPuzzle(puzzle) {
    return `
      <div class="puzzle-final-offering">
        <div class="final-prompt">${puzzle.prompt || 'Speak the word you fear.'}</div>
        <input type="text" id="offeringWord" placeholder="The word...">
        <button id="offeringSubmitBtn" class="puzzle-btn">Offer</button>
        <button id="offeringSpeakBtn" class="puzzle-btn">🎤 Speak</button>
        <div class="final-feedback"></div>
      </div>
    `;
  }

  renderPracticePuzzle(puzzle) {
    const glyphs = puzzle.glyphs || ['𐤀', '𐤃', '𐤆', '𐤌', '𐤉', '𐤎', '𐤕'];
    return `
      <div class="puzzle-practice">
        <div class="practice-prompt">${puzzle.prompt || 'Click any glyph to hear it:'}</div>
        <div class="practice-glyphs">
          ${glyphs.map(g => `<button class="practice-glyph-btn" data-glyph="${g}">${g}</button>`).join('')}
        </div>
        <div class="practice-feedback"></div>
      </div>
    `;
  }

  attachPuzzleEvents(container) {
    if (!container) return;

    // Hear button
    const hearBtn = container.querySelector('.hear-btn');
    if (hearBtn && this.audio) {
      hearBtn.addEventListener('click', async () => {
        const freq = parseFloat(hearBtn.dataset.frequency);
        if (freq) await this.audio.playFrequency(freq, 1500);
      });
    }

    // Speak button
    const speakBtn = container.querySelector('.speak-btn');
    if (speakBtn) {
      speakBtn.addEventListener('click', async () => {
        const target = speakBtn.dataset.target;
        const fb = container.querySelector('.chant-feedback');
        const result = await this.solveChantPuzzle(target);
        if (fb) fb.innerHTML = `<div class="feedback ${result.success ? 'success' : 'failure'}">${result.message}</div>`;
        if (result.success && this.puzzleCallbacks.onSolve) this.puzzleCallbacks.onSolve(this.currentSceneId, result);
      });
    }

    // Choice buttons
    container.querySelectorAll('.choice-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const choiceId = btn.dataset.choiceId;
        const puzzle = this.currentPuzzle;
        const option = puzzle?.options?.find(o => o.id === choiceId);
        const result = this.solveChoicePuzzle(choiceId, option);
        const fb = container.querySelector('.choice-feedback');
        if (fb) fb.innerHTML = `<div class="feedback ${result.success ? 'success' : 'failure'}">${result.message}</div>`;
        if (result.success && this.puzzleCallbacks.onSolve) this.puzzleCallbacks.onSolve(this.currentSceneId, result);
      });
    });

    // Triad buttons
    container.querySelectorAll('.triad-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const isCorrect = btn.dataset.correct === 'true';
        const fb = container.querySelector('.triad-feedback');
        const result = this.solveTriadPuzzle(isCorrect);
        if (fb) fb.innerHTML = `<div class="feedback ${result.success ? 'success' : 'failure'}">${result.message || (isCorrect ? 'Correct!' : 'Wrong. Try again.')}</div>`;
        if (result.success && this.puzzleCallbacks.onSolve) this.puzzleCallbacks.onSolve(this.currentSceneId, result);
      });
    });

    // Recall buttons
    container.querySelectorAll('.recall-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const isCorrect = btn.dataset.correct === 'true';
        const fb = container.querySelector('.recall-feedback');
        const result = this.solveRecallPuzzle(isCorrect);
        if (fb) fb.innerHTML = `<div class="feedback ${result.success ? 'success' : 'failure'}">${result.message}</div>`;
        if (result.success && this.puzzleCallbacks.onSolve) this.puzzleCallbacks.onSolve(this.currentSceneId, result);
      });
    });

    const recallCustom = container.querySelector('#recallCustomSubmit');
    if (recallCustom) {
      recallCustom.addEventListener('click', async () => {
        const input = container.querySelector('#recallCustomInput');
        const dream = input?.value || '';
        const fb = container.querySelector('.recall-feedback');
        const result = this.solveRecallPuzzle(true, dream);
        if (fb) fb.innerHTML = `<div class="feedback success">${result.message}</div>`;
        if (result.success && this.puzzleCallbacks.onSolve) this.puzzleCallbacks.onSolve(this.currentSceneId, result);
      });
    }

    // Balance buttons
    container.querySelectorAll('.balance-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const isCorrect = btn.dataset.correct === 'true';
        const fb = container.querySelector('.balance-feedback');
        const result = this.solveBalancePuzzle(isCorrect);
        if (fb) fb.innerHTML = `<div class="feedback ${result.success ? 'success' : 'failure'}">${result.message}</div>`;
        if (result.success && this.puzzleCallbacks.onSolve) this.puzzleCallbacks.onSolve(this.currentSceneId, result);
      });
    });

    // Sequence check
    const seqCheck = container.querySelector('#sequenceCheckBtn');
    if (seqCheck) this.setupSequencePuzzle(container);

    // Sequence recall
    this.setupSequenceRecallPuzzle(container);

    // Final chant
    const finalChant = container.querySelector('#finalChantBtn');
    if (finalChant) {
      finalChant.addEventListener('click', async () => {
        const fb = container.querySelector('.final-feedback');
        const result = await this.solveFinalChantPuzzle();
        if (fb) fb.innerHTML = `<div class="feedback success">${result.message}</div>`;
        if (result.success && this.puzzleCallbacks.onSolve) this.puzzleCallbacks.onSolve(this.currentSceneId, result);
      });
    }

    // Final offering
    const offeringSubmit = container.querySelector('#offeringSubmitBtn');
    if (offeringSubmit) {
      offeringSubmit.addEventListener('click', async () => {
        const input = container.querySelector('#offeringWord');
        const word = input?.value || '';
        const fb = container.querySelector('.final-feedback');
        const result = this.solveFinalOfferingPuzzle(word);
        if (fb) fb.innerHTML = `<div class="feedback success">${result.message}</div>`;
        if (result.success && this.puzzleCallbacks.onSolve) this.puzzleCallbacks.onSolve(this.currentSceneId, result);
      });
    }

    const offeringSpeak = container.querySelector('#offeringSpeakBtn');
    if (offeringSpeak) {
      offeringSpeak.addEventListener('click', async () => {
        const fb = container.querySelector('.final-feedback');
        const result = await this.solveFinalOfferingPuzzle(null, true);
        if (fb) fb.innerHTML = `<div class="feedback success">${result.message}</div>`;
        if (result.success && this.puzzleCallbacks.onSolve) this.puzzleCallbacks.onSolve(this.currentSceneId, result);
      });
    }

    // Practice
    container.querySelectorAll('.practice-glyph-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const glyph = btn.dataset.glyph;
        const freq = this.getGlyphFrequency(glyph);
        if (freq && this.audio) {
          await this.audio.playFrequency(freq, 1500);
          const fb = container.querySelector('.practice-feedback');
          if (fb) fb.innerHTML = `<div class="feedback">${glyph}</div>`;
          setTimeout(() => { if (fb) fb.innerHTML = ''; }, 1500);
        }
      });
    });
  }

  setupSequencePuzzle(container) {
    const pool = container.querySelector('#sequencePool');
    const slots = container.querySelector('#sequenceSlots');
    const checkBtn = container.querySelector('#sequenceCheckBtn');
    const fb = container.querySelector('.sequence-feedback');
    if (!pool || !slots) return;

    let current = [];
    const correct = this.currentPuzzle?.correct_sequence || ['𐤀', '𐤃', '𐤆', '𐤌', '𐤕'];

    const makeDraggable = (el) => {
      el.setAttribute('draggable', 'true');
      el.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', el.dataset.glyph);
      });
    };

    pool.querySelectorAll('.sequence-item').forEach(makeDraggable);

    const slotDivs = slots.querySelectorAll('.sequence-slot');
    slotDivs.forEach((slot, i) => {
      slot.addEventListener('dragover', (e) => e.preventDefault());
      slot.addEventListener('drop', (e) => {
        e.preventDefault();
        const glyph = e.dataTransfer.getData('text/plain');
        if (glyph && !current[i]) {
          current[i] = glyph;
          slot.textContent = glyph;
          const source = pool.querySelector(`.sequence-item[data-glyph="${glyph}"]`);
          if (source) source.remove();
        }
      });
      slot.addEventListener('click', () => {
        if (current[i]) {
          const removed = current[i];
          current[i] = null;
          slot.textContent = '';
          const newItem = document.createElement('div');
          newItem.className = 'sequence-item';
          newItem.setAttribute('data-glyph', removed);
          newItem.textContent = removed;
          makeDraggable(newItem);
          pool.appendChild(newItem);
        }
      });
    });

    if (checkBtn) {
      checkBtn.addEventListener('click', () => {
        const isCorrect = current.every((v, i) => v === correct[i]);
        if (fb) {
          if (isCorrect) {
            fb.innerHTML = '<div class="feedback success">Correct!</div>';
            if (this.puzzleCallbacks.onSolve) this.puzzleCallbacks.onSolve(this.currentSceneId, { success: true });
          } else {
            fb.innerHTML = '<div class="feedback failure">Wrong order. Try again.</div>';
          }
        }
      });
    }
  }

  setupSequenceRecallPuzzle(container) {
    const glyphBtns = container.querySelectorAll('.seq-glyph-btn');
    const display = container.querySelector('#recallSequenceDisplay');
    const submitBtn = container.querySelector('#recallSubmitBtn');
    const chantBtn = container.querySelector('#recallChantBtn');
    const fb = container.querySelector('.seq-feedback');

    let current = [];
    const expected = this.currentPuzzle?.expected_sequence || ['𐤀', '𐤃', '𐤆', '𐤌', '𐤉', '𐤎', '𐤕'];

    if (glyphBtns) {
      glyphBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          current.push(btn.dataset.glyph);
          if (display) display.textContent = `[${current.join(', ')}]`;
        });
      });
    }

    if (submitBtn) {
      submitBtn.addEventListener('click', () => {
        const isCorrect = current.length === expected.length && current.every((v, i) => v === expected[i]);
        if (fb) {
          if (isCorrect) {
            fb.innerHTML = '<div class="feedback success">Sequence accepted!</div>';
            if (this.puzzleCallbacks.onSolve) this.puzzleCallbacks.onSolve(this.currentSceneId, { success: true });
          } else {
            fb.innerHTML = '<div class="feedback failure">Incorrect sequence.</div>';
          }
        }
      });
    }

    if (chantBtn) {
      chantBtn.addEventListener('click', async () => {
        const result = await this.solveSequenceRecallByChant(expected);
        if (fb) {
          if (result.success) {
            fb.innerHTML = '<div class="feedback success">Chant recognized!</div>';
            if (this.puzzleCallbacks.onSolve) this.puzzleCallbacks.onSolve(this.currentSceneId, result);
          } else {
            fb.innerHTML = `<div class="feedback failure">${result.message}</div>`;
          }
        }
      });
    }
  }

  async solveChantPuzzle(targetGlyph) {
    if (!this.speechRecognition) this.initSpeechRecognition();
    if (!this.speechRecognition) {
      return { success: false, message: 'Speech recognition not supported.' };
    }
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.speechRecognition.abort();
        resolve({ success: false, message: 'No speech detected.' });
      }, 5000);
      const sounds = { '𐤀': ['ah', 'a'], '𐤃': ['d', 'duh'], '𐤆': ['z'], '𐤌': ['m'], '𐤉': ['y'], '𐤎': ['s'], '𐤕': ['t'] };
      this.speechRecognition.onresult = (e) => {
        clearTimeout(timeout);
        const heard = e.results[0][0].transcript.toLowerCase();
        const expected = sounds[targetGlyph] || ['ah'];
        const matched = expected.some(s => heard.includes(s));
        resolve(matched ? { success: true, message: 'The door opens.' } : { success: false, message: `Heard "${heard}". Try again.` });
      };
      this.speechRecognition.start();
    });
  }

  solveChoicePuzzle(choiceId, option) {
    if (option) {
      if (option.sets_schism && this.game) this.game.setSchism(option.sets_schism);
      return { success: true, message: option.success_message || 'Choice made.' };
    }
    return { success: false, message: 'Invalid choice.' };
  }

  solveTriadPuzzle(isCorrect) {
    return isCorrect ? { success: true, message: 'Correct!' } : { success: false, message: 'Try again.' };
  }

  solveRecallPuzzle(isCorrect, customDream = null) {
    return isCorrect || customDream ? { success: true, message: 'The water accepts.' } : { success: false, message: 'Not recognized.' };
  }

  solveBalancePuzzle(isCorrect) {
    return isCorrect ? { success: true, message: 'The hall steadies.' } : { success: false, message: 'Still unstable.' };
  }

  async solveSequenceRecallByChant(expected) {
    if (!this.speechRecognition) this.initSpeechRecognition();
    if (!this.speechRecognition) {
      return { success: false, message: 'Speech not supported.' };
    }
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.speechRecognition.abort();
        resolve({ success: false, message: 'No speech.' });
      }, 8000);
      const soundMap = { '𐤀': 'ah', '𐤃': 'd', '𐤆': 'z', '𐤌': 'm', '𐤉': 'y', '𐤎': 's', '𐤕': 't' };
      const expectedStr = expected.map(g => soundMap[g]).join(' ');
      this.speechRecognition.onresult = (e) => {
        clearTimeout(timeout);
        const heard = e.results[0][0].transcript.toLowerCase();
        const matched = expectedStr.split(' ').every(s => heard.includes(s));
        resolve(matched ? { success: true, message: 'Sequence recognized.' } : { success: false, message: `Heard "${heard}". Try: ${expectedStr}` });
      };
      this.speechRecognition.start();
    });
  }

  async solveFinalChantPuzzle() {
    if (!this.speechRecognition) this.initSpeechRecognition();
    if (!this.speechRecognition) {
      return { success: false, message: 'Speech not supported.' };
    }
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.speechRecognition.abort();
        resolve({ success: false, message: 'No name spoken.' });
      }, 8000);
      this.speechRecognition.onresult = (e) => {
        clearTimeout(timeout);
        const heard = e.results[0][0].transcript;
        resolve({ success: true, message: `The door hears you, ${heard}. Welcome.` });
      };
      this.speechRecognition.start();
    });
  }

  async solveFinalOfferingPuzzle(word = null, useSpeech = false) {
    if (useSpeech) {
      if (!this.speechRecognition) this.initSpeechRecognition();
      if (!this.speechRecognition) {
        return { success: false, message: 'Speech not supported.' };
      }
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          this.speechRecognition.abort();
          resolve({ success: false, message: 'No word spoken.' });
        }, 8000);
        this.speechRecognition.onresult = (e) => {
          clearTimeout(timeout);
          const heard = e.results[0][0].transcript;
          resolve({ success: true, message: `The goddess accepts "${heard}".` });
        };
        this.speechRecognition.start();
      });
    }
    if (word && word.length > 0) {
      return { success: true, message: `The goddess accepts "${word}".` };
    }
    return { success: false, message: 'The door waits for a word.' };
  }

  getGlyphFrequency(glyph) {
    const freq = { '𐤀': 261.63, '𐤃': 349.23, '𐤆': 493.88, '𐤌': 880, '𐤉': 659.25, '𐤎': 1046.5, '𐤕': 2093 };
    return freq[glyph] || 440;
  }

  onSolve(callback) { this.puzzleCallbacks.onSolve = callback; }
  onLoad(callback) { this.puzzleCallbacks.onLoad = callback; }
}

if (typeof module !== 'undefined') module.exports = PuzzleSolver;
