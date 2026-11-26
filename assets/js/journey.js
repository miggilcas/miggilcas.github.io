/*
 * Career journey animation for miggilcas.github.io.
 * A cloud of points morphs between six line drawings (one per career stage),
 * with an auto-advancing stage bar, click-to-jump and a pause button.
 * Original code; no external dependencies.
 */
(function () {
  "use strict";

  var root = document.getElementById("journey");
  if (!root) return;

  var data = JSON.parse(root.querySelector("script[type='application/json']").textContent);
  var lang = root.getAttribute("data-lang") || "en";
  var stages = data.stages;
  var canvas = root.querySelector("canvas");
  var ctx = canvas.getContext("2d");
  var buttons = Array.prototype.slice.call(root.querySelectorAll("[data-stage]"));
  var caption = root.querySelector(".jr-caption");
  var playBtn = root.querySelector(".jr-play");
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var N = 260; // number of points
  var HOLD = 3800; // ms a drawing stays
  var MORPH = 1100; // ms of morphing
  var STAGE_MS = HOLD + MORPH;

  // Blue palette, light -> navy (light theme) and readable variants for dark theme.
  var PALETTE_LIGHT = ["#5b8fd1", "#4a7fc2", "#3c6fb0", "#2f5f9c", "#264d85", "#1f3a5f"];
  var PALETTE_DARK = ["#cfe0f5", "#b8d0ee", "#a2c1e8", "#8fb4e3", "#7ba5dc", "#6a97d4"];

  function isDark() {
    return document.documentElement.getAttribute("data-theme") === "dark";
  }

  /* ---------- geometry helpers (drawings live in a 160 x 100 box) ---------- */
  function rect(x, y, w, h) {
    return [[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y]];
  }
  function circle(cx, cy, r, n) {
    n = n || 18;
    var pts = [];
    for (var i = 0; i <= n; i++) {
      var a = (i / n) * Math.PI * 2;
      pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
    return pts;
  }
  function quad(cx, cy, s) {
    // top view of a quadrotor: two arms + four rotors + body
    var d = s * 0.75;
    var out = [
      [[cx - d, cy - d], [cx + d, cy + d]],
      [[cx - d, cy + d], [cx + d, cy - d]],
      rect(cx - s * 0.22, cy - s * 0.22, s * 0.44, s * 0.44),
    ];
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(function (k) {
      out.push(circle(cx + k[0] * d, cy + k[1] * d, s * 0.42, 14));
    });
    return out;
  }

  var SHAPES = {
    circuit: function () {
      var p = [rect(62, 32, 36, 36), rect(68, 38, 24, 24)];
      for (var i = 0; i < 4; i++) {
        var o = 38 + i * 8;
        p.push([[62, o], [54, o]]);
        p.push([[98, o], [106, o]]);
        var px = 66 + i * 9;
        p.push([[px, 32], [px, 24]]);
      }
      p.push([[54, 38], [36, 38], [28, 30], [14, 30]]);
      p.push([[54, 62], [40, 62], [30, 74], [14, 74]]);
      p.push([[106, 46], [124, 46], [132, 38], [146, 38]]);
      p.push([[106, 62], [120, 62], [130, 74], [146, 74]]);
      p.push([[80, 68], [80, 84], [96, 92], [118, 92]]);
      p.push(circle(14, 30, 2.6, 10), circle(14, 74, 2.6, 10), circle(146, 38, 2.6, 10), circle(146, 74, 2.6, 10), circle(118, 92, 2.6, 10));
      return p;
    },
    document: function () {
      var p = [[[52, 6], [96, 6], [108, 18], [108, 94], [52, 94], [52, 6]], [[96, 6], [96, 18], [108, 18]]];
      [22, 30, 38].forEach(function (y) {
        p.push([[60, y], [100, y]]);
      });
      [52, 66, 80].forEach(function (y) {
        p.push(rect(60, y - 4, 7, 7));
        p.push([[61.5, y], [63.5, y + 2], [66.5, y - 3]]);
        p.push([[72, y], [100, y]]);
      });
      p.push(circle(118, 78, 9, 20), [[113, 78], [117, 82], [124, 73]]);
      return p;
    },
    neural: function () {
      var layers = [
        [26, [30, 50, 70]],
        [66, [20, 40, 60, 80]],
        [106, [30, 50, 70]],
        [140, [40, 60]],
      ];
      var p = [];
      for (var l = 0; l < layers.length - 1; l++) {
        layers[l][1].forEach(function (y1) {
          layers[l + 1][1].forEach(function (y2) {
            p.push([[layers[l][0] + 4, y1], [layers[l + 1][0] - 4, y2]]);
          });
        });
      }
      layers.forEach(function (L) {
        L[1].forEach(function (y) {
          p.push(circle(L[0], y, 4, 12));
        });
      });
      return p;
    },
    swarm: function () {
      var p = [].concat(quad(38, 30, 10), quad(82, 18, 10), quad(124, 32, 10));
      // power line with sag between two towers
      var line = [];
      for (var i = 0; i <= 20; i++) {
        var x = 12 + (i / 20) * 136;
        var t = (x - 80) / 68;
        line.push([x, 74 + 10 * (1 - t * t)]);
      }
      p.push(line);
      p.push([[12, 96], [12, 68], [6, 74], [18, 74]], [[148, 96], [148, 68], [142, 74], [154, 74]]);
      return p;
    },
    tree: function () {
      var p = [rect(66, 6, 28, 12)];
      p.push([[80, 18], [80, 26], [30, 26], [30, 36]], [[80, 26], [80, 36]], [[80, 26], [130, 26], [130, 36]]);
      p.push(rect(18, 36, 24, 10), rect(68, 36, 24, 10), rect(118, 36, 24, 10));
      p.push([[30, 46], [30, 56], [16, 56], [16, 66]], [[30, 56], [44, 56], [44, 66]]);
      p.push([[130, 46], [130, 56], [118, 56], [118, 66]], [[130, 56], [142, 56], [142, 66]]);
      p.push(rect(8, 66, 16, 10), rect(36, 66, 16, 10), rect(110, 66, 16, 10), rect(134, 66, 16, 10));
      p.push([[80, 46], [80, 66]], circle(80, 72, 6, 14));
      return p;
    },
    drone_llm: function () {
      var p = quad(58, 42, 16);
      p.push([[58, 52], [58, 80]], rect(50, 80, 16, 12));
      // speech bubble with three dots
      p.push([[96, 8], [150, 8], [150, 34], [112, 34], [102, 42], [104, 34], [96, 34], [96, 8]]);
      p.push(circle(111, 21, 2.4, 8), circle(123, 21, 2.4, 8), circle(135, 21, 2.4, 8));
      return p;
    },
  };

  // Sample N points evenly along all polylines of a drawing; keep polyline id for line drawing.
  function sample(polys) {
    var segs = [];
    var total = 0;
    polys.forEach(function (poly, id) {
      for (var i = 0; i < poly.length - 1; i++) {
        var a = poly[i],
          b = poly[i + 1];
        var len = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (len > 0) {
          segs.push({ a: a, b: b, len: len, id: id });
          total += len;
        }
      }
    });
    var pts = [];
    var step = total / N;
    var acc = step / 2;
    var si = 0,
      walked = 0;
    for (var k = 0; k < N; k++) {
      var target = acc + k * step;
      while (si < segs.length - 1 && walked + segs[si].len < target) {
        walked += segs[si].len;
        si++;
      }
      var s = segs[si];
      var t = Math.min(1, Math.max(0, (target - walked) / s.len));
      pts.push({ x: s.a[0] + (s.b[0] - s.a[0]) * t, y: s.a[1] + (s.b[1] - s.a[1]) * t, id: s.id });
    }
    return pts;
  }

  var drawings = stages.map(function (s) {
    return sample(SHAPES[s.shape]());
  });

  /* ---------- canvas sizing ---------- */
  var W = 0,
    H = 0,
    dpr = 1;
  function resize() {
    var r = canvas.getBoundingClientRect();
    dpr = window.devicePixelRatio || 1;
    W = r.width;
    H = r.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  if (window.ResizeObserver) new ResizeObserver(resize).observe(canvas);
  window.addEventListener("resize", resize);
  resize();

  function toScreen(x, y) {
    var scale = Math.min(W / 160, H / 100) * 0.92;
    var ox = (W - 160 * scale) / 2;
    var oy = (H - 100 * scale) / 2;
    return [ox + x * scale, oy + y * scale, scale];
  }

  function ease(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  /* ---------- state ---------- */
  var current = 0;
  var from = 0;
  var stageStart = performance.now();
  var paused = reduceMotion;
  var pausedAt = 0;

  function setStage(i, instant) {
    from = instant ? i : current;
    current = i;
    stageStart = performance.now() - (instant ? MORPH : 0);
    if (paused) pausedAt = stageStart + (instant ? MORPH : 0);
    buttons.forEach(function (b, k) {
      b.setAttribute("aria-pressed", k === i ? "true" : "false");
      var fill = b.querySelector(".jr-track i");
      fill.style.width = k < i ? "100%" : "0%";
    });
    var s = stages[i];
    caption.classList.add("jr-fade");
    setTimeout(function () {
      caption.querySelector(".jr-index").innerHTML = s.index[lang];
      caption.querySelector("h2").innerHTML = s.title[lang];
      caption.querySelector(".jr-context").innerHTML = s.context[lang];
      caption.classList.remove("jr-fade");
    }, 180);
  }

  buttons.forEach(function (b, i) {
    b.addEventListener("click", function () {
      setStage(i, paused);
    });
  });

  function updatePlayLabel() {
    playBtn.innerHTML = (paused ? data.ui.play + ' <span aria-hidden="true">&#9654;</span>' : data.ui.pause + ' <span aria-hidden="true">&#10074;&#10074;</span>');
    playBtn.setAttribute("aria-label", paused ? data.ui.play : data.ui.pause);
  }
  playBtn.addEventListener("click", function () {
    if (paused) {
      stageStart += performance.now() - pausedAt;
      paused = false;
    } else {
      pausedAt = performance.now();
      paused = true;
    }
    updatePlayLabel();
  });
  updatePlayLabel();

  /* ---------- render loop ---------- */
  function frame(now) {
    var clock = paused ? pausedAt : now;
    var elapsed = clock - stageStart;
    if (!paused && elapsed >= STAGE_MS) {
      setStage((current + 1) % stages.length, false);
      elapsed = 0;
    }
    var mt = Math.min(1, Math.max(0, elapsed / MORPH));
    var e = ease(mt);
    var A = drawings[from],
      B = drawings[current];
    var dark = isDark();
    var palette = dark ? PALETTE_DARK : PALETTE_LIGHT;
    var color = palette[current % palette.length];

    var fill = buttons[current].querySelector(".jr-track i");
    fill.style.width = Math.min(100, (Math.max(0, elapsed) / STAGE_MS) * 100) + "%";

    ctx.clearRect(0, 0, W, H);
    var pts = [];
    var wob = reduceMotion ? 0 : 0.6;
    for (var i = 0; i < N; i++) {
      var x = A[i].x + (B[i].x - A[i].x) * e;
      var y = A[i].y + (B[i].y - A[i].y) * e;
      // arc the trajectory slightly during the morph and add a gentle idle breathing
      var arc = Math.sin(mt * Math.PI) * 6 * Math.sin(i * 1.7);
      x += arc + wob * Math.sin(now / 900 + i);
      y += arc * 0.6 + wob * Math.cos(now / 1100 + i * 0.7);
      var sp = toScreen(x, y);
      pts.push({ x: sp[0], y: sp[1], id: e < 0.5 ? A[i].id : B[i].id, s: sp[2] });
    }

    // connecting lines within the same polyline
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.35 + 0.45 * Math.abs(e * 2 - 1);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    var maxGap = (pts[0] ? pts[0].s : 1) * 7;
    for (var j = 0; j < N - 1; j++) {
      var p = pts[j],
        q = pts[j + 1];
      if (p.id === q.id && Math.hypot(q.x - p.x, q.y - p.y) < maxGap) {
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(q.x, q.y);
      }
    }
    ctx.stroke();

    // points
    ctx.globalAlpha = 1;
    ctx.fillStyle = color;
    for (var k = 0; k < N; k++) {
      ctx.beginPath();
      ctx.arc(pts[k].x, pts[k].y, 1.7, 0, Math.PI * 2);
      ctx.fill();
    }
    requestAnimationFrame(frame);
  }

  setStage(0, true);
  requestAnimationFrame(frame);
})();
