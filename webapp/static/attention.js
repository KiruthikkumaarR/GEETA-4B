/* GEETA 4B - on-device focus helper (session 13, opt-in, parent-consented).
 *
 * PRIVACY CONTRACT - read before touching this file:
 *   - Camera video NEVER leaves this browser tab. No frame, image, or video
 *     is ever uploaded, recorded, saved, or sent to any server.
 *   - Face detection runs entirely on-device (MediaPipe WASM, in-browser).
 *   - The ONLY thing that ever crosses the network is a single short string
 *     - "engaged" or "away" - sent to /api/session/{sid}/attention. That
 *     endpoint (webapp/geeta_server.ipynb) never accepts an image field.
 *   - Off by default. A kid/parent must explicitly click "Turn on focus
 *     helper" (getUserMedia only fires on that click). Turning it off stops
 *     every camera track immediately.
 *
 * This is a togglable ENGAGEMENT PROXY, not identity/emotion recognition:
 * it asks "are the kid's EYES on the screen right now?" - using MediaPipe's
 * on-device eye blendshapes (gaze direction + blink), not just face presence.
 * Eyes closed or gaze wandered off for a few consecutive samples reads as
 * "away" and (via the backend) can trigger a warm, story-based re-engagement
 * nudge - same tone as the existing inactivity re-engagement loop.
 */
(function () {
  "use strict";

  var btn = document.getElementById("btn-focus");
  var previewWrap = document.getElementById("focus-preview-wrap");
  var video = document.getElementById("focus-preview");
  var statusEl = document.getElementById("focus-status");
  if (!btn || !video) return;   // page doesn't have the focus-helper markup

  var VISION_CDN = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";
  var MODEL_URL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

  var stream = null;
  var landmarker = null;
  var loopHandle = null;
  var running = false;
  var awayStreak = 0;
  var engagedStreak = 0;
  var lastSentState = null;

  function setStatus(text) { if (statusEl) statusEl.textContent = text; }

  function sendState(state) {
    var sid = window.GEETA_SID;
    if (!sid) return;   // no session yet - nothing to attach the signal to
    fetch("/api/session/" + sid + "/attention", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state: state })
    }).then(function (r) {
        // session gone (e.g. server restarted) -> stop the helper rather
        // than 404-spamming the endpoint every detection tick forever
        if (r.status === 404) {
          setStatus("Focus helper stopped - start a new session to use it again.");
          if (typeof window.GEETA_stopFocusHelper === "function") window.GEETA_stopFocusHelper();
          return null;
        }
        return r.json();
      })
      .then(function (r) {
        if (r && r.reply) {
          window.dispatchEvent(new CustomEvent("geeta:attention-reply", { detail: r }));
        }
      }).catch(function () { /* best-effort only - never blocks the session */ });
  }

  // --- gaze estimate from MediaPipe eye blendshapes (all on-device) --------
  // eyesOnScreen = eyes open AND gaze not strongly off to a side / up / down.
  // Thresholds are deliberately loose - a quick glance at a pencil shouldn't
  // count; only a sustained streak (handled downstream) triggers a nudge.
  function eyesOnScreen(result) {
    if (!result || !result.faceLandmarks || !result.faceLandmarks.length) return false;
    var bs = result.faceBlendshapes && result.faceBlendshapes[0];
    if (!bs || !bs.categories) return true;   // face there but no gaze data -> don't punish
    var m = {};
    bs.categories.forEach(function (c) { m[c.categoryName] = c.score; });
    var blink = Math.max(m.eyeBlinkLeft || 0, m.eyeBlinkRight || 0);
    // Looking DOWN is a kid writing on their homework sheet - that's working,
    // not wandering off (and eyes look half-closed then, so skip the blink test).
    var lookDown = Math.max(m.eyeLookDownLeft || 0, m.eyeLookDownRight || 0);
    if (lookDown > 0.45) return true;
    var lookAway = Math.max(
      m.eyeLookOutLeft || 0, m.eyeLookOutRight || 0,
      m.eyeLookInLeft || 0, m.eyeLookInRight || 0,
      m.eyeLookUpLeft || 0, m.eyeLookUpRight || 0
    );
    return blink < 0.7 && lookAway < 0.72;
  }

  function onDetection(looking) {
    if (looking) {
      engagedStreak++; awayStreak = 0;
      setStatus(engagedStreak >= 2 ? "Focus helper: eyes on it! 👀" : "Focus helper: checking…");
    } else {
      awayStreak++; engagedStreak = 0;
      setStatus("Focus helper: your eyes wandered off…");
    }
    var state = looking ? "engaged" : "away";
    if (state !== lastSentState || awayStreak % 3 === 0 || engagedStreak % 6 === 0) {
      lastSentState = state;
      sendState(state);
    }
  }

  function detectLoop() {
    if (!running) return;
    if (landmarker && video.readyState >= 2) {
      var result = landmarker.detectForVideo(video, performance.now());
      onDetection(eyesOnScreen(result));
    }
    loopHandle = setTimeout(detectLoop, 1200);
  }

  function loadLandmarker() {
    if (landmarker) return Promise.resolve(landmarker);
    return import(VISION_CDN + "/vision_bundle.mjs").then(function (vt) {
      return vt.FilesetResolver.forVisionTasks(VISION_CDN + "/wasm").then(function (files) {
        return vt.FaceLandmarker.createFromOptions(files, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
          runningMode: "VIDEO",
          numFaces: 1,
          outputFaceBlendshapes: true   // gives the eye-gaze / blink signals
        });
      });
    }).then(function (l) { landmarker = l; return l; });
  }

  function start() {
    setStatus("Focus helper: starting…");
    navigator.mediaDevices.getUserMedia({ video: { width: 160, height: 120 }, audio: false })
      .then(function (s) {
        stream = s;
        video.srcObject = s;
        previewWrap.hidden = false;
        return video.play();
      })
      .then(loadLandmarker)
      .then(function () {
        running = true;
        btn.textContent = "👁️ Turn off focus helper";
        btn.classList.add("active");
        detectLoop();
      })
      .catch(function () {
        setStatus("");
        previewWrap.hidden = true;
        alert("Couldn't start the camera - focus helper needs camera permission.");
      });
  }

  function stop() {
    running = false;
    if (loopHandle) clearTimeout(loopHandle);
    if (stream) { stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; }
    video.srcObject = null;
    previewWrap.hidden = true;
    btn.textContent = "👁️ Turn on focus helper";
    btn.classList.remove("active");
    setStatus("");
    awayStreak = 0; engagedStreak = 0; lastSentState = null;
  }
  window.GEETA_stopFocusHelper = stop;

  btn.addEventListener("click", function () {
    if (running) stop(); else start();
  });

  window.addEventListener("beforeunload", stop);
})();
