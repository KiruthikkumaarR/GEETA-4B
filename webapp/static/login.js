/* GEETA grown-up sign-in (parent-login.html / staff-login.html) + first-run
 * admin setup. <body data-expect="parent|staff"> says which page this is. */
(function () {
  "use strict";

  var expect = document.body.getAttribute("data-expect") || null;
  var pending = null;

  function post(path, body) {
    return fetch(path, {
      method: "POST", credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) throw new Error(j.detail || "Something went wrong - please try again.");
        return j;
      });
    });
  }
  function show(id) { var n = document.getElementById(id); if (n) n.hidden = false; }
  function formData(form) {
    var o = {};
    new FormData(form).forEach(function (v, k) { o[k] = String(v); });
    return o;
  }
  function wire(formId, errId, path, extra) {
    var form = document.getElementById(formId), err = document.getElementById(errId);
    if (!form) return;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      err.textContent = "";
      var btn = form.querySelector("button[type=submit]");
      btn.disabled = true;
      var body = formData(form);
      Object.keys(extra || {}).forEach(function (k) { body[k] = extra[k]; });
      post(path, body)
        .then(function (r) {
          if (r.needs_code) {            // 2-step sign-in is on: ask for the code
            pending = r.pending;
            document.getElementById("login-panel").hidden = true;
            show("code-panel");
            var c = document.querySelector("#code-form input");
            if (c) c.focus();
            return;
          }
          window.location.href = r.home || "/portal.html";
        })
        .catch(function (x) { err.textContent = x.message; btn.disabled = false; });
    });
  }

  wire("login-form", "login-err", "/api/auth/login", { expect: expect });
  wire("setup-form", "setup-err", "/api/auth/setup");

  var codeForm = document.getElementById("code-form");
  if (codeForm) codeForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var err = document.getElementById("code-err");
    err.textContent = "";
    post("/api/auth/login/code", { pending: pending, code: formData(codeForm).code })
      .then(function (r) { window.location.href = r.home || "/portal.html"; })
      .catch(function (x) { err.textContent = x.message; });
  });

  fetch("/api/auth/status", { credentials: "same-origin" })
    .then(function (r) { return r.json(); })
    .then(function (s) {
      if (s.signed_in && s.home) { window.location.replace(s.home); return; }
      if (s.needs_setup) {
        if (expect !== "staff") { window.location.replace("/staff-login.html"); return; }
        show(s.setup_allowed_here ? "setup-panel" : "setup-remote");
      } else { show("login-panel"); }
    })
    .catch(function () { show("login-panel"); });
})();
