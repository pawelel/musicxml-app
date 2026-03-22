// src/accompaniment-generator.js
// Harmonic accompaniment generator based on music theory (no external dependencies)
// Generates a waltz/bass-pattern accompaniment matching the melody's key and tempo

// Circle of fifths → semitone offset from C
const FIFTHS_TO_SEMITONE = { 0:0, 1:7, 2:2, 3:9, 4:4, 5:11, '-1':5, '-2':10, '-3':3, '-4':8, '-5':1 }

// Chord offsets from key root: [root, third, fifth]
// I-vi-IV-V progression (major key)
const CHORD_PROGRESSION = [
  { offsets: [0, 4, 7],  quality: 'maj' }, // I
  { offsets: [9, 0, 4],  quality: 'min' }, // vi (A in C = 9st up, chord: A-C-E)
  { offsets: [5, 9, 0],  quality: 'maj' }, // IV (F in C = 5st up, chord: F-A-C)
  { offsets: [7, 11, 2], quality: 'maj' }, // V  (G in C = 7st up, chord: G-B-D)
]

/**
 * Generate a bass accompaniment NoteSequence using music theory.
 * @param {object} melodyNs  - time-based NoteSequence from parser
 * @param {number} keyFifths - key signature (-7..7)
 * @param {{ numerator, denominator }} timeSig
 * @returns {object} time-based NoteSequence for accompaniment
 */
export async function generateAccompaniment(melodyNs, keyFifths, timeSig) {
  const qpm = melodyNs.tempos[0]?.qpm ?? 120
  const secondsPerBeat = 60 / qpm
  const beatsPerMeasure = timeSig?.numerator ?? 3
  const secondsPerMeasure = secondsPerBeat * beatsPerMeasure

  const keyRoot = FIFTHS_TO_SEMITONE[String(keyFifths)] ?? 0
  // Bass root in octave 2 (C2 = MIDI 36)
  const bassOctaveBase = 36 + keyRoot

  const totalTime = melodyNs.totalTime
  const totalMeasures = Math.ceil(totalTime / secondsPerMeasure)
  // Each chord lasts this many measures (cycle of 4 chords)
  const measuresPerChord = Math.max(1, Math.round(totalMeasures / (CHORD_PROGRESSION.length * 2)))

  const notes = []

  for (let measure = 0; measure < totalMeasures; measure++) {
    const chordIndex = Math.floor(measure / measuresPerChord) % CHORD_PROGRESSION.length
    const chord = CHORD_PROGRESSION[chordIndex]
    const measureStart = measure * secondsPerMeasure

    // Build bass pattern: depends on time signature
    const pattern = buildPattern(beatsPerMeasure, chord, bassOctaveBase, keyRoot)

    for (const step of pattern) {
      const startTime = measureStart + step.beat * secondsPerBeat
      const endTime = startTime + step.duration * secondsPerBeat
      if (startTime >= totalTime) break
      notes.push({
        pitch: step.pitch,
        startTime,
        endTime: Math.min(endTime, totalTime),
        velocity: step.velocity
      })
    }
  }

  return {
    notes,
    totalTime,
    tempos: melodyNs.tempos,
    timeSignatures: melodyNs.timeSignatures
  }
}

/**
 * Build a beat pattern for one measure.
 * Returns array of { beat, duration, pitch, velocity }
 */
function buildPattern(beatsPerMeasure, chord, bassOctaveBase, keyRoot) {
  const [root, third, fifth] = chord.offsets

  // Low bass note (root, octave 2)
  const bassRoot = wrap(bassOctaveBase + root, 36, 48)
  // Mid notes (5th and 3rd, octave 3)
  const bassFifth = wrap(bassOctaveBase + fifth + 12, 48, 60)
  const bassThird = wrap(bassOctaveBase + third + 12, 48, 60)

  if (beatsPerMeasure === 3) {
    // Waltz: root — fifth — third
    return [
      { beat: 0, duration: 0.95, pitch: bassRoot,  velocity: 70 },
      { beat: 1, duration: 0.9,  pitch: bassFifth, velocity: 50 },
      { beat: 2, duration: 0.9,  pitch: bassThird, velocity: 50 },
    ]
  } else if (beatsPerMeasure === 6) {
    // 6/8: root — mid — mid — root — mid — mid
    return [
      { beat: 0, duration: 0.9, pitch: bassRoot,  velocity: 70 },
      { beat: 1, duration: 0.9, pitch: bassFifth, velocity: 45 },
      { beat: 2, duration: 0.9, pitch: bassThird, velocity: 45 },
      { beat: 3, duration: 0.9, pitch: bassRoot,  velocity: 60 },
      { beat: 4, duration: 0.9, pitch: bassFifth, velocity: 45 },
      { beat: 5, duration: 0.9, pitch: bassThird, velocity: 45 },
    ]
  } else {
    // 4/4 and others: root — fifth — root — third
    return [
      { beat: 0, duration: 0.95, pitch: bassRoot,  velocity: 70 },
      { beat: 1, duration: 0.9,  pitch: bassFifth, velocity: 50 },
      { beat: 2, duration: 0.9,  pitch: bassRoot,  velocity: 60 },
      { beat: 3, duration: 0.9,  pitch: bassThird, velocity: 50 },
    ]
  }
}

/** Keep a MIDI pitch within [low, high) by shifting octaves */
function wrap(pitch, low, high) {
  while (pitch < low) pitch += 12
  while (pitch >= high) pitch -= 12
  return pitch
}
