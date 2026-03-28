// Missal Keep Playing - Prevents video auto-pause on missal.ai when tab loses focus
// Injected at document_start to intercept before site scripts run

(function () {
  "use strict";

  // 1. Override Page Visibility API
  // Sites check document.hidden and listen for visibilitychange to pause playback
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

  // Block visibilitychange events from reaching site handlers
  document.addEventListener(
    "visibilitychange",
    function (e) {
      e.stopImmediatePropagation();
    },
    true
  );

  // 2. Override document.hasFocus() - some sites use this as a fallback check
  if (typeof Document.prototype.hasFocus === "function") {
    Document.prototype.hasFocus = function () {
      return true;
    };
  }

  // 3. Intercept window blur/focusout events that sites use to detect unfocus
  // Use capture phase so we block before site handlers fire
  ["blur", "focusout", "pagehide"].forEach(function (eventType) {
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

  // 4. Keep requestAnimationFrame running even in background tabs
  // Chrome throttles rAF in background tabs, which some sites detect
  const originalRAF = window.requestAnimationFrame;
  let rafFallbackId = 0;
  window.requestAnimationFrame = function (callback) {
    if (document.hidden) {
      // Tab is hidden but we fake it as visible - use setTimeout as fallback
      const id = ++rafFallbackId;
      setTimeout(function () {
        callback(performance.now());
      }, 16); // ~60fps
      return id;
    }
    return originalRAF.call(this, callback);
  };

  // 5. Intercept video.pause() calls that the site triggers on unfocus
  // Wait for DOM to be ready, then patch all video elements
  function patchVideoElement(video) {
    if (video._patched) return;
    video._patched = true;

    const originalPause = video.pause.bind(video);
    let lastPlayTime = 0;

    // Track when play() is called
    const originalPlay = video.play.bind(video);
    video.play = function () {
      lastPlayTime = Date.now();
      return originalPlay();
    };

    // Intercept pause() - block it if it was triggered shortly after a blur/visibility event
    video.pause = function () {
      // Allow explicit user-triggered pauses (e.g., clicking pause button)
      // Block programmatic pauses that happen due to visibility changes
      const timeSincePlay = Date.now() - lastPlayTime;
      const stack = new Error().stack || "";

      // If pause is called and it looks like it's from a visibility/blur handler, block it
      const suspiciousPatterns = [
        "visibilitychange",
        "blur",
        "focusout",
        "hidden",
        "pauseOnHidden",
        "autoPause",
        "onHidden",
      ];

      const isSuspicious = suspiciousPatterns.some(
        (p) => stack.toLowerCase().includes(p.toLowerCase())
      );

      // If video was recently playing and the call looks automated, block it
      if (isSuspicious && !video.paused) {
        console.log("[Missal Keep Playing] Blocked auto-pause on video:", video.src);
        return;
      }

      return originalPause();
    };

    // Auto-resume if video gets paused unexpectedly
    video.addEventListener("pause", function () {
      // Small delay to let any programmatic pause settle
      setTimeout(function () {
        if (video.paused && !video._userPaused) {
          // Check if this was a user action (they clicked pause)
          // If not, auto-resume
          video.play().catch(function () {});
        }
      }, 100);
    });
  }

  // Watch for video elements being added to the DOM
  function observeVideos() {
    // Patch existing videos
    document.querySelectorAll("video").forEach(patchVideoElement);

    // Watch for new videos added dynamically
    const observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        mutation.addedNodes.forEach(function (node) {
          if (node.nodeName === "VIDEO") {
            patchVideoElement(node);
          }
          // Check children too
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

  // Start observing when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", observeVideos);
  } else {
    observeVideos();
  }

  console.log("[Missal Keep Playing] Extension active - videos will keep playing in background");
})();
