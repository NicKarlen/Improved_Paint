# Improved Paint — Local Screenshot Editor

Desktop tool for organizing and editing screenshots. Built with Electron + React + HTML Canvas.

**important**

Do not make any AI Slop for the frontend stuff. NO Purple!! be crative not just for the Frontend!

Keep the Code KISS!


## Tech Stack

- **Electron** — desktop shell, file system access, clipboard integration
- **React** — renderer UI (tabbed sidebar, toolbar, dialogs)
- **HTML Canvas** — image manipulation (borders, overlays, step indicators, export)
- **TypeScript** throughout

## Commands

```bash
npm install          # install dependencies
npm run dev          # start Electron in dev mode with hot reload
npm run build        # production build
npm run test         # run tests
npm run lint         # lint + typecheck
npm run package      # build + zip for distribution → release/Improved-Paint.zip
```

> **Distributing:** `npm run package` produces `release/Improved-Paint.zip`. Friends extract it and run `Improved Paint.exe` — no install needed.
> For a proper single portable `.exe` instead of a zip, enable Windows Developer Mode first, then use `npm run dist`.

## Architecture

```
src/
  main/           # Electron main process — window management, file I/O, clipboard
  renderer/       # React app
    components/   # UI components (Sidebar, Canvas, Toolbar, ExportDialog)
    hooks/        # Custom hooks (useCanvas, useTabs, useImageEditor)
    store/        # State management (tabs, active image, settings)
    utils/        # Canvas helpers, image processing functions
  shared/         # Types and constants shared between processes
```

**Main process:** Window lifecycle, native file dialogs (open/save), clipboard paste handling, IPC bridge to renderer.

**Renderer process:** React app with two primary areas:
- Left sidebar — vertical thumbnail tabs for open images, drag-to-reorder
- Main canvas — active image editing surface

## Core Features

1. **Tabbed image management** — sidebar with thumbnail previews, paste new screenshots into tabs
2. **Auto-border** — colored border around images; saved default brand color in settings
3. **Step indicators** — place numbered labels (1., 2., I., II.) on screenshots
4. **Image overlay** — paste/composite screenshots onto existing images (Paint-style)
5. **Export** — save as .png or .jpeg

## Key Constraints

- Fully local — no network calls, no cloud storage
- Performance-first — canvas operations must feel instant
- Clipboard paste is primary input method for screenshots
