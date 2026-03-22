// src/main.js
import { parseMusicXml } from './musicxml-parser.js'
import { generateAccompaniment } from './accompaniment-generator.js'
import { Player } from './player.js'

// --- UI refs ---
const dropZone = document.getElementById('drop-zone')
const fileInput = document.getElementById('file-input')
const statusBar = document.getElementById('status-bar')
const statusText = document.getElementById('status-text')
const playerBar = document.getElementById('player-bar')
const fileNameEl = document.getElementById('file-name')
const playBtn = document.getElementById('play-btn')
const progressFill = document.getElementById('progress-fill')
const timeCurrent = document.getElementById('time-current')
const timeTotal = document.getElementById('time-total')
const errorBar = document.getElementById('error-bar')

// --- State ---
const player = new Player()
let ready = false

// --- State helpers ---
function setStatus(msg) {
  statusBar.classList.add('visible')
  playerBar.classList.remove('visible')
  errorBar.classList.remove('visible')
  statusText.textContent = msg
}

function setReady(fileName, totalTime) {
  statusBar.classList.remove('visible')
  playerBar.classList.add('visible')
  errorBar.classList.remove('visible')
  fileNameEl.textContent = fileName
  timeTotal.textContent = formatTime(totalTime)
  timeCurrent.textContent = '0:00'
  progressFill.style.width = '0%'
  playBtn.textContent = '▶'
  ready = true
}

function setError(msg) {
  statusBar.classList.remove('visible')
  errorBar.classList.add('visible')
  errorBar.textContent = '⚠️ ' + msg
  ready = false
}

function formatTime(s) {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

// --- File processing ---
async function processFile(file) {
  ready = false
  playBtn.textContent = '▶'

  setStatus('Parsing file…')
  let melody
  try {
    const xml = await file.text()
    melody = parseMusicXml(xml)
  } catch (e) {
    setError(e.message)
    return
  }

  setStatus('Generating accompaniment…')
  let accomp
  try {
    accomp = await generateAccompaniment(melody, melody.keyFifths, melody.timeSignatures[0])
  } catch (e) {
    setError(e.message)
    return
  }

  setStatus('Loading piano sounds…')
  try {
    await player.load()
  } catch (e) {
    setError('Failed to load piano sounds: ' + e.message)
    return
  }

  player.prepare(melody, accomp, (t) => {
    const pct = player.totalTime > 0 ? (t / player.totalTime) * 100 : 0
    progressFill.style.width = pct + '%'
    timeCurrent.textContent = formatTime(t)
    if (t >= player.totalTime) {
      playBtn.textContent = '▶'
    }
  })

  setReady(file.name, melody.totalTime)
}

// --- Play / Pause ---
playBtn.addEventListener('click', async () => {
  if (!ready) return
  if (player.isPlaying) {
    player.pause()
    playBtn.textContent = '▶'
  } else {
    player.play()
    playBtn.textContent = '⏸'
  }
})

// --- Drop zone ---
dropZone.addEventListener('click', () => fileInput.click())

fileInput.addEventListener('change', (e) => {
  if (e.target.files[0]) processFile(e.target.files[0])
})

dropZone.addEventListener('dragover', (e) => {
  e.preventDefault()
  dropZone.classList.add('drag-over')
})
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'))
dropZone.addEventListener('drop', (e) => {
  e.preventDefault()
  dropZone.classList.remove('drag-over')
  const file = e.dataTransfer.files[0]
  if (file) processFile(file)
})
