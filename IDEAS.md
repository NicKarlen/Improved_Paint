# Feature Ideas — Improved Paint

Brainstormed for the core use case: **creating branded, step-by-step Microsoft tutorial screenshots.**

> Features already shipped: Text Annotations, Copy to Clipboard, Crop Tool,
> Move & Resize Annotations, Blur/Pixelate, Duplicate Tab, Tab Context Menu,
> OCR Simplify, Image Overlay, Canvas Frame, Watermarks, Zoom & Pan.

---

## Tier 1 — High Impact, Daily Workflow Boosters

### 1. Spotlight / Dimmer Effect

When explaining a specific button buried in a complex Microsoft ribbon,
dim everything *except* the area you want the reader to focus on.

- Draw a region — everything outside gets a dark semi-transparent overlay (60-70% black)
- The "spotlight" region stays crisp and bright
- Immediately draws the eye — way more effective than a red rectangle
- Rectangle or ellipse shape modes
- Stack multiple spotlights for multi-focus explanations

### 2. Screenshot Beautifier / Social-Ready Export

Turn raw screenshots into polished visuals for blog posts, social media, or presentations.
Inspired by CleanShot X, Xnapper, and ShowNumbers.

- Add gradient or solid-color backgrounds behind the screenshot
- Adjustable padding (0–150px) around the image
- Rounded corners (0–50px) on the screenshot itself
- Drop shadow with intensity control
- Preset aspect ratios: 16:9, 4:3, 1:1, Instagram Story, Twitter Card
- One-click "beautify" that applies shadow + padding + rounded corners
- Makes the difference between "raw screenshot" and "professional graphic"

### 3. Freehand Pen / Highlighter

Sometimes you just need to quickly circle something or underline text.

- Freehand drawing with configurable color + stroke width
- Highlighter mode: semi-transparent wide stroke (like a marker pen)
- Smoothing algorithm so wobbly mouse lines look decent
- Great for informal "look here!" annotations
- Works with move & resize after drawing

### 4. Smart Color Picker (Eyedropper)

Pick a color directly from the screenshot to match annotations to the UI you're documenting.

- Click the eyedropper, click anywhere on the image
- That color becomes the active annotation color
- Zoomed pixel preview while hovering (8x magnifier loupe)
- Shows HEX + RGB values live
- Click to copy color code to clipboard
- Great for matching annotation colors to the app's theme

### 5. Auto-Connect Steps with Flow Lines

You place Step 1, Step 2, Step 3 — but the reader has to scan for numbers.
Connecting them with a flow line makes the sequence obvious at a glance.

- Toggle "show flow lines" — draws a curved/dashed line between consecutive steps
- Follows the 1 → 2 → 3 order automatically
- Uses your brand color, subtle dashed stroke
- Optional arrowheads on the lines
- Turns a screenshot into a clear visual narrative

---

## Tier 2 — Polish & Power-User Features

### 6. Keyboard Shortcut Badges

Your tutorials explain Microsoft tips — many involve keyboard shortcuts.
Render them as styled keycap badges directly on the screenshot.

- Type `Ctrl+S` and it renders as `[Ctrl]` + `[S]` with rounded keycap styling
- Light 3D effect (subtle gradient + bottom shadow like a real key)
- Matches your brand colors
- Place them anywhere on the canvas
- Readers instantly recognize keyboard shortcuts visually

### 7. Smart Guides & Snap-to-Grid

When placing multiple annotations, misaligned elements look unprofessional.

- Show alignment guides (dashed lines) when dragging near other annotations
- Snap to horizontal/vertical center of other elements
- Snap to equal spacing between elements
- Optional pixel grid overlay toggle
- Hold Alt to temporarily disable snapping
- Keeps layouts clean without pixel-hunting

### 8. Magnifier / Zoom Lens Inset

Microsoft UIs have tiny checkboxes and dropdown arrows. A magnifier lets you
blow up a small region so the reader can actually see what you're pointing at.

- Draw a small region on the screenshot
- A magnified inset appears (2–4x zoom, configurable)
- Connected to the source region with a subtle line
- Border in your brand color
- Moveable and resizable after placement
- Readers see both the context AND the detail

### 9. Image Resize / Normalize

Tutorial images should have consistent dimensions for clean layout in documents.

- Set a target width (e.g., 800px) — images scale proportionally
- Or set exact dimensions with aspect ratio lock
- "Normalize all tabs" — resize every open image to the same width
- Prevents the jarring mix of 1920px and 600px screenshots in one doc
- Could include DPI options for print vs screen

### 10. Pixel Measurement Tool

Inspired by Shottr — essential for developer-facing documentation.

- Click two points to measure distance in pixels
- Hold Shift to measure only horizontal or vertical
- Imprint measurement as a labeled dimension line on the canvas
- Shows width × height when measuring rectangles
- Great for UI spec documentation and design handoffs

---

## Tier 3 — Template & Batch Workflow

### 11. Canvas Templates / Layouts

For recurring tutorial formats, pre-built layouts save massive time.

- **"Before → After"**: Two images side by side with an arrow between them
- **"3-Step Strip"**: Three images in a row, each with a step number
- **"Zoomed Detail"**: Main screenshot + inset magnified region
- **"Comparison"**: Two screenshots with a divider line and labels
- Pick a template → paste screenshots into the slots → done
- Save custom templates from current layouts

### 12. Batch Annotation Apply

When building a 10-step tutorial, each screenshot often needs the same treatment.

