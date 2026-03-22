# MusicXML Player

A browser-based MusicXML player with auto-generated piano accompaniment.

> **Note:** This is a proof of concept — the accompaniment is auto-generated based on a simple chord progression (I–vi–IV–V) with no attention to style or sample quality. The idea is to quickly get something playable from any MusicXML file.

Possible directions: configurable accompaniment styles, fade-out at the end, and support for additional instruments.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173), drag a `.musicxml` file onto the page and press play.

## Build

```bash
npm run build
```

Static files will be in `dist/` — serve with any web server.

## How it works

- Parses MusicXML, extracts melody from the first part
- Generates a bass accompaniment using a I–vi–IV–V chord progression
- Plays back using [Tone.js](https://tonejs.github.io/) with Salamander Grand Piano samples (bundled locally in `public/audio/`)
