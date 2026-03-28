// Missav Keep Playing - Prevents video auto-pause on missav.ai when tab loses focus
// Injected at document_start to intercept before site scripts run

(function () {
  "use strict";

  // ============================================
  // METHOD 1: Block visibility/blur event listeners entirely
  // Prevent the site from ever registering handlers for these events
  // ============================================
  const blockedEvents = new Set(["blur", "visibilitychange", "focusout", "pagehide"]);

  const originalAddEventListener = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function (type, listener, options) {
    if (blockedEvents.has(type)) {
      console.log(`[Missav Keep Playing] Blocked "${type}" event listener.`);
      return;
    }
    return originalAddEventListener.call(this, type, listener, options);
  };

  // Also block capture-phase listeners via document/window directly as a safety net
  ["blur", "visibilitychange", "focusout", "pagehide"].forEach(function (eventType) {
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
  } catch (e) {
    // Some browsers may not allow redefining these
  }

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
  // This is the main mechanism missav uses to pause playback
  // ============================================
  function patchPlayer() {
    if (window.player && typeof window.player.pause === "function" && !window.player._patched) {
      const originalPause = window.player.pause.bind(window.player);
      window.player._patched = true;

      window.player.pause = function () {
        // If document would be hidden or unfocused, this is an auto-pause
        // Since we fake hidden/hasFocus, we also check for common patterns
        const stack = new Error().stack || "";
        const isAutoPause =
          stack.includes("visibilitychange") ||
          stack.includes("blur") ||
          stack.includes("hidden") ||
          stack.includes("onHide") ||
          stack.includes("pauseOnHidden");

        if (isAutoPause) {
          console.log("[Missav Keep Playing] Blocked player auto-pause.");
          return;
        }

        // Allow manual pause (user clicking pause button, pressing space, etc.)
        console.log("[Missav Keep Playing] Allowing manual pause.");
        return originalPause();
      };

      console.log("[Missav Keep Playing] Player pause() overridden.");
    }
  }

  // Poll for window.player since it's created dynamically
  const playerCheckInterval = setInterval(function () {
    patchPlayer();
    if (window.player && window.player._patched) {
      clearInterval(playerCheckInterval);
    }
  }, 500);

  // Stop checking after 60 seconds
  setTimeout(function () {
    clearInterval(playerCheckInterval);
  }, 60000);

  // ============================================
  // METHOD 5: Patch native video.pause() as fallback
  // ============================================
  function patchVideoElement(video) {
    if (video._patched) return;
    video._patched = true;

    const originalPause = video.pause.bind(video);

    video.pause = function () {
      const stack = new Error().stack || "";
      const isAutoPause =
        stack.includes("visibilitychange") ||
        stack.includes("blur") ||
        stack.includes("hidden") ||
        stack.includes("pauseOnHidden");

      if (isAutoPause && !video.paused) {
        console.log("[Missav Keep Playing] Blocked video element auto-pause.");
        return;
      }
      return originalPause();
    };
  }

  function observeVideos() {
    document.querySelectorAll("video").forEach(patchVideoElement);

    const observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        mutation.addedNodes.forEach(function (node) {
          if (node.nodeName === "VIDEO") patchVideoElement(node);
          if (node.querySelectorAll) {
            node.querySelectorAll("video").forEach(patchVideoElement);
          }
        });
      });
    });

    observer.observe(document.documentElement || document.body, {
      childList: true,
      subtree: true,
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", observeVideos);
  } else {
    observeVideos();
  }

  console.log("[Missav Keep Playing] Extension active - videos will keep playing in background");
})();
