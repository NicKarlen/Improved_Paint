import { useState, useEffect, useCallback } from 'react';

interface Props {
  onClose: () => void;
}

const STEPS = [
  {
    title: 'Paste & Open',
    description: 'Press Ctrl+V to paste a screenshot from clipboard into a new tab. Drag image files onto the window too.',
    icon: (
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="10" y="4" width="16" height="20" rx="2" />
        <path d="M10 8H7a2 2 0 0 0-2 2v18a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-4" />
        <path d="M18 17v8M14 21l4 4 4-4" />
      </svg>
    ),
  },
  {
    title: 'Manage Tabs',
    description: 'Left sidebar shows all open images as thumbnails. Click to switch, drag to reorder, right-click for options.',
    icon: (
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="6" width="10" height="24" rx="2" />
        <rect x="4" y="6" width="10" height="8" rx="2" fill="currentColor" fillOpacity="0.2" />
        <line x1="17" y1="10" x2="32" y2="10" />
        <line x1="17" y1="18" x2="32" y2="18" />
        <line x1="17" y1="26" x2="28" y2="26" />
      </svg>
    ),
  },
  {
    title: 'Annotate',
    description: 'Toolbar tools: step-number circles, arrows, rectangles, blur, text. Select tool to move and resize placed items.',
    icon: (
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="13" cy="13" r="7" />
        <text x="13" y="17" textAnchor="middle" fontSize="9" fill="currentColor" stroke="none" fontWeight="700">1</text>
        <path d="M20 20l10 10M26 30l4 0 0-4" />
      </svg>
    ),
  },
  {
    title: 'Beautify',
    description: 'Right sidebar adds padding, borders, drop shadows, gradient backgrounds, and watermarks.',
    icon: (
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="8" y="8" width="20" height="20" rx="3" />
        <rect x="12" y="12" width="12" height="12" rx="1" fill="currentColor" fillOpacity="0.15" />
        <path d="M4 18h2M30 18h2M18 4v2M18 30v2" />
      </svg>
    ),
  },
  {
    title: 'Export',
    description: 'Export button saves as PNG, JPEG, or WebP. Export All batch-saves every tab to a folder.',
    icon: (
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 24v4a2 2 0 0 0 2 2h20a2 2 0 0 0 2-2v-4" />
        <path d="M18 6v18M11 20l7 7 7-7" />
      </svg>
    ),
  },
];

export default function IntroDialog({ onClose }: Props) {
  const [step, setStep] = useState(0);
  const total = STEPS.length;
  const isLast = step === total - 1;

  const prev = useCallback(() => setStep(s => Math.max(0, s - 1)), []);
  const next = useCallback(() => {
    if (isLast) onClose();
    else setStep(s => s + 1);
  }, [isLast, onClose]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') prev();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, next, prev]);

  const current = STEPS[step];

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="intro-dialog" onClick={e => e.stopPropagation()}>
        <div className="intro-step-dots">
          {STEPS.map((_, i) => (
            <button
              key={i}
              className={`intro-dot${i === step ? ' intro-dot-active' : ''}`}
              onClick={() => setStep(i)}
              aria-label={`Go to step ${i + 1}`}
            />
          ))}
        </div>

        <div className="intro-icon">{current.icon}</div>

        <div className="intro-counter">{step + 1} / {total}</div>
        <div className="intro-title">{current.title}</div>
        <div className="intro-description">{current.description}</div>

        <div className="intro-actions">
          <button
            className="intro-nav-btn"
            onClick={prev}
            disabled={step === 0}
          >
            Back
          </button>
          <button
            className="intro-nav-btn primary"
            onClick={next}
          >
            {isLast ? 'Got it!' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
