# Feature Ideas — Improved Paint

Brainstormed for the core use case: **creating branded, step-by-step Microsoft tutorial screenshots.**

---

## Tier 1 — High Impact, Daily Workflow Boosters

### 1. Text Annotations / Callout Boxes

You have numbered step circles — but no way to write *what* the step actually says.
Add a text tool that places a small styled label or callout box directly on the canvas.

- Click to place, type your text, press Enter to commit
- Auto-styled with your brand color as background + white text (or inverse)
- Optional pointer/arrow tail pointing to the relevant UI element
- Font size slider (like step indicator size)
- Becomes the missing glue between "Step 1" and "Click here to open Settings"

### 2. Copy Result to Clipboard (One-Click)

Right now export = save to disk. But for tutorials you're probably pasting into
Word, PowerPoint, Teams, Outlook, or a CMS constantly.

- "Copy" button in the toolbar — renders the final image (with border, watermark,
  annotations) and puts it straight on the clipboard
- Keyboard shortcut: `Ctrl+Shift+C`
- Saves the round-trip of export → navigate → open → copy
- Arguably more useful than Save for your workflow

### 3. Crop Tool

Screenshots often contain too much. A crop tool lets you focus on the relevant window
or dialog without opening another app first.

- Click + drag a crop region on the canvas
- Handles on corners/edges to fine-tune
- Enter to confirm, Escape to cancel
- Works with undo/redo

### 4. Move & Resize Annotations

Currently annotations (steps, rectangles, arrows) can only be placed or deleted.
You can't nudge a misplaced step circle or resize a rectangle after drawing it.

- Click an annotation in select mode to grab it
- Drag to reposition
- Corner handles on rectangles to resize
- Endpoint handles on arrows to re-aim
- Makes iterating on a screenshot 5x faster

### 5. Spotlight / Dimmer Effect

When explaining a specific button buried in a complex Microsoft ribbon,
dim everything *except* the area you want the reader to focus on.

- Draw a region → everything outside gets a dark semi-transparent overlay (60-70% black)
- The "spotlight" region stays crisp and bright
- Immediately draws the eye — way more effective than a red rectangle
- Could be a rectangle or ellipse shape

---

## Tier 2 — Polish & Power-User Features

### 6. Freehand Pen / Highlighter

Sometimes you just need to quickly circle something or underline text in a screenshot.

- Freehand drawing with configurable color + stroke width
- Highlighter mode: semi-transparent wide stroke (like a marker pen)
- Smoothing algorithm so wobbly mouse lines look clean
- Great for informal "look here!" annotations

### 7. Blur / Pixelate Censoring

Blackout and whiteout work, but they scream "something was hidden here."
Blur/pixelate looks more professional in published tutorials.

- Brush or rectangle region selection
- Gaussian blur or mosaic pixelation
- Adjustable strength
- Perfect for hiding email addresses, names, license keys in screenshots

### 8. Keyboard Shortcut Badges

Your tutorials explain Microsoft tips — many involve keyboard shortcuts.
Render them as styled keycap badges directly on the screenshot.

- Type `Ctrl+S` and it renders as: `[Ctrl]` + `[S]` with rounded keycap styling
- Matches your brand colors
- Place them anywhere on the canvas
- Readers instantly recognize keyboard shortcuts visually
- Much better than writing "Press Ctrl+S" in text

### 9. Auto-Connect Steps with Flow Lines

You place Step 1, Step 2, Step 3 — but the reader has to figure out the order by
scanning for numbers. Connecting them with a curved flow line makes the sequence obvious.

- Toggle "show flow lines" — draws a curved/dashed line between consecutive steps
- Follows the 1 → 2 → 3 order automatically
- Uses your brand color, subtle dashed stroke
- Optional arrowheads on the lines
- Turns a screenshot into a clear visual narrative

### 10. Smart Guides & Snap-to-Grid

When placing multiple step indicators or rectangles, alignment matters.
Misaligned annotations look unprofessional.

- Show alignment guides (dashed lines) when dragging near other annotations
- Snap to horizontal/vertical center of other elements
- Optional grid overlay toggle
- Keeps layouts clean without pixel-hunting

---

## Tier 3 — Template & Batch Workflow

### 11. Canvas Templates / Layouts

For recurring tutorial formats, pre-built layouts save massive time.

