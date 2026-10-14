/* Welcome page: already signed in? go straight to the right place. */
    // already signed in? go straight to the right place
    fetch("/api/auth/status", { credentials: "same-origin" }).then(function (r) { return r.json(); })
      .then(function (s) {
        if (s.needs_setup) { window.location.replace("/staff-login.html"); return; }
        if (s.kid_signed_in) { window.location.replace("/"); return; }
        if (s.signed_in && s.home) { window.location.replace(s.home); }
      }).catch(function () {});
