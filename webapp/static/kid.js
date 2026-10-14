/* GEETA kid sign-in: tap your picture, type your 4-number secret.
 * Only works on a device a grown-up switched on (device cookie). */
(function () {
  "use strict";

  var chosen = null, typed = "";

  function api(method, path, body) {
    return fetch(path, {
      method: method, credentials: "same-origin",
      headers: body ? { "Content-Type": "application/json" } : {},
      body: body ? JSON.stringify(body) : undefined
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) { var e = new Error(j.detail || "Oops - try again!"); e.status = r.status; throw e; }
        return j;
      });
    });
  }
  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }

  function showPick(kids) {
    $("pin").hidden = true; $("pick").hidden = false;
    var grid = $("roster");
    grid.textContent = "";
    if (!kids.length) {
      grid.appendChild(el("p", "empty", "No kids here yet - ask your grown-up to add you!"));
      return;
    }
    kids.forEach(function (k) {
      var b = el("button", "panel avatar-btn");
      b.type = "button";
      b.appendChild(el("span", "avatar-face", k.avatar || "\u{1F642}"));
      b.appendChild(el("b", "", k.nickname));
      if (!k.has_pin) {
        b.disabled = true;
        b.appendChild(el("span", "form-note", "Ask a grown-up to make your secret number"));
      }
      b.addEventListener("click", function () { showPin(k); });
      grid.appendChild(b);
    });
  }

  function paintDots() {
    var dots = $("pin-dots").children;
    for (var i = 0; i < dots.length; i++) dots[i].className = i < typed.length ? "on" : "";
  }

  function showPin(k) {
    chosen = k; typed = "";
    $("pick").hidden = true; $("pin").hidden = false;
    $("pin-avatar").textContent = k.avatar || "\u{1F642}";
    $("pin-name").textContent = "Hi " + k.nickname + "!";
    $("pin-err").textContent = "";
    paintDots();
  }

  function press(key) {
    $("pin-err").textContent = "";
    if (key === "del") { typed = typed.slice(0, -1); paintDots(); return; }
    if (typed.length >= 4) return;
    typed += key;
    paintDots();
    if (typed.length === 4) {
      api("POST", "/api/kid/login", { kid_id: chosen.id, pin: typed })
        .then(function () { window.location.href = "/"; })
        .catch(function (x) {
          typed = ""; paintDots();
          $("pin-err").textContent = x.message;
          $("pin-dots").classList.add("shake");
          setTimeout(function () { $("pin-dots").classList.remove("shake"); }, 450);
        });
    }
  }

  // number pad: 1-9, (blank), 0, delete
  var pad = $("pin-pad");
  ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"].forEach(function (k) {
    if (!k) { pad.appendChild(el("span")); return; }
    var b = el("button", "pin-key", k === "del" ? "⌫" : k);
    b.type = "button";
    b.setAttribute("aria-label", k === "del" ? "delete" : k);
    b.addEventListener("click", function () { press(k); });
    pad.appendChild(b);
  });
  document.addEventListener("keydown", function (e) {
    if ($("pin").hidden) return;
    if (/^[0-9]$/.test(e.key)) press(e.key);
    else if (e.key === "Backspace") press("del");
  });
  $("pin-back").addEventListener("click", function () { boot(); });

  function boot() {
    api("GET", "/api/kid/roster").then(function (r) { showPick(r.kids); })
      .catch(function () { $("pick").hidden = true; $("pin").hidden = true; $("no-device").hidden = false; });
  }

  // already signed in as a kid? straight to maths
  api("GET", "/api/kid/me").then(function () { window.location.replace("/"); }).catch(boot);
})();
