// This script runs in the MAIN world (same context as the page)
// to properly intercept window.player.pause() and event listeners

(function () {
  "use strict";

  // ============================================
  // METHOD 1: Block visibility/blur event listeners
  // Override addEventListener on document and window to prevent the site
  // from ever registering these handlers
  // ============================================
  const blockedEvents = new Set(["visibilitychange", "blur", "focusout", "pagehide"]);

  const originalDocAddEventListener = document.addEventListener.bind(document);
  const originalWinAddEventListener = window.addEventListener.bind(window);

  document.addEventListener = function (type, listener, options) {
    if (blockedEvents.has(type)) {
      console.log("[Missav Keep Playing] Blocked document listener for:", type);
      return;
    }
    return originalDocAddEventListener(type, listener, options);
  };

  window.addEventListener = function (type, listener, options) {
    if (blockedEvents.has(type)) {
      console.log("[Missav Keep Playing] Blocked window listener for:", type);
      return;
    }
    return originalWinAddEventListener(type, listener, options);
  };

  // Safety net: also block capture-phase events
  blockedEvents.forEach(function (eventType) {
    window.addEventListener(
      eventType,
      function (e) {
        e.stopImmediatePropagation();
      },
      true
    );
    document.addEventListener(
      eventType,
      function (e) {
        e.stopImmediatePropagation();
      },
      true
    );
  });

  // ============================================
  // METHOD 2: Fake Page Visibility API
  // ============================================
  try {
    Object.defineProperty(document, "hidden", {
      value: false,
      writable: false,
      configurable: true,
    });
    Object.defineProperty(document, "visibilityState", {
      value: "visible",
      writable: false,
      configurable: true,
    });
  } catch (e) {}

  // ============================================
  // METHOD 3: Override document.hasFocus()
  // ============================================
  if (typeof Document.prototype.hasFocus === "function") {
    Document.prototype.hasFocus = function () {
      return true;
    };
  }

  // ============================================
  // METHOD 4: Override window.player.pause() (DPlayer)
  // The key fix: only allow pause when user explicitly toggles play
  // Check stack trace for togglePlay (user click) vs auto-pause (visibility change)
  // ============================================
  function getStackTrace() {
    const obj = {};
    Error.captureStackTrace(obj, getStackTrace);
    return obj.stack;
  }

  function isUserPause(stackTrace) {
    // DPlayer uses a togglePlay method when user clicks the play/pause button
    // Also check for keyboard shortcut handlers
    return (
      stackTrace.includes("togglePlay") ||
      stackTrace.includes("onPlayBtnClick") ||
      stackTrace.includes("keydown")
    );
  }

  function patchPlayer() {
    if (window.player && typeof window.player.pause === "function" && !window.player._keepPlayingPatched) {
      window.player._keepPlayingPatched = true;

      window.player.pause = function () {
        const stack = getStackTrace();
        if (isUserPause(stack)) {
          // User explicitly clicked pause - use the underlying media element
          console.log("[Missav Keep Playing] Manual pause allowed.");
          if (window.player.media && typeof window.player.media.pause === "function") {
            window.player.media.pause();
          }
          return;
        }
        // Auto-pause triggered by visibility/blur - block it
        console.log("[Missav Keep Playing] Blocked auto-pause.");
        return;
      };

      console.log("[Missav Keep Playing] Player pause() overridden.");
    }
  }

  // Poll for window.player since it's created dynamically after page load
  const playerCheckInterval = setInterval(function () {
    patchPlayer();
    if (window.player && window.player._keepPlayingPatched) {
      clearInterval(playerCheckInterval);
    }
  }, 500);

  // Stop checking after 120 seconds
  setTimeout(function () {
    clearInterval(playerCheckInterval);
  }, 120000);

  console.log("[Missav Keep Playing] Active in MAIN world - videos will keep playing in background");
})();
