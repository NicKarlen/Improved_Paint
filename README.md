# Improved Paint

A local screenshot editor built for fast annotation workflows. Paste screenshots, mark up steps, draw shapes, and export — all offline.

Built with Electron, React, and HTML Canvas.

---

## Features

- **Paste-first workflow** — `Ctrl+V` drops a screenshot straight into a new tab
- **Tabbed image management** — multiple images open at once with thumbnail sidebar
- **Step indicators** — click to place numbered labels (`1.` `2.` or `I.` `II.`)
- **Shapes & arrows** — draw rectangles and arrows with color, stroke, and fill controls
- **Text annotations** — freeform text labels, moveable and resizable
- **Blur** — drag to redact sensitive areas
- **Crop** — trim images non-destructively
- **Simplify** — OCR-based tool that auto-detects and grays out text regions
- **Export** — save as PNG, JPEG, or WebP; copy to clipboard in one click
- **Brand colors** — configure a palette, swap colors instantly from the toolbar
- **Projects** — save and reopen your work

Everything runs locally. No network calls, no accounts.

---

## Getting Started

```bash
npm install
npm run dev
```

---

## Build & Distribute

```bash
npm run package   # → release/Improved-Paint.zip
```

Extract the zip and run `Improved Paint.exe` — no install required.

> For a single portable `.exe`, enable Windows Developer Mode first, then use `npm run dist`.

---

## Other Commands

```bash
npm run build   # production build
npm run test    # run tests
npm run lint    # lint + typecheck
```

---

## Stack

| Layer | Tech |
|---|---|
| Desktop shell | Electron 33 |
| UI | React 18 + TypeScript |
| Image rendering | HTML Canvas |
| OCR (Simplify) | Tesseract.js |
| Bundler | Vite 6 |
