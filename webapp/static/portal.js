/* GEETA portal: children, progress history, reports, accounts.
 * Everything is rendered with textContent (never innerHTML) - names come
 * from user input. */
(function () {
  "use strict";

  var me = null, users = [], kids = [], avatars = [];
  var page = document.body.getAttribute("data-page");   // admin | tutor | parent
  var YEARS = [["", "Year?"], ["0", "Foundation"], ["1", "Year 1"], ["2", "Year 2"], ["3", "Year 3"],
               ["4", "Year 4"], ["5", "Year 5"], ["6", "Year 6"]];

  function api(method, path, body) {
    return fetch(path, {
      method: method, credentials: "same-origin",
      headers: body ? { "Content-Type": "application/json" } : {},
      body: body ? JSON.stringify(body) : undefined
    }).then(function (r) {
      if (r.status === 401) { window.location.href = "/login.html"; throw new Error("signed out"); }
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) throw new Error(j.detail || "Something went wrong - please try again.");
        return j;
      });
    });
  }

  function el(tag, attrs, kids_) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === "text") n.textContent = attrs[k];
      else if (k === "class") n.className = attrs[k];
      else if (k.slice(0, 2) === "on") n.addEventListener(k.slice(2), attrs[k]);
      else n.setAttribute(k, attrs[k]);
    });
    (kids_ || []).forEach(function (c) { if (c) n.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return n;
  }
  function select(name, options, value) {
    var s = el("select", { name: name });
    options.forEach(function (o) {
      var opt = el("option", { value: o[0], text: o[1] });
      if (String(value == null ? "" : value) === String(o[0])) opt.selected = true;
      s.appendChild(opt);
    });
    return s;
  }
  function yearText(y) { return y === null || y === undefined ? "" : (y === 0 ? "Foundation" : "Year " + y); }
  function when(ts) {
    if (!ts) return "never";
    var d = new Date(ts * 1000);
    return d.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }) +
           ", " + d.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" });
  }
  function formData(form) {
    var o = {};
    new FormData(form).forEach(function (v, k) { o[k] = String(v); });
    return o;
  }
  function peopleOptions(role, blank) {
    return [["", blank]].concat(users.filter(function (u) { return u.role === role; })
      .map(function (u) { return [String(u.id), u.name + " (" + u.email + ")"]; }));
  }

  // ------------------------------------------------------------------ kids
  function renderKids() {
    var grid = document.getElementById("kids");
    grid.textContent = "";
    kids.forEach(function (k) {
      var links = [];
      if (k.parent_name) links.push("Parent: " + k.parent_name);
      if (k.tutor_name) links.push("Tutor: " + k.tutor_name);
      links.push(k.has_pin ? "Kid sign-in ready" : "No secret number yet");
      grid.appendChild(el("article", { class: "panel kid-card" }, [
        el("h3", {}, [el("span", { class: "kid-avatar", text: k.avatar || "\u{1F642}" }), k.nickname]),
        el("p", { class: "meta", text: [yearText(k.year_level), k.n_sessions + " session" + (k.n_sessions === 1 ? "" : "s"),
                                         "last: " + when(k.last_session)].filter(Boolean).join(" · ") }),
        links.length ? el("p", { class: "meta", text: links.join(" · ") }) : null,
        el("div", { class: "actions" }, [
          el("a", { class: "btn primary small", href: "/?kid=" + k.id, text: "Start tutoring" }),
          el("button", { class: "btn ghost small", type: "button", text: "Progress",
                         onclick: function () { showProgress(k.id); } })
        ])
      ]));
    });
    grid.appendChild(addKidCard());
  }

  function addKidCard() {
    var err = el("p", { class: "msg-err", role: "alert" });
    var fields = [
      el("label", {}, ["First name or nickname", el("input", { name: "nickname", required: "", maxlength: "40" })]),
      el("label", {}, ["Year level", select("year_level", YEARS, "")])
    ];
    if (me.is_admin) {
      fields.push(el("label", {}, ["Parent", select("parent_id", peopleOptions("parent", "No parent yet"), "")]));
      fields.push(el("label", {}, ["Tutor", select("tutor_id", peopleOptions("tutor", "No tutor"), me.id)]));
    }
    var form = el("form", { class: "form" }, fields.concat([
      el("p", { class: "form-note", text: "Please don't use full names - a first name or nickname is plenty." }),
      err, el("button", { class: "btn small", type: "submit", text: "Add child" })
    ]));
    form.addEventListener("submit", function (e) {
      e.preventDefault(); err.textContent = "";
      var d = formData(form), body = { nickname: d.nickname };
      body.year_level = d.year_level === "" ? null : Number(d.year_level);
      if (me.is_admin) {
        body.parent_id = d.parent_id ? Number(d.parent_id) : null;
        body.tutor_id = d.tutor_id ? Number(d.tutor_id) : null;
      }
      api("POST", "/api/kids", body).then(loadKids).catch(function (x) { err.textContent = x.message; });
    });
    return el("article", { class: "panel kid-card add" }, [el("h3", { text: "+ Add a child" }), form]);
  }

  function loadKids() {
    return api("GET", "/api/kids").then(function (r) { kids = r.kids; avatars = r.avatars || []; renderKids(); });
  }

  // ------------------------------------------------------------------ progress
  function pill(status) {
    var cls = status === "confident" ? "confident" : (status === "getting there" ? "getting" : "learning");
    var txt = status === "confident" ? "Confident" : (status === "getting there" ? "Getting there" : "Still learning");
    return el("span", { class: "pill " + cls, text: txt });
  }

  function showProgress(kidId) {
    var box = document.getElementById("detail");
    box.hidden = false;
    box.textContent = "Loading…";
    api("GET", "/api/kids/" + kidId + "/progress").then(function (r) {
      var k = r.kid, p = r.progress;
      box.textContent = "";
      var head = el("div", { class: "detail-head" }, [
        el("h2", { text: k.nickname + "'s progress" }),
        el("div", { class: "actions", style: "display:flex;gap:8px;flex-wrap:wrap" }, [
          el("a", { class: "btn primary small", href: "/?kid=" + k.id, text: "Start tutoring" }),
          (me.is_admin || k.parent_id === me.id) ? el("button", {
            class: "btn small danger", type: "button", text: "Delete child's data",
            onclick: function () { deleteKid(k); } }) : null
        ])
      ]);
      box.appendChild(head);

      box.appendChild(el("div", { class: "stat-row", style: "margin-top:16px" }, [
        el("div", { class: "stat" }, [el("b", { text: String(p.sessions) }), el("span", { text: "sessions" })]),
        el("div", { class: "stat" }, [el("b", { text: String(p.solved) }), el("span", { text: "questions solved" })]),
        el("div", { class: "stat" }, [el("b", { text: String(p.minutes) }), el("span", { text: "minutes learning" })]),
        el("div", { class: "stat" }, [el("b", { text: String(p.skills.length) }), el("span", { text: "skills practised" })])
      ]));

      if (!p.sessions) {
        box.appendChild(el("p", { class: "empty", text: "No sessions yet. Press \"Start tutoring\" to begin - the summary appears here when the session ends." }));
      } else {
        var cols = el("div", { class: "two-col" });
        var skillRows = [el("tr", {}, [el("th", { text: "Skill" }), el("th", { text: "Solved / tried" }), el("th", { text: "Where they are" })])];
        p.skills.forEach(function (s) {
          skillRows.push(el("tr", {}, [el("td", { text: s.skill }), el("td", { text: s.solved + " / " + s.tried }), el("td", {}, [pill(s.status)])]));
        });
        cols.appendChild(el("div", {}, [el("h3", { text: "Skills" }),
          el("div", { class: "table-wrap" }, [el("table", { class: "plain" }, skillRows)])]));
        var watch = r.watch_text && r.watch_text.length
          ? el("ul", { class: "watch" }, r.watch_text.map(function (t) { return el("li", { text: t }); }))
          : el("p", { class: "empty", text: "Nothing that keeps coming up - great!" });
        cols.appendChild(el("div", {}, [el("h3", { text: "Worth practising" }), watch,
          el("p", { class: "form-note", style: "margin-top:8px", text: "GEETA also gently reminds " + k.nickname + " about these at the start of a matching question." })]));
        box.appendChild(cols);

        var sRows = [el("tr", {}, [el("th", { text: "When" }), el("th", { text: "What they did" }), el("th", { text: "Solved" }),
                                   el("th", { text: "Grade" }), el("th", { text: "Report" })])];
        r.sessions.forEach(function (s) {
          sRows.push(el("tr", {}, [
            el("td", { text: when(s.started) }),
            el("td", { text: s.skills.map(function (x) { return x.skill; }).join("; ") || "-" }),
            el("td", { text: (s.solved_count || 0) + " / " + (s.tried_count || 0) }),
            el("td", { text: s.grade || "-" }),
            el("td", {}, [s.pdf_url ? el("a", { href: s.pdf_url, target: "_blank", rel: "noopener", text: "PDF" }) : document.createTextNode("-")])
          ]));
        });
        box.appendChild(el("h3", { text: "Sessions" }));
        box.appendChild(el("div", { class: "table-wrap" }, [el("table", { class: "plain" }, sRows)]));
      }

      box.appendChild(kidSignInSettings(k));
      if (me.role === "tutor") box.appendChild(pilotBox(k, r.pilot || {}));
      if (me.is_admin) box.appendChild(assignForm(k));
      box.scrollIntoView({ behavior: "smooth", block: "start" });
    }).catch(function (x) { box.textContent = x.message; });
  }

  function pilotBox(k, scores) {
    var msg = el("p", { class: "msg-err", role: "alert" });
    var code = el("input", { name: "study_code", value: k.study_code || "", maxlength: "12", placeholder: "e.g. P01" });
    function scoreRow(phase, label) {
      var s = scores[phase] || {};
      var sc = el("input", { name: phase + "_score", inputmode: "numeric", value: s.score != null ? String(s.score) : "", placeholder: "correct" });
      var of = el("input", { name: phase + "_of", inputmode: "numeric", value: String(s.out_of || 12) });
      return el("div", { class: "row" }, [el("label", {}, [label + " - correct", sc]), el("label", {}, ["out of", of])]);
    }
    var gain = "";
    if (scores.pre && scores.post) {
      var g = 100 * scores.post.score / scores.post.out_of - 100 * scores.pre.score / scores.pre.out_of;
      gain = "Change: " + (g >= 0 ? "+" : "") + g.toFixed(1) + " percentage points (pre-registered goal: +10).";
    }
    var form = el("form", { class: "form pilot-box" }, [
      el("h3", { text: "Pilot study (only after ethics approval)", style: "margin:0" }),
      el("p", { class: "form-note", text: "Research downloads use the study code only - never the child's name. " +
        "Print the 12-question check, give it before and after the pilot, and enter the scores here." }),
      el("label", {}, ["Study code", code]),
      scoreRow("pre", "Pre-test"), scoreRow("post", "Post-test"),
      gain ? el("p", { class: "msg-ok", text: gain }) : null,
      el("div", { style: "display:flex;gap:8px;flex-wrap:wrap" }, [
        el("button", { class: "btn small", type: "submit", text: "Save pilot details" }),
        el("a", { class: "btn ghost small", href: "/pilot-test.html", target: "_blank", rel: "noopener", text: "Printable check" }),
        me.is_admin ? el("a", { class: "btn ghost small", href: "/api/pilot/export.csv", text: "Download de-identified data" }) : null
      ]),
      msg
    ]);
    form.addEventListener("submit", function (e) {
      e.preventDefault(); msg.className = "msg-err"; msg.textContent = "";
      var d = formData(form);
      var jobs = [api("PATCH", "/api/kids/" + k.id, { study_code: d.study_code.trim().toUpperCase() })];
      ["pre", "post"].forEach(function (ph) {
        if (d[ph + "_score"] !== "") jobs.push(api("POST", "/api/kids/" + k.id + "/pilot-score",
          { phase: ph, score: Number(d[ph + "_score"]), out_of: Number(d[ph + "_of"] || 12) }));
      });
      Promise.all(jobs).then(function () { msg.className = "msg-ok"; msg.textContent = "Saved."; showProgress(k.id); })
        .catch(function (x) { msg.textContent = x.message; });
    });
    return form;
  }

  function kidSignInSettings(k) {
    var msg = el("p", { class: "msg-err", role: "alert" });
    var pick = el("div", { class: "avatar-pick", role: "group", "aria-label": "Picture" });
    avatars.forEach(function (a) {
      var b = el("button", { type: "button", text: a, "aria-pressed": String(a === k.avatar), "aria-label": "picture " + a });
      b.addEventListener("click", function () {
        api("PATCH", "/api/kids/" + k.id, { avatar: a }).then(function () {
          k.avatar = a;
          Array.prototype.forEach.call(pick.children, function (c) { c.setAttribute("aria-pressed", String(c === b)); });
          msg.className = "msg-ok"; msg.textContent = "Picture saved.";
          loadKids();
        }).catch(function (x) { msg.className = "msg-err"; msg.textContent = x.message; });
      });
      pick.appendChild(b);
    });
    var pinInput = el("input", { name: "pin", inputmode: "numeric", pattern: "[0-9]{4}", maxlength: "4",
                                 autocomplete: "off", placeholder: "4 numbers", required: "" });
    var form = el("form", { class: "form", style: "margin-top:20px" }, [
      el("h3", { text: "Kid sign-in", style: "margin:0" }),
      el("p", { class: "form-note", text: k.nickname + " signs in by tapping their picture and typing a 4-number secret. " +
        (k.has_pin ? "A secret number is set - you can change it here." : "No secret number yet - set one so they can sign in.") }),
      el("label", {}, ["Picture", pick]),
      el("div", { class: "row" }, [el("label", {}, ["Secret number", pinInput]),
        el("div", { style: "align-self:end" }, [el("button", { class: "btn small", type: "submit", text: "Save secret number" })])]),
      msg
    ]);
    form.addEventListener("submit", function (e) {
      e.preventDefault(); msg.className = "msg-err"; msg.textContent = "";
      api("POST", "/api/kids/" + k.id + "/pin", { pin: pinInput.value }).then(function () {
        pinInput.value = ""; k.has_pin = true;
        msg.className = "msg-ok"; msg.textContent = "Saved! Tell " + k.nickname + " their secret number.";
        loadKids();
      }).catch(function (x) { msg.textContent = x.message; });
    });
    return form;
  }

  function assignForm(k) {
    var msg = el("p", { class: "msg-err", role: "alert" });
    var form = el("form", { class: "form", style: "margin-top:20px" }, [
      el("h3", { text: "Details (admin)", style: "margin:0" }),
      el("div", { class: "row" }, [
        el("label", {}, ["Name", el("input", { name: "nickname", value: k.nickname, maxlength: "40", required: "" })]),
        el("label", {}, ["Year level", select("year_level", YEARS, k.year_level)])
      ]),
      el("div", { class: "row" }, [
        el("label", {}, ["Parent", select("parent_id", peopleOptions("parent", "No parent"), k.parent_id)]),
        el("label", {}, ["Tutor", select("tutor_id", peopleOptions("tutor", "No tutor"), k.tutor_id)])
      ]),
      msg, el("button", { class: "btn small", type: "submit", text: "Save details" })
    ]);
    form.addEventListener("submit", function (e) {
      e.preventDefault(); msg.className = "msg-err"; msg.textContent = "";
      var d = formData(form);
      api("PATCH", "/api/kids/" + k.id, {
        nickname: d.nickname, year_level: d.year_level === "" ? null : Number(d.year_level),
        parent_id: d.parent_id ? Number(d.parent_id) : null, tutor_id: d.tutor_id ? Number(d.tutor_id) : null
      }).then(function () { msg.className = "msg-ok"; msg.textContent = "Saved."; loadKids(); })
        .catch(function (x) { msg.textContent = x.message; });
    });
    return form;
  }

  function deleteKid(k) {
    var typed = window.prompt("This permanently deletes " + k.nickname + "'s profile, learning history and all reports.\n\nType the name " + k.nickname + " to confirm:");
    if (typed === null) return;
    if (typed.trim() !== k.nickname) { window.alert("The name didn't match - nothing was deleted."); return; }
    api("DELETE", "/api/kids/" + k.id).then(function () {
      document.getElementById("detail").hidden = true;
      loadKids();
    }).catch(function (x) { window.alert(x.message); });
  }

  // ------------------------------------------------------------------ admin
  function renderUsers() {
    var t = document.getElementById("users-table");
    t.textContent = "";
    t.appendChild(el("tr", {}, [el("th", { text: "Name" }), el("th", { text: "Email" }), el("th", { text: "Role" }),
                                el("th", { text: "2-step" }), el("th", { text: "" })]));
    users.forEach(function (u) {
      t.appendChild(el("tr", {}, [
        el("td", { text: u.name }), el("td", { text: u.email }),
        el("td", { text: u.role + (u.is_admin ? " (admin)" : "") }),
        el("td", {}, [u.two_step ? el("span", { class: "pill on", text: "on" }) : el("span", { class: "pill off", text: "off" }),
          (u.two_step && u.id !== me.id) ? el("button", { class: "btn ghost small", type: "button", text: "Reset",
            onclick: function () {
              if (!window.confirm("Turn off 2-step sign-in for " + u.name + "? Only do this if they lost their phone.")) return;
              api("POST", "/api/users/" + u.id + "/2step/reset").then(loadAdmin).catch(function (x) { window.alert(x.message); });
            } }) : null]),
        el("td", {}, [el("button", {
          class: "btn ghost small", type: "button", text: "New password",
          onclick: function () {
            var pw = window.prompt("New starting password for " + u.name + " (at least 10 characters, upper- and lower-case letters and a number):");
            if (!pw) return;
            api("POST", "/api/users/" + u.id + "/password", { password: pw })
              .then(function () { window.alert("Done - share it with " + u.name + " privately. They're signed out everywhere until they use it."); })
              .catch(function (x) { window.alert(x.message); });
          } }), u.id === me.id ? null : el("button", {
          class: "btn ghost small", type: "button", text: "Remove",
          onclick: function () {
            if (!window.confirm("Remove " + u.name + "'s account? Their children stay, just unlinked.")) return;
            api("DELETE", "/api/users/" + u.id).then(loadAdmin).catch(function (x) { window.alert(x.message); });
          } })])
      ]));
    });
  }
  var EVENT_TEXT = {
    login: "Signed in", login_failed: "Wrong password", account_locked: "Account locked (too many wrong passwords)",
    "2step_failed": "Wrong 2-step code", "2step_on": "Turned on 2-step sign-in", "2step_off": "Turned off 2-step sign-in",
    "2step_reset_by_admin": "2-step reset by admin", logout: "Signed out", password_changed: "Changed password",
    password_reset_by_admin: "Password reset by admin", account_created: "Account created", account_deleted: "Account removed",
    admin_created: "Admin account created", child_added: "Child added", child_deleted: "Child's data deleted",
    kid_pin_set: "Child's secret number set", kid_pin_failed: "Child: wrong secret number", kid_signed_in: "Child signed in",
    kid_device_on: "Kid sign-in switched on for a device", blocked_cross_site: "Blocked a request from another website"
  };
  var BAD = { login_failed: 1, account_locked: 1, "2step_failed": 1, kid_pin_failed: 1, blocked_cross_site: 1 };
  function renderEvents(r) {
    var t = document.getElementById("events-table");
    if (!t) return;
    t.textContent = "";
    t.appendChild(el("tr", {}, ["When", "What", "Who", "Details", "From"].map(function (h) { return el("th", { text: h }); })));
    r.events.forEach(function (e) {
      var who = e.user_name ? e.user_name + " (" + e.user_email + ")" : (e.kid_name ? "child: " + e.kid_name : "-");
      t.appendChild(el("tr", {}, [
        el("td", { text: when(e.ts) }),
        el("td", { class: BAD[e.action] ? "ev-bad" : "", text: EVENT_TEXT[e.action] || e.action }),
        el("td", { text: who }), el("td", { text: e.detail || "" }), el("td", { text: e.ip || "" })
      ]));
    });
    if (!r.events.length) t.appendChild(el("tr", {}, [el("td", { text: "Nothing yet." })]));
  }

  function loadAdmin() {
    api("GET", "/api/admin/overview").then(function (r) {
      var c = r.counts, box = document.getElementById("overview");
      box.textContent = "";
      [[c.kids, "children"], [c.parents, "parents"], [c.tutors, "tutors"], [c.sessions_7d, "sessions this week"], [c.sessions, "sessions in total"]]
        .forEach(function (p) { box.appendChild(el("div", { class: "stat" }, [el("b", { text: String(p[0]) }), el("span", { text: p[1] })])); });
    }).catch(function () {});
    api("GET", "/api/admin/security-log").then(renderEvents).catch(function () {});
    return api("GET", "/api/users").then(function (r) { users = r.users; renderUsers(); return loadKids(); });
  }
  var userForm = document.getElementById("user-form");
  if (userForm) userForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var err = document.getElementById("user-err"); err.textContent = "";
    api("POST", "/api/users", formData(userForm)).then(function () { userForm.reset(); return loadAdmin(); })
      .catch(function (x) { err.textContent = x.message; });
  });

  // ------------------------------------------------------------------ account
  document.getElementById("btn-logout").addEventListener("click", function () {
    api("POST", "/api/auth/logout").then(function () { window.location.href = "/login.html"; });
  });
  var dlg = document.getElementById("pw-dialog"), pwForm = document.getElementById("pw-form");
  document.getElementById("btn-password").addEventListener("click", function () { pwForm.reset(); dlg.showModal(); });
  document.getElementById("pw-cancel").addEventListener("click", function () { dlg.close(); });
  pwForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var err = document.getElementById("pw-err"); err.textContent = "";
    api("POST", "/api/auth/password", formData(pwForm)).then(function () { dlg.close(); window.alert("Password changed."); })
      .catch(function (x) { err.textContent = x.message; });
  });

  // ------------------------------------------------------------------ kid device
  var deviceOn = false;
  function paintDevice() {
    var st = document.getElementById("device-state"), btn = document.getElementById("btn-device");
    st.textContent = deviceOn ? "on" : "off";
    st.className = "pill " + (deviceOn ? "on" : "off");
    btn.textContent = deviceOn ? "Switch off kid sign-in here" : "Let kids sign in on this device";
  }
  document.getElementById("btn-device").addEventListener("click", function () {
    var turnOn = !deviceOn;
    api(turnOn ? "POST" : "DELETE", "/api/kid/device").then(function () {
      deviceOn = turnOn; paintDevice();
      if (turnOn && window.confirm("Kid sign-in is on for this device. Go to the kids' sign-in page now? (You'll be signed out when your child signs in.)")) {
        window.location.href = "/kid.html";
      }
    }).catch(function (x) { window.alert(x.message); });
  });

  // ------------------------------------------------------------------ 2-step sign-in
  var tsDlg = document.getElementById("twostep-dialog"), tsForm = document.getElementById("twostep-form");
  function paintTwoStep() {
    var on = !!(me && me.two_step);
    var st = document.getElementById("twostep-state");
    st.textContent = on ? "on" : "off"; st.className = "pill " + (on ? "on" : "off");
    document.getElementById("btn-twostep").textContent = on ? "Turn off 2-step sign-in" : "Turn on 2-step sign-in";
    if (me && me.is_admin && !on) {
      document.getElementById("twostep-note").textContent =
        "Strongly recommended for the admin: your account can see every family. Adds a 6-digit code from an authenticator app when you sign in.";
    }
  }
  document.getElementById("btn-twostep").addEventListener("click", function () {
    if (me.two_step) {
      var pw = window.prompt("To turn off 2-step sign-in, type your password:");
      if (!pw) return;
      var code = window.prompt("And the current 6-digit code from your authenticator app:");
      if (!code) return;
      api("POST", "/api/auth/2step/off", { password: pw, code: code })
        .then(function () { me.two_step = false; paintTwoStep(); })
        .catch(function (x) { window.alert(x.message); });
      return;
    }
    api("POST", "/api/auth/2step/start").then(function (r) {
      document.getElementById("twostep-secret").textContent = r.secret.replace(/(.{4})/g, "$1 ").trim();
      document.getElementById("twostep-link").href = r.uri;
      document.getElementById("twostep-err").textContent = "";
      tsForm.hidden = false; tsForm.reset();
      document.getElementById("twostep-done").hidden = true;
      tsDlg.showModal();
    }).catch(function (x) { window.alert(x.message); });
  });
  document.getElementById("twostep-cancel").addEventListener("click", function () { tsDlg.close(); });
  document.getElementById("twostep-close").addEventListener("click", function () { tsDlg.close(); });
  tsForm.addEventListener("submit", function (e) {
    e.preventDefault();
    api("POST", "/api/auth/2step/confirm", { code: formData(tsForm).code }).then(function (r) {
      me.two_step = true; paintTwoStep();
      tsForm.hidden = true;
      document.getElementById("twostep-codes").textContent = r.recovery_codes.join("\n");
      document.getElementById("twostep-done").hidden = false;
      if (me.is_admin) loadAdmin();
    }).catch(function (x) { document.getElementById("twostep-err").textContent = x.message; });
  });

  // ------------------------------------------------------------------ boot
  api("GET", "/api/auth/me").then(function (r) {
    me = r.user;
    if (r.home && r.home.indexOf(page) === -1) { window.location.replace(r.home); throw new Error("wrong page"); }
    deviceOn = !!r.kid_device; paintDevice(); paintTwoStep();
    document.getElementById("whoami").textContent =
      "Signed in as " + me.name + " · " + (me.role === "parent" ? "Parent" : (me.is_admin ? "Tutor (admin)" : "Tutor"));
    if (me.is_admin) return loadAdmin();
    return loadKids();
  }).then(function () {
    var m = /[?&]kid=(\d+)/.exec(window.location.search);
    if (m) showProgress(Number(m[1]));
  });
})();
