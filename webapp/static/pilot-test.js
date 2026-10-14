/* Printable pilot check: child copy + grown-up answer key (tutors/admin only). */
(function () {
  "use strict";
  document.getElementById("btn-print").addEventListener("click", function () { window.print(); });
  fetch("/api/pilot/form", { credentials: "same-origin" }).then(function (r) {
    if (!r.ok) throw new Error("Only tutors and the admin can open the pilot check.");
    return r.json();
  }).then(function (d) {
    var kids = document.getElementById("child-items"), key = document.getElementById("key-items");
    d.items.forEach(function (it) {
      var li = document.createElement("li");
      li.textContent = it.q;
      var space = document.createElement("div");
      space.className = "answer-space";
      li.appendChild(space);
      kids.appendChild(li);
      var k = document.createElement("li");
      k.textContent = it.q + "  →  " + it.answer;
      key.appendChild(k);
    });
    document.getElementById("out-of").textContent = String(d.items.length);
  }).catch(function (e) { document.body.textContent = e.message; });
})();
