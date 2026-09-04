import { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);

  // On first load: read saved preference. The storefront's design
  // default is the dark shell (explicit product decision, not a
  // dark-mode toggle default) — so unlike a typical prefers-color-
  // scheme fallback, an OS set to light does NOT override this on a
  // first visit. Only an explicit past choice (saved in localStorage)
  // switches it to light.
  useEffect(() => {
    const saved = localStorage.getItem('theme');
    const isDark = saved ? saved === 'dark' : true;
    setDark(isDark);
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
    localStorage.setItem('theme', next ? 'dark' : 'light');
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={toggle}
      style={{
        position: 'relative',
        width: 52,
        height: 28,
        borderRadius: 999,
        border: '1px solid var(--border, #e2e2e2)',
        background: dark ? '#20242e' : '#f4f1ea',
        cursor: 'pointer',
        padding: 0,
        flexShrink: 0,
        transition: 'background 0.2s ease, border-color 0.2s ease',
      }}
    >
      {/* Track icons — static, dimmed on the inactive side, give the
          switch meaning even before the knob finishes animating. */}
      <Sun
        size={13}
        strokeWidth={2}
        aria-hidden="true"
        style={{
          position: 'absolute', left: 6, top: '50%', transform: 'translateY(-50%)',
          color: dark ? 'var(--muted, #6b7085)' : '#d99a2b',
          transition: 'color 0.2s ease',
        }}
      />
      <Moon
        size={13}
        strokeWidth={2}
        aria-hidden="true"
        style={{
          position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
          color: dark ? '#cfd3e0' : 'var(--muted, #9a958c)',
          transition: 'color 0.2s ease',
        }}
      />

      {/* Knob */}
      <span
        style={{
          position: 'absolute',
          top: 2,
          left: dark ? 26 : 2,
          width: 22,
          height: 22,
          borderRadius: '50%',
          background: 'var(--surface, #fff)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'left 0.2s ease',
        }}
      >
        {dark
          ? <Moon size={12} strokeWidth={2} color="#cfd3e0" aria-hidden="true" />
          : <Sun size={12} strokeWidth={2} color="#d99a2b" aria-hidden="true" />}
      </span>
    </button>
  );
}
