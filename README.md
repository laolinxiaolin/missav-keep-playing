# Missal Keep Playing

A Chrome extension that prevents videos on [missal.ai](https://missal.ai) from auto-pausing when you switch to another tab or window.

## Why?

Missal.ai pauses video playback when the browser tab loses focus. This is annoying when you want to listen to audio while working in another tab, or keep a video playing in the background.

## How It Works

The extension intercepts multiple browser APIs that sites use to detect tab visibility:

| Technique | What we block |
|-----------|--------------|
| **Page Visibility API** | `document.hidden`, `visibilityState`, `visibilitychange` events |
| **Focus Detection** | `blur`, `focusout`, `pagehide` events |
| **document.hasFocus()** | Always returns `true` |
| **requestAnimationFrame** | Fallback timer when tab is hidden |
| **video.pause() interception** | Blocks programmatic pause calls from visibility handlers |

## Install

### From source (developer mode)

1. Clone this repo or download the ZIP
2. Open Chrome → `chrome://extensions/`
3. Enable **Developer mode** (top right toggle)
4. Click **Load unpacked**
5. Select the `missal-keep-playing` folder

### From Chrome Web Store

*Coming soon*

## Usage

Just install it — no configuration needed. The extension activates automatically on missal.ai and keeps your videos playing even when the tab is in the background.

## Permissions

- `scripting` — injects content script into missal.ai pages
- Host access to `missal.ai` and `missal.ws` only

## License

MIT