- **"Before → After"**: Two images side by side with an arrow between them
- **"3-Step Strip"**: Three images in a row, each with a step number
- **"Zoomed Detail"**: Main screenshot + inset magnified region
- **"Comparison"**: Two screenshots with a divider line and labels
- Pick a template → paste screenshots into the slots → done
- Consistent sizing across all your tutorials

### 12. Magnifier / Zoom Lens Inset

Microsoft UIs have tiny checkboxes and dropdown arrows. A magnifier lets you
blow up a small region so the reader can actually see what you're pointing at.

- Draw a small region on the screenshot
- A magnified version appears as a floating inset (2-4x zoom)
- Connected to the source region with a subtle line
- Border in your brand color
- Readers see both the context AND the detail

### 13. Built-In Screen Capture

Skip the Windows Snipping Tool entirely. Capture directly into the app.

- Global hotkey (e.g., `Ctrl+Shift+X`) triggers region capture even when app is minimized
- Screenshot lands directly as a new tab — no clipboard middleman
- Optional: capture a specific window by clicking it
- Removes one step from every single screenshot you take

### 14. Quick Presets / Annotation Profiles

Different tutorials might use different brand colors or annotation styles.
Profiles let you switch between setups in one click.

- Save current config (border, colors, watermark, step size) as a named preset
- "Microsoft 365 Tutorial" / "Windows Tips" / "Office Dark Theme"
- One-click switch between them
- Keeps branding consistent per tutorial series

### 15. Batch Annotation Apply

When building a 10-step tutorial, each screenshot often needs the same border,
watermark, and similar annotation placement.

- Select multiple tabs → apply border + watermark to all at once
- Auto-number: assign step numbers to multiple tabs sequentially
  (Tab 1 gets "Step 1" badge, Tab 2 gets "Step 2", etc.)
- Batch resize all images to same width
- Batch export already exists — batch *annotate* is the missing pair

---

## Tier 4 — Surprise & Delight

### 16. Image Diff / Change Highlight

Paste two similar screenshots (before/after a setting change) and auto-highlight
what changed between them.

- Pixel-diff overlay shows changed regions with a colored border
- Perfect for "toggle this setting" tutorials where the change is subtle
- Readers immediately see what's different

### 17. Annotation Library / Stamps

Pre-made visual elements you drop onto screenshots:

- Checkmark (green) / X mark (red) for "do this" / "don't do this"
- Mouse cursor icon (to show "click here")
- Warning triangle, info circle, lightbulb tip icons
- Custom stamps: upload your own SVGs or PNGs
- Drag from a stamp palette onto the canvas

### 18. Smart Color Picker (Eyedropper)

Pick a color directly from the screenshot to match your annotations
to the Microsoft UI you're documenting.

- Click the eyedropper, click anywhere on the image
- That color becomes the active shape/annotation color
- Great for matching annotation colors to the app's UI theme

### 19. Image Resize / Normalize

Tutorial images should have consistent dimensions for a clean layout
in documents or blog posts.

- Set a target width (e.g., 800px) — all images scale proportionally
- Or set exact dimensions with aspect ratio lock
- "Normalize all tabs" — resize every open image to the same width
- Prevents the jarring mix of 1920px and 600px screenshots

### 20. Session Restore / Project Files

Long tutorials might span 15+ screenshots across multiple sessions.

- Save all open tabs (images + annotations + names) as a `.paint` project file
- Reopen later and pick up exactly where you left off
- Share project files with colleagues for collaborative editing
- No more re-importing and re-annotating after an app restart

---

## Quick Wins (Small effort, nice payoff)

| Idea | Description |
|------|-------------|
| **Duplicate tab** | Right-click → Duplicate. Start from existing annotations. |
| **Reorder steps** | Drag step indicators to swap their numbers. |
| **Annotation opacity** | Slider to make rectangles/arrows semi-transparent. |
| **Dark/light export** | Toggle white vs dark canvas background for JPEG exports. |
| **Drag-in from Explorer** | Drag image files from Windows Explorer into sidebar. |
| **Tab context menu** | Right-click tab → Rename, Duplicate, Close, Export. |
| **Recent files** | Quick access to last 10 opened/exported paths. |
| **Minimap** | Small overview when zoomed in on large screenshots. |
| **Ruler overlay** | Pixel rulers along top and left edges. |
| **Annotation counter** | Status bar shows "3 steps, 2 rectangles, 1 arrow" for the current canvas. |

---

*Priority recommendation: Start with **Copy to Clipboard**, **Text Annotations**, and **Crop Tool** —
they remove the most friction from a daily tutorial-building workflow.*
