// src/player.js
// Tone is imported lazily in load() to avoid creating AudioContext before user gesture

const SAMPLER_NOTES = {
  A0: 'A0.mp3', C1: 'C1.mp3', 'D#1': 'Ds1.mp3', 'F#1': 'Fs1.mp3',
  A1: 'A1.mp3', C2: 'C2.mp3', 'D#2': 'Ds2.mp3', 'F#2': 'Fs2.mp3',
  A2: 'A2.mp3', C3: 'C3.mp3', 'D#3': 'Ds3.mp3', 'F#3': 'Fs3.mp3',
  A3: 'A3.mp3', C4: 'C4.mp3', 'D#4': 'Ds4.mp3', 'F#4': 'Fs4.mp3',
  A4: 'A4.mp3', C5: 'C5.mp3', 'D#5': 'Ds5.mp3', 'F#5': 'Fs5.mp3',
  A5: 'A5.mp3', C6: 'C6.mp3', 'D#6': 'Ds6.mp3', 'F#6': 'Fs6.mp3',
  A6: 'A6.mp3', C7: 'C7.mp3', 'D#7': 'Ds7.mp3', 'F#7': 'Fs7.mp3',
  A7: 'A7.mp3', C8: 'C8.mp3'
}

let Tone = null

export class Player {
  constructor() {
    this._sampler = null
    this._parts = []
    this._pausedAt = 0
    this._totalTime = 0
    this._onTimeUpdate = null
    this._timerId = null
  }

  /** Load local Salamander samples. Call once after a user gesture; resolves when ready to play. */
  async load() {
    if (this._sampler) return
    if (!Tone) Tone = await import('tone')
    await Tone.start() // unlock AudioContext
    this._sampler = new Tone.Sampler({
      urls: SAMPLER_NOTES,
      baseUrl: '/audio/'
    }).toDestination()
    await Tone.loaded()
  }

  /**
   * Schedule two NoteSequences for playback.
   * @param {object} melody  - NoteSequence (time-based, seconds)
   * @param {object} accomp  - NoteSequence (time-based, seconds)
   * @param {function} onTimeUpdate  - called with currentTime (seconds) ~10 fps
   */
  prepare(melody, accomp, onTimeUpdate) {
    this._stop()
    this._totalTime = melody.totalTime
    this._onTimeUpdate = onTimeUpdate

    const allNotes = [
      ...melody.notes.map(n => ({ ...n, velocity: n.velocity ?? 80 })),
      ...accomp.notes.map(n => ({ ...n, velocity: n.velocity ?? 55 }))
    ]

    this._parts = allNotes.map(note => {
      const noteName = Tone.Frequency(note.pitch, 'midi').toNote()
      const duration = note.endTime - note.startTime
      return new Tone.Part((time) => {
        this._sampler.triggerAttackRelease(noteName, duration, time, note.velocity / 127)
      }, [[note.startTime, note]])
    })
  }

  play() {
    if (!this._sampler) throw new Error('Player not loaded')
    Tone.getTransport().start('+0.1', this._pausedAt)
    this._parts.forEach(p => p.start(0))

    this._timerId = setInterval(() => {
      const t = Tone.getTransport().seconds
      if (this._onTimeUpdate) this._onTimeUpdate(t)
      if (t >= this._totalTime) {
        this.pause()
        if (this._onTimeUpdate) this._onTimeUpdate(this._totalTime)
      }
    }, 100)
  }

  pause() {
    this._pausedAt = Tone.getTransport().seconds
    Tone.getTransport().pause()
    clearInterval(this._timerId)
  }

  get isPlaying() {
    return Tone?.getTransport().state === 'started'
  }

  get totalTime() {
    return this._totalTime
  }

  _stop() {
    if (!Tone) return
    Tone.getTransport().stop()
    Tone.getTransport().cancel()
    this._parts.forEach(p => p.dispose())
    this._parts = []
    this._pausedAt = 0
    clearInterval(this._timerId)
  }
}
