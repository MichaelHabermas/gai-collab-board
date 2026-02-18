# Theme (Light / Dark) Visual Guide

Use this guide to verify that the theme toggle changes the UI and to compare your app with the expected appearance.

## What should change when you click the toggle

- **Icon:** Moon = dark mode is on; Sun = light mode is on.
- **Chrome (header, sidebars, toolbar, bottom bar):** Colors should switch between light and dark.
- **Board (canvas):** Stays **white with grid** in both modes and does not change.

If you only see the icon change (moon vs sun) and the rest of the UI stays the same, see [Troubleshooting](#troubleshooting) below.

---

## Expected appearance

### Light mode (Sun icon visible)

| Area | Expected look |
|------|----------------|
| **Header** | Light background (white or very light gray). Dark text: "CollabBoard", board name, "Share", email, "Sign Out". |
| **Left toolbar** | Light gray background. Dark icon outlines. |
| **Right sidebar (Boards / Properties / AI)** | Light background. Dark text and tabs. "New board" button: light background, dark text. |
| **Board (canvas)** | White with subtle grid. Unchanged in both modes. |
| **Bottom bar** | Light background. Dark icons and text (zoom, page). |

### Dark mode (Moon icon visible)

| Area | Expected look |
|------|----------------|
| **Header** | Dark blue-gray background. White / light gray text and icons. |
| **Left toolbar** | Dark blue-gray background. White / light gray icons. |
| **Right sidebar** | Dark blue-gray background. White / light gray text, tabs, and "New board" button. |
| **Board (canvas)** | Still **white** with grid. No change. |
| **Bottom bar** | Dark blue-gray background. White / light gray icons and text. |

---

## Reference screenshots

Add your own screenshots to compare:

1. **Light mode:** Run the app, click the theme toggle until the **sun** icon shows. Capture the full window and save as `docs/theme-screenshots/light-mode.png`.
2. **Dark mode:** Click the toggle until the **moon** icon shows. Capture and save as `docs/theme-screenshots/dark-mode.png`.

Then compare:
- **Light:** Header and sidebars should be light with dark text.
- **Dark:** Header and sidebars should be dark with light text.
- **Both:** The board (white canvas) should look the same.

---

## Troubleshooting

**I only see the icon change (sun vs moon); header and sidebars stay dark.**

1. **Hard refresh** so the latest CSS loads: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (macOS).
2. **Check the document class:** Open DevTools (F12), select the `<html>` element. When the moon is shown, `html` should have class `dark`. When the sun is shown, `dark` should be removed. If the class does not change when you click, the toggle logic may not be running.
3. **Clear site data:** In Application (or Storage) tab, clear localStorage for the site and reload. Then set the theme again with the toggle.

If it still does not change, the stylesheet may be cached or the dark theme variables may not be loading; try a different browser or incognito window.
