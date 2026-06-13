/**
 * Adzmyst Game — Chant Detector
 * Uses Web Speech API for microphone input
 */

const AdzmystChant = {
  // Glyph sound mappings
  glyphSounds: {
    '𐤀': { name: 'Aleph', sound: 'ah', variations: ['ah', 'aaah', 'ahhh', 'a'] },
    '𐤃': { name: 'Dalet', sound: 'd', variations: ['duh', 'dah', 'd'] },
    '𐤆': { name: 'Zayin', sound: 'z', variations: ['zzz', 'zuh', 'z'] },
    '𐤌': { name: 'Mem', sound: 'm', variations: ['mmm', 'muh', 'm'] },
    '𐤉': { name: 'Yod', sound: 'y', variations: ['yuh', 'yah', 'y'] },
    '𐤎': { name: 'Samekh', sound: 's', variations: ['sss', 'suh', 's'] },
    '𐤕': { name: 'Taw', sound: 't', variations: ['tuh', 'tah', 't'] }
  },
  
  // Listen for a specific glyph
  async listenForGlyph(targetGlyph, timeout = 5000) {
    return new Promise((resolve) => {
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        resolve({ matched: false, heard: null, error: 'Speech recognition not supported' });
        return;
      }
      
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      
      let timer = setTimeout(() => {
        recognition.abort();
        resolve({ matched: false, heard: null, error: 'Timeout' });
      }, timeout);
      
      recognition.onresult = (event) => {
        clearTimeout(timer);
        const heard = event.results[0][0].transcript.toLowerCase().trim();
        const targetSound = this.glyphSounds[targetGlyph];
        
        let matched = false;
        if (targetSound) {
          matched = targetSound.variations.some(v => heard.includes(v)) || 
                    heard === targetSound.sound ||
                    (heard.length === 1 && heard === targetSound.sound);
        }
        
        resolve({ matched, heard });
      };
      
      recognition.onerror = () => {
        clearTimeout(timer);
        resolve({ matched: false, heard: null, error: 'Recognition failed' });
      };
      
      recognition.start();
    });
  }
};

window.AdzmystChant = AdzmystChant;
