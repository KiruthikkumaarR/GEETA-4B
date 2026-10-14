/* GEETA kid "worlds": each one is a buddy (animated SVG mascot), a background
 * scene, colours and celebration confetti. The kid picks one; it's saved on
 * their profile. Shared animation hooks in every mascot (styled in worlds.css):
 *   .m-bob    whole body (idle bob / think tilt / cheer bounce)
 *   .m-eyes   blink
 *   .m-think  thought bubble (shown while thinking)
 *   .m-cheer  sparkles (shown while celebrating)
 *   .m-arm-l/.m-arm-r, .m-wheel, .m-flame, .m-puff, .m-tail, .m-tentacle  extra moves
 * All art is original, hand-written SVG - nothing loaded from elsewhere. */
(function () {
  "use strict";

  // thought bubble + sparkles shared by every buddy (positioned top-right)
  function think(fill, ink) {
    return '<g class="m-think">' +
      '<circle cx="158" cy="44" r="5" fill="' + fill + '" stroke="' + ink + '" stroke-width="2.5"/>' +
      '<circle cx="168" cy="30" r="7" fill="' + fill + '" stroke="' + ink + '" stroke-width="2.5"/>' +
      '<rect x="166" y="0" width="34" height="26" rx="13" fill="' + fill + '" stroke="' + ink + '" stroke-width="2.5"/>' +
      '<text x="183" y="19" text-anchor="middle" font-size="17" font-weight="900" fill="' + ink + '">?</text></g>';
  }
  function cheer(c1, c2) {
    var star = function (x, y, s, c, cls) {
      return '<path class="m-spark ' + cls + '" transform="translate(' + x + ' ' + y + ') scale(' + s + ')" ' +
        'd="M0 -10 L2.6 -2.6 L10 0 L2.6 2.6 L0 10 L-2.6 2.6 L-10 0 L-2.6 -2.6 Z" fill="' + c + '"/>';
    };
    return '<g class="m-cheer">' + star(26, 40, 1.2, c1, "s1") + star(178, 66, 1, c2, "s2") +
      star(100, 8, 0.9, c1, "s3") + star(170, 150, 1.1, c2, "s4") + star(24, 132, 0.8, c2, "s2") + '</g>';
  }
  function eyes(lx, rx, y, r, ink) {
    return '<g class="m-eyes">' +
      '<circle cx="' + lx + '" cy="' + y + '" r="' + r + '" fill="' + ink + '"/>' +
      '<circle cx="' + rx + '" cy="' + y + '" r="' + r + '" fill="' + ink + '"/>' +
      '<circle cx="' + (lx + r * 0.35) + '" cy="' + (y - r * 0.4) + '" r="' + r * 0.36 + '" fill="#fff"/>' +
      '<circle cx="' + (rx + r * 0.35) + '" cy="' + (y - r * 0.4) + '" r="' + r * 0.36 + '" fill="#fff"/></g>';
  }
  function svg(id, inner, defs) {
    return '<svg class="buddy" viewBox="0 0 200 200" aria-hidden="true" focusable="false">' +
      '<defs>' + (defs || "") + '</defs>' +
      '<ellipse class="m-shadow" cx="100" cy="192" rx="54" ry="7"/>' + inner + '</svg>';
  }
  function grad(id, a, b, radial) {
    return radial
      ? '<radialGradient id="' + id + '" cx="40%" cy="35%" r="75%"><stop offset="0" stop-color="' + a + '"/><stop offset="1" stop-color="' + b + '"/></radialGradient>'
      : '<linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + a + '"/><stop offset="1" stop-color="' + b + '"/></linearGradient>';
  }

  // ---------------------------------------------------------------- buddies
  var TEDDY = svg("teddy",
    '<g class="m-bob">' +
      // feet
      '<ellipse cx="72" cy="182" rx="20" ry="11" fill="url(#tdFur)" stroke="#5b3a22" stroke-width="3"/>' +
      '<ellipse cx="128" cy="182" rx="20" ry="11" fill="url(#tdFur)" stroke="#5b3a22" stroke-width="3"/>' +
      '<ellipse cx="72" cy="182" rx="10" ry="6" fill="#f4d9b8"/><ellipse cx="128" cy="182" rx="10" ry="6" fill="#f4d9b8"/>' +
      // body + tummy
      '<ellipse cx="100" cy="145" rx="46" ry="40" fill="url(#tdFur)" stroke="#5b3a22" stroke-width="3"/>' +
      '<ellipse cx="100" cy="152" rx="27" ry="24" fill="#f4d9b8"/>' +
      // arms
      '<g class="m-arm-l"><ellipse cx="56" cy="138" rx="14" ry="24" transform="rotate(28 56 138)" fill="url(#tdFur)" stroke="#5b3a22" stroke-width="3"/></g>' +
      '<g class="m-arm-r"><ellipse cx="144" cy="138" rx="14" ry="24" transform="rotate(-28 144 138)" fill="url(#tdFur)" stroke="#5b3a22" stroke-width="3"/></g>' +
      // ears
      '<circle cx="60" cy="44" r="21" fill="url(#tdFur)" stroke="#5b3a22" stroke-width="3"/><circle cx="60" cy="44" r="11" fill="#f4c7a6"/>' +
      '<circle cx="140" cy="44" r="21" fill="url(#tdFur)" stroke="#5b3a22" stroke-width="3"/><circle cx="140" cy="44" r="11" fill="#f4c7a6"/>' +
      // head
      '<ellipse cx="100" cy="76" rx="51" ry="45" fill="url(#tdFur)" stroke="#5b3a22" stroke-width="3"/>' +
      '<ellipse cx="100" cy="94" rx="23" ry="17" fill="#f4d9b8"/>' +
      '<ellipse cx="74" cy="92" rx="8" ry="5" fill="#ff9aa2" opacity=".55"/><ellipse cx="126" cy="92" rx="8" ry="5" fill="#ff9aa2" opacity=".55"/>' +
      eyes(82, 118, 72, 6.5, "#2b1a0e") +
      '<ellipse cx="100" cy="87" rx="8" ry="5.5" fill="#3b2414"/><ellipse cx="97" cy="85.5" rx="2.5" ry="1.5" fill="#fff" opacity=".7"/>' +
      '<path class="m-mouth" d="M100 92 q-7 10 -14 4 M100 92 q7 10 14 4" fill="none" stroke="#3b2414" stroke-width="3" stroke-linecap="round"/>' +
      // red bow tie
      '<path d="M100 120 l-16 -9 v18 z M100 120 l16 -9 v18 z" fill="#e8484f" stroke="#7a1d22" stroke-width="2.5" stroke-linejoin="round"/>' +
      '<circle cx="100" cy="120" r="5" fill="#ff6b6f" stroke="#7a1d22" stroke-width="2.5"/>' +
    '</g>' + think("#fff", "#5b3a22") + cheer("#ff6b8a", "#ffc94d"),
    grad("tdFur", "#d79a63", "#a8693a", true));

  var CAR = svg("car",
    '<g class="m-bob">' +
      '<g class="m-puff"><circle cx="16" cy="140" r="9" fill="#d9dde8"/><circle cx="6" cy="128" r="6" fill="#e8ebf2"/></g>' +
      // spoiler
      '<path d="M30 88 h26 v10 h-8 v14 h-8 v-14 h-10 z" fill="#2a2d3e"/>' +
      // body
      '<path d="M24 150 C22 124 34 112 58 108 L78 104 C88 80 104 70 128 70 C148 70 160 84 168 104 C184 108 192 120 190 150 Z" fill="url(#carBody)" stroke="#7a0f17" stroke-width="3.5" stroke-linejoin="round"/>' +
      // racing stripe + number
      '<path d="M28 132 H188" stroke="#fff" stroke-width="7" opacity=".9"/><path d="M28 132 H188" stroke="#ffd23f" stroke-width="3"/>' +
      '<circle cx="62" cy="128" r="14" fill="#fff" stroke="#7a0f17" stroke-width="3"/><text x="62" y="134" text-anchor="middle" font-size="17" font-weight="900" fill="#d7262b">7</text>' +
      // windshield face
      '<path d="M92 104 C98 86 110 80 128 80 C144 80 154 90 160 104 Z" fill="url(#carGlass)" stroke="#7a0f17" stroke-width="3"/>' +
      '<g class="m-eyes"><ellipse cx="116" cy="94" rx="9" ry="10" fill="#fff"/><ellipse cx="142" cy="94" rx="9" ry="10" fill="#fff"/>' +
      '<circle cx="118" cy="95" r="5" fill="#1d2033"/><circle cx="144" cy="95" r="5" fill="#1d2033"/>' +
      '<circle cx="119.5" cy="93" r="1.8" fill="#fff"/><circle cx="145.5" cy="93" r="1.8" fill="#fff"/></g>' +
      // grin on the front bumper + headlight
      '<path class="m-mouth" d="M162 128 q12 10 24 0" fill="none" stroke="#7a0f17" stroke-width="3.5" stroke-linecap="round"/>' +
      '<ellipse cx="184" cy="116" rx="5" ry="7" fill="#fff6c2" stroke="#7a0f17" stroke-width="2.5"/>' +
      // wheels
      '<g class="m-wheel" style="transform-origin:60px 154px"><circle cx="60" cy="154" r="22" fill="#1d2033"/><circle cx="60" cy="154" r="11" fill="#c9cede"/>' +
        '<path d="M60 143 V165 M49 154 H71" stroke="#1d2033" stroke-width="3"/></g>' +
      '<g class="m-wheel" style="transform-origin:156px 154px"><circle cx="156" cy="154" r="22" fill="#1d2033"/><circle cx="156" cy="154" r="11" fill="#c9cede"/>' +
        '<path d="M156 143 V165 M145 154 H167" stroke="#1d2033" stroke-width="3"/></g>' +
    '</g>' +
    // checkered flag (celebrate)
    '<g class="m-cheer"><path d="M150 10 V60" stroke="#2a2d3e" stroke-width="4"/>' +
      '<path d="M152 12 h36 v24 h-36 z" fill="#fff" stroke="#2a2d3e" stroke-width="2.5"/>' +
      '<path d="M152 12 h9 v8 h-9z M170 12 h9 v8 h-9z M161 20 h9 v8 h-9z M179 20 h9 v8 h-9z M152 28 h9 v8 h-9z M170 28 h9 v8 h-9z" fill="#2a2d3e"/>' +
      '<path class="m-spark s1" transform="translate(30 60)" d="M0 -10 L2.6 -2.6 L10 0 L2.6 2.6 L0 10 L-2.6 2.6 L-10 0 L-2.6 -2.6 Z" fill="#ffd23f"/></g>' +
    think("#fff", "#2a2d3e"),
    grad("carBody", "#ff6a55", "#d01f2b") + grad("carGlass", "#d9f2ff", "#7cc6ff"));

  var ROCKET = svg("rocket",
    '<g class="m-flame"><path d="M84 160 Q100 206 116 160 Z" fill="#ffb627"/><path d="M91 160 Q100 190 109 160 Z" fill="#fff1a8"/></g>' +
    '<g class="m-bob">' +
      // fins
      '<path d="M66 118 C46 128 40 150 42 166 L72 150 Z" fill="#ff5d73" stroke="#3b1f5e" stroke-width="3" stroke-linejoin="round"/>' +
      '<path d="M134 118 C154 128 160 150 158 166 L128 150 Z" fill="#ff5d73" stroke="#3b1f5e" stroke-width="3" stroke-linejoin="round"/>' +
      // body
      '<path d="M100 8 C130 30 140 70 136 116 L132 160 H68 L64 116 C60 70 70 30 100 8 Z" fill="url(#rkBody)" stroke="#3b1f5e" stroke-width="3.5" stroke-linejoin="round"/>' +
      '<path d="M100 8 C116 20 126 36 130 52 H70 C74 36 84 20 100 8 Z" fill="#ff5d73" stroke="#3b1f5e" stroke-width="3" stroke-linejoin="round"/>' +
      '<rect x="66" y="150" width="68" height="12" rx="4" fill="#9aa3c7" stroke="#3b1f5e" stroke-width="3"/>' +
      // porthole face
      '<circle cx="100" cy="94" r="30" fill="#bfe6ff" stroke="#3b1f5e" stroke-width="4"/>' +
      '<circle cx="100" cy="94" r="24" fill="url(#rkGlass)"/>' +
      eyes(89, 111, 89, 5, "#1d1640") +
      '<path class="m-mouth" d="M89 102 q11 10 22 0" fill="none" stroke="#1d1640" stroke-width="3" stroke-linecap="round"/>' +
      '<ellipse cx="81" cy="99" rx="5" ry="3" fill="#ff9ab5" opacity=".7"/><ellipse cx="119" cy="99" rx="5" ry="3" fill="#ff9ab5" opacity=".7"/>' +
      '<path d="M100 130 v18" stroke="#3b1f5e" stroke-width="3" stroke-linecap="round"/>' +
    '</g>' + think("#fff", "#3b1f5e") + cheer("#ffe066", "#8be9ff"),
    grad("rkBody", "#ffffff", "#d7dcf2") + grad("rkGlass", "#e8f7ff", "#8fd3ff", true));

  var DINO = svg("dino",
    '<g class="m-bob">' +
      '<g class="m-tail" style="transform-origin:62px 150px"><path d="M66 140 C40 146 20 160 8 178 C30 176 52 170 70 160 Z" fill="url(#dnSkin)" stroke="#1f5b3a" stroke-width="3" stroke-linejoin="round"/></g>' +
      // legs
      '<path d="M70 160 v22 h22 v-22 z M112 160 v22 h22 v-22 z" fill="url(#dnSkin)" stroke="#1f5b3a" stroke-width="3" stroke-linejoin="round"/>' +
      '<path d="M70 182 h22 M112 182 h22" stroke="#1f5b3a" stroke-width="3"/>' +
      // back spikes
      '<path d="M78 92 l8 -14 l8 12 l8 -14 l8 13 l8 -13 l6 12" fill="#ffb347" stroke="#1f5b3a" stroke-width="3" stroke-linejoin="round"/>' +
      // body
      '<ellipse cx="102" cy="132" rx="44" ry="42" fill="url(#dnSkin)" stroke="#1f5b3a" stroke-width="3"/>' +
      '<ellipse cx="110" cy="140" rx="26" ry="28" fill="#cff3b8"/>' +
      '<path d="M96 128 h28 M98 140 h26 M100 152 h22" stroke="#9ed986" stroke-width="3" stroke-linecap="round"/>' +
      // tiny arms
      '<g class="m-arm-l"><path d="M136 120 q16 2 16 12" fill="none" stroke="#1f5b3a" stroke-width="9" stroke-linecap="round"/><path d="M136 120 q16 2 16 12" fill="none" stroke="#5fcf7a" stroke-width="5" stroke-linecap="round"/></g>' +
      // head
      '<path d="M84 40 C100 18 150 18 170 38 C184 52 182 76 168 84 C150 94 108 94 92 84 C78 74 74 54 84 40 Z" fill="url(#dnSkin)" stroke="#1f5b3a" stroke-width="3" stroke-linejoin="round"/>' +
      eyes(112, 142, 50, 6.5, "#123a24") +
      '<ellipse cx="160" cy="60" rx="2.5" ry="2" fill="#1f5b3a"/><ellipse cx="168" cy="58" rx="2.5" ry="2" fill="#1f5b3a"/>' +
      '<path class="m-mouth" d="M110 72 q30 14 58 -4" fill="none" stroke="#1f5b3a" stroke-width="3.5" stroke-linecap="round"/>' +
      '<path d="M122 76 l3 6 l3 -5 M146 75 l3 6 l3 -6" fill="#fff" stroke="#1f5b3a" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<ellipse cx="104" cy="66" rx="7" ry="4" fill="#ff9aa2" opacity=".6"/>' +
    '</g>' + think("#fff", "#1f5b3a") + cheer("#ffb347", "#ffe066"),
    grad("dnSkin", "#7fe08f", "#3fae5e", true));

  var UNICORN = svg("unicorn",
    '<g class="m-bob">' +
      // body + legs
      '<path d="M66 150 v28 h16 v-24 M118 150 v28 h16 v-28" fill="#fff" stroke="#6b4c9a" stroke-width="3" stroke-linejoin="round"/>' +
      '<path d="M66 178 h16 M118 178 h16" stroke="#c9a7ff" stroke-width="6"/>' +
      '<ellipse cx="100" cy="138" rx="46" ry="30" fill="url(#unBody)" stroke="#6b4c9a" stroke-width="3"/>' +
      // tail
      '<g class="m-tail" style="transform-origin:56px 132px"><path d="M56 128 C30 120 24 146 34 160 C38 146 46 140 58 140 Z" fill="#ff8fc7" stroke="#6b4c9a" stroke-width="3" stroke-linejoin="round"/>' +
        '<path d="M50 132 C38 134 34 144 38 152" fill="none" stroke="#8fd3ff" stroke-width="5" stroke-linecap="round"/></g>' +
      // neck + head
      '<path d="M112 120 C112 96 116 80 124 66 L150 74 C146 92 144 108 140 128 Z" fill="url(#unBody)" stroke="#6b4c9a" stroke-width="3" stroke-linejoin="round"/>' +
      '<path d="M118 40 C140 30 168 40 176 62 C182 78 172 92 156 92 C140 92 120 84 114 68 C110 56 110 46 118 40 Z" fill="url(#unBody)" stroke="#6b4c9a" stroke-width="3" stroke-linejoin="round"/>' +
      '<ellipse cx="166" cy="78" rx="12" ry="10" fill="#ffd3ea"/><ellipse cx="164" cy="76" rx="2" ry="1.6" fill="#6b4c9a"/><ellipse cx="172" cy="76" rx="2" ry="1.6" fill="#6b4c9a"/>' +
      // horn
      '<g class="m-horn"><path d="M136 38 L150 2 L154 42 Z" fill="url(#unHorn)" stroke="#b07a10" stroke-width="2.5" stroke-linejoin="round"/>' +
        '<path d="M140 30 l12 -3 M143 20 l9 -3 M146 11 l6 -2" stroke="#b07a10" stroke-width="2"/></g>' +
      // ear
      '<path d="M124 42 l-2 -18 l14 12 z" fill="#fff" stroke="#6b4c9a" stroke-width="2.5" stroke-linejoin="round"/>' +
      // rainbow mane
      '<path d="M124 40 C108 44 104 60 108 74 C112 90 108 104 112 118" fill="none" stroke="#ff8fc7" stroke-width="9" stroke-linecap="round"/>' +
      '<path d="M120 46 C112 56 112 70 116 82 C120 96 116 106 118 116" fill="none" stroke="#ffd36e" stroke-width="6" stroke-linecap="round"/>' +
      '<path d="M128 50 C120 62 122 76 124 88" fill="none" stroke="#8fd3ff" stroke-width="5" stroke-linecap="round"/>' +
      eyes(138, 156, 60, 5.5, "#3a2560") +
      '<path d="M134 52 l-4 -4 M152 52 l-2 -5 M138 52 l-2 -5" stroke="#3a2560" stroke-width="2" stroke-linecap="round"/>' +
      '<path class="m-mouth" d="M156 86 q6 4 12 0" fill="none" stroke="#6b4c9a" stroke-width="2.5" stroke-linecap="round"/>' +
      '<ellipse cx="146" cy="74" rx="6" ry="3.5" fill="#ff9ac8" opacity=".7"/>' +
    '</g>' + think("#fff", "#6b4c9a") + cheer("#ff8fc7", "#ffd36e"),
    grad("unBody", "#ffffff", "#efe4ff", true) + grad("unHorn", "#fff3b0", "#ffc83d"));

  var OCTO = svg("octo",
    '<g class="m-bob">' +
      // tentacles
      '<g class="m-tentacle t1" style="transform-origin:62px 132px"><path d="M66 128 C46 140 34 160 40 178 C46 186 56 180 54 170 C52 158 62 148 74 142 Z" fill="url(#ocSkin)" stroke="#5a2a7a" stroke-width="3"/></g>' +
      '<g class="m-tentacle t2" style="transform-origin:84px 140px"><path d="M82 138 C76 156 74 172 82 186 C90 192 96 184 92 176 C88 166 92 152 98 144 Z" fill="url(#ocSkin)" stroke="#5a2a7a" stroke-width="3"/></g>' +
      '<g class="m-tentacle t3" style="transform-origin:116px 140px"><path d="M118 138 C124 156 126 172 118 186 C110 192 104 184 108 176 C112 166 108 152 102 144 Z" fill="url(#ocSkin)" stroke="#5a2a7a" stroke-width="3"/></g>' +
      '<g class="m-tentacle t4" style="transform-origin:138px 132px"><path d="M134 128 C154 140 166 160 160 178 C154 186 144 180 146 170 C148 158 138 148 126 142 Z" fill="url(#ocSkin)" stroke="#5a2a7a" stroke-width="3"/></g>' +
      '<circle cx="48" cy="170" r="3" fill="#ffd1f0"/><circle cx="88" cy="176" r="3" fill="#ffd1f0"/><circle cx="112" cy="176" r="3" fill="#ffd1f0"/><circle cx="152" cy="170" r="3" fill="#ffd1f0"/>' +
      // head dome
      '<path d="M44 108 C40 56 66 24 100 24 C134 24 160 56 156 108 C154 132 130 146 100 146 C70 146 46 132 44 108 Z" fill="url(#ocSkin)" stroke="#5a2a7a" stroke-width="3.5"/>' +
      '<ellipse cx="78" cy="52" rx="14" ry="8" fill="#fff" opacity=".35" transform="rotate(-25 78 52)"/>' +
      '<circle cx="128" cy="50" r="5" fill="#d68ae8"/><circle cx="140" cy="66" r="3.5" fill="#d68ae8"/>' +
      '<g class="m-eyes"><circle cx="80" cy="96" r="13" fill="#fff" stroke="#5a2a7a" stroke-width="2.5"/><circle cx="120" cy="96" r="13" fill="#fff" stroke="#5a2a7a" stroke-width="2.5"/>' +
        '<circle cx="82" cy="98" r="7" fill="#2a1240"/><circle cx="122" cy="98" r="7" fill="#2a1240"/>' +
        '<circle cx="84.5" cy="95" r="2.5" fill="#fff"/><circle cx="124.5" cy="95" r="2.5" fill="#fff"/></g>' +
      '<path class="m-mouth" d="M90 118 q10 10 20 0" fill="none" stroke="#5a2a7a" stroke-width="3" stroke-linecap="round"/>' +
      '<ellipse cx="66" cy="114" rx="7" ry="4" fill="#ff8fb8" opacity=".6"/><ellipse cx="134" cy="114" rx="7" ry="4" fill="#ff8fb8" opacity=".6"/>' +
    '</g>' + think("#fff", "#5a2a7a") +
    '<g class="m-cheer"><circle class="m-spark s1" cx="30" cy="60" r="7" fill="none" stroke="#9fe7ff" stroke-width="2.5"/>' +
      '<circle class="m-spark s2" cx="172" cy="80" r="9" fill="none" stroke="#9fe7ff" stroke-width="2.5"/>' +
      '<circle class="m-spark s3" cx="160" cy="24" r="5" fill="none" stroke="#9fe7ff" stroke-width="2.5"/>' +
      '<circle class="m-spark s4" cx="24" cy="120" r="5" fill="none" stroke="#9fe7ff" stroke-width="2.5"/></g>',
    grad("ocSkin", "#e7a6ff", "#a95fd6", true));

  // ---------------------------------------------------------------- scenes
  // Wide background art (fills the window behind the page, bottom-anchored).
  function sceneSvg(inner, defs) {
    return '<svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">' +
      '<defs>' + (defs || "") + '</defs>' + inner + '</svg>';
  }
  function cloud(x, y, s, fill) {
    return '<g class="sc-cloud" transform="translate(' + x + ' ' + y + ') scale(' + s + ')" fill="' + (fill || "#fff") + '">' +
      '<ellipse cx="0" cy="0" rx="60" ry="26"/><ellipse cx="-40" cy="8" rx="38" ry="20"/><ellipse cx="44" cy="8" rx="42" ry="20"/><ellipse cx="6" cy="-18" rx="36" ry="24"/></g>';
  }
  function stars(n, seed, w, h, color) {
    var out = "", r = seed;
    function rnd() { r = (r * 9301 + 49297) % 233280; return r / 233280; }
    for (var i = 0; i < n; i++) {
      out += '<circle class="sc-twinkle" style="animation-delay:' + (rnd() * 4).toFixed(2) + 's" cx="' + (rnd() * w).toFixed(0) +
        '" cy="' + (rnd() * h).toFixed(0) + '" r="' + (0.8 + rnd() * 2.2).toFixed(1) + '" fill="' + color + '"/>';
    }
    return out;
  }
  function flowers(n, seed, y0, y1) {
    var out = "", r = seed, cols = ["#ff8fb1", "#ffd36e", "#ffffff", "#b49cff"];
    function rnd() { r = (r * 9301 + 49297) % 233280; return r / 233280; }
    for (var i = 0; i < n; i++) {
      var x = rnd() * 1440, y = y0 + rnd() * (y1 - y0), c = cols[i % cols.length];
      out += '<g transform="translate(' + x.toFixed(0) + ' ' + y.toFixed(0) + ')"><circle r="5" cx="-5" fill="' + c + '"/><circle r="5" cx="5" fill="' + c + '"/>' +
        '<circle r="5" cy="-5" fill="' + c + '"/><circle r="5" cy="5" fill="' + c + '"/><circle r="3.5" fill="#ffb627"/></g>';
    }
    return out;
  }

  var SCENES = {
    teddy: sceneSvg(
      '<rect width="1440" height="900" fill="url(#tdSky)"/>' +
      '<circle cx="1220" cy="140" r="70" fill="#ffe27a"/><circle cx="1220" cy="140" r="100" fill="#ffe27a" opacity=".25"/>' +
      cloud(220, 150, 1.2) + cloud(760, 100, .9) + cloud(1040, 230, .7) +
      '<path d="M0 640 C240 560 420 600 620 640 C860 690 1080 560 1440 600 V900 H0 Z" fill="#a8e08a"/>' +
      '<path d="M0 720 C300 660 560 720 820 700 C1080 680 1260 640 1440 680 V900 H0 Z" fill="#86cf6b"/>' +
      flowers(26, 7, 700, 880) +
      // picnic blanket
      '<g transform="translate(1040 760) skewX(-20)"><rect width="300" height="110" fill="#ff7a8a"/>' +
      '<path d="M0 22 H300 M0 55 H300 M0 88 H300 M50 0 V110 M110 0 V110 M170 0 V110 M230 0 V110" stroke="#fff" stroke-width="12" opacity=".75"/></g>',
      '<linearGradient id="tdSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe9c7"/><stop offset=".6" stop-color="#ffe0ec"/><stop offset="1" stop-color="#fff4e6"/></linearGradient>'),

    car: sceneSvg(
      '<rect width="1440" height="900" fill="url(#crSky)"/>' +
      cloud(260, 130, 1) + cloud(980, 90, .8) + cloud(1280, 200, .6) +
      '<path d="M0 560 C200 470 380 500 560 540 C760 590 980 470 1200 500 C1320 515 1400 540 1440 550 V900 H0 Z" fill="#9ed6a0"/>' +
      // grandstand flags
      '<g stroke="#4b4f63" stroke-width="4">' +
        '<path d="M180 560 V470"/><path d="M420 560 V480"/><path d="M1100 540 V450"/><path d="M1320 560 V470"/></g>' +
      '<path d="M182 472 l46 14 l-46 14z" fill="#ff5a4e"/><path d="M422 482 l46 14 l-46 14z" fill="#ffd23f"/>' +
      '<path d="M1102 452 l46 14 l-46 14z" fill="#4da3ff"/><path d="M1322 472 l46 14 l-46 14z" fill="#ff5a4e"/>' +
      // track
      '<path d="M0 640 C360 600 1080 600 1440 640 V900 H0 Z" fill="#4b4f63"/>' +
      '<path d="M0 640 C360 600 1080 600 1440 640" fill="none" stroke="url(#crKerbP)" stroke-width="18"/>' +
      '<path class="sc-road" d="M0 770 H1440" stroke="#fff" stroke-width="10" stroke-dasharray="70 60"/>' +
      // checkered finish strip
      '<g transform="translate(860 640)">' +
      '<rect width="60" height="260" fill="#fff"/>' +
      '<path d="M0 0h20v20H0zM40 0h20v20H40zM20 20h20v20H20zM0 40h20v20H0zM40 40h20v20H40zM20 60h20v20H20zM0 80h20v20H0zM40 80h20v20H40zM20 100h20v20H20zM0 120h20v20H0zM40 120h20v20H40zM20 140h20v20H20zM0 160h20v20H0zM40 160h20v20H40zM20 180h20v20H20zM0 200h20v20H0zM40 200h20v20H40zM20 220h20v20H20zM0 240h20v20H0zM40 240h20v20H40z" fill="#1d2033"/></g>',
      '<linearGradient id="crSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fd3ff"/><stop offset="1" stop-color="#e3f6ff"/></linearGradient>' +
      '<pattern id="crKerbP" width="80" height="18" patternUnits="userSpaceOnUse"><rect width="40" height="18" fill="#ff5a4e"/><rect x="40" width="40" height="18" fill="#fff"/></pattern>' +
      ''),

    space: sceneSvg(
      '<rect width="1440" height="900" fill="url(#spSky)"/>' +
      stars(140, 11, 1440, 900, "#fff") +
      '<circle cx="1180" cy="200" r="90" fill="url(#spPlanet)"/>' +
      '<ellipse cx="1180" cy="200" rx="150" ry="28" fill="none" stroke="#ffd36e" stroke-width="10" opacity=".85" transform="rotate(-15 1180 200)"/>' +
      '<circle cx="240" cy="260" r="40" fill="#ff8fb1"/><circle cx="226" cy="248" r="8" fill="#ff6f9c"/><circle cx="252" cy="274" r="6" fill="#ff6f9c"/>' +
      '<circle class="sc-shoot" cx="0" cy="0" r="3" fill="#fff"/>' +
      '<path d="M0 760 C300 700 520 760 760 740 C1000 720 1200 680 1440 720 V900 H0 Z" fill="#3a2a74"/>' +
      '<ellipse cx="420" cy="800" rx="60" ry="14" fill="#2a1f5a"/><ellipse cx="1060" cy="780" rx="80" ry="16" fill="#2a1f5a"/>',
      '<linearGradient id="spSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0f0b2e"/><stop offset=".7" stop-color="#2a1c63"/><stop offset="1" stop-color="#4b2f8a"/></linearGradient>' +
      '<radialGradient id="spPlanet" cx="35%" cy="35%" r="70%"><stop offset="0" stop-color="#8fe0ff"/><stop offset="1" stop-color="#3a7bd5"/></radialGradient>'),

    dino: sceneSvg(
      '<rect width="1440" height="900" fill="url(#dnSky)"/>' +
      cloud(300, 120, .9) + cloud(900, 160, .7) +
      // volcano + smoke
      '<path d="M980 600 L1150 300 H1230 L1400 600 Z" fill="#a0715a"/><path d="M1150 300 H1230 L1210 340 L1190 320 L1170 345 Z" fill="#ff7a3d"/>' +
      '<g class="sc-smoke" fill="#d8d2cc"><circle cx="1190" cy="260" r="26"/><circle cx="1216" cy="220" r="32"/><circle cx="1180" cy="180" r="24"/></g>' +
      '<path d="M0 600 C260 540 520 580 760 600 C1000 620 1240 560 1440 590 V900 H0 Z" fill="#8fd17a"/>' +
      '<path d="M0 720 C320 680 640 740 960 710 C1200 690 1320 700 1440 720 V900 H0 Z" fill="#6cbf5c"/>' +
      // palm trees
      '<g transform="translate(140 560)"><path d="M0 200 C10 120 20 60 10 0" fill="none" stroke="#9b6a3c" stroke-width="18" stroke-linecap="round"/>' +
        '<path d="M10 0 C-50 -20 -100 10 -120 40 C-70 20 -30 20 10 0 Z M10 0 C70 -30 120 0 140 30 C90 10 50 10 10 0 Z M10 0 C-20 -60 -70 -70 -100 -60 C-60 -50 -20 -30 10 0 Z M10 0 C40 -60 90 -70 120 -56 C80 -46 40 -30 10 0 Z" fill="#3fae5e"/></g>' +
      '<g transform="translate(1320 640) scale(.7)"><path d="M0 200 C10 120 20 60 10 0" fill="none" stroke="#9b6a3c" stroke-width="18" stroke-linecap="round"/>' +
        '<path d="M10 0 C-50 -20 -100 10 -120 40 C-70 20 -30 20 10 0 Z M10 0 C70 -30 120 0 140 30 C90 10 50 10 10 0 Z M10 0 C-20 -60 -70 -70 -100 -60 C-60 -50 -20 -30 10 0 Z" fill="#3fae5e"/></g>' +
      flowers(10, 3, 760, 880),
      '<linearGradient id="dnSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c8f1e0"/><stop offset="1" stop-color="#fff5d1"/></linearGradient>'),

    unicorn: sceneSvg(
      '<rect width="1440" height="900" fill="url(#unSky)"/>' +
      '<g fill="none" stroke-width="34" opacity=".85" transform="translate(720 820)">' +
        '<path d="M-620 0 A620 620 0 0 1 620 0" stroke="#ff9ab5"/><path d="M-586 0 A586 586 0 0 1 586 0" stroke="#ffc36b"/>' +
        '<path d="M-552 0 A552 552 0 0 1 552 0" stroke="#fff07a"/><path d="M-518 0 A518 518 0 0 1 518 0" stroke="#9be8a6"/>' +
        '<path d="M-484 0 A484 484 0 0 1 484 0" stroke="#8fd3ff"/><path d="M-450 0 A450 450 0 0 1 450 0" stroke="#c4a3ff"/></g>' +
      cloud(130, 760, 1.6) + cloud(1320, 770, 1.6) + cloud(260, 160, .9) + cloud(1100, 120, .8) +
      stars(40, 5, 1440, 600, "#ffffff"),
      '<linearGradient id="unSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e9ddff"/><stop offset=".6" stop-color="#ffe3f1"/><stop offset="1" stop-color="#fff6fb"/></linearGradient>'),

    ocean: sceneSvg(
      '<rect width="1440" height="900" fill="url(#ocSea)"/>' +
      '<g fill="#fff" opacity=".12"><path d="M200 0 L320 0 L120 900 L40 900 Z"/><path d="M700 0 L780 0 L640 900 L560 900 Z"/><path d="M1180 0 L1300 0 L1120 900 L1020 900 Z"/></g>' +
      '<g class="sc-bubbles" fill="none" stroke="#e6faff" stroke-width="3" opacity=".7">' +
        '<circle cx="180" cy="700" r="10"/><circle cx="200" cy="640" r="6"/><circle cx="1240" cy="680" r="12"/><circle cx="1262" cy="610" r="7"/><circle cx="760" cy="720" r="8"/></g>' +
      '<g class="sc-weed" stroke-linecap="round" fill="none">' +
        '<path d="M120 900 C100 820 150 780 120 700 C100 650 130 620 120 580" stroke="#2fbf8f" stroke-width="16"/>' +
        '<path d="M170 900 C190 840 150 800 176 740" stroke="#4fd8a5" stroke-width="12"/>' +
        '<path d="M1320 900 C1300 820 1350 780 1320 700 C1300 650 1330 620 1320 590" stroke="#2fbf8f" stroke-width="16"/>' +
        '<path d="M1270 900 C1250 850 1290 810 1266 760" stroke="#4fd8a5" stroke-width="12"/></g>' +
      '<path d="M0 800 C300 770 600 820 900 800 C1140 784 1300 790 1440 800 V900 H0 Z" fill="#ffe2a8"/>' +
      '<g transform="translate(980 830)"><path d="M0 0 l12 -26 l12 26 l26 4 l-20 16 l6 26 l-24 -14 l-24 14 l6 -26 l-20 -16 z" fill="#ff8f6b"/></g>' +
      '<ellipse cx="420" cy="846" rx="30" ry="12" fill="#ffc36b"/>',
      '<linearGradient id="ocSea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fe3ff"/><stop offset=".55" stop-color="#2fa6d8"/><stop offset="1" stop-color="#1b6fb0"/></linearGradient>')
  };

  // ---------------------------------------------------------------- worlds
  window.GEETA_WORLDS = [
    { id: "teddy", name: "Teddy's Picnic", buddy: "Bobo", buddyKind: "teddy bear", icon: "🧸", mascot: TEDDY,
      title: "Cuddle up - let's think it through!", sub: "Bobo loves puzzles. Show me your homework and we'll work it out, one little step at a time.",
      confetti: ["💛", "🧸", "💗", "🍯", "⭐"] },
    { id: "car", name: "Race Track", buddy: "Zoom", buddyKind: "race car", icon: "🏎️", mascot: CAR,
      title: "Ready, set... let's race through maths!", sub: "Zoom is revving up! Show me your homework and we'll speed through it together.",
      confetti: ["🏁", "⭐", "🏆", "🔥", "🚦"] },
    { id: "space", name: "Space Adventure", buddy: "Cosmo", buddyKind: "rocket", icon: "🚀", mascot: ROCKET,
      title: "3... 2... 1... blast off into maths!", sub: "Cosmo is ready for launch. Show me your homework and we'll explore it together.",
      confetti: ["⭐", "🌟", "✨", "🪐", "🌙"] },
    { id: "dino", name: "Dino Valley", buddy: "Rexy", buddyKind: "dinosaur", icon: "🦖", mascot: DINO,
      title: "ROAR! Let's stomp through maths!", sub: "Rexy has tiny arms but a BIG brain. Show me your homework and let's go!",
      confetti: ["🦕", "🍃", "⭐", "🌴", "🥚"] },
    { id: "unicorn", name: "Unicorn Sky", buddy: "Luna", buddyKind: "unicorn", icon: "🦄", mascot: UNICORN,
      title: "Sprinkle some magic on your maths!", sub: "Luna's horn sparkles when you think hard. Show me your homework!",
      confetti: ["🌈", "✨", "💖", "⭐", "🦄"] },
    { id: "ocean", name: "Ocean Reef", buddy: "Ollie", buddyKind: "octopus", icon: "🐙", mascot: OCTO,
      title: "Dive into maths with Ollie!", sub: "Ollie has eight arms for counting! Show me your homework and let's swim through it.",
      confetti: ["🫧", "🐠", "⭐", "🐚", "💙"] }
  ];
  window.GEETA_SCENES = SCENES;
  window.GEETA_WORLD_IDS = window.GEETA_WORLDS.map(function (w) { return w.id; });
})();
