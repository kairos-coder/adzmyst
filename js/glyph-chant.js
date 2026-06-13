// glyph-chant.js — The Sound of Adzmyst
class GlyphChant {
  constructor() {
    this.chants = null;
    this.audioContext = null;
  }

  async init() {
    const response = await fetch('data/glyph-chant.json');
    const data = await response.json();
    this.chants = data.chants;
    this.sequences = data.sequences;
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  // Play a frequency for a glyph
  playGlyph(glyphSymbol) {
    const chant = this.chants.find(c => c.glyph === glyphSymbol);
    if (!chant) return;
    
    const now = this.audioContext.currentTime;
    const oscillator = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    
    oscillator.connect(gain);
    gain.connect(this.audioContext.destination);
    
    oscillator.frequency.value = chant.frequency_hz;
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.00001, now + chant.duration_ms / 1000);
    
    oscillator.start(now);
    oscillator.stop(now + chant.duration_ms / 1000);
    
    return chant;
  }

  // Recite the chant text for a glyph
  reciteGlyph(glyphSymbol) {
    const chant = this.chants.find(c => c.glyph === glyphSymbol);
    if (!chant) return null;
    
    // Use Web Speech API
    const utterance = new SpeechSynthesisUtterance(chant.chant_text);
    utterance.rate = 0.8;
    utterance.pitch = 1.2;
    window.speechSynthesis.speak(utterance);
    
    return chant;
  }

  // Play a sequence of glyphs
  playSequence(sequenceName, delayBetween = 1500) {
    const glyphs = this.sequences[sequenceName];
    if (!glyphs) return;
    
    glyphs.forEach((glyph, index) => {
      setTimeout(() => this.playGlyph(glyph), index * delayBetween);
    });
  }

  // Render a clickable glyph that plays sound
  renderSoundGlyph(glyphSymbol, className = 'sound-glyph') {
    return `<span class="${className}" data-glyph="${glyphSymbol}">${glyphSymbol}</span>`;
  }

  // Attach sound handlers to all sound-glyph elements
  attachSoundHandlers() {
    document.querySelectorAll('.sound-glyph').forEach(el => {
      el.addEventListener('click', () => {
        const glyph = el.dataset.glyph;
        this.playGlyph(glyph);
        this.reciteGlyph(glyph);
      });
    });
  }
}

export default GlyphChant;
