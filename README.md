# Missav Keep Playing

A Chrome extension that prevents videos on [missav.ai](https://missav.ai) (and related domains) from auto-pausing when you switch to another tab or window.

## Why?

Missav pauses video playback when the browser tab loses focus or becomes hidden. This is annoying when you want to listen while working in another tab, or keep a video playing in the background.

## How It Works

The extension uses multiple techniques to block auto-pause:

| Layer | Technique |
|-------|-----------|
| **Event blocking** | Prevents the site from registering `blur`, `visibilitychange`, `focusout`, `pagehide` listeners |
| **Visibility API** | Fakes `document.hidden = false` and `visibilityState = "visible"` |
| **Focus detection** | `document.hasFocus()` always returns `true` |
| **DPlayer override** | Intercepts `window.player.pause()` — the main mechanism missav uses |
| **Video element fallback** | Patches native `video.pause()` for any other video elements |

Manual pause (clicking the pause button, pressing space) still works normally.

## Supported Domains

- missav.ai
- missav.ws
- missav.com
- missav.live
- thisav.com

## Install

### From source (developer mode)

1. Download or clone this repo
2. Open Chrome → `chrome://extensions/`
3. Enable **Developer mode** (top right toggle)
4. Click **Load unpacked**
5. Select the `missav-keep-playing` folder

## Permissions

- `scripting` — injects content script into missav pages
- Host access to missav/thisav domains only

## License

MIT
