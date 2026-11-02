/* GEETA 4B - kid-facing web app logic.
 * Canvas board -> PNG upload, chat, voice (graceful fallback), TTS, report download.
 * All same-origin: the FastAPI server serves both /static and /api. */
(function () {
  "use strict";

  var API = "";            // same origin
  var sid = null;          // current session id
  // which child is learning: a grown-up picks one on their page (/?kid=ID),
  // or the kid signed in themselves (picture + secret number) - kid mode.
  var kidMatch = /[?&]kid=(\d+)/.exec(window.location.search);
  var kidId = kidMatch ? Number(kidMatch[1]) : null;
  var kidMode = false;
  var modelSource = "mock";

  // ------------------------------------------------------------------ mascot
  // The mascot's pose is part of the teaching moment, not decoration: it
  // visibly "thinks" while GEETA is working (addTyping), then either
  // celebrates a real solve or settles back to a calm idle - so a kid gets
  // a wordless read on what's happening before the text even arrives.
  var mascot = document.getElementById("mascot");
  function setMascot(state) {
    // SVG elements need setAttribute/classList, not a plain .className string.
    if (!mascot) return;
    mascot.setAttribute("class", "mascot state-" + state);
  }

  function burstConfetti() {
    var layer = document.getElementById("confetti-layer");
    if (!layer) return;
    // the kid's world decides the confetti: hearts for Teddy, flags for Zoom...
    var world = window.GEETA_currentWorld;
    var emoji = world && world.confetti;
    var colors = ["#e07a5f", "#81b298", "#f2cc8f", "#8ab6d6", "#3d405b"];
    for (var i = 0; i < 36; i++) {
      var p = document.createElement("div");
      p.style.left = (Math.random() * 100) + "vw";
      if (emoji) {
        p.className = "confetti-emoji";
        p.textContent = emoji[i % emoji.length];
        p.style.fontSize = (20 + Math.random() * 18) + "px";
      } else {
        p.className = "confetti-piece";
        p.style.background = colors[i % colors.length];
      }
      p.style.animationDuration = (1.6 + Math.random() * 1.2) + "s";
      p.style.animationDelay = (Math.random() * 0.4) + "s";
      p.style.transform = "rotate(" + (Math.random() * 360) + "deg)";
      layer.appendChild(p);
      (function (el) { setTimeout(function () { el.remove(); }, 3200); })(p);
    }
  }

  // ------------------------------------------------------------------ chat
  var chatEl = document.getElementById("chat");
  var form = document.getElementById("composer");
  var input = document.getElementById("text-input");
  var btnReport = document.getElementById("btn-report");

  function addMsg(who, text) {
    var d = document.createElement("div");
    d.className = "msg " + who;
    var w = document.createElement("span");
    w.className = "who";
    var buddy = window.GEETA_currentWorld;
    w.textContent = who === "kid" ? "You" : (who === "geeta" ? (buddy ? buddy.icon + " " + buddy.buddy : "GEETA") : "");
    d.appendChild(w);
    var b = document.createElement("span");
    b.textContent = text;
    d.appendChild(b);
    chatEl.appendChild(d);
    chatEl.scrollTop = chatEl.scrollHeight;
    return d;
  }

  function addTyping() {
    setMascot("thinking");
    var d = document.createElement("div");
    d.className = "msg geeta";
    d.id = "typing";
    d.innerHTML = "<span class='who'>GEETA</span><span>&hellip;</span>";
    chatEl.appendChild(d);
    chatEl.scrollTop = chatEl.scrollHeight;
  }
  function removeTyping() {
    var t = document.getElementById("typing");
    if (t) t.remove();
  }

  // ------------------------------------------------------------------ TTS
  var speakBtn = document.getElementById("btn-speak");
  var lastGeetaText = "";

  // pick a gentle, young-sounding FEMALE voice - the browser default is
  // often a flat adult male, which reads as cold/rude to a young kid.
  var geetaVoice = null;
  function pickVoice() {
    var voices = window.speechSynthesis ? window.speechSynthesis.getVoices() : [];
    if (!voices.length) return;
    // most-wanted named voices, gentle + female, AU/GB first
    var prefer = ["karen", "catherine", "google uk english female", "libby", "sonia",
                  "google australian english", "samantha", "tessa", "moira", "fiona",
                  "google us english", "microsoft zira", "microsoft jenny", "microsoft aria"];
    function score(v) {
      var n = (v.name || "").toLowerCase(), l = (v.lang || "").toLowerCase(), s = 0;
      for (var i = 0; i < prefer.length; i++) if (n.indexOf(prefer[i]) !== -1) { s += 100 - i; break; }
      if (/female|woman|girl/.test(n)) s += 40;
      if (/(^|[^a-z])(male|man)([^a-z]|$)/.test(n) && !/female/.test(n)) s -= 60;
      if (l.indexOf("en-au") === 0) s += 15;
      else if (l.indexOf("en-gb") === 0) s += 10;
      else if (l.indexOf("en") === 0) s += 5;
      return s;
    }
    geetaVoice = voices.slice().sort(function (a, b) { return score(b) - score(a); })[0] || null;
  }
  if (window.speechSynthesis) {
    pickVoice();
    window.speechSynthesis.onvoiceschanged = pickVoice;  // voices load async
  }

  // what's on screen isn't always good to hear: "___" was read out as
  // "underscore underscore underscore", and emojis get their names read.
  function forSpeech(text) {
    return String(text || "")
      .replace(/_+/g, " blank ")
      .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]/gu, "")
      .replace(/(\d)\s*\+\s*(\d)/g, "$1 plus $2")
      .replace(/(\d)\s*[\u2212-]\s*(\d)/g, "$1 take away $2")
      .replace(/:\s*\n+/g, ": ")
      .replace(/\n+/g, ". ")
      .replace(/\s{2,}/g, " ")
      .trim();
  }

  function speak(text) {
    if (!("speechSynthesis" in window)) {
      addMsg("sys", "Your browser can't read out loud. Try Chrome or Safari.");
      return;
    }
    window.speechSynthesis.cancel();
    if (!geetaVoice) pickVoice();
    var u = new SpeechSynthesisUtterance(forSpeech(text));
    if (geetaVoice) u.voice = geetaVoice;
    u.rate = 0.88;    // slow + gentle
    u.pitch = 1.35;   // higher -> lighter, younger, kinder
    u.volume = 1.0;
    window.speechSynthesis.speak(u);
  }
  speakBtn.addEventListener("click", function () {
    if (lastGeetaText) speak(lastGeetaText);
  });

  // ------------------------------------------------------------------ ASR (voice input)
  // config.yaml's tutor.voice.asr default is "browser_web_speech": the
  // browser transcribes speech to text itself (no audio file ever leaves
  // the device as an upload) - the kid's words go through the exact same
  // real, verified, guarded /text pipeline as typing, not a stub.
  var micBtn = document.getElementById("btn-mic");
  var SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  var recognizer = null;
  var listening = false;

  function submitSpokenText(text) {
    text = text.trim();
    if (!text) return;
    addMsg("kid", text);
    ensureSession().then(function () {
      addTyping();
      return post("/api/session/" + sid + "/text", { text: text });
    }).then(function (r) { removeTyping(); handleReply(r); })
      .catch(function () { removeTyping(); setMascot("idle"); addMsg("sys", "Hmm, I lost you - try again?"); });
  }

  function stopListening() {
    listening = false;
    micBtn.classList.remove("recording");
    if (recognizer) recognizer.stop();
  }

  micBtn.addEventListener("click", function () {
    if (listening) { stopListening(); return; }
    if (!SpeechRec) {
      addMsg("sys", "Voice input isn't available in this browser - please type instead.");
      return;
    }
    recognizer = new SpeechRec();
    recognizer.lang = "en-AU";
    recognizer.interimResults = true;
    recognizer.continuous = false;
    recognizer.onstart = function () {
      listening = true;
      micBtn.classList.add("recording");
      addMsg("sys", "Listening… tap the mic again when you're done.");
    };
    // show what GEETA is hearing live, so a kid can see they're understood
    // as they talk, not just after they finish
    recognizer.onresult = function (e) {
      var text = "";
      for (var i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
      input.value = text;
      if (e.results[e.results.length - 1].isFinal) {
        input.value = "";
        submitSpokenText(text);
      }
    };
    recognizer.onerror = function (e) {
      stopListening();
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        addMsg("sys", "I couldn't use the microphone - please check permission, or type instead.");
      } else if (e.error !== "no-speech" && e.error !== "aborted") {
        addMsg("sys", "I didn't catch that - please try again or type it.");
      }
    };
    recognizer.onend = function () { stopListening(); };
    recognizer.start();
  });

  // ------------------------------------------------------------------ API
  function post(path, body) {
    return fetch(API + path, {
      method: "POST", credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body || {})
    }).then(function (r) {
      if (r.status === 401) { window.location.href = "/login.html"; throw new Error("signed out"); }
      return r.json();
    });
  }

  function ensureSession() {
    if (sid) return Promise.resolve(sid);
    return post("/api/session", { kid_id: kidId }).then(function (r) {
      if (!r.sid) { window.location.replace(kidMode ? "/kid.html" : "/portal.html"); throw new Error(r.detail || "no session"); }
      sid = r.sid;
      kidMode = !!r.kid_mode;
      if (r.kid && window.GEETA_setKidWorld) window.GEETA_setKidWorld(r.kid, kidMode);
      if (r.kid) {
        var who = document.getElementById("kid-name");
        if (who) who.textContent = (r.kid.avatar ? r.kid.avatar + " " : "") + r.kid.nickname;
        var back = document.getElementById("kid-progress");
        if (back && kidMode) {
          back.textContent = "Bye \u{1F44B}";
          back.href = "#";
          back.addEventListener("click", function (e) {
            e.preventDefault();
            var done = sid ? post("/api/session/" + sid + "/close") : Promise.resolve();
            sid = null;
            done.catch(function () {}).then(function () { return post("/api/kid/logout"); })
              .catch(function () {}).then(function () { window.location.href = "/kid.html"; });
          });
        } else if (back) {
          back.href = "/portal.html?kid=" + r.kid.id;
        }
      }
      window.GEETA_SID = sid;   // exposed for attention.js (decoupled opt-in module)
      modelSource = r.model_source || modelSource;
      updateBadge();
      if (r.greeting) { lastGeetaText = r.greeting; addMsg("geeta", r.greeting); }
      return sid;
    });
  }

  // attention.js (on-device focus helper, opt-in) dispatches this after
  // POSTing a derived engagement label - never image/video data - to
  // /api/session/{sid}/attention. Only act when the backend actually sent a
  // re-engagement reply (sustained distraction), never on a plain "engaged" tick.
  window.addEventListener("geeta:attention-reply", function (e) {
    if (e.detail && e.detail.reply) handleReply(e.detail);
  });

  function updateBadge() {
    var b = document.getElementById("model-badge");
    if (!b) return;
    b.textContent = modelSource === "real" ? "live brain" : "practice mode";
    b.className = "badge " + (modelSource === "real" ? "real" : "mock");
  }

  function handleReply(r) {
    if (r.reply) { lastGeetaText = r.reply; addMsg("geeta", r.reply); }
    if (r.metrics && r.metrics.solved) btnReport.disabled = false;
    if (r.metrics && r.metrics.just_solved) {
      setMascot("celebrating");
      burstConfetti();
      setTimeout(function () { setMascot("idle"); }, 2600);
    } else {
      setMascot("idle");
    }
  }

  // text
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var text = input.value.trim();
    if (!text) return;
    input.value = "";
    addMsg("kid", text);
    ensureSession().then(function () {
      addTyping();
      return post("/api/session/" + sid + "/text", { text: text });
    }).then(function (r) { removeTyping(); handleReply(r); })
      .catch(function () { removeTyping(); setMascot("idle"); addMsg("sys", "Hmm, I lost you - try again?"); });
  });

  // board -> image
  var sendBoard = document.getElementById("btn-send-board");
  function canvasToBlob(canvas) {
    // canvas.toBlob() is callback-style, not a Promise - chaining .then()
    // straight onto its (undefined) return value threw a TypeError before
    // the request was ever sent, silently swallowing every board submission
    // (found live-testing: the "..." indicator hung forever because
    // removeTyping()/handleReply() never ran).
    return new Promise(function (resolve) { canvas.toBlob(resolve, "image/png"); });
  }

  function sendBoardImage() {
    var canvas = document.getElementById("board");
    if (canvas._empty) { addMsg("sys", "Draw the question first, then send it!"); return; }
    ensureSession().then(function () {
      addTyping();
      return canvasToBlob(canvas).then(function (blob) {
        var fd = new FormData();
        fd.append("file", blob, "board.png");
        return fetch(API + "/api/session/" + sid + "/image", { method: "POST", body: fd });
      }).then(function (r) { return r.json(); })
        .then(function (r) { removeTyping(); handleReply(r); })
        .catch(function () { removeTyping(); setMascot("idle"); addMsg("sys", "I couldn't read that - can you type it?"); });
    });
  }
  sendBoard.addEventListener("click", sendBoardImage);

  // attach a real photo or PDF of homework (not just the drawn board)
  var attachBtn = document.getElementById("btn-attach");
  var fileInput = document.getElementById("file-attach");
  attachBtn.addEventListener("click", function () { fileInput.click(); });
  fileInput.addEventListener("change", function () {
    var file = fileInput.files && fileInput.files[0];
    fileInput.value = "";       // allow re-selecting the same file next time
    if (!file) return;
    addMsg("kid", "[attached " + (file.type === "application/pdf" ? "a PDF" : "a photo") + ": " + file.name + "]");
    ensureSession().then(function () {
      addTyping();
      var fd = new FormData();
      fd.append("file", file, file.name);
      return fetch(API + "/api/session/" + sid + "/image", { method: "POST", body: fd })
        .then(function (r) { return r.json(); });
    }).then(function (r) { removeTyping(); handleReply(r); })
      .catch(function () { removeTyping(); setMascot("idle"); addMsg("sys", "I couldn't read that file - can you try a photo instead?"); });
  });

  // report download -> close session, then fetch the PDF
  btnReport.addEventListener("click", function () {
    if (!sid) return;
    addMsg("sys", "Finishing this session and making the report…");
    post("/api/session/" + sid + "/close").then(function (r) {
      if (kidMode && r.saved) {
        sid = null;
        addMsg("sys", "Great job today! \u{1F389} Your report is saved for your grown-up. Want to keep going? Send a new question!");
        return;
      }
      if (!r.report) { addMsg("sys", "Let's do a question first - then there's something to report!"); return; }
      sid = null;   // a new message starts a fresh session
      window.open(r.report.pdf_url, "_blank", "noopener");
      addMsg("sys", "Report saved to the portal. 🎉 Want to keep going? Send a new question!");
    }).catch(function () { addMsg("sys", "I couldn't make the report - sorry!"); });
  });

  // closing the tab still saves the session's learning summary to the portal
  window.addEventListener("pagehide", function () {
    if (sid && navigator.sendBeacon) navigator.sendBeacon(API + "/api/session/" + sid + "/close");
  });

  // ------------------------------------------------------------------ canvas board
  var canvas = document.getElementById("board");
  var ctx = canvas.getContext("2d");
  var drawing = false, lastX = 0, lastY = 0;
  canvas._empty = true;

  function pos(e) {
    var r = canvas.getBoundingClientRect();
    var sx = canvas.width / r.width, sy = canvas.height / r.height;
    return { x: (e.clientX - r.left) * sx, y: (e.clientY - r.top) * sy };
  }
  canvas.addEventListener("pointerdown", function (e) {
    drawing = true; canvas._empty = false; var p = pos(e); lastX = p.x; lastY = p.y;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointermove", function (e) {
    if (!drawing) return;
    canvas._empty = false;
    var p = pos(e);
    ctx.strokeStyle = "#3d405b"; ctx.lineWidth = 4; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.beginPath(); ctx.moveTo(lastX, lastY); ctx.lineTo(p.x, p.y); ctx.stroke();
    lastX = p.x; lastY = p.y;
  });
  ["pointerup", "pointercancel", "pointerleave"].forEach(function (ev) {
    canvas.addEventListener(ev, function () { drawing = false; });
  });

  document.getElementById("btn-clear").addEventListener("click", function () {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    canvas._empty = true;
  });

  // ------------------------------------------------------------------ health / boot
  fetch(API + "/health").then(function (r) { return r.json(); }).then(function (h) {
    modelSource = h.model_source || "mock";
    updateBadge();
  }).catch(function () { updateBadge(); });

  // start straight away so GEETA greets this child by name (and remembers them)
  if (kidId) {
    ensureSession().catch(function () {});
  } else {
    fetch(API + "/api/kid/me", { credentials: "same-origin" }).then(function (r) {
      if (!r.ok) { window.location.replace("/login.html"); return; }
      kidMode = true;
      ensureSession().catch(function () {});
    });
  }
})();
