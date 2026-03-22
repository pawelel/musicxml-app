// src/musicxml-parser.js

const STEP_TO_SEMITONE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }

/**
 * Parse MusicXML string → NoteSequence
 * @param {string} xmlText - raw MusicXML file contents
 * @returns {{ notes, totalTime, tempos, timeSignatures, keyFifths }}
 */
export function parseMusicXml(xmlText) {
  const doc = new DOMParser().parseFromString(xmlText, 'application/xml')

  const parseError = doc.querySelector('parsererror')
  if (parseError) throw new Error('File is not valid MusicXML')

  const parts = doc.querySelectorAll('part')
  if (parts.length === 0) throw new Error('No parts found in MusicXML file')

  // Use first part
  const part = parts[0]
  const measures = part.querySelectorAll('measure')
  if (measures.length === 0) throw new Error('No notes found in file')

  // Read global attributes from first measure
  let divisions = 1
  let qpm = 120
  let numerator = 4
  let denominator = 4
  let keyFifths = 0

  const firstAttrs = measures[0].querySelector('attributes')
  if (firstAttrs) {
    const divEl = firstAttrs.querySelector('divisions')
    if (divEl) divisions = parseInt(divEl.textContent)

    const keyEl = firstAttrs.querySelector('key > fifths')
    if (keyEl) keyFifths = parseInt(keyEl.textContent)

    const beatsEl = firstAttrs.querySelector('time > beats')
    if (beatsEl) numerator = parseInt(beatsEl.textContent)

    const beatTypeEl = firstAttrs.querySelector('time > beat-type')
    if (beatTypeEl) denominator = parseInt(beatTypeEl.textContent)
  }

  // Read tempo from first direction
  const tempoEl = measures[0].querySelector('direction > sound[tempo]')
    ?? doc.querySelector('sound[tempo]')
  if (tempoEl) qpm = parseFloat(tempoEl.getAttribute('tempo'))

  let secondsPerQuarter = 60 / qpm

  const notes = []
  let currentTime = 0 // in quarters

  for (const measure of measures) {
    let topVoiceDone = false

    for (const child of measure.children) {
      if (child.tagName === 'backup') {
        // First backup = end of top voice. currentTime is already at measure end — just stop.
        topVoiceDone = true
        break
      }

      if (child.tagName === 'note') {
        if (topVoiceDone) continue

        const isRest = child.querySelector('rest') !== null
        const isChord = child.querySelector('chord') !== null
        const durEl = child.querySelector('duration')
        const dur = durEl ? parseInt(durEl.textContent) / divisions : 0 // in quarters

        if (isChord) {
          if (!isRest) {
            const lastNote = notes[notes.length - 1]
            if (lastNote) {
              const chordPitch = getPitch(child)
              if (chordPitch !== null) {
                notes.push({
                  pitch: chordPitch,
                  startTime: lastNote.startTime,
                  endTime: lastNote.endTime,
                  velocity: 75
                })
              }
            }
          }
          continue
        }

        if (!isRest) {
          const pitch = getPitch(child)
          if (pitch !== null) {
            notes.push({
              pitch,
              startTime: currentTime * secondsPerQuarter,
              endTime: (currentTime + dur) * secondsPerQuarter,
              velocity: 80
            })
          }
        }
        currentTime += dur
      }

      if (child.tagName === 'forward') {
        const dur = parseInt(child.querySelector('duration')?.textContent ?? 0)
        currentTime += dur / divisions
      }

      if (child.tagName === 'direction') {
        const soundEl = child.querySelector('sound[tempo]')
        if (soundEl) {
          qpm = parseFloat(soundEl.getAttribute('tempo'))
          secondsPerQuarter = 60 / qpm
        }
      }
    }
  }

  if (notes.length === 0) throw new Error('No notes found in file')

  const totalTime = Math.max(...notes.map(n => n.endTime))

  return {
    notes,
    totalTime,
    tempos: [{ time: 0, qpm }],
    timeSignatures: [{ time: 0, numerator, denominator }],
    keyFifths
  }
}

function getPitch(noteEl) {
  const pitchEl = noteEl.querySelector('pitch')
  if (!pitchEl) return null

  const step = pitchEl.querySelector('step')?.textContent ?? 'C'
  const octave = parseInt(pitchEl.querySelector('octave')?.textContent ?? '4')
  const alter = parseFloat(pitchEl.querySelector('alter')?.textContent ?? '0')

  return (octave + 1) * 12 + STEP_TO_SEMITONE[step] + Math.round(alter)
}
