/**
 * Adzmyst Audio Engine — Chant detection and playback
 */

const AdzmystAudio = (function() {
  let audioContext = null;
  
  // Glyph sound mappings
  const glyphSounds = {
    '𐤀': { name: 'Aleph', sound: 'ah', variations: ['ah', 'aaah', 'ahhh', 'a', 'alpha'] },
    '𐤃': { name: 'Dalet', sound: 'd', variations: ['duh', 'dah', 'd', 'dalet'] },
    '𐤆': { name: 'Zayin', sound: 'z', variations: ['zzz', 'zuh', 'z', 'zayin'] },
    '𐤌': { name: 'Mem', sound: 'm', variations: ['mmm', 'muh', 'm', 'mem'] },
    '𐤉': { name: 'Yod', sound: 'y', variations: ['yuh', 'yah', 'y', 'yod'] },
    '𐤎': { name: 'Samekh', sound: 's', variations: ['sss', 'suh', 's', 'samekh'] },
    '𐤕': { name: 'Taw', sound: 't', variations: ['tuh', 'tah', 't', 'taw'] }
  };
  
  async function getAudioContext() {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContext;
  }
  
  async function playFrequency(frequency, duration = 1500, volume = 0.3) {
    const ctx = await getAudioContext();
    await ctx.resume();
    
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.05);
    gain.gain.setValueAtTime(volume, ctx.currentTime + duration / 1000 - 0.1);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration / 1000);
    
    oscillator.start();
    oscillator.stop(ctx.currentTime + duration / 1000);
  }
  
  async function listenForGlyph(targetGlyph, timeout = 5000) {
    return new Promise((resolve) => {
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        resolve({ matched: false, heard: null, error: 'Speech recognition not supported' });
        return;
      }
      
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 3;
      
      let timer = setTimeout(() => {
        recognition.abort();
        resolve({ matched: false, heard: null, error: 'Timeout' });
      }, timeout);
      
      recognition.onresult = (event) => {
        clearTimeout(timer);
        const heard = event.results[0][0].transcript.toLowerCase().trim();
        const targetSound = glyphSounds[targetGlyph];
        
        let matched = false;
        if (targetSound) {
          matched = targetSound.variations.some(v => heard.includes(v)) || 
                    heard === targetSound.sound;
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
  
  return { playFrequency, listenForGlyph, getAudioContext };
})();

window.AdzmystAudio = AdzmystAudio;
