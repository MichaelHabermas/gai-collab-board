import { describe, it, expect, beforeEach, afterEach } from 'vitest';

/**
 * Asserts that when .dark is on document.documentElement, theme CSS variables
 * resolve to the dark palette (so the UI chrome looks different in dark mode).
 * Uses a minimal injected stylesheet that mirrors the .dark block in index.css.
 * (jsdom does not reliably expose :root/html custom properties on descendants,
 * but it does apply .dark and .dark * so we assert the dark case.)
 */
describe('theme appearance', () => {
  const DARK_BG = '#1e293b';
  const LIGHT_BG = '#ffffff';

  let styleEl: HTMLStyleElement;

  beforeEach(() => {
    document.documentElement.classList.remove('dark');
    styleEl = document.createElement('style');
    /* Mirror app: light on html and descendants by default, dark when .dark is on (same variable names as index.css). */
    styleEl.textContent = `
      html, html * { --color-background: ${LIGHT_BG}; }
      .dark, .dark * { --color-background: ${DARK_BG}; }
    `;
    document.head.appendChild(styleEl);
  });

  afterEach(() => {
    document.documentElement.classList.remove('dark');
    styleEl.remove();
  });

  it('applies light background variable when document does not have dark class', () => {
    const el = document.createElement('div');
    el.style.background = 'var(--color-background)';
    document.body.appendChild(el);
    const value = getComputedStyle(el).getPropertyValue('--color-background').trim();
    el.remove();
    expect(value).toBe(LIGHT_BG);
  });

  it('applies dark background variable when document has dark class', () => {
    document.documentElement.classList.add('dark');
    const el = document.createElement('div');
    el.style.background = 'var(--color-background)';
    document.body.appendChild(el);
    const value = getComputedStyle(el).getPropertyValue('--color-background').trim();
    el.remove();
    expect(value).toBe(DARK_BG);
  });

  it('applies dark variable to descendant when dark class is toggled on', () => {
    const el = document.createElement('div');
    el.style.background = 'var(--color-background)';
    document.body.appendChild(el);
    document.documentElement.classList.add('dark');
    const value = getComputedStyle(el).getPropertyValue('--color-background').trim();
    el.remove();
    expect(value).toBe(DARK_BG);
  });

  it('resolved background changes when dark class is added then removed (visible theme toggle)', () => {
    const el = document.createElement('div');
    el.style.background = 'var(--color-background)';
    document.body.appendChild(el);
    expect(getComputedStyle(el).getPropertyValue('--color-background').trim()).toBe(LIGHT_BG);
    document.documentElement.classList.add('dark');
    expect(getComputedStyle(el).getPropertyValue('--color-background').trim()).toBe(DARK_BG);
    document.documentElement.classList.remove('dark');
    expect(getComputedStyle(el).getPropertyValue('--color-background').trim()).toBe(LIGHT_BG);
    el.remove();
  });
});
