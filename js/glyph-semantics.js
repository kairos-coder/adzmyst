/**
 * glyph-semantics.js — Semantic Engine for Adzmyst
 * 
 * Generates inscriptions from glyph triads, affinities, and oppositions.
 * Uses the same glyph data as glyph-chant.js.
 */

class GlyphSemantics {
  constructor() {
    this.glyphs = null;
    this.triads = [];
    this.affinities = {};
    this.oppositions = {};
  }

  async init() {
    // Load the glyph-chant.json for glyph data
    const response = await fetch('data/json/glyph-chant.json');
    const data = await response.json();
    this.glyphs = data.chants;
    
    // Build semantic relationships
    this.buildTriads();
    this.buildAffinities();
    this.buildOppositions();
    
    return this;
  }

  // ─────────────────────────────────────────────────────────────
  // Predefined Triads (can be expanded)
  // ─────────────────────────────────────────────────────────────
  buildTriads() {
    this.triads = [
      {
        name: "The Fool's Step",
        glyphs: ["𐤀", "𐤐", "𐤕"],
        description: "The word that starts and ends the journey. Aleph (beginning) + Pe (mouth) + Taw (completion).",
        inscription: "The mouth speaks the first word. The beginning becomes the end. The seal is the same as the opening."
      },
      {
        name: "The Descent",
        glyphs: ["𐤃", "𐤌", "𐤒"],
        description: "The threshold into the deep that returns. Dalet (door) + Mem (water) + Qoph (cycle).",
        inscription: "The door opens to water. The water cycles through the deep. What descends must rise."
      },
      {
        name: "The Return",
        glyphs: ["𐤓", "𐤏", "𐤔"],
        description: "Seeing clearly after transformation. Resh (head) + Ayin (eye) + Shin (fire).",
        inscription: "The head turns. The eye sees. The fire consumes what was false. What remains is true."
      },
      {
        name: "The Hearth",
        glyphs: ["𐤁", "𐤎", "𐤇"],
        description: "The protected center that holds. Bet (house) + Samekh (pillar) + Heth (fence).",
        inscription: "The house is built on pillars. The fence marks the boundary. The center is safe."
      },
      {
        name: "The Covenant",
        glyphs: ["𐤅", "𐤈", "𐤕"],
        description: "The binding that endures. Waw (hook) + Teth (snake) + Taw (mark).",
        inscription: "The hook catches the snake. The snake coils around the mark. The covenant is sealed."
      },
      {
        name: "The Harvest",
        glyphs: ["𐤑", "𐤊", "𐤋"],
        description: "The gathering of what was sown. Tsade (hook) + Kaph (palm) + Lamed (goad).",
        inscription: "The hand opens to receive. The hook gathers what was cast. The goad guides the harvest home."
      },
      {
        name: "The Vision",
        glyphs: ["𐤄", "𐤍", "𐤒"],
        description: "The window to eternity. He (window) + Nun (eternity) + Qoph (cycle).",
        inscription: "The window looks out on the cycle. The cycle never ends. The eternal watches from within."
      },
      {
        name: "The Wound",
        glyphs: ["𐤆", "𐤉", "𐤌"],
        description: "The cut that becomes a hand in water. Zayin (weapon) + Yod (hand) + Mem (water).",
        inscription: "The weapon cuts. The hand reaches into the wound. The water heals what it receives."
      }
    ];
  }

  // ─────────────────────────────────────────────────────────────
  // Affinities — glyphs that naturally combine
  // ─────────────────────────────────────────────────────────────
  buildAffinities() {
    this.affinities = {
      "𐤀": ["𐤃", "𐤕", "𐤓"],  // Aleph works with door, completion, head
      "𐤁": ["𐤇", "𐤎", "𐤋"],  // Bet works with fence, pillar, goad
      "𐤃": ["𐤀", "𐤌", "𐤒"],  // Dalet works with beginning, water, cycle
      "𐤄": ["𐤏", "𐤔", "𐤓"],  // He works with eye, fire, head
      "𐤅": ["𐤈", "𐤕", "𐤍"],  // Waw works with snake, completion, eternity
      "𐤆": ["𐤉", "𐤌", "𐤐"],  // Zayin works with hand, water, mouth
      "𐤇": ["𐤁", "𐤎", "𐤋"],  // Heth works with house, pillar, goad
      "𐤈": ["𐤅", "𐤕", "𐤍"],  // Teth works with hook, completion, eternity
      "𐤉": ["𐤆", "𐤌", "𐤐"],  // Yod works with weapon, water, mouth
      "𐤊": ["𐤑", "𐤋", "𐤁"],  // Kaph works with hook, goad, house
      "𐤋": ["𐤊", "𐤑", "𐤇"],  // Lamed works with palm, hook, fence
      "𐤌": ["𐤃", "𐤒", "𐤍"],  // Mem works with door, cycle, eternity
      "𐤍": ["𐤌", "𐤒", "𐤈"],  // Nun works with water, cycle, snake
      "𐤎": ["𐤁", "𐤇", "𐤋"],  // Samekh works with house, fence, goad
      "𐤏": ["𐤄", "𐤔", "𐤓"],  // Ayin works with window, fire, head
      "𐤐": ["𐤀", "𐤉", "𐤆"],  // Pe works with beginning, hand, weapon
      "𐤑": ["𐤊", "𐤋", "𐤁"],  // Tsade works with palm, goad, house
      "𐤒": ["𐤃", "𐤌", "𐤍"],  // Qoph works with door, water, eternity
      "𐤓": ["𐤀", "𐤄", "𐤏"],  // Resh works with beginning, window, eye
      "𐤔": ["𐤄", "𐤏", "𐤓"],  // Shin works with window, eye, head
      "𐤕": ["𐤀", "𐤅", "𐤈"]   // Taw works with beginning, hook, snake
    };
  }

