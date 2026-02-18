/**
 * Shared shadow constants for canvas objects (Konva shapes).
 * Single source of truth for consistent slight shadow across sticky notes,
 * shapes, frames, text elements, lines, and connectors.
 */

/** Shadow color for default object shadow (slight). */
export const SHADOW_COLOR = 'rgba(0, 0, 0, 0.1)';

/** Shadow blur radius when object is not selected. */
export const SHADOW_BLUR_DEFAULT = 4;

/** Shadow blur radius when object is selected (rect, circle, frame, text, line, connector). */
export const SHADOW_BLUR_SELECTED = 8;

/** Shadow opacity. */
export const SHADOW_OPACITY = 0.3;

/** Shadow offset X and Y (pixels). */
export const SHADOW_OFFSET_X = 2;
export const SHADOW_OFFSET_Y = 2;

/** Do not apply shadow to stroke (avoids double shadow on bordered shapes). */
export const SHADOW_FOR_STROKE_ENABLED = false;

/** Sticky note: slightly stronger shadow (card-like). */
export const STICKY_NOTE_SHADOW_COLOR = 'rgba(0, 0, 0, 0.15)';
export const STICKY_NOTE_SHADOW_BLUR_DEFAULT = 8;
export const STICKY_NOTE_SHADOW_BLUR_SELECTED = 12;
export const STICKY_NOTE_SHADOW_OPACITY_DEFAULT = 0.2;
export const STICKY_NOTE_SHADOW_OPACITY_SELECTED = 0.3;
export const STICKY_NOTE_SHADOW_OFFSET_DEFAULT = 3;
export const STICKY_NOTE_SHADOW_OFFSET_SELECTED = 0;