- Select multiple tabs → apply border + watermark to all at once
- Auto-number: assign step numbers to multiple tabs sequentially
  (Tab 1 gets "Step 1" badge, Tab 2 gets "Step 2", etc.)
- Batch resize all images to same width
- Batch export already exists — batch *annotate* is the missing pair

### 13. Quick Presets / Annotation Profiles

Different tutorials might use different brand colors or annotation styles.

- Save current config (border, colors, watermark, step size) as a named preset
- "Microsoft 365 Tutorial" / "Windows Tips" / "Office Dark Theme"
- One-click switch between them
- Import/export presets as JSON for team sharing

### 14. Session Restore / Project Files

Long tutorials might span 15+ screenshots across multiple sessions.

- Save all open tabs (images + annotations + names) as a `.paint` project file
- Reopen later and pick up exactly where you left off
- Auto-save recovery after crash
- Share project files with colleagues for collaborative editing

### 15. Built-In Screen Capture

Skip the Windows Snipping Tool entirely.

- Global hotkey (e.g., `Ctrl+Shift+X`) triggers region capture even when app is minimized
- Screenshot lands directly as a new tab — no clipboard middleman
- Delayed capture mode (3s/5s/10s countdown) for menus and tooltips
- Capture a specific window by clicking it
- Removes one step from every single screenshot you take

---

## Tier 4 — Surprise & Delight

### 16. Annotation Library / Stamps

Pre-made visual elements you drop onto screenshots:

- Checkmark (green) / X mark (red) for "do this" / "don't do this"
- Mouse cursor icon (to show "click here")
- Warning triangle, info circle, lightbulb tip icons
- Keyboard key icons (Enter, Tab, Esc, etc.)
- Custom stamps: upload your own SVGs or PNGs
- Drag from a stamp palette onto the canvas

### 17. Image Diff / Change Highlight

Paste two similar screenshots (before/after a setting change) and auto-highlight
what changed between them.

- Pixel-diff overlay shows changed regions with a colored border
- Side-by-side view with synchronized zoom/pan
- Slider overlay to wipe between before/after
- Perfect for "toggle this setting" tutorials where the change is subtle

### 18. Smart Redact (AI-Powered)

Inspired by Snagit and Scribe — auto-detect sensitive information.

- One-click scan for emails, names, IP addresses, URLs, license keys
- Auto-apply blur/pixelate to all detected sensitive regions
- Review and approve each redaction before committing
- Works with the existing OCR/Tesseract integration
- Saves time vs manually blurring 15 email addresses in a screenshot

### 19. Pinned Preview / Always-on-Top

Inspired by CleanShot X and Shottr — keep a screenshot visible while working.

- "Pin" button on a tab — opens a borderless always-on-top mini window
- Shows the current state of that tab (with annotations)
- Drag to reposition, scroll to resize
- Perfect for referencing a design mockup while editing another screenshot
- Click to dismiss

### 20. Scrolling Capture

Capture entire web pages, long dialogs, or chat conversations.

- Start capture → slowly scroll → app auto-stitches frames
- Removes duplicate content from overlapping scroll regions
- Works in any app, not just browsers
- Result lands as a single tall image in a new tab

---

## Quick Wins (Small effort, nice payoff)

| Idea | Description |
|------|-------------|
| **Reorder steps** | Drag step indicators to swap their numbers. |
| **Annotation opacity** | Slider to make rectangles/arrows/text semi-transparent. |
| **Dark/light export bg** | Toggle white vs dark canvas background for JPEG exports. |
| **Drag-in from Explorer** | Drag image files from Windows Explorer into sidebar. |
| **Recent files** | Quick access to last 10 opened/exported paths. |
| **Minimap** | Small overview when zoomed in on large screenshots. |
| **Ruler overlay** | Pixel rulers along top and left edges of the canvas. |
| **Annotation counter** | Status bar shows "3 steps, 2 rectangles, 1 arrow" on current canvas. |
| **Quick duplicate anno** | Alt+drag an annotation to clone it in place. |
| **Lock annotations** | Right-click → Lock to prevent accidental moves. |
| **Flip/rotate image** | 90° rotation and horizontal/vertical flip. Quick toolbar buttons. |
| **Redo numbering** | After deleting Step 2 out of 5, auto-renumber to fill the gap. |
| **Annotation grouping** | Select multiple annotations → group → move/resize as one unit. |
| **Canvas background color** | Pick a custom canvas bg (not just checkerboard) for transparent PNGs. |

---

## Performance & Technical Optimizations

| Optimization | Why it matters |
|------|-------------|
| **OffscreenCanvas rendering** | Move heavy compositing off the main thread — keeps UI snappy during export. |
| **Thumbnail caching** | Cache sidebar thumbnails as bitmap instead of re-rendering on every state change. |
| **Lazy annotation rendering** | Only re-render annotations that actually changed, not the full canvas. |
| **WebGL blur** | GPU-accelerated blur instead of CPU pixel loops — instant even on large images. |
| **Virtual tab list** | Virtualize the sidebar when 20+ tabs are open to avoid DOM bloat. |
| **Image compression on paste** | Auto-downscale 4K screenshots to working resolution, keep original for export. |
| **Debounced settings save** | Batch settings writes instead of saving on every slider tick. |

---

*Priority recommendation: Start with **Spotlight/Dimmer**, **Freehand Pen**, and **Screenshot Beautifier** —
they add the most visual punch to tutorials and are the features competitors charge premium for.*