  // ─────────────────────────────────────────────────────────────
  // Oppositions — glyphs that contrast or balance
  // ─────────────────────────────────────────────────────────────
  buildOppositions() {
    this.oppositions = {
      "𐤀": "𐤕",  // Beginning opposes completion
      "𐤁": "𐤏",  // House opposes eye (inside vs outside)
      "𐤃": "𐤇",  // Door opposes fence (passage vs boundary)
      "𐤄": "𐤌",  // Window opposes water (light vs depth)
      "𐤅": "𐤆",  // Hook opposes weapon (binding vs cutting)
      "𐤉": "𐤐",  // Hand opposes mouth (action vs speech)
      "𐤊": "𐤑",  // Palm opposes hook (open vs catch)
      "𐤋": "𐤍",  // Goad opposes snake (control vs wild)
      "𐤎": "𐤒",  // Pillar opposes cycle (still vs turning)
      "𐤓": "𐤔"   // Head opposes fire (mind vs transformation)
    };
  }

  // ─────────────────────────────────────────────────────────────
  // Semantic Distance between two glyphs
  // ─────────────────────────────────────────────────────────────
  getSemanticDistance(glyph1, glyph2) {
    // If they are opposites, distance is high (10)
    if (this.oppositions[glyph1] === glyph2 || this.oppositions[glyph2] === glyph1) {
      return 10;
    }
    // If they have affinity, distance is low (1-3)
    if (this.affinities[glyph1]?.includes(glyph2) || this.affinities[glyph2]?.includes(glyph1)) {
      return 2;
    }
    // If they share a triad with a third glyph, medium distance (5)
    const sharedTriad = this.triads.find(t => 
      t.glyphs.includes(glyph1) && t.glyphs.includes(glyph2)
    );
    if (sharedTriad) return 4;
    
    // Default distance
    return 7;
  }

  // ─────────────────────────────────────────────────────────────
  // Generate a random triad
  // ─────────────────────────────────────────────────────────────
  getRandomTriad() {
    const index = Math.floor(Math.random() * this.triads.length);
    return this.triads[index];
  }

  // ─────────────────────────────────────────────────────────────
  // Generate an inscription from a triad
  // ─────────────────────────────────────────────────────────────
  generateInscriptionFromTriad(triad) {
    const glyphData = triad.glyphs.map(g => this.glyphs.find(gl => gl.glyph === g));
    
    return {
      title: triad.name,
      glyphs: triad.glyphs,
      description: triad.description,
      inscription: triad.inscription,
      glyphDetails: glyphData.map(g => ({
        glyph: g.glyph,
        name: g.name,
        meaning: g.meaning,
        frequency: g.frequency_hz,
        chant: g.chant_text
      })),
      meditation: `Contemplate the ${triad.name}. ${triad.inscription} The glyphs speak: ${glyphData.map(g => g.name).join(', ')}. Their frequencies mingle: ${glyphData.map(g => g.note).join(', ')}. The breath holds them all.`
    };
  }

  // ─────────────────────────────────────────────────────────────
  // Generate a custom inscription from any three glyphs
  // ─────────────────────────────────────────────────────────────
  generateCustomInscription(glyph1, glyph2, glyph3) {
    const g1 = this.glyphs.find(g => g.glyph === glyph1);
    const g2 = this.glyphs.find(g => g.glyph === glyph2);
    const g3 = this.glyphs.find(g => g.glyph === glyph3);
    
    if (!g1 || !g2 || !g3) return null;
    
    // Calculate pairwise distances
    const d12 = this.getSemanticDistance(glyph1, glyph2);
    const d23 = this.getSemanticDistance(glyph2, glyph3);
    const d13 = this.getSemanticDistance(glyph1, glyph3);
    const avgDistance = (d12 + d23 + d13) / 3;
    
    // Generate inscription based on distances
    let inscription = "";
    if (avgDistance < 4) {
      inscription = `${g1.name}, ${g2.name}, and ${g3.name} sing together. Their meanings resonate: ${g1.meaning}, ${g2.meaning}, ${g3.meaning}. The breath finds harmony.`;
    } else if (avgDistance > 7) {
      inscription = `${g1.name} and ${g3.name} are opposed — ${g1.meaning} against ${g3.meaning}. ${g2.name} stands between them as ${g2.meaning}. The tension is the teaching.`;
    } else {
      inscription = `${g1.name} (${g1.meaning}) meets ${g2.name} (${g2.meaning}) and ${g3.name} (${g3.meaning}). The distance between them is ${Math.round(avgDistance)} steps. Walk the path.`;
    }
    
    return {
      title: `Custom Triad: ${g1.name} · ${g2.name} · ${g3.name}`,
      glyphs: [glyph1, glyph2, glyph3],
      description: `${g1.meaning} + ${g2.meaning} + ${g3.meaning}`,
      inscription: inscription,
      glyphDetails: [g1, g2, g3],
      semanticDistance: avgDistance,
      meditation: `Contemplate the distance between ${g1.name} and ${g3.name}. ${g2.name} is the bridge. The breath crosses.`
    };
  }

  // ─────────────────────────────────────────────────────────────
  // Generate all inscriptions for the inscriptions.html page
  // ─────────────────────────────────────────────────────────────
  getAllInscriptions() {
    return this.triads.map(triad => this.generateInscriptionFromTriad(triad));
  }

  // ─────────────────────────────────────────────────────────────
  // Generate a daily inscription
  // ─────────────────────────────────────────────────────────────
  getDailyInscription() {
    const today = new Date().toDateString();
    const hash = today.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    const index = hash % this.triads.length;
    return this.generateInscriptionFromTriad(this.triads[index]);
  }
}

export default GlyphSemantics;
