/* Applies the kid's chosen world to the tutoring page and runs the picker.
 * Needs worlds.js first. The choice is saved on the kid's profile (so it
 * follows them to any device) and remembered locally as a quick fallback. */
(function () {
  "use strict";

  var WORLDS = window.GEETA_WORLDS || [];
  var current = null, kid = null, kidMode = false, onPicked = null;

  function byId(id) { return WORLDS.filter(function (w) { return w.id === id; })[0] || null; }
  function $(id) { return document.getElementById(id); }
  function remembered() {
    try { return localStorage.getItem("geeta.world." + (kid ? kid.id : "x")); } catch (e) { return null; }
  }
  function remember(id) {
    try { localStorage.setItem("geeta.world." + (kid ? kid.id : "x"), id); } catch (e) { /* private mode */ }
  }

  function apply(id) {
    var w = byId(id) || WORLDS[0];
    current = w;
    document.body.setAttribute("data-world", w.id);
    $("world-scene").innerHTML = window.GEETA_SCENES[w.id];          // our own static art
    var m = $("mascot");
    var state = (m.getAttribute("class") || "mascot state-idle").replace(/^.*(state-\w+).*$/, "$1");
    m.innerHTML = w.mascot;
    m.setAttribute("class", "mascot " + (state.indexOf("state-") === 0 ? state : "state-idle"));
    $("hero-title").textContent = w.title;
    $("hero-sub").textContent = w.sub;
    $("world-name").textContent = w.icon + " " + w.name;
    $("buddy-hello").textContent = "Hi" + (kid ? " " + kid.nickname : "") + "! I'm " + w.buddy + " the " + w.buddyKind + ".";
    window.GEETA_currentWorld = w;
    // chat bubbles already on screen + the send button speak as the new buddy
    Array.prototype.forEach.call(document.querySelectorAll(".msg.geeta .who"), function (el) {
      el.textContent = w.icon + " " + w.buddy;
    });
    var send = $("btn-send-board");
    if (send) send.textContent = "\u{1F4E4} Send to " + w.buddy;
  }

  function save(id) {
    remember(id);
    if (!kid) return Promise.resolve();
    var req = kidMode
      ? fetch("/api/kid/world", { method: "POST", credentials: "same-origin",
          headers: { "Content-Type": "application/json" }, body: JSON.stringify({ world: id }) })
      : fetch("/api/kids/" + kid.id, { method: "PATCH", credentials: "same-origin",
          headers: { "Content-Type": "application/json" }, body: JSON.stringify({ world: id }) });
    return req.catch(function () { /* still applied locally */ });
  }

  // ------------------------------------------------------------- picker
  function buildPicker() {
    var grid = $("world-grid");
    grid.textContent = "";
    WORLDS.forEach(function (w) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "world-card";
      b.setAttribute("aria-pressed", String(current && current.id === w.id));
      b.setAttribute("aria-label", w.name + " with " + w.buddy + " the " + w.buddyKind);
      var prev = document.createElement("div");
      prev.className = "preview";
      prev.innerHTML = window.GEETA_SCENES[w.id];
      var bud = document.createElement("div");
      bud.className = "card-buddy mascot state-idle";
      bud.innerHTML = w.mascot;
      var name = document.createElement("b");
      name.textContent = w.icon + " " + w.name;
      var who = document.createElement("span");
      who.className = "buddy-name";
      who.textContent = "with " + w.buddy + " the " + w.buddyKind;
      b.appendChild(prev); b.appendChild(bud); b.appendChild(name); b.appendChild(who);
      b.addEventListener("click", function () {
        apply(w.id);
        save(w.id);
        $("world-picker").close();
        if (onPicked) { var f = onPicked; onPicked = null; f(w); }
      });
      grid.appendChild(b);
    });
  }

  function openPicker(firstTime, cb) {
    onPicked = cb || null;
    $("picker-title").textContent = firstTime ? "Pick your world!" : "Change your world";
    $("picker-sub").textContent = firstTime
      ? "Who do you want to do maths with today? You can change it any time."
      : "Tap a world to jump in.";
    $("picker-close").hidden = !!firstTime;
    buildPicker();
    $("world-picker").showModal();
  }

  // cards in the picker repeat SVG gradient ids; give each copy unique ids so
  // every preview keeps its own colours
  var uid = 0;
  var _origBuild = buildPicker;
  buildPicker = function () {
    _origBuild();
    Array.prototype.forEach.call($("world-grid").querySelectorAll("svg"), function (svg) {
      uid += 1;
      var map = {};
      Array.prototype.forEach.call(svg.querySelectorAll("[id]"), function (el) {
        map[el.id] = el.id + "-p" + uid; el.id = map[el.id];
      });
      Array.prototype.forEach.call(svg.querySelectorAll("*"), function (el) {
        ["fill", "stroke"].forEach(function (a) {
          var v = el.getAttribute(a);
          var m = v && /^url\(#(.+)\)$/.exec(v);
          if (m && map[m[1]]) el.setAttribute(a, "url(#" + map[m[1]] + ")");
        });
      });
    });
  };

  $("btn-world").addEventListener("click", function () { openPicker(false); });
  $("picker-close").addEventListener("click", function () { $("world-picker").close(); });
  $("world-picker").addEventListener("cancel", function (e) {
    if ($("picker-close").hidden) e.preventDefault();      // first pick is required
  });

  // called by app.js once it knows who is learning
  window.GEETA_setKidWorld = function (k, isKid) {
    kid = k; kidMode = !!isKid;
    var saved = (k && k.world) || remembered();
    if (saved && byId(saved)) { apply(saved); if (!k.world) save(saved); return; }
    apply(WORLDS[0].id);
    openPicker(true);
  };
  window.GEETA_openWorldPicker = openPicker;

  apply(remembered() || WORLDS[0].id);   // something nice straight away, before sign-in finishes
})();
